// Every dashboard read and write. A flow is either live (a real key on the
// database service) or mock (lives in store.ts). For a live flow, fields the
// backend accepts go to PUT /flow; the rest land in its mock overlay and come
// back marked in `mock`. Values travel as JSON strings so server-function
// serialisation never has to reason about the open-ended document shape.

import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { Voxio } from 'voxioagent/server'
import { randomUUID } from 'node:crypto'

import { db, withDb } from '#/server/db'
import { playableUrl } from '#/server/r2.server'
import { AVATAR_VOICEBOT, SERVERS } from '#/server/voice/servers'
import { currentUser } from '#/server/session.server'
import { LIVE_WRITABLE } from '#/lib/dashboard/knobs'
import { billedMinutes } from '#/lib/dashboard/client'
import type { Account, Delivery, FlowDoc, FlowSummary, Result, Session, TestCall, TestSetup, TestTurn } from '#/lib/dashboard/types'
import { TEMPLATES } from '#/lib/workflow/templates'
import { extractWorkflow, withStart, type Workflow } from '#/lib/workflow/convert'
import { TTS_PROVIDERS, tidyTts } from '#/lib/dashboard/providers'
import { blankFlow, load, markFlowDeleted, mutate, newKey, rekeyFlow, type Overlay } from './store.server'
import { accountClient, accountKey, createErrorText, createOnBackend, ON_BACKEND, sessionRecordOf, settingsOf } from './flows.server'
import { cancelTestCall as sdkCancelCall, getSessionRecord, getTestCall, placeTestCall, sdkErrorText, sdkServerReady } from './test.server'
import type { AuthUser } from '#/server/session.server'

const USER_API_KEY = process.env.VOXIO_USER_API_KEY
const FROM_NUMBER = process.env.VOXIO_FROM_NUMBER

const urlOf = (h: string) => (!h ? null : /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(h) ? `http://${h}` : `https://${h}`)
const CALLBOT = () => urlOf(SERVERS.callbot)

const wire = <T,>(r: Result<T>) => JSON.stringify(r)
const fail = (reason: string) => wire({ ok: false, reason })
const errMsg = (e: unknown) => (e as Error)?.message ?? String(e)

// ---------------------------------------------------------------- live flows

const LIVE_EMAILS = new Set((process.env.DASHBOARD_LIVE_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))
const canSeeLive = (me: AuthUser) => LIVE_EMAILS.has(me.email.toLowerCase())

function liveKeys(me: AuthUser): { key: string; env: string }[] {
  if (!canSeeLive(me)) return []
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

// Live flows go through the SDK: read with the flow's own key, written as the signed-in user.
async function fetchLive(key: string): Promise<Record<string, any>> {
  return (await new Voxio({ flowKey: key, environment: 'gpu' }).flows.get(key, { keys: ['all'] })) as Record<string, any>
}

/**
 * A sessions row as the voice server writes it: session.mp4 in recordingUrl,
 * the user's camera in extra.cameraRecordingUrl. Both sit in a private
 * bucket, so sign them.
 */
function liveSession(r: Record<string, any>): Session {
  const camera = r.extra?.cameraRecordingUrl
  return { ...r, recordingUrl: playableUrl(r.recordingUrl ?? undefined), clientVideoUrl: playableUrl(typeof camera === 'string' ? camera : undefined) } as Session
}

/** The live flow document in the dashboard's shape, with its mock overlay applied. */
function fromLive(key: string, doc: Record<string, any>, overlay: Overlay): FlowDoc {
  const { agent_id, stt_id, tts_id, faces, numbers, sessions, user_id, api_key, created_at, updated_at, ...knobs } = doc
  const faceManifest = Array.isArray(faces)
    ? { version: null, expressions: faces, transitions: doc.transitions ?? [] }
    : faces ?? { version: null, expressions: [], transitions: [] }
  const flow: FlowDoc = {
    ...knobs,
    key,
    source: 'live',
    mock: [],
    flow_name: doc.flow_name ?? 'Untitled flow',
    created_at,
    workflow: agent_id?.workflow ?? { nodes: {} },
    'webhook-url': agent_id?.['webhook-url'] ?? '',
    stt: stt_id ?? null,
    tts: tidyTts(tts_id ?? null),
    kbs: doc.kbs ?? [],
    faces: faceManifest,
    vision_id: doc.vision_id ?? null,
    running_vision_id: doc.running_vision_id ?? null,
    integrations: [],
    'web-actions': [],
    numbers: (numbers ?? []).filter(Boolean).map((n: any) => ({ phone_number: n.phone_number, provider: 'plivo' })),
    sessions: (sessions ?? []).filter(Boolean).map(liveSession),
    deliveries: [],
  }
  for (const [k, v] of Object.entries(overlay)) {
    ;(flow as Record<string, unknown>)[k] = v
    if (k !== 'deliveries') flow.mock.push(k)
  }
  return flow
}

/** A flow this account may see: one of its own, or (for live accounts) a configured backend flow. */
async function getFlowDoc(me: AuthUser, key: string): Promise<FlowDoc> {
  const store = await load(me)
  const own = store.flows[key]
  // Stored recording URLs are raw R2 links; sign them on the way out, never in the store.
  if (own) return { ...own, source: 'mock', mock: ['*'], sessions: own.sessions.map((x) => ({ ...x, recordingUrl: playableUrl(x.recordingUrl) })) }
  if (!liveKeys(me).some((l) => l.key === key)) throw new Error('Flow not found')
  return fromLive(key, await fetchLive(key), store.overlays[key] ?? {})
}
const isLiveFor = (me: AuthUser, key: string) => liveKeys(me).some((l) => l.key === key)

async function putLive(me: AuthUser, key: string, body: Record<string, unknown>) {
  // `runtime` goes to the data server as-is: the body is already in its document shape.
  await (await accountClient(me)).flows.update(key, { runtime: body })
}

// ---------------------------------------------------------------- flows

export const listFlows = createServerFn({ method: 'GET' }).handler(async (): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
  const store = (await load(me))
  const shops = new Map(store.account.integrations.map((x) => [x.id, x.name]))
  const summary = (f: FlowDoc): FlowSummary => ({
    key: f.key,
    name: f.flow_name,
    createdAt: f.created_at,
    source: f.source,
    sessions: f.sessions.length,
    minutes: f.sessions.reduce((a, s) => a + billedMinutes(s.totalConnectedTime), 0),
    connections: [
      ...f.numbers.map((n) => ({ kind: 'number' as const, label: n.phone_number })),
      ...(f.integrations ?? []).map((id) => ({ kind: 'integration' as const, label: shops.get(id) ?? id })),
      ...(f['webhook-url'] ? [{ kind: 'webhook' as const, label: 'Webhook' }] : []),
      ...(f['web-actions']?.length ? [{ kind: 'web' as const, label: 'Website' }] : []),
    ],
  })
  const rows: FlowSummary[] = Object.values(store.flows).map((f) => summary({ ...f, source: 'mock' }))
  await Promise.all(liveKeys(me).filter(({ key }) => !store.flows[key]).map(async ({ key, env }) => {
    try {
      rows.push(summary(fromLive(key, await fetchLive(key), store.overlays[key] ?? {})))
    } catch (e) {
      rows.push({ key, name: env.replace(/^VOXIO_FLOW_API_KEY_?/, '').toLowerCase() || 'default', source: 'live', sessions: 0, minutes: 0, connections: [], error: errMsg(e) })
    }
  }))
  // Newest first; flows without a date (live ones that failed to load) go last.
  rows.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  return wire({ ok: true, data: rows })
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
 * Saves part of a flow the way the dashboard's own Save does: own flows in the
 * store; live flows split between PUT /flow and the overlay. Used by patchFlow
 * and by the Assistant when a change is applied.
 */
export const applyFlowPatch = createServerOnlyFn(async (me: AuthUser, key: string, input: Record<string, unknown>): Promise<Result<FlowDoc>> => {
    const patch = { ...input }
    for (const k of ['key', 'source', 'mock', 'sessions']) delete patch[k]
    const store = (await load(me))

    if (store.flows[key]) {
      await mutate(me, (s) => { Object.assign(s.flows[key], patch) })
      return { ok: true, data: await getFlowDoc(me, key) }
    }
    if (!isLiveFor(me, key)) return { ok: false, reason: 'Flow not found.' }

    // Live: split into what PUT /flow takes and what goes to the overlay.
    const body: Record<string, any> = {}
    const toOverlay: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'workflow') (body.agent ??= {}).workflow = withStart(v as Workflow)
      else if (k === 'webhook-url') (body.agent ??= {})['webhook-url'] = v
      else if (k === 'faces') { const f = v as FlowDoc['faces']; body.faces = f.expressions; body.transitions = f.transitions }
      else if (k === 'tts') body.tts = tidyTts(v as FlowDoc['tts'])
      else if (LIVE_WRITABLE.has(k)) body[k] = v
      else toOverlay[k] = v
    }
    try {
      if (Object.keys(body).length) await putLive(me, key, body)
    } catch (e) { return { ok: false, reason: `Save failed: ${errMsg(e)}` } }
    if (Object.keys(toOverlay).length) await mutate(me, (s) => { s.overlays[key] = { ...(s.overlays[key] ?? {}), ...toOverlay } })
    try { return { ok: true, data: await getFlowDoc(me, key) } } catch (e) { return { ok: false, reason: errMsg(e) } }
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
    // Created on the backend first (with the user's account key), then kept here under its key.
    let key: string
    try { key = await createOnBackend(me, settingsOf(draft)) } catch (e) { return fail(createErrorText(e)) }
    const flow: FlowDoc = { ...draft, key, [ON_BACKEND]: true }
    await mutate(me, (s) => { s.flows[flow.key] = flow })
    return wire({ ok: true, data: flow.key, note: undefined })
  })

/**
 * Deletes a flow from the dashboard but keeps its history: the key stops
 * working at once (rotated through the SDK; re-keyed here if that fails), the
 * flow is stamped deleted and its numbers are freed. Its sessions and webhook
 * logs stay, shown as "Flow deleted". The SDK's flows.delete would remove them.
 */
export const deleteFlow = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    if (!(await load(me)).flows[data.key]) return fail('This flow can’t be deleted from here yet.')
    let dead: string
    try {
      dead = (await (await accountClient(me)).flows.rotateKey(data.key)).flowKey
    } catch {
      dead = newKey('flow')
      await rekeyFlow(me, data.key, dead)
    }
    try {
      await markFlowDeleted(me, dead)
    } catch (e) {
      return fail(`The flow’s key was turned off, but it couldn’t be marked deleted: ${errMsg(e)}`)
    }
    return wire({ ok: true, data: null })
  })

export const rotateFlowKey = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    if (!(await load(me)).flows[data.key]) return fail('Rotating a live key needs the backend endpoint (DASHBOARD_BACKEND_PLAN §3) — numbers point at the old key.')
    const next = newKey('flow')
    await mutate(me, (s) => { const f = s.flows[data.key]; delete s.flows[data.key]; f.key = next; f.key_rotated_at = new Date().toISOString(); s.flows[next] = f })
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
  await mutate(me, (s) => {
    const target = s.flows[key] ?? (s.overlays[key] ??= {})
    const list = (target.deliveries as Delivery[] | undefined) ?? []
    target.deliveries = [d, ...list].slice(0, 200)
  })
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
    const own = !!(await load(me)).flows[data.key]
    if (!own && !isLiveFor(me, data.key)) return fail('Flow not found.')
    const live = !own

    const userKey = live ? await accountKey(me).catch(() => '') : ''
    if (live && callbot && userKey && from) {
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
    await mutate(me, (st) => {
      const target = st.flows[data.key] ?? (st.overlays[data.key] ??= {})
      target.sessions = [s, ...((target.sessions as Session[]) ?? [])]
    })
    const why = !live ? 'This flow isn’t connected to the voice backend' : !callbot ? 'VX_CALLBOT is not set' : !from ? 'No from-number (VOXIO_FROM_NUMBER)' : 'Your account has no API key'
    return wire({ ok: true, data: s.sessionId, note: `Not dialled. ${why}.` })
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
  const store = (await load(me))
  const text = (t: unknown) => (typeof t === 'string' ? t : Array.isArray(t) ? t.map((x) => (x as { content?: string })?.content ?? '').join(' ') : '').slice(0, 1500)
  const slim = (ss: Session[]) => ss.map(({ transcription, ...s }) => ({ ...s, transcription: text(transcription) }))
  const flows: OverviewFlow[] = Object.values(store.flows).map((f) => ({ key: f.key, name: f.flow_name, source: 'mock', sessions: slim(f.sessions) }))
  // Deleted flows' sessions still count, labelled as such.
  for (const [key, f] of Object.entries(store.deleted ?? {})) flows.push({ key, name: f.name, source: 'mock', sessions: slim(f.sessions), deleted: true })
  await Promise.all(liveKeys(me).filter(({ key }) => !store.flows[key]).map(async ({ key }) => {
    try {
      const f = fromLive(key, await fetchLive(key), store.overlays[key] ?? {})
      flows.push({ key, name: f.flow_name, source: 'live', sessions: slim(f.sessions) })
    } catch { /* listed with its error on the Flows page */ }
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
    if (data.attach && !store.flows[data.key] && !isLiveFor(me, data.key)) return fail('Flow not found.')
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
 * numbers and deliveries belong to the original and aren't copied. The copy is
 * created on the backend (with the user's account key) and gets the key it returns.
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
    try { copy.key = await createOnBackend(me, settingsOf(copy)) } catch (e) { return fail(createErrorText(e)) }
    ;(copy as Record<string, unknown>)[ON_BACKEND] = true
    copy.source = 'mock'
    copy.mock = []
    copy.created_at = new Date().toISOString()
    copy.sessions = []
    copy.numbers = []
    copy.deliveries = []
    delete (copy as Record<string, unknown>).key_rotated_at
    await mutate(me, (s) => { s.flows[copy.key] = copy })
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
  return !!(await load(me)).flows[key] || isLiveFor(me, key)
}

/**
 * Whether the voice servers can run this flow for this account: a configured
 * live flow, one of its own flows imported from the backend's Mongo by
 * scripts/migrate-mongo.mjs (those keep their Mongo _id, 24 hex, as their id),
 * or one created or duplicated here, which goes to the backend through the SDK.
 */
async function onVoiceServers(me: AuthUser, key: string): Promise<{ ok: boolean; imported: boolean }> {
  if (isLiveFor(me, key)) return { ok: true, imported: false }
  const row = await withDb(() => db.flow.findFirst({ where: { apiKey: key, userId: me.id }, select: { id: true, runtime: true } }))
  const imported = !!row && /^[0-9a-f]{24}$/.test(row.id)
  // Made in the dashboard through the SDK: the backend has it too.
  const created = !!row && (row.runtime as Record<string, unknown> | null)?.[ON_BACKEND] === true
  return { ok: imported || created, imported }
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

/**
 * Keep a finished test in the flow's sessions, marked as a test. Flows in our
 * own tables store it; live flows are recorded by the voice server itself
 * (recording: true), and their overlay isn't persisted, so nothing is written.
 */
/** A session's recording and full transcript from the voice server, for the replay dialog. */
export const getSessionRecording = createServerFn({ method: 'GET' })
  .inputValidator((d: { key: string; id: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const rec = await sessionRecordOf(me, data.key, data.id)
    const own = (await load(me)).flows[data.key]
    if (!rec) {
      // The voice server doesn't have it; a stored URL may still need signing.
      const stored = own?.sessions.find((y) => y.sessionId === data.id)?.recordingUrl
      return stored ? wire({ ok: true, data: { recordingUrl: playableUrl(stored), transcript: [] } }) : fail('No recording yet.')
    }
    if (own && (rec.recordingUrl || rec.transcript.length)) {
      // Keep it, so the next open doesn't have to ask again.
      await mutate(me, (st) => {
        const x = st.flows[data.key]?.sessions.find((y) => y.sessionId === data.id)
        if (!x) return
        if (rec.recordingUrl) x.recordingUrl = rec.recordingUrl
        if (!hasData(x.transcription) && rec.transcript.length >= (Array.isArray(x.transcription) ? x.transcription.length : 0)) x.transcription = rec.transcript.slice(0, 500)
      })
    }
    // The bucket is private: hand out signed links, keep the raw URLs stored.
    return wire({ ok: true, data: { ...rec, recordingUrl: playableUrl(rec.recordingUrl), cameraUrl: playableUrl(rec.cameraUrl) } })
  })

/** True when a saved transcript has the agent's extra data lines, which the voice server's copy lacks. */
const hasData = (t: unknown) => Array.isArray(t) && t.some((x) => (x as { data?: boolean } | null)?.data)

export const saveTestSession = createServerFn({ method: 'POST' })
  .inputValidator((d: { key: string; session: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const input = JSON.parse(data.session) as { sessionId: string; type: string; startTime: string; seconds: number; status: string; transcript: TestTurn[]; to?: string; actions?: Session['actions']; wire?: Session['wire'] }
    const own = !!(await load(me)).flows[data.key]
    if (!own) {
      if (!isLiveFor(me, data.key)) return fail('Flow not found.')
      return wire({ ok: true, data: null, note: 'Kept by the voice server.' })
    }
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
    await mutate(me, (st) => {
      const f = st.flows[data.key]
      if (!f) return
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
