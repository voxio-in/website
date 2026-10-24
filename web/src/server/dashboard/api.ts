// Every dashboard read and write, straight to Neon through Prisma
// (store.server.ts). A flow is the user's own ("mock" in the UI's words) or,
// for an admin, someone else's ("live"); both are rows in the same tables.
// Values travel as JSON strings so server-function serialisation never has to
// reason about the open-ended document shape.

import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { randomUUID } from 'node:crypto'

import { db, withDb } from '#/server/db'
import { playableUrl } from '#/server/r2.server'
import { AVATAR_VOICEBOT, SERVERS } from '#/server/voice/servers'
import { currentUser } from '#/server/session.server'
import { billedMinutes } from '#/lib/dashboard/client'
import type { Account, Delivery, FlowDoc, FlowSummary, Result, Session, TestCall, TestSetup, TestTurn } from '#/lib/dashboard/types'
import { TEMPLATES } from '#/lib/workflow/templates'
import { extractWorkflow, withStart } from '#/lib/workflow/convert'
import { TTS_PROVIDERS, tidyTts } from '#/lib/dashboard/providers'
import { faceIdsOf } from '#/lib/dashboard/faces'
import { blankFlow, createFlowRow, flowAccess, flowKey, isAdmin, load, loadFlow, markFlowDeleted, mutate, mutateFlow, newKey, rekeyFlow } from './store.server'
import { accountKey, sessionRecordOf } from './flows.server'
import { cancelTestCall as sdkCancelCall, getSessionRecord, getTestCall, placeTestCall, sdkErrorText, sdkServerReady } from './test.server'
import type { AuthUser } from '#/server/session.server'

const USER_API_KEY = process.env.VOXIO_USER_API_KEY
const FROM_NUMBER = process.env.VOXIO_FROM_NUMBER

const urlOf = (h: string) => (!h ? null : /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(h) ? `http://${h}` : `https://${h}`)
const CALLBOT = () => urlOf(SERVERS.callbot)

const wire = <T,>(r: Result<T>) => JSON.stringify(r)
const fail = (reason: string) => wire({ ok: false, reason })
const errMsg = (e: unknown) => (e as Error)?.message ?? String(e)

// ---------------------------------------------------------------- access

// Every flow is a row in Neon, read and written here through Prisma; the voice
// backend is used only to run voice (tests and calls). Who may reach a flow
// follows the database service: its owner, or an admin (`flowAccess`).
// Admins also see the flows named in VOXIO_FLOW_API_KEY_* / VX_FLOW_API_KEY in
// their lists, next to their own.

function pinnedKeys(): { key: string; env: string }[] {
  const seen = new Set<string>()
  const out: { key: string; env: string }[] = []
  for (const [env, key] of Object.entries(process.env)) {
    // VX_FLOW_API_KEY is the /avatar demos' flow; the voice server records those sessions.
    if ((env.startsWith('VOXIO_FLOW_API_KEY') || env === 'VX_FLOW_API_KEY') && key && !seen.has(key)) {
      seen.add(key)
      out.push({ key, env })
    }
  }
  return out
}

/** Keys of other people's flows this user's lists include: the pinned ones, for admins only. */
async function extraKeys(me: AuthUser): Promise<string[]> {
  return (await isAdmin(me)) ? pinnedKeys().map((p) => p.key) : []
}

/** Recordings sit in a private bucket: sign them on the way out, never in the table. */
function signed(s: Session): Session {
  const camera = (s as { cameraRecordingUrl?: unknown }).cameraRecordingUrl
  return { ...s, recordingUrl: playableUrl(s.recordingUrl), clientVideoUrl: playableUrl(typeof camera === 'string' ? camera : undefined) } as Session
}

/** A flow this user may see (own, or any for an admin), as the dashboard shows it. */
async function getFlowDoc(me: AuthUser, key: string): Promise<FlowDoc> {
  const loaded = await loadFlow(me, key)
  if (!loaded) throw new Error('Flow not found')
  const { doc, access } = loaded
  // An admin on someone else's flow sees whose it is, as on the Flows list.
  const owner = access.own ? undefined : (await withDb(() => db.user.findUnique({ where: { id: access.ownerId }, select: { name: true } })))?.name
  return { ...doc, source: access.own ? 'mock' : 'live', mock: access.own ? ['*'] : [], sessions: doc.sessions.map(signed), ...(owner ? { owner } : {}) }
}

// ---------------------------------------------------------------- flows

export const listFlows = createServerFn({ method: 'GET' }).handler(async (): Promise<string> => {
  const me = await currentUser()
  if (!me) return fail('Please log in again.')
  // Only what the table shows: no workflows, transcripts or deliveries.
  const extra = await extraKeys(me)
  const [rows, user] = await Promise.all([
    withDb(() => db.flow.findMany({
      where: { OR: [{ userId: me.id }, ...(extra.length ? [{ apiKey: { in: extra } }] : [])] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, apiKey: true, flowName: true, createdAt: true, userId: true, runtime: true, faces: true,
        user: { select: { name: true } },
        agent: { select: { webhookUrl: true } },
        numbers: { select: { phoneNumber: true }, orderBy: { phoneNumber: 'asc' } },
        sessions: { select: { totalConnectedTime: true } },
      },
    })),
    withDb(() => db.user.findUnique({ where: { id: me.id }, select: { integrations: true } })),
  ])
  // Real sessions and tests counted apart, and the last real one, in one pass over the sessions table.
  const ids = rows.map((f) => f.id)
  const counts = ids.length ? await withDb(() => db.$queryRaw<{ flow_id: string; real: number; tests: number; last_real: Date | null }[]>`
    SELECT flow_id,
      count(*) FILTER (WHERE coalesce(extra->>'test', 'false') <> 'true')::int AS real,
      count(*) FILTER (WHERE extra->>'test' = 'true')::int AS tests,
      max("startTime") FILTER (WHERE coalesce(extra->>'test', 'false') <> 'true') AS last_real
    FROM sessions WHERE flow_id = ANY(${ids}) GROUP BY flow_id`) : []
  const byFlow = new Map(counts.map((c) => [c.flow_id, c]))
  const shops = new Map(((user?.integrations ?? []) as Account['integrations']).map((x) => [x.id, x.name]))
  const flows: FlowSummary[] = []
  for (const f of rows) {
    const runtime = (f.runtime ?? {}) as { deleted_at?: string; integrations?: string[]; 'web-actions'?: unknown[] }
    if (runtime.deleted_at) continue
    const c = byFlow.get(f.id)
    const own = f.userId === me.id
    const faces = (f.faces ?? {}) as { expressions?: unknown[] }
    flows.push({
      key: f.apiKey,
      name: f.flowName,
      createdAt: f.createdAt.toISOString(),
      source: own ? 'mock' : 'live',
      sessions: c?.real ?? 0,
      tests: c?.tests ?? 0,
      lastAt: c?.last_real ? new Date(c.last_real).toISOString() : undefined,
      minutes: f.sessions.reduce((a, x) => a + billedMinutes(x.totalConnectedTime), 0),
      kind: faces.expressions?.length ? 'avatar' : f.numbers.length ? 'phone' : 'voice',
      owner: own ? undefined : f.user.name,
      connections: [
        ...f.numbers.map((n) => ({ kind: 'number' as const, label: n.phoneNumber })),
        ...(runtime.integrations ?? []).map((id) => ({ kind: 'integration' as const, label: shops.get(id) ?? id })),
        ...(f.agent.webhookUrl ? [{ kind: 'webhook' as const, label: 'Webhook' }] : []),
        ...(runtime['web-actions']?.length ? [{ kind: 'web' as const, label: 'Website' }] : []),
      ],
    })
  }
  return wire({ ok: true, data: flows })
})

export const getFlow = createServerFn({ method: 'GET' })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    try { return wire({ ok: true, data: await getFlowDoc(me, data.key) }) } catch (e) { return fail(`Couldn’t load this flow: ${errMsg(e)}`) }
  })

/** Patch a flow. `patch` is JSON of a Partial<FlowDoc>. */
export const patchFlow = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; patch: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    return wire(await applyFlowPatch(me, data.key, JSON.parse(data.patch) as Record<string, unknown>))
  })

/**
 * A flow as the dashboard sees it; for server code outside this file (the Assistant).
 * Server-only: this file is imported by pages, and the build strips these from the browser bundle.
 */
export const readFlowDoc = createServerOnlyFn((me: AuthUser, key: string) => getFlowDoc(me, key))

/**
 * Saves part of a flow the way the dashboard's own Save does, for its owner or
 * an admin. Used by patchFlow and by the Assistant when a change is applied.
 */
export const applyFlowPatch = createServerOnlyFn(async (me: AuthUser, key: string, input: Record<string, unknown>): Promise<Result<FlowDoc>> => {
  const patch = { ...input }
  // Server-owned keys, as the database service's PROTECTED_FLOW_KEYS.
  for (const k of ['key', 'source', 'mock', 'sessions', 'numbers', 'deliveries', 'created_at', 'id', 'api_key', 'user_id', 'owner']) delete patch[k]
  if (patch.tts) patch.tts = tidyTts(patch.tts as FlowDoc['tts'])
  try {
    await mutateFlow(me, key, (f) => { Object.assign(f, patch) })
    return { ok: true, data: await getFlowDoc(me, key) }
  } catch (e) { return { ok: false, reason: errMsg(e) === 'Flow not found.' ? 'Flow not found.' : `Save failed: ${errMsg(e)}` } }
})

export const createFlow = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; template: string; workflow?: string; tts?: { service: string; [k: string]: unknown } }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const tpl = TEMPLATES.find((t) => t.id === data.template) ?? TEMPLATES[0]
    // A voice from an import file: only a provider the dashboard knows, only plain values.
    const tts = data.tts && TTS_PROVIDERS.some((p) => p.service === data.tts!.service)
      ? Object.fromEntries(Object.entries(data.tts).filter(([, v]) => typeof v === 'string' && v.length <= 200)) as FlowDoc['tts']
      : null
    // An imported workflow (JSON) wins over the template.
    const imported = data.workflow ? extractWorkflow(JSON.parse(data.workflow)) : null
    if (data.workflow && !imported) return fail('The imported JSON has no workflow in it.')
    const draft = blankFlow('pending', data.name.trim() || 'Untitled flow', withStart(imported ?? structuredClone(tpl.workflow)))
    if (tts) draft.tts = tts
    // Written straight to Neon; the voice servers read the same tables, so it can take calls at once.
    const flow: FlowDoc = { ...draft, key: flowKey() }
    try { await createFlowRow(me.id, flow) } catch (e) { return fail(`Couldn’t create the flow: ${errMsg(e)}`) }
    return wire({ ok: true, data: flow.key, note: undefined })
  })

/**
 * Deletes a flow from the dashboard but keeps its history: the key stops
 * working at once (it is replaced, as the database service's key rotation
 * does), the flow is stamped deleted and its numbers are freed. Its sessions
 * and webhook logs stay, shown as "Flow deleted". Owner or admin only.
 */
export const deleteFlow = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const access = await flowAccess(me, data.key)
    if (!access || access.deleted) return fail('Flow not found.')
    const dead = flowKey()
    try {
      await rekeyFlow(access.ownerId, data.key, dead)
      await markFlowDeleted(access.ownerId, dead)
    } catch (e) {
      return fail(`The flow couldn’t be deleted: ${errMsg(e)}`)
    }
    return wire({ ok: true, data: null })
  })

/** A new key for a flow its owner (or an admin) may change; numbers follow, the old key dies at once. */
export const rotateFlowKey = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const access = await flowAccess(me, data.key)
    if (!access || access.deleted) return fail('Flow not found.')
    const next = flowKey()
    try {
      await rekeyFlow(access.ownerId, data.key, next)
      await mutateFlow(me, next, (f) => { f.key_rotated_at = new Date().toISOString() })
    } catch (e) { return fail(`The key couldn’t be changed: ${errMsg(e)}`) }
    return wire({ ok: true, data: next })
  })

// ---------------------------------------------------------------- webhooks

/** Really POSTs to the flow's webhook URL from this server, and logs the delivery. */
export const sendTestWebhook = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; event: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const flow = await getFlowDoc(me, data.key).catch(() => null)
    if (!flow) return fail('Flow not found.')
    const url = flow['webhook-url']
    if (!url) return fail('Set a webhook URL first.')
    const request = {
      status: data.event === 'session.started' ? 'started' : 'finished',
      event: data.event,
      test: true,
      session_id: randomUUID(),
      flow: flow.flow_name,
      'session-data': { state: { conversation_history: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello! This is a test event.' }] } },
    }
    const t0 = Date.now()
    let status: number | null = null
    let response = ''
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-voxio-event': data.event }, body: JSON.stringify(request), signal: AbortSignal.timeout(10000) })
      status = res.status
      response = (await res.text()).slice(0, 2000)
    } catch (e) { response = errMsg(e) }
    const d: Delivery = { id: randomUUID(), at: new Date().toISOString(), event: data.event, url, status, ms: Date.now() - t0, attempt: 1, request, response }
    await addDelivery(me, data.key, d)
    return wire({ ok: true, data: d })
  })

async function addDelivery(me: AuthUser, key: string, d: Delivery) {
  await mutateFlow(me, key, (f) => { f.deliveries = [d, ...(f.deliveries ?? [])].slice(0, 200) })
}

export const redeliver = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; id: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const flow = await getFlowDoc(me, data.key).catch(() => null)
    const old = flow?.deliveries.find((x) => x.id === data.id)
    if (!flow || !old) return fail('Delivery not found.')
    const t0 = Date.now()
    let status: number | null = null
    let response = ''
    try {
      const res = await fetch(old.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(old.request), signal: AbortSignal.timeout(10000) })
      status = res.status
      response = (await res.text()).slice(0, 2000)
    } catch (e) { response = errMsg(e) }
    const d: Delivery = { ...old, id: randomUUID(), at: new Date().toISOString(), status, ms: Date.now() - t0, attempt: old.attempt + 1, response }
    await addDelivery(me, data.key, d)
    return wire({ ok: true, data: d })
  })

// ---------------------------------------------------------------- calls

export const placeCall = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; to: string; from?: string; customs?: string; when?: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const customs = JSON.parse(data.customs || '{}')
    const to = data.to.replace(/[^\d+]/g, '')
    if (!/^\+?\d{8,15}$/.test(to)) return fail('Enter the number with its country code, e.g. +91…')
    const from = data.from || FROM_NUMBER || ''
    const callbot = CALLBOT()
    const access = await flowAccess(me, data.key)
    if (!access || access.deleted) return fail('Flow not found.')

    // Every flow is in the voice servers' tables, so callbot can dial any of them.
    const userKey = await accountKey(me).catch(() => '')
    if (callbot && userKey && from) {
      try {
        const path = data.when ? '/plivo/outbound/schedule' : '/plivo/outbound'
        const body: Record<string, unknown> = { 'from-number': from, 'to-number': to, customs }
        if (data.when) body.datetimezone = data.when
        const res = await fetch(`${callbot}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', user_api_key: userKey, flow_api_key: data.key },
          body: JSON.stringify(body),
        })
        const text = await res.text()
        if (!res.ok) return fail(`Callbot returned ${res.status}: ${text.slice(0, 200)}`)
        return wire({ ok: true, data: text, note: data.when ? `Scheduled for ${data.when}.` : `Dialling ${to}…` })
      } catch (e) { return fail(`Couldn’t reach callbot: ${errMsg(e)}`) }
    }

    // Mock: record a session as if the call happened.
    const now = new Date()
    const s: Session = {
      sessionId: randomUUID(), type: 'phone', startTime: now.toISOString(), endTime: new Date(now.getTime() + 42000).toISOString(),
      totalConnectedTime: 42, totalAiTime: 24, totalHumanTime: 18, aiTokens: 210, humanTokens: 96, from, to,
      status: data.when ? `scheduled ${data.when}` : 'completed',
      transcription: [{ role: 'assistant', content: '(not dialled)' }],
    }
    await mutateFlow(me, data.key, (f) => { f.sessions = [s, ...f.sessions] })
    const why = !callbot ? 'VX_CALLBOT is not set' : !from ? 'No from-number (VOXIO_FROM_NUMBER)' : 'Your account has no API key'
    return wire({ ok: true, data: s.sessionId, note: `Not dialled. ${why}.` })
  })

// ---------------------------------------------------------------- avatars

export type FaceLibrary = { avatars: Account['avatars']; admin: boolean }

/**
 * The Avatars page: faces with the flows that use them. Mine: the user's own faces and
 * flows. Everyone's (admins only, as the Flows list): also the faces the pinned flows use.
 */
export const getFaceLibrary = createServerFn({ method: 'GET' })
  .inputValidator((d: { scope?: 'mine' | 'all' }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const extra = data.scope === 'all' ? await extraKeys(me) : []
    const admin = await isAdmin(me)
    const flows = await withDb(() => db.flow.findMany({
      where: { OR: [{ userId: me.id }, ...(extra.length ? [{ apiKey: { in: extra } }] : [])] },
      select: { apiKey: true, flowName: true, faces: true, runtime: true },
    }))
    const usedBy = new Map<string, { key: string; name: string }[]>()
    for (const f of flows) {
      if ((f.runtime as { deleted_at?: string } | null)?.deleted_at) continue
      for (const uuid of new Set(faceIdsOf(f.faces))) usedBy.set(uuid, [...(usedBy.get(uuid) ?? []), { key: f.apiKey, name: f.flowName }])
    }
    const others = extra.length ? [...usedBy.keys()] : []
    const rows = await withDb(() => db.face.findMany({
      where: { OR: [{ userId: me.id }, ...(others.length ? [{ uuid: { in: others } }] : [])] },
      orderBy: { createdAt: 'desc' },
      select: { uuid: true, label: true, detector: true, clip: true, media: true, createdAt: true, userId: true, user: { select: { name: true } } },
    }))
    const avatars: Account['avatars'] = rows.map((f) => {
      const clip = f.clip as { frames?: number; fps?: number }
      const media = f.media as { preview?: string; preview_type?: 'image' | 'video' }
      return {
        uuid: f.uuid, label: f.label, detector: f.detector as 'dwpose' | 's3fd', frames: clip.frames ?? 0, fps: clip.fps ?? 25,
        created_at: f.createdAt.toISOString(), preview: playableUrl(media.preview), previewType: media.preview_type,
        usedBy: usedBy.get(f.uuid) ?? [], ...(f.userId === me.id ? {} : { owner: f.user.name }),
      }
    })
    return wire({ ok: true, data: { avatars, admin } satisfies FaceLibrary })
  })

// ---------------------------------------------------------------- account

/** Just the account's faces: one small query, for pages that only need those. */
export const getAvatars = createServerFn({ method: 'GET' }).handler(async (): Promise<string> => {
  const me = await currentUser()
  if (!me) return fail('Please log in again.')
  const rows = await withDb(() => db.face.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'asc' }, select: { uuid: true, label: true, detector: true, clip: true, media: true, createdAt: true } }))
  const avatars: Account['avatars'] = rows.map((f) => {
    const clip = f.clip as { frames?: number; fps?: number }
    const media = f.media as { preview?: string; preview_type?: 'image' | 'video' }
    return { uuid: f.uuid, label: f.label, detector: f.detector as 'dwpose' | 's3fd', frames: clip.frames ?? 0, fps: clip.fps ?? 25, created_at: f.createdAt.toISOString(), preview: playableUrl(media.preview), previewType: media.preview_type }
  })
  return wire({ ok: true, data: avatars })
})

export const getAccount = createServerFn({ method: 'GET' }).handler(async (): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
  const s = (await load(me))
  const acct = structuredClone(s.account)
  // `used_by` is derived, so it can never drift from the flows.
  const allFlows = Object.values(s.flows).map((f) => ({ key: f.key, stt_ref: f.stt_ref, tts_ref: f.tts_ref }))
  for (const [key, o] of Object.entries(s.overlays)) allFlows.push({ key, stt_ref: o.stt_ref as string, tts_ref: o.tts_ref as string })
  for (const v of acct.voices) v.used_by = allFlows.filter((f) => f.stt_ref === v.id || f.tts_ref === v.id).map((f) => f.key)
  return wire({ ok: true, data: { ...acct, liveUserKey: !!USER_API_KEY } })
})

type AccountOp =
  | { op: 'voice.save'; voice: Account['voices'][number] }
  | { op: 'voice.delete'; id: string }
  | { op: 'kb.create'; name: string }
  | { op: 'kb.addSource'; id: string; kind: string; label: string }
  | { op: 'kb.delete'; id: string }
  | { op: 'kb.removeSource'; id: string; index: number }
  | { op: 'avatar.add'; label: string; detector: 's3fd' | 'dwpose' }
  | { op: 'avatar.delete'; uuid: string }
  | { op: 'integration.connect'; shop: string }
  | { op: 'integration.disconnect'; id: string }
  | { op: 'key.rotate' }

export const accountOp = createServerFn({ method: 'POST' })
  .inputValidator((d: { op: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const a = JSON.parse(data.op) as AccountOp
    const now = new Date().toISOString()
    try {
      await mutate(me, (s) => {
        const acct = s.account
        switch (a.op) {
          case 'voice.save': {
            const i = acct.voices.findIndex((v) => v.id === a.voice.id)
            const v = { ...a.voice, id: a.voice.id || `${a.voice.kind === 'stt' ? 's' : 'v'}_${randomUUID().slice(0, 8)}` }
            if (i >= 0) acct.voices[i] = v
            else acct.voices.push(v)
            // Shared by reference: every flow pointing here gets the new config.
            const apply = (f: Record<string, any>) => {
              if (f.stt_ref === v.id) f.stt = v.config
              if (f.tts_ref === v.id) f.tts = v.config
            }
            Object.values(s.flows).forEach(apply)
            Object.values(s.overlays).forEach(apply)
            break
          }
          case 'voice.delete': {
            const used = [...Object.values(s.flows), ...Object.values(s.overlays)].some((f: any) => f.stt_ref === a.id || f.tts_ref === a.id)
            if (used) throw new Error('This voice is used by a flow. Switch those flows first.')
            acct.voices = acct.voices.filter((v) => v.id !== a.id)
            break
          }
          case 'kb.create':
            acct.knowledge.push({ id: `kb_${randomUUID().slice(0, 8)}`, name: a.name || 'Untitled', sources: [] })
            break
          case 'kb.addSource': {
            const kb = acct.knowledge.find((k) => k.id === a.id)
            if (!kb) throw new Error('Knowledge base not found.')
            kb.sources.push({ kind: a.kind, label: a.label, status: 'ready', chunks: 20 + Math.floor(Math.random() * 180), added_at: now })
            break
          }
          case 'kb.removeSource': {
            const kb = acct.knowledge.find((k) => k.id === a.id)
            if (kb) kb.sources.splice(a.index, 1)
            break
          }
          case 'kb.delete':
            acct.knowledge = acct.knowledge.filter((k) => k.id !== a.id)
            break
          case 'avatar.add':
            acct.avatars.push({ uuid: randomUUID(), label: a.label || 'main', detector: a.detector, frames: 250, fps: 25, created_at: now })
            break
          case 'avatar.delete':
            acct.avatars = acct.avatars.filter((x) => x.uuid !== a.uuid)
            break
          case 'integration.connect':
            acct.integrations.push({ id: `shop_${randomUUID().slice(0, 8)}`, kind: 'shopify', name: a.shop.replace(/^https?:\/\//, ''), status: 'connected', connected_at: now })
            break
          case 'integration.disconnect':
            acct.integrations = acct.integrations.filter((x) => x.id !== a.id)
            break
          case 'key.rotate':
            acct.apiKey = newKey('user')
            acct.apiKeyRotatedAt = now
            break
        }
      })
    } catch (e) { return fail(errMsg(e)) }
    return wire({ ok: true, data: null })
  })

// ---------------------------------------------------------------- overview

export type OverviewFlow = { key: string; name: string; source: 'live' | 'mock'; sessions: Session[]; deleted?: boolean }

/** Every flow with its sessions, for account-wide usage. Transcripts come as one short string, for search. */
export const getOverview = createServerFn({ method: 'GET' }).handler(async (): Promise<string> => {
  const me = await currentUser()
  if (!me) return fail('Please log in again.')
  const extra = await extraKeys(me)
  // Flows and their sessions only: no workflows, voices or deliveries.
  const rows = await withDb(() => db.flow.findMany({
    where: { OR: [{ userId: me.id }, ...(extra.length ? [{ apiKey: { in: extra } }] : [])] },
    // Only what Home shows and searches: not the recordings, wire logs or actions a session also keeps.
    select: {
      apiKey: true, flowName: true, userId: true, runtime: true,
      sessions: { orderBy: { startTime: 'desc' }, select: { sessionId: true, type: true, startTime: true, endTime: true, totalConnectedTime: true, status: true, from: true, to: true, transcription: true } },
    },
  }))
  const text = (t: unknown) => (typeof t === 'string' ? t : Array.isArray(t) ? t.map((x) => (x as { content?: string })?.content ?? '').join(' ') : '').slice(0, 1500)
  const slim = (ss: (typeof rows)[number]['sessions']): Session[] => ss.map((x) => ({
    sessionId: x.sessionId, type: x.type, startTime: x.startTime.toISOString(), endTime: x.endTime.toISOString(),
    totalConnectedTime: x.totalConnectedTime, totalAiTime: 0, totalHumanTime: 0, aiTokens: 0, humanTokens: 0,
    status: x.status ?? undefined, from: x.from ?? undefined, to: x.to ?? undefined, transcription: text(x.transcription),
  }) as Session)
  // Deleted flows' sessions still count, labelled as such.
  const flows: OverviewFlow[] = rows.map((f) => ({
    key: f.apiKey, name: f.flowName, source: f.userId === me.id ? 'mock' : 'live',
    sessions: slim(f.sessions),
    ...((f.runtime as { deleted_at?: string } | null)?.deleted_at ? { deleted: true } : {}),
  }))
  return wire({ ok: true, data: flows })
})

// ---------------------------------------------------------------- numbers

/**
 * Attach one of the account's numbers to a flow (taking it off any other flow),
 * or detach it. Numbers are provisioned by Voxio, never added here.
 */
export const setFlowNumber = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; number: string; attach: boolean }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const store = (await load(me))
    if (data.attach && !(store.account.numbers ?? []).some((n) => n.phone_number === data.number)) return fail('That number isn’t on your account.')
    // The number and the flow must both be this account's, as the database service's POST /number requires.
    if (data.attach && !store.flows[data.key]) return fail('Flow not found.')
    await mutate(me, (s) => {
      const strip = (list?: { phone_number: string }[]) => (list ?? []).filter((n) => n.phone_number !== data.number)
      for (const f of Object.values(s.flows)) f.numbers = strip(f.numbers)
      for (const o of Object.values(s.overlays)) if (o.numbers) o.numbers = strip(o.numbers as { phone_number: string }[])
      if (data.attach) {
        const target = s.flows[data.key] ?? (s.overlays[data.key] ??= {})
        const entry = { phone_number: data.number, added_at: new Date().toISOString() }
        target.numbers = [...((target.numbers as { phone_number: string }[] | undefined) ?? []), entry]
      }
    })
    return wire({ ok: true, data: null })
  })

/** Which flow each of the account's numbers is on. */
export const getNumbers = createServerFn({ method: 'GET' }).handler(async (): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
  const store = (await load(me))
  const owner = new Map<string, { key: string; name: string }>()
  for (const f of Object.values(store.flows)) for (const n of f.numbers) owner.set(n.phone_number, { key: f.key, name: f.flow_name })
  for (const [key, o] of Object.entries(store.overlays)) for (const n of (o.numbers as { phone_number: string }[] | undefined) ?? []) owner.set(n.phone_number, { key, name: key })
  return wire({ ok: true, data: (store.account.numbers ?? []).map((n) => ({ ...n, flow: owner.get(n.phone_number) ?? null })) })
})

// ---------------------------------------------------------------- duplicate

/**
 * Copy a flow: its workflow, voice, behaviour and avatar settings. Sessions,
 * numbers and deliveries belong to the original and aren't copied. The copy
 * gets a new key and belongs to the user who made it.
 */
export const duplicateFlow = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    let src: FlowDoc
    try { src = await getFlowDoc(me, data.key) } catch (e) { return fail(`Couldn’t copy this flow: ${errMsg(e)}`) }
    const copy = structuredClone(src) as FlowDoc
    copy.flow_name = `${src.flow_name} (copy)`
    copy.key = flowKey()
    copy.source = 'mock'
    copy.mock = []
    copy.created_at = new Date().toISOString()
    copy.sessions = []
    copy.numbers = []
    copy.deliveries = []
    delete (copy as Record<string, unknown>).key_rotated_at
    // The copy is the user's own, whoever owned the original.
    try { await createFlowRow(me.id, copy) } catch (e) { return fail(`Couldn’t copy this flow: ${errMsg(e)}`) }
    return wire({ ok: true, data: copy.key })
  })

// ---------------------------------------------------------------- test

// Everything the Test tab does goes through the Voxio SDK (test.server.ts on
// this side, @voxio/client in the browser). Only flows the voice servers can
// run are testable: live ones, imported ones, and ones created or duplicated
// here (flows.server.ts creates those on the backend).

const NOT_ON_SERVERS = 'This flow isn’t on the voice servers yet, so it can’t take calls. It will be once your account is connected.'

/** Customs arrive from the browser as JSON; only an object is accepted. */
function parseCustoms(raw?: string): Record<string, unknown> | undefined {
  if (!raw) return undefined
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length ? v : undefined
  } catch { return undefined }
}

async function canSee(me: AuthUser, key: string) {
  const access = await flowAccess(me, key)
  return !!access && !access.deleted
}

/**
 * Whether the voice servers can run this flow for this user. They read the
 * same Neon tables, so every flow the user may reach can run. `imported` marks
 * flows copied from the backend's Mongo by scripts/migrate-mongo.mjs (their id
 * is the Mongo _id, 24 hex).
 */
async function onVoiceServers(me: AuthUser, key: string): Promise<{ ok: boolean; imported: boolean }> {
  const access = await flowAccess(me, key)
  if (!access || access.deleted) return { ok: false, imported: false }
  return { ok: true, imported: /^[0-9a-f]{24}$/.test(access.flowId) }
}

export const getTestSetup = createServerFn({ method: 'GET' })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    if (!(await canSee(me, data.key))) return fail('Flow not found.')
    const { ok: testable, imported } = await onVoiceServers(me, data.key)
    const baseUrl = urlOf(SERVERS.voicebot) ?? ''
    // The tester's account key goes with the flow key (as user_api_key). It is
    // their own, on their own dashboard: Developers shows it anyway.
    const account = testable
      ? await withDb(() => db.user.findUnique({ where: { id: me.id }, select: { apiKey: true } }))
      : null
    const setup: TestSetup = {
      testable: testable && !!baseUrl,
      reason: !testable ? NOT_ON_SERVERS : !baseUrl ? 'No voice server is configured (VX_VOICEBOT).' : undefined,
      phone: testable && sdkServerReady(),
      baseUrl,
      chatUrl: urlOf(SERVERS.chat) ?? '',
      // Tests authenticate with the flow's own key. It is the owner's, on their
      // own dashboard, and the Overview shows it anyway.
      flowKey: testable ? data.key : undefined,
      userKey: account?.apiKey,
      avatarUrl: `https://${AVATAR_VOICEBOT}`,
      imported,
    }
    return wire({ ok: true, data: setup })
  })

export const startTestCall = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; from: string; to: string; customs?: string; idempotencyKey: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    if (!(await onVoiceServers(me, data.key)).ok) return fail(NOT_ON_SERVERS)
    if (!sdkServerReady()) return fail('Phone testing is coming soon.')
    const to = data.to.replace(/[^\d+]/g, '')
    if (!/^\+\d{8,15}$/.test(to)) return fail('Enter your number with its country code, e.g. +91…')
    // Only a number attached to this flow may ring out for it.
    const flow = await getFlowDoc(me, data.key).catch(() => null)
    if (!flow?.numbers.some((n) => n.phone_number === data.from)) return fail('Pick one of this flow’s numbers to call from.')
    try {
      const call = await placeTestCall({ flow: data.key, from: data.from, to, customs: parseCustoms(data.customs), idempotencyKey: data.idempotencyKey })
      return wire({ ok: true, data: { id: call.id, status: call.status, sessionId: call.sessionId } satisfies TestCall })
    } catch (e) { return fail(sdkErrorText(e)) }
  })

const ENDED = new Set(['completed', 'failed', 'no-answer', 'busy', 'canceled'])

export const testCallStatus = createServerFn({ method: 'GET' })
  .inputValidator((d: { key: string; id: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    if (!sdkServerReady() || !(await onVoiceServers(me, data.key)).ok) return fail('Phone testing is coming soon.')
    try {
      const call = await getTestCall(data.id)
      const out: TestCall = { id: call.id, status: call.status, sessionId: call.sessionId }
      if (ENDED.has(call.status) && call.sessionId) {
        const rec = await getSessionRecord(call.sessionId).catch(() => null)
        if (rec) {
          out.transcript = rec.transcript.map((t: { role: string; text: string }) => ({ role: t.role === 'agent' ? 'assistant' : 'user', content: t.text }))
          out.seconds = rec.seconds
        }
      }
      return wire({ ok: true, data: out })
    } catch (e) { return fail(sdkErrorText(e)) }
  })

export const cancelTestCall = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; id: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    if (!sdkServerReady() || !(await onVoiceServers(me, data.key)).ok) return fail('Phone testing is coming soon.')
    try {
      const call = await sdkCancelCall(data.id)
      return wire({ ok: true, data: { id: call.id, status: call.status, sessionId: call.sessionId } satisfies TestCall })
    } catch (e) { return fail(sdkErrorText(e)) }
  })

/** A session's recording and transcript, for the replay dialog. */
export const getSessionRecording = createServerFn({ method: 'GET' })
  .inputValidator((d: { key: string; id: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    // The voice server archives into the same sessions table, so this is the stored row.
    const rec = await sessionRecordOf(me, data.key, data.id)
    if (!rec || (!rec.recordingUrl && !rec.transcript.length)) return fail('No recording yet.')
    // The bucket is private: hand out signed links, keep the raw URLs stored.
    return wire({ ok: true, data: { ...rec, recordingUrl: playableUrl(rec.recordingUrl), cameraUrl: playableUrl(rec.cameraUrl) } })
  })

/** True when a saved transcript has the agent's extra data lines, which the voice server's copy lacks. */
const hasData = (t: unknown) => Array.isArray(t) && t.some((x) => (x as { data?: boolean } | null)?.data)

/** Keep a finished test in the flow's sessions, marked as a test. */
export const saveTestSession = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; session: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const input = JSON.parse(data.session) as { sessionId: string; type: string; startTime: string; seconds: number; status: string; transcript: TestTurn[]; to?: string; actions?: Session['actions']; wire?: Session['wire'] }
    if (!(await canSee(me, data.key))) return fail('Flow not found.')
    const seconds = Math.max(0, Math.round(input.seconds || 0))
    const s: Session = {
      sessionId: input.sessionId, type: input.type, startTime: input.startTime,
      endTime: new Date(Date.parse(input.startTime) + seconds * 1000).toISOString(),
      totalConnectedTime: seconds, totalAiTime: 0, totalHumanTime: 0, aiTokens: 0, humanTokens: 0,
      status: input.status, to: input.to, transcription: input.transcript.slice(0, 500), test: true,
      ...(input.actions?.length ? { actions: input.actions.slice(0, 200) } : {}),
      // The log is already redacted in the browser; the last 300 entries are plenty to read back.
      ...(input.wire?.length ? { wire: input.wire.slice(-300) } : {}),
    }
    // The voice server's record has the recording and both sides of the talk; prefer it when it's ready.
    const rec = await sessionRecordOf(me, data.key, input.sessionId)
    if (rec?.recordingUrl) s.recordingUrl = rec.recordingUrl
    // Use the server's transcript only when it has at least as many turns as ours, and never over
    // one carrying the agent's extra data (movements, expressions, diagnosis): the server's has only words.
    if (rec && !hasData(input.transcript) && rec.transcript.length >= input.transcript.length) s.transcription = rec.transcript.slice(0, 500)
    await mutateFlow(me, data.key, (f) => {
      // The voice server usually archives the session into this same table first, with only
      // the spoken words. Add what only the test saw to that row instead of dropping it.
      const row = f.sessions.find((x) => x.sessionId === s.sessionId)
      if (!row) { f.sessions = [s, ...f.sessions]; return }
      row.test = true
      if (s.actions) row.actions = s.actions
      if (s.wire) row.wire = s.wire
      if (hasData(input.transcript) && !hasData(row.transcription)) row.transcription = input.transcript.slice(0, 500)
    })
    return wire({ ok: true, data: null })
  })
