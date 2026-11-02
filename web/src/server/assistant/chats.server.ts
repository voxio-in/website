// Ask Voxio's saved conversations (assistant_chats / assistant_messages).
// The reply loop saves both sides of every turn here as it runs: the question
// before the model starts, the answer (text, every tool call with its input and
// result, change cards) when the turn ends, however it ends. Change cards keep
// their status in step when they're applied, discarded or undone.

import type { Prisma } from '@prisma/client'
import { db, withDb } from '#/server/db'

export type ChatPart =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; id: string; label: string; input: unknown; result?: unknown; ok?: boolean }
  | { kind: 'change'; card: { id: string; status: string; [k: string]: unknown } }
  | { kind: 'test'; test: { flow: string; name: string; how: 'chat' | 'voice' } }
  | { kind: 'voices'; voices: { label: string; url: string; changes: unknown[] }[] }
  | { kind: 'followups'; followups: { title: string; total: number; calls: { call: string; when: string; caller: string; seconds: number; recorded: Record<string, unknown>; last_caller_line: string }[] } }
  | { kind: 'download'; download: { name: string; rows: number } }
  | { kind: 'doc'; doc: { title: string; items: { question: string; hint: string }[] } }

export type ChatItem =
  | { role: 'user'; text: string; mentions: unknown[] }
  | { role: 'assistant'; parts: ChatPart[]; done: true; error?: string; meta?: string }

const titleOf = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 60 ? `${t.slice(0, 59)}…` : t || 'New chat'
}

export const listChats = (userId: string) =>
  withDb(() => db.assistantChat.findMany({
    where: { userId }, orderBy: { updatedAt: 'desc' }, take: 50,
    select: { id: true, title: true, updatedAt: true },
  }))

/** A chat with its messages, shaped like the panel's items. Null when it isn't this user's. */
export async function readChat(userId: string, id: string) {
  const chat = await withDb(() => db.assistantChat.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { seq: 'asc' } } },
  }))
  if (!chat) return null
  const items: ChatItem[] = chat.messages.map((m) => m.role === 'user'
    ? { role: 'user', text: m.text ?? '', mentions: (m.mentions as unknown[] | null) ?? [] }
    : { role: 'assistant', parts: (m.parts as ChatPart[] | null) ?? [], done: true, error: m.error ?? undefined, meta: m.meta ?? undefined })
  return { id: chat.id, title: chat.title, model: chat.model, items }
}

/** The chat to save into: the given one if it's this user's, else a new one titled after the question. */
export async function chatFor(userId: string, id: string | undefined, question: string, model: string) {
  if (id) {
    const found = await withDb(() => db.assistantChat.findFirst({ where: { id, userId }, select: { id: true } }))
    if (found) return found.id
  }
  const made = await withDb(() => db.assistantChat.create({ data: { userId, title: titleOf(question), model: model || null }, select: { id: true } }))
  return made.id
}

async function nextSeq(chatId: string) {
  const last = await withDb(() => db.assistantMessage.findFirst({ where: { chatId }, orderBy: { seq: 'desc' }, select: { seq: true } }))
  return (last?.seq ?? -1) + 1
}

export async function saveQuestion(chatId: string, text: string, mentions: unknown[], model: string) {
  const seq = await nextSeq(chatId)
  await withDb(() => db.$transaction([
    db.assistantMessage.create({ data: { chatId, seq, role: 'user', text, mentions: mentions as Prisma.InputJsonValue } }),
    db.assistantChat.update({ where: { id: chatId }, data: { model: model || undefined, updatedAt: new Date() } }),
  ]))
}

export async function saveAnswer(chatId: string, a: { parts: ChatPart[]; error?: string; meta?: string }) {
  const seq = await nextSeq(chatId)
  await withDb(() => db.$transaction([
    db.assistantMessage.create({ data: { chatId, seq, role: 'assistant', parts: a.parts as unknown as Prisma.InputJsonValue, error: a.error ?? null, meta: a.meta ?? null } }),
    db.assistantChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
  ]))
}

/** Builds an answer from the reply's events, the same way the panel draws it. */
export function answerFrom() {
  const a: { parts: ChatPart[]; error?: string; meta?: string } = { parts: [] }
  const add = (e: Record<string, any>) => {
    if (e.type === 'text') a.parts.push({ kind: 'text', text: e.text })
    else if (e.type === 'tool') a.parts.push({ kind: 'tool', id: e.id, label: e.label, input: e.input })
    else if (e.type === 'tool_result') {
      const p = a.parts.find((x) => x.kind === 'tool' && x.id === e.id) as Extract<ChatPart, { kind: 'tool' }> | undefined
      if (p) Object.assign(p, { label: e.label, result: e.result, ok: e.ok })
    }
    else if (e.type === 'change') {
      const same = a.parts.find((p) => p.kind === 'change' && p.card.id === e.card.id) as Extract<ChatPart, { kind: 'change' }> | undefined
      if (same) same.card = e.card
      else a.parts.push({ kind: 'change', card: e.card })
    }
    else if (e.type === 'test') a.parts.push({ kind: 'test', test: e.test })
    else if (e.type === 'voices') a.parts.push({ kind: 'voices', voices: e.voices })
    else if (e.type === 'doc') a.parts.push({ kind: 'doc', doc: e.doc })
    else if (e.type === 'followups') a.parts.push({ kind: 'followups', followups: e.followups })
    // The file itself isn't kept in the chat: ask again for a fresh one.
    else if (e.type === 'download') a.parts.push({ kind: 'download', download: { name: e.download.name, rows: e.download.rows } })
    else if (e.type === 'done') a.meta = e.summary ?? `${e.model} · ${e.steps} step${e.steps === 1 ? '' : 's'} · ${(e.usage.input + e.usage.output).toLocaleString()} tokens${e.usage.cached ? ` (${e.usage.cached.toLocaleString()} cached)` : ''}`
    else if (e.type === 'error') a.error = e.message
  }
  return { answer: a, add }
}

/** Keeps a change card's saved copy in step after Apply / Discard / Undo.
 *  One chat's updates run one at a time: each reads the message and writes it back, so two at
 *  once (Apply on several cards of one answer) would each overwrite the other's status. */
const queue = new Map<string, Promise<unknown>>()
export function updateCard(userId: string, chatId: string, card: { id: string }) {
  const prev = queue.get(chatId) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(() => writeCard(userId, chatId, card))
  queue.set(chatId, next)
  void next.finally(() => { if (queue.get(chatId) === next) queue.delete(chatId) }).catch(() => {})
  return next
}

async function writeCard(userId: string, chatId: string, card: { id: string }) {
  const msgs = await withDb(() => db.assistantMessage.findMany({
    where: { chatId, role: 'assistant', chat: { userId } }, select: { id: true, parts: true }, orderBy: { seq: 'desc' }, take: 40,
  }))
  for (const m of msgs) {
    const parts = (m.parts as ChatPart[] | null) ?? []
    if (!parts.some((p) => p.kind === 'change' && p.card.id === card.id)) continue
    const next = parts.map((p) => (p.kind === 'change' && p.card.id === card.id ? { ...p, card } : p))
    await withDb(() => db.assistantMessage.update({ where: { id: m.id }, data: { parts: next as unknown as Prisma.InputJsonValue } }))
    return
  }
}

export const renameChat = (userId: string, id: string, title: string) =>
  withDb(() => db.assistantChat.updateMany({ where: { id, userId }, data: { title: titleOf(title) } }))

export const deleteChat = (userId: string, id: string) =>
  withDb(() => db.assistantChat.deleteMany({ where: { id, userId } }))
