// The Assistant's read tools. Each is defined once (name, description, JSON
// Schema input, handler) and handed to whichever model runs the reply.
//
// Every handler runs as the signed-in user, with small targeted Prisma queries
// (never the whole-account load the pages use), and its result goes through
// redact() and cap() before the model sees it. See docs/AI_ASSISTANT_AND_VAD_PLAN.md §6.

import type { Prisma } from '@prisma/client'

import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'
import { toGraph, type Workflow } from '#/lib/workflow/convert'
import { validate } from '#/lib/workflow/validate'
import { NODE_SPECS, prettyName, specFor } from '#/lib/workflow/registry'
import { KNOBS } from '#/lib/dashboard/knobs'
import { cap, redact, shortKey } from './redact'

export type ToolDef = {
  name: string
  /** One or two sentences: when to use it and what comes back. */
  description: string
  /** JSON Schema for the input. */
  input: Record<string, unknown>
  /** What the chat shows while it runs, e.g. "Read workflow of Clinic". */
  label: (input: Record<string, unknown>) => string
  run: (me: AuthUser, input: Record<string, unknown>) => Promise<unknown>
}

// ------------------------------------------------------------------ helpers

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined)
/** Links the model puts in answers; the panel turns them into chips that open the page. */
const ref = { flow: (key: string) => `vx:flow/${shortKey(key).replace(/…$/, '')}`, session: (id: string) => `vx:session/${id}`, step: (key: string, id: string) => `vx:step/${shortKey(key).replace(/…$/, '')}/${id}` }
const words = (t: unknown) => (typeof t === 'string' ? t : Array.isArray(t) ? t.map((x) => (x as { content?: string })?.content ?? '').join(' ') : '')

/** The user's live flows (deleted ones are hidden), lightest select that serves the caller. */
async function flowsOf(me: AuthUser) {
  const rows = await withDb(() => db.flow.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, apiKey: true, flowName: true, createdAt: true, runtime: true },
  }))
  return rows.filter((f) => !(f.runtime as { deleted_at?: string } | null)?.deleted_at)
}

/** A flow by its key, its shortened key (as the Assistant sees it) or its exact name. */
export async function findFlow(me: AuthUser, ref: unknown) {
  // Accepts a vx:flow/… or vx:step/…/… link too (models pass those back).
  const r = str(ref).replace(/^vx:(flow|step)\//, '').split('/')[0].replace(/…$/, '').trim()
  if (!r) throw new Error('Say which flow (its key or name).')
  const all = await flowsOf(me)
  const low = r.toLowerCase()
  const exact = all.find((f) => f.apiKey === r) ?? all.find((f) => f.apiKey.startsWith(r)) ?? all.find((f) => f.flowName.toLowerCase() === low)
  if (exact) return exact
  // Part of a name works when it points at one flow.
  const part = all.filter((f) => f.flowName.toLowerCase().includes(low))
  if (part.length === 1) return part[0]
  if (part.length > 1) throw new Error(`“${r}” matches ${part.length} flows: ${part.slice(0, 6).map((f) => `${f.flowName} (${shortKey(f.apiKey)})`).join('; ')}. Use the key.`)
  throw new Error(`No flow matches “${r}”. Use list_flows to see them.`)
}

async function flowFull(me: AuthUser, ref: unknown) {
  const f = await findFlow(me, ref)
  return withDb(() => db.flow.findUniqueOrThrow({
    where: { id: f.id },
    include: {
      agent: { select: { workflow: true, webhookUrl: true } },
      stt: { select: { id: true, service: true, config: true, name: true, isPreset: true } },
      tts: { select: { id: true, service: true, config: true, name: true, isPreset: true } },
      numbers: { select: { phoneNumber: true, label: true, attachedAt: true } },
    },
  }))
}

const voiceOf = (v: { service: string; config: unknown; name: string | null; isPreset: boolean } | null) =>
  v ? { saved_as: v.isPreset ? v.name : undefined, service: v.service, ...(v.config as Record<string, unknown>) } : null

/** Long strings shortened (prompts can be thousands of words): enough to know what they say. */
function clip(v: unknown, n = 400): unknown {
  if (typeof v === 'string') return v.length > n ? `${v.slice(0, n)}… [${v.length - n} more characters; detail "full" to read all]` : v
  if (Array.isArray(v)) return v.map((x) => clip(x, n))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clip(x, n)]))
  return v
}

/**
 * The open flow in a few lines for the system prompt, so the model needn't list
 * flows or read the workflow just to know what's there: one line per step.
 */
export async function flowBrief(me: AuthUser, key: string) {
  const f = await flowFull(me, key)
  const o = outline(f.agent.workflow as unknown as Workflow, f.apiKey)
  const lines = o.steps.slice(0, 40).map((s) => {
    const to = s.goes_to ? ` → ${Object.entries(s.goes_to).map(([via, t]) => (via === 'next' ? t.join(', ') : `${via}: ${t.join(', ')}`)).join('; ')}` : ''
    return `- ${s.id} (${s.kind}): ${s.summary}${to}${s.issues ? ` [${s.issues.join('; ')}]` : ''}`
  })
  return [
    `Open flow "${f.flowName}" (key ${shortKey(f.apiKey)}, ref ${o.ref}). Listening: ${f.stt?.service ?? 'not set'}; speaking: ${f.tts?.service ?? 'not set'}. Start step: ${o.start}. Steps:`,
    ...lines,
    ...(o.steps.length > 40 ? [`- … ${o.steps.length - 40} more (get_workflow)`] : []),
  ].join('\n')
}

/** A workflow as the canvas shows it: one line per step, where each output goes, and issues. */
function outline(wf: Workflow, key: string) {
  const g = toGraph(wf)
  const issues = validate(g)
  const out = new Map<string, Record<string, string[]>>()
  for (const e of g.edges) {
    const r = out.get(e.source) ?? {}
    ;(r[e.sourceHandle === 'next' ? 'next' : e.sourceHandle.replace(/^m:/, 'if ')] ??= []).push(e.target)
    out.set(e.source, r)
  }
  // Kept small: it's resent on every later step. Step refs are vx:step/<flow key>/<id>.
  return {
    flow: shortKey(key), ref: ref.flow(key),
    start: g.nodes[0]?.id,
    steps: g.nodes.map((n) => {
      const spec = specFor(n.data.type)
      const iss = issues.filter((i) => i.node === n.id).map((i) => `${i.level}: ${i.message}`)
      const to = out.get(n.id)
      return { id: n.id, kind: spec.label, summary: spec.summary(n.data.parameters), ...(to ? { goes_to: to } : {}), ...(iss.length ? { issues: iss } : {}) }
    }),
    workflow_issues: issues.filter((i) => !i.node).map((i) => `${i.level}: ${i.message}`),
  }
}

/** A transcript as numbered turns, with the agent's extra data lines kept apart. */
function turns(t: unknown) {
  const list = Array.isArray(t) ? t : typeof t === 'string' ? t.split('\n').filter(Boolean).map((l) => { const m = l.match(/^(\w+):\s*(.*)$/); return m ? { role: m[1], content: m[2] } : { role: 'user', content: l } }) : []
  return list.map((x, i) => {
    const r = x as { role?: string; content?: unknown; data?: boolean }
    const agent = /assist|ai|agent|bot/i.test(String(r.role ?? ''))
    if (r.data) return { n: i + 1, data: String(r.content ?? '') }
    // Web sessions store what the caller said as {"user_input": "…"}: show just the words.
    let text = typeof r.content === 'string' ? r.content : JSON.stringify(r.content)
    if (text.startsWith('{')) { try { const o = JSON.parse(text) as Record<string, unknown>; if (typeof o.user_input === 'string') text = o.user_input } catch { /* plain text that starts with { */ } }
    return { n: i + 1, who: agent ? 'agent' : 'caller', text }
  })
}

const sessionWhere = async (me: AuthUser, input: Record<string, unknown>): Promise<Prisma.CallSessionWhereInput> => {
  const flowIds = input.flow ? [(await findFlow(me, input.flow)).id] : (await flowsOf(me)).map((f) => f.id)
  const where: Prisma.CallSessionWhereInput = { flowId: { in: flowIds } }
  const time: Prisma.DateTimeFilter = {}
  if (str(input.from)) time.gte = new Date(str(input.from))
  if (str(input.to)) time.lte = new Date(str(input.to))
  if (time.gte || time.lte) where.startTime = time
  if (str(input.channel)) where.type = { contains: str(input.channel) === 'web' ? 'browser' : str(input.channel) === 'video' ? 'avatar' : str(input.channel), mode: 'insensitive' }
  if (str(input.status) === 'completed') where.OR = [{ status: null }, { status: 'completed' }]
  else if (str(input.status)) where.status = str(input.status)
  if (input.test === true) where.extra = { path: ['test'], equals: true }
  else if (input.test === false) where.NOT = { extra: { path: ['test'], equals: true } }
  return where
}

// ------------------------------------------------------------------ tools

const FLOW_PARTS = ['settings', 'voice', 'knobs', 'faces', 'numbers', 'webhook', 'knowledge', 'integrations'] as const

export const READ_TOOLS: ToolDef[] = [
  {
    name: 'account_overview',
    description: 'Start here for broad questions. The account at a glance: counts, every flow (key, name, sessions and minutes in the last 30 days), saved voices, faces, numbers.',
    input: { type: 'object', properties: {} },
    label: () => 'Read account overview',
    run: async (me) => {
      const since = new Date(Date.now() - 30 * 86400_000)
      const flows = await flowsOf(me)
      const [stats, voices, faces, numbers, kbs] = await Promise.all([
        withDb(() => db.callSession.groupBy({ by: ['flowId'], where: { flowId: { in: flows.map((f) => f.id) }, startTime: { gte: since } }, _count: true, _sum: { totalConnectedTime: true } })),
        withDb(() => Promise.all([db.stt.findMany({ where: { userId: me.id, isPreset: true }, select: { name: true, service: true } }), db.tts.findMany({ where: { userId: me.id, isPreset: true }, select: { name: true, service: true } })])),
        withDb(() => db.face.findMany({ where: { userId: me.id }, select: { label: true } })),
        withDb(() => db.phoneNumber.findMany({ where: { user: { id: me.id } }, select: { phoneNumber: true, flowApiKey: true } })),
        withDb(() => db.knowledgeBase.count({ where: { userId: me.id } })),
      ])
      const by = new Map(stats.map((s) => [s.flowId, s]))
      return {
        name: me.name,
        counts: { flows: flows.length, sessions_30d: stats.reduce((a, s) => a + s._count, 0), faces: faces.length, saved_voices: voices[0].length + voices[1].length, numbers: numbers.length, knowledge_bases: kbs },
        flows: flows.map((f) => ({ key: shortKey(f.apiKey), ref: ref.flow(f.apiKey), name: f.flowName, created: iso(f.createdAt), sessions_30d: by.get(f.id)?._count ?? 0, minutes_30d: Math.round((by.get(f.id)?._sum.totalConnectedTime ?? 0) / 60) })),
        saved_voices: [...voices[0].map((v) => ({ kind: 'listening', name: v.name, service: v.service })), ...voices[1].map((v) => ({ kind: 'speaking', name: v.name, service: v.service }))],
        faces: faces.map((f) => f.label || '(unnamed)'),
      }
    },
  },
  {
    name: 'list_flows',
    description: 'List flows with optional name search. Each row: key, name, created, sessions and minutes (all time).',
    input: { type: 'object', properties: { query: { type: 'string', description: 'Part of a flow name' } } },
    label: (i) => (i.query ? `Searched flows for “${i.query}”` : 'Listed flows'),
    run: async (me, i) => {
      const q = str(i.query).toLowerCase()
      const flows = (await flowsOf(me)).filter((f) => !q || f.flowName.toLowerCase().includes(q))
      const stats = await withDb(() => db.callSession.groupBy({ by: ['flowId'], where: { flowId: { in: flows.map((f) => f.id) } }, _count: true, _sum: { totalConnectedTime: true } }))
      const by = new Map(stats.map((s) => [s.flowId, s]))
      return flows.map((f) => ({ key: shortKey(f.apiKey), ref: ref.flow(f.apiKey), name: f.flowName, created: iso(f.createdAt), sessions: by.get(f.id)?._count ?? 0, minutes: Math.round((by.get(f.id)?._sum.totalConnectedTime ?? 0) / 60) }))
    },
  },
  {
    name: 'get_flow',
    description: `Read parts of one flow. parts: ${FLOW_PARTS.join(', ')}. "settings" is name/created/engine; "knobs" are behaviour settings with label, value and default.`,
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string', description: 'Flow key (shortened is fine) or exact name' }, parts: { type: 'array', items: { type: 'string', enum: [...FLOW_PARTS] } } } },
    label: (i) => `Read flow ${i.flow}${Array.isArray(i.parts) && i.parts.length ? ` (${(i.parts as string[]).join(', ')})` : ''}`,
    run: async (me, i) => {
      const f = await flowFull(me, i.flow)
      const parts = new Set(Array.isArray(i.parts) && i.parts.length ? (i.parts as string[]) : ['settings', 'voice', 'knobs'])
      const rt = (f.runtime ?? {}) as Record<string, unknown>
      const out: Record<string, unknown> = { key: shortKey(f.apiKey), ref: ref.flow(f.apiKey), name: f.flowName }
      if (parts.has('settings')) out.settings = { created: iso(f.createdAt), updated: iso(f.updatedAt), engine: f.processType }
      if (parts.has('voice')) out.voice = { listening: voiceOf(f.stt), speaking: voiceOf(f.tts) }
      // Only knobs changed from their default; explain lists the rest.
      if (parts.has('knobs')) {
        const changed = KNOBS.map((k) => ({ key: k.key, label: k.label, value: rt[k.key] ?? (k.key === 'process-type' ? f.processType : undefined), default: k.default }))
          .filter((k) => k.value !== undefined && JSON.stringify(k.value) !== JSON.stringify(k.default))
        out.knobs = changed.length ? changed : 'all at their defaults'
      }
      if (parts.has('faces')) out.faces = f.faces
      if (parts.has('numbers')) out.numbers = f.numbers.map((n) => ({ number: n.phoneNumber, label: n.label, attached: iso(n.attachedAt) }))
      if (parts.has('webhook')) out.webhook = { url: f.agent.webhookUrl, events: f.webhookEvents, has_secret: !!f.webhookSecret }
      if (parts.has('knowledge')) out.knowledge = f.kbs
      if (parts.has('integrations')) out.integrations = rt.integrations ?? []
      return out
    },
  },
  {
    name: 'get_workflow',
    description: 'Read a flow\'s workflow. view "outline" (default): every step with id, kind, one-line summary, where its outputs go, and issues. view "full": the raw engine JSON.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' }, view: { type: 'string', enum: ['outline', 'full'] } } },
    label: (i) => `Read workflow of ${i.flow}${i.view === 'full' ? ' (full)' : ''}`,
    run: async (me, i) => {
      const f = await flowFull(me, i.flow)
      const wf = f.agent.workflow as unknown as Workflow
      if (i.view === 'full') { const { ui: _ui, ...rest } = wf; return rest }
      return outline(wf, f.apiKey)
    },
  },
  {
    name: 'get_step',
    description: 'Read one workflow step: its settings and connections. Long texts (prompts) are shortened unless detail is "full"; ask for full only to quote or rewrite them.',
    input: { type: 'object', required: ['flow', 'step'], properties: { flow: { type: 'string' }, step: { type: 'string', description: 'Step id, e.g. "llm" or "greeting1"' }, detail: { type: 'string', enum: ['short', 'full'] } } },
    label: (i) => `Read step “${i.step}” in ${i.flow}`,
    run: async (me, i) => {
      const f = await flowFull(me, i.flow)
      const wf = f.agent.workflow as unknown as Workflow
      const id = str(i.step)
      const node = wf.nodes?.[id] ?? Object.entries(wf.nodes ?? {}).find(([k]) => prettyName(k).toLowerCase() === id.toLowerCase())?.[1]
      if (!node) throw new Error(`No step “${id}”. Steps: ${Object.keys(wf.nodes ?? {}).join(', ')}`)
      const realId = wf.nodes[id] ? id : Object.keys(wf.nodes).find((k) => prettyName(k).toLowerCase() === id.toLowerCase())!
      const g = toGraph(wf)
      return {
        id: realId, kind: specFor(node.type).label, node: i.detail === 'full' ? node : clip(node),
        comes_from: g.edges.filter((e) => e.target === realId).map((e) => e.source),
        goes_to: g.edges.filter((e) => e.source === realId).map((e) => ({ via: e.sourceHandle, to: e.target })),
      }
    },
  },
  {
    name: 'validate_workflow',
    description: 'The workflow editor\'s own checks for a flow: errors that block saving and tips.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' } } },
    label: (i) => `Checked workflow of ${i.flow}`,
    run: async (me, i) => {
      const f = await flowFull(me, i.flow)
      return validate(toGraph(f.agent.workflow as unknown as Workflow))
    },
  },
  {
    name: 'list_voices',
    description: 'Saved voice presets (speaking = TTS, listening = STT): name, provider, model/voice, and which flows use them.',
    input: { type: 'object', properties: { kind: { type: 'string', enum: ['speaking', 'listening'] } } },
    label: () => 'Listed saved voices',
    run: async (me, i) => {
      const flows = await withDb(() => db.flow.findMany({ where: { userId: me.id }, select: { apiKey: true, flowName: true, sttId: true, ttsId: true } }))
      const users = (id: string, k: 'sttId' | 'ttsId') => flows.filter((f) => f[k] === id).map((f) => f.flowName)
      const [stt, tts] = await withDb(() => Promise.all([
        i.kind === 'speaking' ? [] : db.stt.findMany({ where: { userId: me.id, isPreset: true } }),
        i.kind === 'listening' ? [] : db.tts.findMany({ where: { userId: me.id, isPreset: true } }),
      ]))
      return [
        ...stt.map((v) => ({ kind: 'listening', name: v.name, service: v.service, config: v.config, used_by: users(v.id, 'sttId') })),
        ...tts.map((v) => ({ kind: 'speaking', name: v.name, service: v.service, config: v.config, used_by: users(v.id, 'ttsId') })),
      ]
    },
  },
  {
    name: 'list_faces',
    description: 'Avatar faces on the account: id, label, detector, frame count, and which flows use each as a look.',
    input: { type: 'object', properties: {} },
    label: () => 'Listed faces',
    run: async (me) => {
      const [faces, flows] = await Promise.all([
        withDb(() => db.face.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'asc' }, select: { uuid: true, label: true, detector: true, media: true, createdAt: true } })),
        withDb(() => db.flow.findMany({ where: { userId: me.id }, select: { flowName: true, faces: true } })),
      ])
      return faces.map((f) => ({
        id: f.uuid, label: f.label, detector: f.detector, frames: (f.media as { frame_count?: number }).frame_count, added: iso(f.createdAt),
        used_by: flows.filter((x) => JSON.stringify(x.faces).includes(f.uuid)).map((x) => x.flowName),
      }))
    },
  },
  {
    name: 'list_numbers',
    description: 'Phone numbers on the account and the flow each is attached to.',
    input: { type: 'object', properties: {} },
    label: () => 'Listed numbers',
    run: async (me) => {
      const rows = await withDb(() => db.phoneNumber.findMany({ where: { user: { id: me.id } }, include: { flow: { select: { flowName: true } } } }))
      return rows.map((n) => ({ number: n.phoneNumber, label: n.label, provider: n.provider, flow: n.flow?.flowName ?? null }))
    },
  },
  {
    name: 'list_knowledge',
    description: 'Knowledge bases and their sources (kind, label, status, chunks).',
    input: { type: 'object', properties: {} },
    label: () => 'Listed knowledge bases',
    run: async (me) => {
      const rows = await withDb(() => db.knowledgeBase.findMany({ where: { userId: me.id }, include: { sources: true } }))
      return rows.map((k) => ({ id: k.id, name: k.name, sources: k.sources.map((s) => ({ kind: s.kind, label: s.label, status: s.status, chunks: s.chunks })) }))
    },
  },
  {
    name: 'search_sessions',
    description: 'Find sessions (calls, web, video, chat), newest first. Filters: flow, from/to (ISO dates), channel (phone, web, video, chat), status (completed or a status word), test (true = only tests, false = only real), text (in the transcript). Up to 50 per page; pass the returned cursor for more.',
    input: {
      type: 'object',
      properties: {
        flow: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' },
        channel: { type: 'string', enum: ['phone', 'web', 'video', 'chat'] }, status: { type: 'string' }, test: { type: 'boolean' },
        text: { type: 'string' }, limit: { type: 'number' }, cursor: { type: 'string' },
      },
    },
    label: (i) => `Searched sessions${i.flow ? ` of ${i.flow}` : ''}${i.text ? ` for “${i.text}”` : ''}`,
    run: async (me, i) => {
      const limit = Math.min(50, Math.max(1, num(i.limit, 20)))
      const where = await sessionWhere(me, i)
      if (str(i.cursor)) where.startTime = { ...(where.startTime as object), lt: new Date(str(i.cursor)) }
      // Text search looks at more rows than it returns.
      const rows = await withDb(() => db.callSession.findMany({
        where, orderBy: { startTime: 'desc' }, take: str(i.text) ? 500 : limit + 1,
        select: { sessionId: true, type: true, startTime: true, totalConnectedTime: true, status: true, from: true, to: true, transcription: true, extra: true, flow: { select: { flowName: true } } },
      }))
      const needle = str(i.text).toLowerCase()
      const hits = needle ? rows.filter((r) => words(r.transcription).toLowerCase().includes(needle)) : rows
      const page = hits.slice(0, limit)
      return {
        sessions: page.map((r) => {
          const t = turns(r.transcription)
          return {
            id: r.sessionId, ref: ref.session(r.sessionId), flow: r.flow.flowName, when: iso(r.startTime), channel: r.type, caller: r.from ?? r.to ?? null,
            seconds: Math.round(r.totalConnectedTime), status: r.status ?? 'completed', turns: t.filter((x) => 'who' in x).length,
            test: !!(r.extra as { test?: boolean }).test,
            first_caller_line: (t.find((x) => 'who' in x && x.who === 'caller') as { text?: string } | undefined)?.text?.slice(0, 140),
          }
        }),
        cursor: hits.length > limit ? iso(page[page.length - 1].startTime) : null,
      }
    },
  },
  {
    name: 'get_session',
    description: 'Read one session. include: transcript (numbered turns, with the agent\'s extra data lines), timing, web_actions. turns: [first, last] to read part of a long transcript.',
    input: {
      type: 'object', required: ['id'],
      properties: { id: { type: 'string' }, include: { type: 'array', items: { type: 'string', enum: ['transcript', 'timing', 'web_actions'] } }, turns: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 } },
    },
    label: (i) => `Read session ${str(i.id).slice(0, 8)}`,
    run: async (me, i) => {
      const r = await withDb(() => db.callSession.findFirst({ where: { sessionId: str(i.id), flow: { userId: me.id } }, include: { flow: { select: { flowName: true, apiKey: true } } } }))
      if (!r) throw new Error('No such session on this account.')
      const inc = new Set(Array.isArray(i.include) && i.include.length ? (i.include as string[]) : ['transcript', 'timing'])
      const extra = r.extra as { test?: boolean; webActions?: unknown[]; avatarVideoUrl?: string }
      const out: Record<string, unknown> = {
        id: r.sessionId, ref: ref.session(r.sessionId), flow: { name: r.flow.flowName, key: shortKey(r.flow.apiKey), ref: ref.flow(r.flow.apiKey) }, channel: r.type, when: iso(r.startTime), ended: iso(r.endTime),
        caller: r.from ?? r.to ?? null, status: r.status ?? 'completed', test: !!extra.test,
        has_recording: !!r.recordingUrl, has_video: !!extra.avatarVideoUrl,
      }
      if (inc.has('timing')) out.timing = { seconds: Math.round(r.totalConnectedTime), ai_seconds: Math.round(r.totalAiTime), caller_seconds: Math.round(r.totalHumanTime), ai_tokens: r.aiTokens, caller_tokens: r.humanTokens }
      if (inc.has('transcript')) {
        const all = turns(r.transcription)
        const range = Array.isArray(i.turns) ? (i.turns as number[]) : null
        out.transcript = range ? all.filter((t) => t.n >= range[0] && t.n <= range[1]) : all
        out.total_turns = all.length
      }
      if (inc.has('web_actions')) out.web_actions = extra.webActions ?? []
      return out
    },
  },
  {
    name: 'session_stats',
    description: 'Numbers over sessions, computed on the server: count, minutes, average seconds, completion rate. Optional grouping by day, week, channel, status or flow. Use this instead of counting rows yourself.',
    input: {
      type: 'object', required: ['from'],
      properties: { flow: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, by: { type: 'string', enum: ['day', 'week', 'channel', 'status', 'flow'] }, test: { type: 'boolean' } },
    },
    label: (i) => `Counted sessions${i.flow ? ` of ${i.flow}` : ''}${i.by ? ` by ${i.by}` : ''}`,
    run: async (me, i) => {
      const where = await sessionWhere(me, i)
      const rows = await withDb(() => db.callSession.findMany({ where, select: { type: true, status: true, startTime: true, totalConnectedTime: true, flow: { select: { flowName: true } } } }))
      const keyOf = (r: (typeof rows)[number]) => {
        switch (i.by) {
          case 'day': return r.startTime.toISOString().slice(0, 10)
          case 'week': { const d = new Date(r.startTime); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return `week of ${d.toISOString().slice(0, 10)}` }
          case 'channel': return r.type
          case 'status': return r.status ?? 'completed'
          case 'flow': return r.flow.flowName
          default: return 'all'
        }
      }
      const groups = new Map<string, typeof rows>()
      for (const r of rows) groups.set(keyOf(r), [...(groups.get(keyOf(r)) ?? []), r])
      const sum = (rs: typeof rows) => {
        const secs = rs.reduce((a, r) => a + r.totalConnectedTime, 0)
        const done = rs.filter((r) => !r.status || r.status === 'completed').length
        return { count: rs.length, minutes: Math.round(secs / 60), avg_seconds: rs.length ? Math.round(secs / rs.length) : 0, completion_rate: rs.length ? Math.round((done / rs.length) * 100) / 100 : null }
      }
      return { total: sum(rows), ...(i.by ? { groups: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([k, rs]) => ({ [String(i.by)]: k, ...sum(rs) })) } : {}) }
    },
  },
  {
    name: 'list_deliveries',
    description: 'Recent webhook deliveries for a flow: event, HTTP status, time, attempts.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' }, limit: { type: 'number' } } },
    label: (i) => `Read webhook deliveries of ${i.flow}`,
    run: async (me, i) => {
      const f = await findFlow(me, i.flow)
      const rows = await withDb(() => db.webhookDelivery.findMany({ where: { flowId: f.id }, orderBy: { at: 'desc' }, take: Math.min(50, num(i.limit, 20)) }))
      return rows.map((d) => { const r = d as unknown as Record<string, unknown>; return { event: r.event, status: r.status, at: iso(r.at as Date), attempts: r.attempt ?? r.attempts, ms: r.ms } })
    },
  },
  {
    name: 'explain',
    description: 'Our own help for a setting or step type, with allowed values and defaults: a knob key (e.g. "pre-fire"), a step type (e.g. "llm", "conditional"), or "steps"/"knobs" for the full catalog.',
    input: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' } } },
    label: (i) => `Looked up “${i.topic}”`,
    run: async (_me, i) => {
      const t = str(i.topic)
      if (t === 'knobs') return KNOBS.map((k) => ({ key: k.key, label: k.label, group: k.group, help: k.help, kind: k.kind, default: k.default }))
      if (t === 'steps') return NODE_SPECS.filter((s) => !s.hidden).map((s) => ({ type: s.type, label: s.label, blurb: s.blurb }))
      const knob = KNOBS.find((k) => k.key === t || k.label.toLowerCase() === t.toLowerCase())
      if (knob) return knob
      const spec = NODE_SPECS.find((s) => s.type === t || s.label.toLowerCase() === t.toLowerCase())
      if (spec) return { type: spec.type, label: spec.label, blurb: spec.blurb, fields: spec.fields.map((f) => ({ key: f.key, label: f.label, kind: f.kind, help: f.help, options: f.options?.map((o) => o.value), more_tab: !!f.advanced })), defaults: spec.defaults }
      throw new Error(`Nothing called “${t}”. Try "steps" or "knobs" for the lists.`)
    },
  },
]

/** Runs one tool as the user. Errors come back as text so the model can recover. */
export async function runTool(me: AuthUser, name: string, input: Record<string, unknown>) {
  const tool = READ_TOOLS.find((t) => t.name === name)
  if (!tool) return { ok: false, label: name, result: { error: `Unknown tool ${name}.` } }
  try {
    const raw = await tool.run(me, input ?? {})
    return { ok: true, label: tool.label(input ?? {}), result: cap(redact(raw)) }
  } catch (e) {
    return { ok: false, label: tool.label(input ?? {}), result: { error: (e as Error).message } }
  }
}
