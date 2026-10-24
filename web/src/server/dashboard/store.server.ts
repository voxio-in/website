// The dashboard's data, per account, in Postgres (Prisma). The tables mirror
// the backend's Mongo collections (users, agents, flows, stt, tts, sessions,
// numbers, faces — see prisma/schema.prisma), plus knowledge and webhook
// deliveries.
//
// `load(user)` assembles them into one plain Store; `mutate(user, fn)` runs fn
// on a copy and writes back only what changed, in one transaction. So callers
// treat it like an in-memory object and never touch Prisma themselves.
//
// The sample-data helpers below seeded the old demo account. Nothing calls
// them now; that data belongs to an ordinary user.

import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'

import type { Prisma } from '@prisma/client'

import type { Account, Avatar, Delivery, FlowDoc, KnowledgeBase, ProviderConfig, Session, VoicePreset, WebActionEvent } from '#/lib/dashboard/types'
import { TEMPLATES } from '#/lib/workflow/templates'
import { withStart } from '#/lib/workflow/convert'
import { db, withDb } from '#/server/db'
import { playableUrl } from '#/server/r2.server'
import type { AuthUser } from '#/server/session.server'

/** Extras for flows served from the voice backend. Not persisted: our tables are the source of truth now. */
export type Overlay = Record<string, unknown> & { deliveries?: Delivery[]; sessions?: Session[] }

export type Store = {
  account: Account
  flows: Record<string, FlowDoc>
  overlays: Record<string, Overlay>
  /**
   * Flows the user deleted. Deleting keeps the row (its sessions and logs
   * cascade with it otherwise), kills its key and stamps `deleted_at` in its
   * runtime; it leaves the flows list but its sessions still count.
   * Read-only: `save` never writes it.
   */
  deleted?: Record<string, { name: string; deletedAt: string; sessions: Session[] }>
}

export const newKey = (prefix = 'vx') => `${prefix}_${randomBytes(18).toString('base64url')}`

const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
/** A flow key in the voice backend's own format (`services.generate_api_key`): `vk_` and 64 letters or digits. */
export const flowKey = () => 'vk_' + Array.from({ length: 64 }, () => KEY_CHARS[randomInt(KEY_CHARS.length)]).join('')


const json = (v: unknown) => (v ?? {}) as Prisma.InputJsonValue
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined)
const date = (s: unknown) => (s ? new Date(String(s)) : new Date())

// ------------------------------------------------------------------ rows → store

const FLOW_COLUMNS = new Set(['key', 'source', 'mock', 'flow_name', 'created_at', 'workflow', 'webhook-url', 'webhook-secret', 'webhook-events',
  'stt', 'tts', 'kbs', 'faces', 'vision_id', 'running_vision_id', 'numbers', 'sessions', 'deliveries', 'process-type', 'xml'])
const SESSION_COLUMNS = new Set(['sessionId', 'type', 'startTime', 'endTime', 'totalConnectedTime', 'totalAiTime', 'totalHumanTime',
  'aiTokens', 'humanTokens', 'recordingUrl', 'transcription', 'from', 'to', 'status', 'timeRatio', 'tokenRatio'])

const provider = (r: { service: string; config: unknown } | null): ProviderConfig | null =>
  r ? { ...(r.config as Record<string, unknown>), service: r.service } : null
const splitProvider = (c: ProviderConfig) => {
  const { service, ...config } = c
  return { service, config: json(config) }
}

/** Everything one flow's page needs: its agent, voices, numbers, sessions and recent deliveries. */
export const flowInclude = {
  agent: true, stt: true, tts: true,
  numbers: { orderBy: { phoneNumber: 'asc' } },
  sessions: { orderBy: { startTime: 'desc' } },
  deliveries: { orderBy: { at: 'desc' }, take: 200 },
} satisfies Prisma.FlowInclude
export type FlowRow = Prisma.FlowGetPayload<{ include: typeof flowInclude }>

const userInclude = {
  flows: { orderBy: { createdAt: 'asc' }, include: flowInclude },
  stt: { where: { isPreset: true }, orderBy: { createdAt: 'asc' } },
  tts: { where: { isPreset: true }, orderBy: { createdAt: 'asc' } },
  numbers: { orderBy: { phoneNumber: 'asc' } },
  faces: { orderBy: { createdAt: 'asc' } },
  knowledge: { orderBy: { createdAt: 'asc' }, include: { sources: { orderBy: { addedAt: 'asc' } } } },
} satisfies Prisma.UserInclude
type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>
type SessionRow = FlowRow['sessions'][number]

export function toSession(r: SessionRow): Session {
  return {
    ...(r.extra as Record<string, unknown>),
    sessionId: r.sessionId, type: r.type, startTime: r.startTime.toISOString(), endTime: r.endTime.toISOString(),
    totalConnectedTime: r.totalConnectedTime, totalAiTime: r.totalAiTime, totalHumanTime: r.totalHumanTime,
    aiTokens: r.aiTokens, humanTokens: r.humanTokens, transcription: r.transcription,
    recordingUrl: r.recordingUrl ?? undefined, from: r.from ?? undefined, to: r.to ?? undefined, status: r.status ?? undefined,
  }
}

/** One flow row as the dashboard's FlowDoc. */
export function flowDocOf(f: FlowRow): FlowDoc {
  return {
  integrations: [], 'web-actions': [],
  ...(f.runtime as Record<string, unknown>),
  key: f.apiKey, source: 'mock', mock: [],
  flow_name: f.flowName, created_at: f.createdAt.toISOString(),
  workflow: f.agent.workflow as FlowDoc['workflow'],
  'webhook-url': f.agent.webhookUrl,
  'webhook-secret': f.webhookSecret ?? undefined,
  'webhook-events': f.webhookEvents.length ? f.webhookEvents : undefined,
  stt: provider(f.stt), tts: provider(f.tts),
  kbs: f.kbs,
  faces: { version: null, expressions: [], transitions: [], ...(f.faces as object) },
  vision_id: (f.visionId ?? null) as FlowDoc['vision_id'],
  running_vision_id: (f.runningVisionId ?? null) as FlowDoc['running_vision_id'],
  'process-type': f.processType, xml: f.xml,
  numbers: f.numbers.map((n) => ({ phone_number: n.phoneNumber, provider: n.provider ?? undefined, added_at: iso(n.attachedAt) })),
  sessions: f.sessions.map(toSession),
  deliveries: f.deliveries.map((d) => ({ id: d.id, at: d.at.toISOString(), event: d.event, url: d.url, status: d.status, ms: d.ms, attempt: d.attempt, request: d.request, response: d.response ?? undefined })),
  } as FlowDoc
}

function toStore(u: UserRow): Store {
  const voice = (kind: 'stt' | 'tts') => (r: UserRow['stt'][number]): VoicePreset =>
    ({ id: r.id, name: r.name ?? r.service, kind, config: provider(r)!, used_by: [] })
  const account: Account = {
    name: u.name, email: u.email, apiKey: u.apiKey, apiKeyRotatedAt: iso(u.apiKeyRotatedAt),
    numbers: u.numbers.map((n) => ({ phone_number: n.phoneNumber, label: n.label ?? undefined, added_at: n.createdAt.toISOString() })),
    voices: [...u.stt.map(voice('stt')), ...u.tts.map(voice('tts'))],
    knowledge: u.knowledge.map((k) => ({
      id: k.id, name: k.name,
      sources: k.sources.map((s) => ({ kind: s.kind, label: s.label, status: s.status as KnowledgeBase['sources'][number]['status'], chunks: s.chunks, added_at: s.addedAt.toISOString() })),
    })),
    avatars: u.faces.map((f) => {
      const clip = f.clip as { frames?: number; fps?: number }
      return { uuid: f.uuid, label: f.label, detector: f.detector as Avatar['detector'], frames: clip.frames ?? 0, fps: clip.fps ?? 25, created_at: f.createdAt.toISOString(), preview: playableUrl((f.media as { preview?: string }).preview), previewType: (f.media as { preview_type?: 'image' | 'video' }).preview_type }
    }),
    integrations: (u.integrations ?? []) as Account['integrations'],
  }
  const flows: Record<string, FlowDoc> = {}
  const deleted: NonNullable<Store['deleted']> = {}
  for (const f of u.flows) {
    const deletedAt = (f.runtime as { deleted_at?: string } | null)?.deleted_at
    if (deletedAt) {
      deleted[f.apiKey] = { name: f.flowName, deletedAt, sessions: f.sessions.map(toSession) }
      continue
    }
    flows[f.apiKey] = flowDocOf(f)
  }
  return { account, flows, overlays: {}, deleted }
}

// Neon is ~0.5s per round trip, and every dashboard tab reads the whole
// account, so reads are served from memory for a few seconds. Every write
// through `save` drops the entry.
const CACHE_MS = 20_000
const cache = new Map<string, { at: number; store: Store }>()
const forget = (userId: string) => cache.delete(userId)

// Pages ask for the account several at a time (loader, preload, sidebar);
// they share one query instead of each running their own.
const loading = new Map<string, Promise<Store>>()

export async function load(user: AuthUser, fresh = false): Promise<Store> {
  const hit = cache.get(user.id)
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return structuredClone(hit.store)
  let p = fresh ? undefined : loading.get(user.id)
  if (!p) {
    p = loadRows(user).then((store) => { cache.set(user.id, { at: Date.now(), store }); return store }).finally(() => loading.delete(user.id))
    if (!fresh) loading.set(user.id, p)
  }
  return structuredClone(await p)
}

async function loadRows(user: AuthUser): Promise<Store> {
  // One joined query instead of one per relation.
  const find = () => db.user.findUniqueOrThrow({ where: { id: user.id }, include: userInclude, relationLoadStrategy: 'join' })
  return withDb(async () => {
    return toStore(await find())
  })
}

// ------------------------------------------------------------------ store → rows

function sessionData(s: Session) {
  const extra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(s)) if (!SESSION_COLUMNS.has(k) && v !== undefined) extra[k] = v
  const t = s.totalConnectedTime || 0
  return {
    sessionId: s.sessionId, type: s.type, startTime: date(s.startTime), endTime: date(s.endTime),
    totalConnectedTime: t, totalAiTime: s.totalAiTime || 0, totalHumanTime: s.totalHumanTime || 0,
    timeRatio: t ? (s.totalAiTime || 0) / t : 0,
    aiTokens: Math.round(s.aiTokens || 0), humanTokens: Math.round(s.humanTokens || 0),
    tokenRatio: s.humanTokens ? (s.aiTokens || 0) / s.humanTokens : 0,
    transcription: json(s.transcription ?? []), recordingUrl: s.recordingUrl ?? null,
    from: s.from ?? null, to: s.to ?? null, status: s.status ?? null, extra: json(extra),
  }
}

function deliveryData(d: Delivery) {
  return { id: d.id, at: date(d.at), event: d.event, url: d.url, status: d.status, ms: Math.round(d.ms), attempt: d.attempt, request: json(d.request), response: d.response ?? null }
}

/** `version` hashes the face uuids; voicebot uses it to drop its face cache (database/flow_.py `faces_manifest`). */
function facesManifest(faces: FlowDoc['faces']) {
  const expressions = faces?.expressions ?? []
  const transitions = faces?.transitions ?? []
  const uuids = [...expressions, ...transitions].map((x) => String((x as { uuid?: string }).uuid ?? '')).sort()
  const version = uuids.length ? createHash('sha256').update(uuids.join(',')).digest('hex').slice(0, 16) : null
  return { ...faces, version, expressions, transitions }
}

/** The flow's own columns (not its agent, voices or child rows). */
function flowColumns(f: FlowDoc) {
  const runtime: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(f)) if (!FLOW_COLUMNS.has(k) && v !== undefined) runtime[k] = v
  return {
    flowName: f.flow_name, processType: String(f['process-type'] ?? 'speech-native'), xml: String(f.xml ?? ''),
    kbs: f.kbs ?? [], faces: json(facesManifest(f.faces)), visionId: f.vision_id ? json(f.vision_id) : undefined,
    runningVisionId: f.running_vision_id ? json(f.running_vision_id) : undefined, runtime: json(runtime),
    webhookSecret: f['webhook-secret'] ?? null, webhookEvents: f['webhook-events'] ?? [],
  }
}

/** Every number the account owns, with the flow each is attached to. */
function numberMap(s: Store) {
  const m = new Map<string, { label: string | null; flowKey: string | null; provider: string | null; attachedAt: Date | null; createdAt: Date }>()
  for (const n of s.account.numbers ?? []) m.set(n.phone_number, { label: n.label ?? null, flowKey: null, provider: null, attachedAt: null, createdAt: date(n.added_at) })
  for (const f of Object.values(s.flows)) {
    for (const n of f.numbers ?? []) {
      const prev = m.get(n.phone_number)
      m.set(n.phone_number, { label: prev?.label ?? null, createdAt: prev?.createdAt ?? date(n.added_at), flowKey: f.key, provider: n.provider ?? null, attachedAt: n.added_at ? date(n.added_at) : null })
    }
  }
  return m
}

function byId<T>(list: T[], id: (x: T) => string) {
  return new Map(list.map((x) => [id(x), x]))
}

/**
 * The writes that turn `prev` into `f` for one flow owned by `userId`
 * (a create when there is no `prev`). New stt / tts rows belong to that owner.
 */
export function flowOps(userId: string, key: string, prev: FlowDoc | undefined, f: FlowDoc): Prisma.PrismaPromise<unknown>[] {
  const ops: Prisma.PrismaPromise<unknown>[] = []
  const connectUser = { connect: { id: userId } }
  f.key = key
  const voice = (c: ProviderConfig | null) => (c ? { create: { user: connectUser, ...splitProvider(c) } } : undefined)
  if (!prev) {
    ops.push(db.flow.create({
      data: {
        apiKey: key, user: connectUser, createdAt: f.created_at ? date(f.created_at) : undefined, ...flowColumns(f),
        agent: { create: { user: connectUser, workflow: json(withStart(f.workflow)), webhookUrl: f['webhook-url'] ?? '' } },
        stt: voice(f.stt), tts: voice(f.tts),
        sessions: { create: f.sessions.map(sessionData) },
        deliveries: { create: (f.deliveries ?? []).map(deliveryData) },
      },
    }))
    return ops
  }
  const data: Prisma.FlowUpdateInput = {}
  if (!same(flowColumns(f), flowColumns(prev))) Object.assign(data, flowColumns(f))
  if (!same(f.workflow, prev.workflow) || f['webhook-url'] !== prev['webhook-url']) {
    data.agent = { update: { workflow: json(withStart(f.workflow)), webhookUrl: f['webhook-url'] ?? '' } }
  }
  for (const k of ['stt', 'tts'] as const) {
    if (same(f[k], prev[k])) continue
    data[k] = f[k]
      ? { upsert: { create: { user: connectUser, ...splitProvider(f[k]!) }, update: splitProvider(f[k]!) } }
      : { disconnect: true }
  }
  if (!same(f.sessions, prev.sessions)) {
    const had = byId(prev.sessions, (x) => x.sessionId)
    const now = byId(f.sessions, (x) => x.sessionId)
    data.sessions = {
      deleteMany: { sessionId: { in: [...had.keys()].filter((id) => !now.has(id)) } },
      create: f.sessions.filter((x) => !had.has(x.sessionId)).map(sessionData),
      update: f.sessions.filter((x) => had.has(x.sessionId) && !same(had.get(x.sessionId), x))
        .map((x) => ({ where: { sessionId: x.sessionId }, data: sessionData(x) })),
    }
  }
  if (!same(f.deliveries, prev.deliveries)) {
    const had = new Set((prev.deliveries ?? []).map((d) => d.id))
    const now = new Set((f.deliveries ?? []).map((d) => d.id))
    data.deliveries = {
      deleteMany: { id: { in: [...had].filter((id) => !now.has(id)) } },
      create: (f.deliveries ?? []).filter((d) => !had.has(d.id)).map(deliveryData),
    }
  }
  // The owner is part of the key, so a write can never land on someone else's flow.
  if (Object.keys(data).length) ops.push(db.flow.update({ where: { apiKey: key, userId }, data }))
  return ops
}

/** Write the difference between two versions of an account's store. */
async function save(userId: string, before: Store, after: Store) {
  forget(userId)
  const ops: Prisma.PrismaPromise<unknown>[] = []
  const a0 = before.account
  const a1 = after.account
  const connectUser = { connect: { id: userId } }

  // Account row.
  if (a1.name !== a0.name || a1.apiKey !== a0.apiKey || a1.apiKeyRotatedAt !== a0.apiKeyRotatedAt || !same(a1.integrations, a0.integrations)) {
    ops.push(db.user.update({ where: { id: userId }, data: { name: a1.name, apiKey: a1.apiKey, apiKeyRotatedAt: a1.apiKeyRotatedAt ? date(a1.apiKeyRotatedAt) : null, integrations: json(a1.integrations ?? []) } }))
  }

  // Voice presets → stt / tts rows.
  const v0 = byId(a0.voices, (v) => v.id)
  const v1 = byId(a1.voices, (v) => v.id)
  for (const [id, v] of v0) if (!v1.has(id)) ops.push(v.kind === 'stt' ? db.stt.deleteMany({ where: { id, userId } }) : db.tts.deleteMany({ where: { id, userId } }))
  for (const [id, v] of v1) {
    const prev = v0.get(id)
    if (prev && same(prev, v)) continue
    const data = { name: v.name, isPreset: true, ...splitProvider(v.config) }
    const table = v.kind === 'stt' ? db.stt : db.tts
    ops.push(prev
      ? (table as typeof db.stt).update({ where: { id }, data })
      : (table as typeof db.stt).create({ data: { id, user: connectUser, ...data } }))
  }

  // Knowledge bases and their sources.
  const k0 = byId(a0.knowledge, (k) => k.id)
  const k1 = byId(a1.knowledge, (k) => k.id)
  for (const id of k0.keys()) if (!k1.has(id)) ops.push(db.knowledgeBase.deleteMany({ where: { id, userId } }))
  for (const [id, k] of k1) {
    const prev = k0.get(id)
    if (prev && same(prev, k)) continue
    const sources = k.sources.map((s) => ({ kind: s.kind, label: s.label, status: s.status, chunks: s.chunks, addedAt: date(s.added_at) }))
    ops.push(prev
      ? db.knowledgeBase.update({ where: { id }, data: { name: k.name, sources: { deleteMany: {}, create: sources } } })
      : db.knowledgeBase.create({ data: { id, name: k.name, user: connectUser, sources: { create: sources } } }))
  }

  // Avatars → faces.
  const f0 = byId(a0.avatars, (f) => f.uuid)
  const f1 = byId(a1.avatars, (f) => f.uuid)
  for (const uuid of f0.keys()) if (!f1.has(uuid)) ops.push(db.face.deleteMany({ where: { uuid, userId } }))
  for (const [uuid, f] of f1) {
    const prev = f0.get(uuid)
    if (prev && same(prev, f)) continue
    const data = { label: f.label, detector: f.detector, clip: json({ frames: f.frames, fps: f.fps }), media: json(f.preview ? { preview: f.preview } : {}) }
    ops.push(prev ? db.face.update({ where: { uuid }, data }) : db.face.create({ data: { uuid, user: connectUser, createdAt: date(f.created_at), ...data } }))
  }

  // Flows, each with its agent, voices, sessions and deliveries.
  for (const key of Object.keys(before.flows)) {
    if (after.flows[key]) continue
    const agentId = (await db.flow.findUnique({ where: { apiKey: key }, select: { agentId: true } }))?.agentId
    ops.push(db.flow.deleteMany({ where: { apiKey: key, userId } }))
    if (agentId) ops.push(db.agent.deleteMany({ where: { id: agentId, userId } }))
  }
  for (const [key, f] of Object.entries(after.flows)) ops.push(...flowOps(userId, key, before.flows[key], f))

  // Numbers last, so they can point at flows created above.
  const n0 = numberMap(before)
  const n1 = numberMap(after)
  for (const phone of n0.keys()) if (!n1.has(phone)) ops.push(db.phoneNumber.deleteMany({ where: { phoneNumber: phone, userApiKey: a1.apiKey } }))
  for (const [phone, n] of n1) {
    const prev = n0.get(phone)
    if (prev && same(prev, n)) continue
    const data = { label: n.label, provider: n.provider, attachedAt: n.attachedAt, flowApiKey: n.flowKey }
    ops.push(db.phoneNumber.upsert({
      where: { phoneNumber: phone },
      create: { phoneNumber: phone, userApiKey: a1.apiKey, createdAt: n.createdAt, ...data },
      update: data,
    }))
  }

  if (ops.length) await db.$transaction(ops)
}

/** Run `fn` on the account's data and save whatever it changed. */
export async function mutate<T>(user: AuthUser, fn: (s: Store) => T): Promise<T> {
  const before = await load(user, true)
  const after = structuredClone(before)
  const out = fn(after)
  await withDb(() => save(user.id, before, after))
  // What was just written is what a reload would return, so keep it rather
  // than reading the whole account back: on a big account that re-read was
  // most of the time a save took.
  cache.set(user.id, { at: Date.now(), store: structuredClone(after) })
  return out
}

/**
 * Mark a flow deleted without removing it: its sessions and webhook logs
 * cascade on a real delete, and the user wants to keep them. Its numbers are
 * detached so they can go on another flow. The caller kills the key first.
 */
export async function markFlowDeleted(ownerId: string, key: string) {
  forget(ownerId)
  await withDb(async () => {
    const f = await db.flow.findFirst({ where: { apiKey: key, userId: ownerId }, select: { id: true, runtime: true } })
    if (!f) throw new Error('Flow not found.')
    const runtime = { ...((f.runtime as Record<string, unknown> | null) ?? {}), deleted_at: new Date().toISOString() }
    await db.$transaction([
      db.flow.update({ where: { id: f.id }, data: { runtime: json(runtime) } }),
      db.phoneNumber.updateMany({ where: { flowApiKey: key }, data: { flowApiKey: null, attachedAt: null } }),
    ])
  })
}

/** Move a flow to a new key; its numbers follow via ON UPDATE CASCADE. The old key stops working at once. */
export async function rekeyFlow(ownerId: string, from: string, to: string) {
  forget(ownerId)
  await withDb(() => db.flow.updateMany({ where: { apiKey: from, userId: ownerId }, data: { apiKey: to, updatedAt: new Date() } }))
}

// ------------------------------------------------------------------ sample data

// Deterministic so the demo data looks the same on every machine.
function rng(seedN: number) {
  let a = seedN >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SAMPLE_TURNS = [
  ['Hi, I wanted to book an appointment for tomorrow.', 'Sure — morning or evening works better for you?'],
  ['Evening, around six if possible.', 'Six fifteen is free with Dr. Rao. Shall I book it?'],
  ['Yes please.', 'Done. You’ll get an SMS confirmation shortly. Anything else?'],
  ['What are your opening hours on Sunday?', 'We’re open ten to two on Sundays.'],
  ['Can I change my booking?', 'Of course — which date would you like instead?'],
  ['No, that’s all, thanks.', 'Thanks for calling, have a good day!'],
]

export function mockSessions(n: number, seedN: number, days = 30): Session[] {
  const r = rng(seedN)
  const now = Date.now()
  const out: Session[] = []
  for (let i = 0; i < n; i++) {
    // Busier on recent days and during the day.
    const dayAgo = Math.floor(Math.pow(r(), 1.4) * days)
    const start = new Date(now - dayAgo * 864e5)
    start.setHours(9 + Math.floor(r() * 10), Math.floor(r() * 60), Math.floor(r() * 60))
    const dur = Math.round(25 + r() * r() * 360)
    const ai = Math.round(dur * (0.45 + r() * 0.2))
    const turns = 1 + Math.floor(r() * 4)
    const transcription: { role: string; content: string }[] = []
    for (let t = 0; t < turns; t++) {
      const [u, a] = SAMPLE_TURNS[(i + t) % SAMPLE_TURNS.length]
      transcription.push({ role: 'user', content: u }, { role: 'assistant', content: a })
    }
    const type = r() < 0.65 ? 'phone' : r() < 0.7 ? 'browser' : 'avatar'
    out.push({
      sessionId: randomUUID(),
      type,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + dur * 1000).toISOString(),
      totalConnectedTime: dur,
      totalAiTime: ai,
      totalHumanTime: dur - ai,
      aiTokens: Math.round(ai * 9),
      humanTokens: Math.round((dur - ai) * 6),
      transcription,
      from: type === 'phone' ? `+9198${String(Math.floor(r() * 1e8)).padStart(8, '0')}` : undefined,
      status: r() < 0.9 ? 'completed' : r() < 0.5 ? 'no-answer' : 'failed',
    })
  }
  return out.sort((a, b) => b.startTime.localeCompare(a.startTime))
}

const WEB_STEPS: [string, WebActionEvent['action']][] = [
  ['Let me open our doctors page for you.', { type: 'navigate', target: '/doctors' }],
  ['Dr. Rao is the cardiologist — here she is.', { type: 'highlight', target: '#dr-rao' }],
  ['I’ll open her available slots.', { type: 'click', target: 'Book appointment' }],
  ['Evening slots are further down.', { type: 'scroll', target: '#evening' }],
  ['I’ve filled in your name.', { type: 'fill', target: '#name' }],
  ['And confirming the booking now.', { type: 'click', target: 'Confirm' }],
]

/** Sample replay media per session type. Returns true if it changed anything. */
export function enrichSession(s: Session, i: number): boolean {
  let changed = false
  // Sample transcripts get a time per message, spread across the session.
  if (Array.isArray(s.transcription) && s.transcription.length && s.transcription.some((x: any) => typeof x?.at !== 'number')) {
    const n = s.transcription.length
    const span = Math.max(8, (s.totalConnectedTime || 30) - 4)
    s.transcription = s.transcription.map((x: any, k: number) => ({ ...x, at: Math.round(2 + (k * span) / n) }))
    changed = true
  }
  const seed = parseInt(s.sessionId.replace(/-/g, '').slice(0, 6), 16) || i
  if (s.type === 'phone' && !s.recordingUrl) { s.recordingUrl = `/api/sample-recording?seed=${seed % 1000}`; changed = true }
  if (s.type === 'avatar' && !s.avatarVideoUrl) {
    s.avatarVideoUrl = '/bg.mp4'
    if (seed % 3) s.clientVideoUrl = '/assets/aurora.mp4'
    changed = true
  }
  if (s.type === 'browser' && !s.webActions) {
    const n = 2 + (seed % 5)
    let at = 4
    s.webActions = WEB_STEPS.slice(0, n).map(([said, action], k) => {
      at += 5 + ((seed >> k) % 9)
      const roll = (seed >> (k + 3)) % 17
      const status: WebActionEvent['status'] = roll === 0 ? 'timeout' : roll === 1 ? 'error' : roll === 2 && k === n - 1 ? 'interrupted' : 'ok'
      return { at, said, action, status, ms: status === 'timeout' ? 15000 : 120 + ((seed >> k) % 600) }
    })
    changed = true
  }
  return changed
}

export function mockDeliveries(url: string, sessions: Session[]): Delivery[] {
  const r = rng(7)
  return sessions.slice(0, 25).flatMap((s) => {
    const ok = r() > 0.08
    const base = { url, request: { event: 'session.ended', session_id: s.sessionId }, ms: Math.round(80 + r() * 400) }
    const first: Delivery = { ...base, id: randomUUID(), at: s.endTime, event: 'session.ended', status: ok ? 200 : 502, attempt: 1, response: ok ? '{"ok":true}' : 'Bad Gateway' }
    return ok ? [first] : [first, { ...base, id: randomUUID(), at: new Date(Date.parse(s.endTime) + 30000).toISOString(), event: 'session.ended', status: 200, attempt: 2, response: '{"ok":true}' }]
  })
}

export function blankFlow(key: string, name: string, workflow = structuredClone(TEMPLATES[0].workflow)): FlowDoc {
  return {
    key,
    source: 'mock',
    mock: [],
    flow_name: name,
    created_at: new Date().toISOString(),
    workflow,
    'webhook-url': '',
    stt: { service: 'deepgram-streaming', model: 'nova-3', language: 'en-IN' },
    tts: { service: 'deepgram', model: 'aura-2-thalia-en' },
    kbs: [],
    faces: { version: null, expressions: [], transitions: [] },
    vision_id: null,
    running_vision_id: null,
    integrations: [],
    'web-actions': [],
    numbers: [],
    sessions: [],
    deliveries: [],
    'process-type': 'speech-native',
    'warmup-agent': true,
    'pre-fire': true,
    'pre-fire-config': { min: 50, max: 5000, current: 100 },
    inactivity: true,
    'inactivity-metadata': { 'time-period': 8, 'max-times': 3, 'inactivity-type': 'static', message: 'Are you still there?', 'interruption-type': 'full', 'interruption-metadata': {} },
    'grain-voice': false,
    'grain-level': 0.025,
  }
}

/** Everything the old demo account started with. Unused; kept for reference. */
export function demoStore(base: Account): Store {
  const sandbox = blankFlow(newKey('flow'), 'Sandbox', structuredClone(TEMPLATES[1].workflow))
  const clinic = blankFlow(newKey('flow'), 'Clinic front desk', structuredClone(TEMPLATES[2].workflow))
  clinic.sessions = mockSessions(180, 42)
  clinic['webhook-url'] = 'https://example.com/voxio/webhook'
  clinic['webhook-secret'] = newKey('whsec')
  clinic.deliveries = mockDeliveries(clinic['webhook-url'], clinic.sessions)
  const days = (n: number) => new Date(Date.now() - n * 864e5).toISOString()
  clinic.numbers = [{ phone_number: '+918045678901', provider: 'plivo', added_at: days(20) }]
  clinic.kbs = ['kb_clinic']
  sandbox.sessions = mockSessions(24, 9, 10)
  for (const f of [sandbox, clinic]) f.sessions.forEach(enrichSession)

  return {
    account: {
      ...base,
      numbers: ['+918045678901', '+918045678902', '+918045678903'].map((phone_number) => ({ phone_number, added_at: days(30) })),
      voices: [
        { id: 'v_simran', name: 'Simran (Hinglish)', kind: 'tts', config: { service: 'sarvam', speaker: 'simran', language: 'en-IN' }, used_by: [] },
        { id: 'v_aura', name: 'Thalia (US English)', kind: 'tts', config: { service: 'deepgram', model: 'aura-2-thalia-en' }, used_by: [] },
        { id: 's_nova', name: 'Nova-3 Indian English', kind: 'stt', config: { service: 'deepgram-streaming', model: 'nova-3', language: 'en-IN' }, used_by: [] },
        { id: 's_soniox', name: 'Soniox Hindi + English', kind: 'stt', config: { service: 'soniox', language: ['hi', 'en'], 'enable-speaker-diarization': true }, used_by: [] },
      ],
      knowledge: [
        { id: 'kb_clinic', name: 'Clinic FAQ', sources: [
          { kind: 'pdf', label: 'clinic-handbook.pdf', status: 'ready', chunks: 214, added_at: days(12) },
          { kind: 'web', label: 'https://example-clinic.in (whole site)', status: 'ready', chunks: 96, added_at: days(9) },
        ] },
      ],
      avatars: [
        { uuid: '7d3c132a-f43f-4d7c-b2b0-03d8fc9ab91f', label: 'main', detector: 's3fd', frames: 250, fps: 25, created_at: days(30), preview: '/bg.mp4' },
        { uuid: 'fd2741f8-652a-48cd-b4dd-6881d4dd7638', label: 'listening', detector: 's3fd', frames: 175, fps: 25, created_at: days(30), preview: '/assets/aurora.mp4' },
      ],
      integrations: [],
    },
    flows: { [sandbox.key]: sandbox, [clinic.key]: clinic },
    overlays: {},
  }
}

// ------------------------------------------------------------------ one flow

// Pages that show one flow read and write only that flow, not the whole
// account. The rules are the voice backend's (database/routers/services.py):
// a flow is reachable by its owner, or by an admin; nobody else.

const roles = new Map<string, { at: number; admin: boolean }>()

/** Remember a role read elsewhere (at login), so the first page doesn't look it up again. */
export function primeRole(userId: string, role: string) {
  roles.set(userId, { at: Date.now(), admin: role === 'admin' })
}

/** Admins may act on any flow, as in the database service's `require_owner`. */
export async function isAdmin(user: AuthUser): Promise<boolean> {
  const hit = roles.get(user.id)
  if (hit && Date.now() - hit.at < 60_000) return hit.admin
  const row = await withDb(() => db.user.findUnique({ where: { id: user.id }, select: { role: true } }))
  const admin = row?.role === 'admin'
  roles.set(user.id, { at: Date.now(), admin })
  return admin
}

export type FlowAccess = { flowId: string; ownerId: string; own: boolean; deleted: boolean }

/** Who may reach this flow key: its owner or an admin. Null for anyone else, or no such flow. */
export async function flowAccess(user: AuthUser, key: string): Promise<FlowAccess | null> {
  const row = await withDb(() => db.flow.findUnique({ where: { apiKey: key }, select: { id: true, userId: true, runtime: true } }))
  if (!row) return null
  const own = row.userId === user.id
  if (!own && !(await isAdmin(user))) return null
  return { flowId: row.id, ownerId: row.userId, own, deleted: !!(row.runtime as { deleted_at?: string } | null)?.deleted_at }
}

/** One flow as the dashboard sees it, or null when this user may not see it. */
export async function loadFlow(user: AuthUser, key: string): Promise<{ doc: FlowDoc; access: FlowAccess } | null> {
  // One query, then the owner check on the row: nothing is returned to anyone else.
  const row = await withDb(() => db.flow.findUnique({ where: { apiKey: key }, include: flowInclude, relationLoadStrategy: 'join' }))
  if (!row) return null
  const own = row.userId === user.id
  if (!own && !(await isAdmin(user))) return null
  const deleted = !!(row.runtime as { deleted_at?: string } | null)?.deleted_at
  if (deleted) return null
  return { doc: flowDocOf(row), access: { flowId: row.id, ownerId: row.userId, own, deleted } }
}

/** The database service refuses a workflow without a start_node that is one of its nodes; so do we. */
export function requireStartNode(wf: FlowDoc['workflow']) {
  const nodes = wf?.nodes
  if (!nodes || typeof nodes !== 'object') throw new Error('The workflow has no steps map.')
  // An empty workflow is a draft (the Blank template): nothing to run yet, so nothing to check.
  if (!Object.keys(nodes).length) return
  const start = withStart(wf).start_node
  if (!start) throw new Error('The workflow has no first step.')
  if (!(String(start) in nodes)) throw new Error(`The workflow's first step "${start}" isn't one of its steps.`)
}

/**
 * Run `fn` on one flow and write what it changed, as its owner. Reads and
 * writes just that flow, so a save costs the same on any size of account.
 * The owner's cached account copy is dropped, so other pages reload it.
 */
export async function mutateFlow<T>(user: AuthUser, key: string, fn: (f: FlowDoc) => T): Promise<T> {
  const loaded = await loadFlow(user, key)
  if (!loaded) throw new Error('Flow not found.')
  const { doc: before, access } = loaded
  const after = structuredClone(before)
  const out = fn(after)
  if (!same(after.workflow, before.workflow)) requireStartNode(after.workflow)
  const ops = flowOps(access.ownerId, key, before, after)
  if (ops.length) await withDb(() => db.$transaction(ops))
  forget(access.ownerId)
  return out
}

/** Create one flow for `ownerId`, without loading the rest of the account. */
export async function createFlowRow(ownerId: string, f: FlowDoc) {
  requireStartNode(f.workflow)
  await withDb(() => db.$transaction(flowOps(ownerId, f.key, undefined, f)))
  forget(ownerId)
}
