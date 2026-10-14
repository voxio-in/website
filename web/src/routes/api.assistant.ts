// The Assistant's endpoints.
// POST /api/assistant              → one reply, streamed as server-sent events (see loop.server).
// POST /api/assistant {act}         → apply / discard / undo a proposed change.
// POST /api/assistant {chatAction}  → rename or delete a saved chat.
// GET  /api/assistant?chats=1       → your saved chats; ?chat=id → one, with every message.
// GET  /api/assistant?models=1     → the models that have a key set.
// GET  /api/assistant?mention=q&flow=key → things to @-mention: flows, steps (of the open
//                                     flow), sessions, faces, saved voices, numbers, knowledge.

import { createFileRoute } from '@tanstack/react-router'
import { ASSISTANT_ON } from '#/lib/features'

import { db, withDb } from '#/server/db'
import { currentUser } from '#/server/session.server'
import { availableModels, type Msg } from '#/server/assistant/models.server'
import { reply, type Context, type Mention } from '#/server/assistant/loop.server'
import { act } from '#/server/assistant/changes.server'
import { answerFrom, chatFor, deleteChat, listChats, readChat, renameChat, saveAnswer, saveQuestion, updateCard } from '#/server/assistant/chats.server'
import { prettyName } from '#/lib/workflow/registry'
import { shortKey } from '#/server/assistant/redact'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/** A reason a change card can show when saving throws (a missing table means db push wasn't run). */
function dbReason(e: unknown): string {
  const err = e as { code?: string; message?: string }
  if (err?.code === 'P2021' || /does not exist/i.test(err?.message ?? '')) return 'This isn’t set up in the database yet. Stop the server, run `npx prisma db push`, then start it again.'
  return err?.message?.split('\n').pop()?.trim() || 'Saving failed.'
}

/**
 * What @ offers. Kept short on purpose: an account can have tens of thousands of
 * sessions, so sessions only appear for a precise query (part of a session ID, or
 * a caller's number); the list shows at most a dozen things.
 */
async function mentions(userId: string, q: string, flowKey: string): Promise<Mention[]> {
  const like = q.trim()
  const ins = { contains: like, mode: 'insensitive' as const }
  const digits = like.replace(/[^\d]/g, '')
  const sessionQuery = /^[0-9a-f-]{6,}$/i.test(like) ? { sessionId: { startsWith: like.toLowerCase() } }
    : digits.length >= 4 && digits.length >= like.replace(/[\s+()-]/g, '').length ? { OR: [{ from: { contains: digits } }, { to: { contains: digits } }] }
    : null
  const none = () => Promise.resolve([])
  const [flows, faces, stt, tts, numbers, kbs, sessions, open] = await withDb(() => Promise.all([
    db.flow.findMany({ where: { userId, ...(like ? { flowName: ins } : {}) }, select: { apiKey: true, flowName: true, runtime: true }, take: like ? 6 : 5, orderBy: { updatedAt: 'desc' } }),
    like ? db.face.findMany({ where: { userId, label: ins }, select: { uuid: true, label: true }, take: 3 }) : none(),
    like ? db.stt.findMany({ where: { userId, isPreset: true, name: ins }, select: { id: true, name: true }, take: 2 }) : none(),
    like ? db.tts.findMany({ where: { userId, isPreset: true, name: ins }, select: { id: true, name: true }, take: 2 }) : none(),
    digits.length >= 3 ? db.phoneNumber.findMany({ where: { user: { id: userId }, phoneNumber: { contains: digits } }, select: { phoneNumber: true, label: true }, take: 3 }) : none(),
    like ? db.knowledgeBase.findMany({ where: { userId, name: ins }, select: { id: true, name: true }, take: 2 }) : none(),
    sessionQuery ? db.callSession.findMany({
      where: { flow: { userId }, ...sessionQuery },
      select: { sessionId: true, startTime: true, type: true, from: true, flow: { select: { flowName: true } } }, orderBy: { startTime: 'desc' }, take: 3,
    }) : none(),
    flowKey ? db.flow.findFirst({ where: { userId, apiKey: flowKey }, select: { flowName: true, agent: { select: { workflow: true } } } }) : null,
  ]))
  // Steps of the flow you're in come first: they're what you most often point at.
  const steps = open ? Object.keys(((open.agent.workflow as { nodes?: object })?.nodes) ?? {})
    .filter((id) => !like || prettyName(id).toLowerCase().includes(like.toLowerCase()) || id.includes(like))
    .slice(0, like ? 6 : 4).map((id): Mention => ({ kind: 'step', id, label: `${prettyName(id)} · ${open.flowName}`, flow: shortKey(flowKey) })) : []
  return [
    ...steps,
    ...flows.filter((f) => !(f.runtime as { deleted_at?: string })?.deleted_at).map((f): Mention => ({ kind: 'flow', id: shortKey(f.apiKey), label: f.flowName })),
    ...sessions.map((s): Mention => ({ kind: 'session', id: s.sessionId, label: `${s.flow.flowName} · ${s.startTime.toISOString().slice(0, 16).replace('T', ' ')}${s.from ? ` · ${s.from}` : ''}` })),
    ...faces.map((f): Mention => ({ kind: 'face', id: f.uuid, label: f.label || f.uuid.slice(0, 8) })),
    ...tts.map((v): Mention => ({ kind: 'voice', id: v.id, label: `${v.name ?? 'Voice'} (speaking)` })),
    ...stt.map((v): Mention => ({ kind: 'voice', id: v.id, label: `${v.name ?? 'Setup'} (listening)` })),
    ...numbers.map((n): Mention => ({ kind: 'number', id: n.phoneNumber, label: n.label ? `${n.phoneNumber} · ${n.label}` : n.phoneNumber })),
    ...kbs.map((k): Mention => ({ kind: 'knowledge', id: k.id, label: k.name })),
  ]
}

/** Where a vx: reference from an answer leads: vx:flow/<key>, vx:session/<id>, vx:step/<key>/<step>. */
async function open(userId: string, r: string) {
  const [kind, a, b] = r.replace(/^vx:/, '').split('/')
  const flowByPrefix = (p: string) => withDb(() => db.flow.findFirst({ where: { userId, apiKey: { startsWith: p.replace(/…$/, '') } }, select: { apiKey: true } }))
  if (kind === 'flow' && a) { const f = await flowByPrefix(a); return f ? { ok: true, data: { path: `/dashboard/flows/${f.apiKey}` } } : { ok: false, reason: 'Flow not found.' } }
  if (kind === 'dash' && a) return { ok: true, data: { path: `/dashboard/dashboards/${a}` } }
  if (kind === 'page' && a) { const f = await flowByPrefix(a); return f ? { ok: true, data: { path: `/dashboard/flows/${f.apiKey}${b ? `/${b}` : ''}` } } : { ok: false, reason: 'Flow not found.' } }
  if (kind === 'step' && a) { const f = await flowByPrefix(a); return f ? { ok: true, data: { path: `/dashboard/flows/${f.apiKey}/workflow`, step: b } } : { ok: false, reason: 'Flow not found.' } }
  if (kind === 'session' && a) {
    const s = await withDb(() => db.callSession.findFirst({ where: { sessionId: a, flow: { userId } }, select: { flow: { select: { apiKey: true } } } }))
    return s ? { ok: true, data: { path: `/dashboard/flows/${s.flow.apiKey}?session=${encodeURIComponent(a)}` } } : { ok: false, reason: 'Session not found.' }
  }
  return { ok: false, reason: 'Unknown link.' }
}

export const Route = createFileRoute('/api/assistant')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!ASSISTANT_ON) return json({ ok: false, reason: 'Ask Voxio is turned off.' }, 404)
        const me = await currentUser()
        if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)
        const url = new URL(request.url)
        if (url.searchParams.has('chats')) { try { return json({ ok: true, data: await listChats(me.id) }) } catch (e) { return json({ ok: false, reason: dbReason(e) }, 500) } }
        if (url.searchParams.has('chat')) {
          try { const c = await readChat(me.id, url.searchParams.get('chat') ?? ''); return c ? json({ ok: true, data: c }) : json({ ok: false, reason: 'Chat not found.' }, 404) } catch (e) { return json({ ok: false, reason: dbReason(e) }, 500) }
        }
        if (url.searchParams.has('models')) return json({ ok: true, data: availableModels().map(({ id, label, note }) => ({ id, label, note })) })
        if (url.searchParams.has('open')) return json(await open(me.id, url.searchParams.get('open') ?? ''))
        if (url.searchParams.has('mention')) return json({ ok: true, data: await mentions(me.id, url.searchParams.get('mention') ?? '', url.searchParams.get('flow') ?? '') })
        return json({ ok: false, reason: 'Nothing asked.' }, 400)
      },

      POST: async ({ request }) => {
        if (!ASSISTANT_ON) return json({ ok: false, reason: 'Ask Voxio is turned off.' }, 404)
        const me = await currentUser()
        if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)
        const body = (await request.json()) as { model?: string; history?: Msg[]; ctx?: Context; mentions?: Mention[]; act?: { id: string; action: 'apply' | 'discard' | 'undo'; chat?: string }; chat?: string; chatAction?: { id: string; rename?: string; remove?: boolean } }
        if (body.chatAction) {
          try {
            if (body.chatAction.remove) await deleteChat(me.id, body.chatAction.id)
            else if (body.chatAction.rename) await renameChat(me.id, body.chatAction.id, body.chatAction.rename)
            return json({ ok: true })
          } catch (e) { return json({ ok: false, reason: dbReason(e) }, 500) }
        }
        // A change card's button: apply, discard or undo a proposed change.
        if (body.act) {
          // Always answer with a reason the card can show, even when saving throws.
          try {
            const r = await act(me, String(body.act.id), body.act.action)
            // The saved chat shows the card's new status when it's reopened.
            if (r.ok && body.act.chat) await updateCard(me.id, body.act.chat, r.card as { id: string }).catch(() => {})
            return json(r.ok ? { ok: true, data: r.card } : r, r.ok ? 200 : 409)
          } catch (e) {
            return json({ ok: false, reason: dbReason(e) }, 500)
          }
        }
        const history = (body.history ?? []).filter((m) => m && (m.role === 'user' || m.role === 'assistant')).slice(-30)
        if (!history.length || history[history.length - 1].role !== 'user') return json({ ok: false, reason: 'Say something first.' }, 400)

        const enc = new TextEncoder()
        const stream = new ReadableStream({
          async start(ctrl) {
            const { answer, add } = answerFrom()
            const send = (e: Record<string, unknown>) => {
              add(e)
              try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)) } catch { /* the browser went away; the answer is still saved */ }
            }
            // Save the question first, into the given chat or a new one; the browser learns its id.
            const question = String((history[history.length - 1] as { content?: unknown }).content ?? '')
            let chatId: string | null = null
            try {
              chatId = await chatFor(me.id, body.chat, question, body.model ?? '')
              await saveQuestion(chatId, question, body.mentions ?? [], body.model ?? '')
              send({ type: 'chat', id: chatId })
            } catch (e) { send({ type: 'chat', id: null, reason: dbReason(e) }) }
            try {
              for await (const e of reply(me, { model: body.model ?? '', history, ctx: body.ctx ?? {}, mentions: body.mentions ?? [], signal: request.signal })) send(e as Record<string, unknown>)
            } catch (e) {
              if (!request.signal.aborted) send({ type: 'error', message: (e as Error).message })
            } finally {
              if (request.signal.aborted && !answer.error && !answer.meta) answer.meta = 'Stopped'
              if (chatId) await saveAnswer(chatId, answer).catch(() => {})
            }
            try { ctrl.close() } catch { /* already closed */ }
          },
        })
        return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } })
      },
    },
  },
})
