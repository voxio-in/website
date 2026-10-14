// The Assistant's write side (docs/AI_ASSISTANT_AND_VAD_PLAN.md §8).
//
// The model never writes. It calls a propose_* tool; the server builds the full
// new value from the flow as it is now, checks it, and keeps it as a pending
// change. The chat shows it as a card; only the user's Apply saves it, through
// the dashboard's own save path (applyFlowPatch). Every applied change keeps the
// previous values for Undo. Sessions are never writable.

import { randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'

import type { AuthUser } from '#/server/session.server'
import type { FlowDoc } from '#/lib/dashboard/types'
import { KNOBS } from '#/lib/dashboard/knobs'
import { STT_PROVIDERS, TTS_PROVIDERS } from '#/lib/dashboard/providers'
import { toGraph, type EngineNode, type Workflow } from '#/lib/workflow/convert'
import { validate } from '#/lib/workflow/validate'
import { NODE_SPECS, prettyName, specFor } from '#/lib/workflow/registry'
import { applyFlowPatch, readFlowDoc } from '#/server/dashboard/api'
import { cap, redact } from './redact'
import { db, withDb } from '#/server/db'
import type { Spec } from '#/lib/vad/spec'
import { findFlow, type ToolDef } from './tools.server'

// ------------------------------------------------------------------ pending changes

export type ChangeLine = { what: string; from?: unknown; to?: unknown }
export type Change = {
  id: string
  userId: string
  flowKey: string
  flowName: string
  title: string
  /** Where in the dashboard this is, e.g. ["Voice", "Speaking voice"], and that page (flow sub-path). */
  where: string[]
  page: string
  lines: ChangeLine[]
  /** The patch Apply saves, and the values it replaces (what Undo puts back). */
  patch: Record<string, unknown>
  before: Record<string, unknown>
  /** stale: the flow was saved after it was proposed, so it can't be applied. */
  status: 'pending' | 'applied' | 'discarded' | 'undone' | 'stale'
  at: number
  /** How many proposals this card holds (one reply's proposals to a flow stack). */
  count?: number
  /** Set for a dashboard (VAD) change instead of a flow change. id is unset until a new one is created. */
  dashboard?: { id?: string; spec: Spec; before: Spec | null }
}

/** What the chat shows for a change: no patches, just the card. */
export const cardOf = (c: Change) => ({
  id: c.id, flow: c.flowName, title: c.title, where: c.where, lines: c.lines, status: c.status,
  page: c.dashboard ? (c.dashboard.id ? `vx:dash/${c.dashboard.id}` : undefined) : `vx:page/${c.flowKey.slice(0, 11)}/${c.page}`,
})

/** Keeps a new pending change and returns its card (used by the dashboard tools too). */
export function addChange(c: Omit<Change, 'id' | 'status' | 'at'>) {
  prune()
  const full: Change = { ...c, id: randomUUID().slice(0, 8), status: 'pending', at: Date.now() }
  CHANGES.set(full.id, full)
  return { proposed: cardOf(full), note: 'This change is NOT saved yet. The user sees it as a card and decides whether to apply it. Do not say it is done.' }
}

// Server memory for v2 (see §8.3). Old ones are dropped after a day.
const CHANGES = new Map<string, Change>()
const prune = () => { const old = Date.now() - 86400_000; for (const [id, c] of CHANGES) if (c.at < old) CHANGES.delete(id) }

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const short = (v: unknown) => {
  if (v === undefined || v === null || v === '') return '—'
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

// One reply's proposals to the same flow stack into one card: each builds on the
// ones before it, and Apply saves them together. (Separate cards were each built
// on the saved flow, so applying one made the rest stale.) The reply loop opens a
// batch with inBatch(); proposals outside one get their own card.
const BATCH = new AsyncLocalStorage<Map<string, string>>()
export const inBatch = <T,>(fn: () => T, batch: Map<string, string>) => BATCH.run(batch, fn)

type Built = { patch: Record<string, unknown>; lines: ChangeLine[]; where: string[]; page: string }
async function propose(me: AuthUser, flowRef: unknown, title: string, build: (doc: FlowDoc) => Built) {
  prune()
  const f = await findFlow(me, flowRef)
  const saved = await readFlowDoc(me, f.apiKey)
  const batch = BATCH.getStore()
  const open = batch?.get(f.apiKey) ? CHANGES.get(batch.get(f.apiKey)!) : undefined
  const stack = open && open.status === 'pending' ? open : undefined
  // Build on what this reply already proposed, not only on what's saved.
  const doc = (stack ? { ...saved, ...structuredClone(stack.patch) } : saved) as FlowDoc
  const { patch, lines, where, page } = build(doc)
  if (!lines.length) throw new Error('Nothing would change: the flow already has these values.')
  const note = 'This change is NOT saved yet. The user sees it as a card and decides whether to apply it. Do not say it is done.'
  if (stack) {
    for (const k of Object.keys(patch)) if (!(k in stack.before)) stack.before[k] = structuredClone((saved as Record<string, unknown>)[k])
    Object.assign(stack.patch, patch)
    stack.lines.push(...redact(lines))
    stack.count = (stack.count ?? 1) + 1
    stack.title = `${stack.count} changes to ${f.flowName}`
    if (stack.where.join('/') !== where.join('/')) stack.where = stack.where[0] === where[0] ? [where[0]] : ['Several places']
    return { proposed: cardOf(stack), note: `Added to the same card as this reply's earlier proposals for this flow (they apply together). ${note}` }
  }
  const before = Object.fromEntries(Object.keys(patch).map((k) => [k, structuredClone((saved as Record<string, unknown>)[k])]))
  const c: Change = { id: randomUUID().slice(0, 8), userId: me.id, flowKey: f.apiKey, flowName: f.flowName, title, where, page, lines: redact(lines), patch, before, status: 'pending', at: Date.now() }
  CHANGES.set(c.id, c)
  batch?.set(f.apiKey, c.id)
  return { proposed: cardOf(c), note }
}

/** Apply, discard or undo, as the signed-in user. */
export async function act(me: AuthUser, id: string, action: 'apply' | 'discard' | 'undo'): Promise<{ ok: true; card: ReturnType<typeof cardOf> } | { ok: false; reason: string }> {
  const c = CHANGES.get(id)
  if (!c || c.userId !== me.id) return { ok: false, reason: 'This change has expired. Ask the Assistant to propose it again.' }
  if (action === 'discard') {
    if (c.status !== 'pending' && c.status !== 'stale') return { ok: false, reason: 'Only a change that hasn’t been applied can be discarded.' }
    c.status = 'discarded'
    return { ok: true, card: cardOf(c) }
  }
  if (c.dashboard) return actDashboard(me, c, action)
  const doc = await readFlowDoc(me, c.flowKey)
  const now = doc as Record<string, unknown>
  if (action === 'apply') {
    if (c.status !== 'pending') return { ok: false, reason: `Already ${c.status}.` }
    // Someone saved this flow since the proposal: don't overwrite their work.
    if (Object.keys(c.before).some((k) => !same(now[k], c.before[k]))) { c.status = 'stale'; return { ok: true, card: cardOf(c) } }
    const r = await applyFlowPatch(me, c.flowKey, c.patch)
    if (!r.ok) return { ok: false, reason: r.reason }
    c.status = 'applied'
    return { ok: true, card: cardOf(c) }
  }
  if (c.status !== 'applied') return { ok: false, reason: 'Only an applied change can be undone.' }
  if (Object.keys(c.patch).some((k) => !same(now[k], c.patch[k]))) return { ok: false, reason: 'The flow changed again after this was applied, so undoing could lose that work. Change it back by hand or ask the Assistant.' }
  const r = await applyFlowPatch(me, c.flowKey, c.before)
  if (!r.ok) return { ok: false, reason: r.reason }
  c.status = 'undone'
  return { ok: true, card: cardOf(c) }
}

/** Apply / undo for a dashboard change: create or update, and undo deletes or restores. */
async function actDashboard(me: AuthUser, c: Change, action: 'apply' | 'undo') {
  const d = c.dashboard!
  if (action === 'apply') {
    if (c.status !== 'pending') return { ok: false as const, reason: `Already ${c.status}.` }
    if (d.id) {
      const cur = await withDb(() => db.dashboard.findFirst({ where: { id: d.id, userId: me.id }, select: { spec: true } }))
      if (!cur) return { ok: false as const, reason: 'That dashboard no longer exists.' }
      if (!same(cur.spec, d.before)) return { ok: false as const, reason: 'The dashboard changed since this was proposed. Ask the Assistant to propose it again.' }
      await withDb(() => db.dashboard.update({ where: { id: d.id }, data: { title: d.spec.title, spec: d.spec } }))
    } else {
      const made = await withDb(() => db.dashboard.create({ data: { userId: me.id, title: d.spec.title, spec: d.spec } }))
      d.id = made.id
    }
    c.status = 'applied'
    return { ok: true as const, card: cardOf(c) }
  }
  if (c.status !== 'applied') return { ok: false as const, reason: 'Only an applied change can be undone.' }
  const cur = await withDb(() => db.dashboard.findFirst({ where: { id: d.id, userId: me.id }, select: { spec: true } }))
  if (!cur) return { ok: false as const, reason: 'That dashboard no longer exists.' }
  if (!same(cur.spec, d.spec)) return { ok: false as const, reason: 'The dashboard changed again after this was applied. Change it back by hand or ask the Assistant.' }
  if (d.before) await withDb(() => db.dashboard.update({ where: { id: d.id }, data: { title: d.before!.title, spec: d.before! } }))
  else await withDb(() => db.dashboard.delete({ where: { id: d.id } }))
  c.status = 'undone'
  return { ok: true as const, card: cardOf(c) }
}

// ------------------------------------------------------------------ workflow edits

const nextOf = (n: EngineNode): string[] => (typeof n.next === 'string' ? [n.next] : Array.isArray(n.next) ? n.next.filter((x): x is string => typeof x === 'string') : [])
const setNext = (n: EngineNode, list: string[]) => { if (list.length) n.next = list.length === 1 ? list[0] : list; else delete n.next }
const mappingsOf = (n: EngineNode) => ((n.parameters?.mappings ?? null) as Record<string, string | string[]> | null)

/** Merge `set` into `obj`: null removes a key; objects merge one level (so "what it decides" can add a field). */
function merge(obj: Record<string, unknown>, set: Record<string, unknown>) {
  const out = { ...obj }
  for (const [k, v] of Object.entries(set)) {
    if (v === null) delete out[k]
    else if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = { ...(out[k] as object), ...(v as object) }
    else out[k] = v
  }
  return out
}

/** Readable before → after lines; settings that are objects (out_dict, what it decides) diff field by field. */
function diffLines(type: string, cur: Record<string, unknown>, next: Record<string, unknown>): ChangeLine[] {
  const lines: ChangeLine[] = []
  // The settings form's own names: "What to say", "Instructions", "What it decides"…
  const spec = specFor(type)
  const label = (k: string) => spec.fields.find((f) => f.key === k && !f.advanced)?.label ?? spec.fields.find((f) => f.key === k)?.label ?? k
  const sub = (k: string, s: string) => (k === 'out_dict' && s === 'speak' ? 'What to say' : `${label(k)} · ${s}`)
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  for (const k of Object.keys({ ...cur, ...next })) {
    if (same(cur[k], next[k])) continue
    const a = cur[k], b = next[k]
    if (isObj(a) && isObj(b)) {
      for (const s of Object.keys({ ...a, ...b })) if (!same(a[s], b[s])) lines.push({ what: sub(k, s), from: short(a[s]), to: short(b[s]) })
    } else lines.push({ what: label(k), from: short(a), to: short(b) })
  }
  return lines
}

/** The workflow must still pass the editor's checks (errors only; tips are fine). */
function checked(wf: Workflow) {
  const errors = validate(toGraph(wf)).filter((i) => i.level === 'error')
  if (errors.length) throw new Error(`The workflow would have errors: ${errors.map((e) => `${e.node ? `${e.node}: ` : ''}${e.message}`).join('; ')}`)
  return wf
}

const stepId = (wf: Workflow, ref: unknown) => {
  const r = str(ref)
  if (wf.nodes[r]) return r
  const hit = Object.keys(wf.nodes).find((k) => prettyName(k).toLowerCase() === r.toLowerCase())
  if (!hit) throw new Error(`No step “${r}”. Steps: ${Object.keys(wf.nodes).join(', ')}`)
  return hit
}

// ------------------------------------------------------------------ propose tools

const flowArg = { type: 'string', description: 'Flow key (shortened is fine), vx:flow ref, or name' }

export const WRITE_TOOLS: ToolDef[] = [
  {
    name: 'propose_flow_settings',
    description: 'Propose changing flow-level settings: name, webhook_url, and/or knobs (behaviour settings by key, e.g. {"pre-fire": true, "speaker-turn-timeout-ms": 500}). Use explain("knobs") for keys and allowed values.',
    input: { type: 'object', required: ['flow'], properties: { flow: flowArg, name: { type: 'string' }, webhook_url: { type: 'string' }, knobs: { type: 'object' } } },
    label: (i) => `Proposed settings change for ${i.flow}`,
    run: (me, i) => propose(me, i.flow, 'Change flow settings', (doc) => {
      const patch: Record<string, unknown> = {}
      const lines: ChangeLine[] = []
      if (str(i.name) && i.name !== doc.flow_name) { patch.flow_name = i.name; lines.push({ what: 'Name', from: doc.flow_name, to: i.name }) }
      if (typeof i.webhook_url === 'string' && i.webhook_url !== doc['webhook-url']) { patch['webhook-url'] = i.webhook_url; lines.push({ what: 'Webhook URL', from: doc['webhook-url'], to: i.webhook_url }) }
      for (const [k, v] of Object.entries((i.knobs ?? {}) as Record<string, unknown>)) {
        const knob = KNOBS.find((x) => x.key === k)
        if (!knob) throw new Error(`Unknown setting “${k}”. Use explain("knobs") for the list.`)
        if (knob.kind === 'bool' && typeof v !== 'boolean') throw new Error(`${knob.label} takes true or false.`)
        if ((knob.kind === 'number' || knob.kind === 'slider') && (typeof v !== 'number' || (knob.min !== undefined && v < knob.min) || (knob.max !== undefined && v > knob.max)))
          throw new Error(`${knob.label} takes a number${knob.min !== undefined ? ` from ${knob.min}` : ''}${knob.max !== undefined ? ` to ${knob.max}` : ''}.`)
        if (knob.kind === 'select' && knob.options && !knob.options.some((o) => o.value === v)) throw new Error(`${knob.label} takes one of: ${knob.options.map((o) => o.value).join(', ')}.`)
        const cur = (doc as Record<string, unknown>)[k] ?? knob.default
        if (same(cur, v)) continue
        patch[k] = v
        lines.push({ what: knob.label, from: short(cur), to: short(v) })
      }
      const onlyKnobs = !patch.flow_name && patch['webhook-url'] === undefined
      return { patch, lines: lines.map((l) => ({ ...l, from: short(l.from), to: short(l.to) })), where: onlyKnobs ? ['Behaviour'] : patch['webhook-url'] !== undefined ? ['Webhook'] : ['Overview'], page: onlyKnobs ? 'behaviour' : patch['webhook-url'] !== undefined ? 'webhook' : '' }
    }),
  },
  {
    name: 'propose_voice',
    description: 'Propose changing the speaking voice (kind "speaking", text-to-speech) or listening setup (kind "listening", speech-to-text). `set` holds the fields to change, merged into the current config (e.g. {"speed": 1.0} or {"voice": "<id>", "model": "eleven_v3"}). null removes a field. To switch provider, set "service" and its fields.',
    input: { type: 'object', required: ['flow', 'kind', 'set'], properties: { flow: flowArg, kind: { type: 'string', enum: ['speaking', 'listening'] }, set: { type: 'object' } } },
    label: (i) => `Proposed ${i.kind} change for ${i.flow}`,
    run: (me, i) => propose(me, i.flow, i.kind === 'speaking' ? 'Change the speaking voice' : 'Change the listening setup', (doc) => {
      const key = i.kind === 'speaking' ? 'tts' : 'stt'
      const cur = ((doc as Record<string, unknown>)[key] ?? {}) as Record<string, unknown>
      const next = merge(cur, (i.set ?? {}) as Record<string, unknown>)
      if (!str(next.service)) throw new Error('A voice setup needs a "service" (provider).')
      const list = key === 'tts' ? TTS_PROVIDERS : STT_PROVIDERS
      const prov = (svc: unknown) => list.find((p) => p.service === svc)
      const label = (k: string) => k === 'service' ? 'Provider' : prov(next.service)?.fields.find((x) => x.key === k)?.label ?? prov(cur.service)?.fields.find((x) => x.key === k)?.label ?? k
      const val = (k: string, v: unknown) => (k === 'service' ? prov(v)?.label ?? v : v)
      const lines = Object.keys({ ...cur, ...next }).filter((k) => !same(cur[k], next[k])).map((k) => ({ what: label(k), from: short(val(k, cur[k])), to: short(val(k, next[k])) }))
      return { patch: { [key]: next }, lines, where: ['Voice', key === 'tts' ? 'Speaking voice' : 'Listening'], page: 'voice' }
    }),
  },
  {
    name: 'propose_step_settings',
    description: 'Propose changing settings of one workflow step. `set` is merged into the step\'s parameters (e.g. {"system_prompt": "…"}, {"model": "openai/gpt-oss-120b", "service": "groq"}, {"llm_return_type": {"outcome": {"type": "str", "description": "booked|callback|other"}}}). null removes a key. Read the step first with get_step.',
    input: { type: 'object', required: ['flow', 'step', 'set'], properties: { flow: flowArg, step: { type: 'string' }, set: { type: 'object' } } },
    label: (i) => `Proposed change to step “${i.step}”`,
    run: (me, i) => propose(me, i.flow, `Change the “${prettyName(str(i.step))}” step`, (doc) => {
      const wf = structuredClone(doc.workflow)
      const id = stepId(wf, i.step)
      const cur = wf.nodes[id].parameters ?? {}
      // Models sometimes wrap the change as {parameters: {...}}: take what's inside.
      let set = (i.set ?? {}) as Record<string, unknown>
      if (Object.keys(set).length === 1 && set.parameters && typeof set.parameters === 'object' && !('parameters' in cur)) set = set.parameters as Record<string, unknown>
      const next = merge(cur, set)
      wf.nodes[id].parameters = next
      checked(wf)
      return { patch: { workflow: wf }, lines: diffLines(wf.nodes[id].type, cur, next), where: ['Workflow', `${prettyName(id)} step`], page: 'workflow' }
    }),
  },
  {
    name: 'propose_add_step',
    description: `Propose adding a step. type is one of: ${NODE_SPECS.filter((s) => !s.hidden && !s.unsupported).map((s) => `${s.type} (${s.label})`).join(', ')}. Defaults come from the step type; \`parameters\` override them. after: the step it follows (via: "next", or a branch path value). then: the step it continues to.`,
    input: {
      type: 'object', required: ['flow', 'id', 'type'],
      properties: { flow: flowArg, id: { type: 'string', description: 'New step id, lowercase_with_underscores' }, type: { type: 'string' }, parameters: { type: 'object' }, after: { type: 'string' }, via: { type: 'string' }, then: { type: 'string' } },
    },
    label: (i) => `Proposed new step “${i.id}”`,
    run: (me, i) => propose(me, i.flow, `Add a “${prettyName(str(i.id))}” step`, (doc) => {
      const wf = structuredClone(doc.workflow)
      const id = str(i.id).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')
      if (!id) throw new Error('Give the new step an id.')
      if (wf.nodes[id]) throw new Error(`A step “${id}” already exists.`)
      const spec = NODE_SPECS.find((s) => s.type === i.type && !s.hidden)
      if (!spec || spec.unsupported) throw new Error(`Unknown or unavailable step type “${i.type}”.`)
      const node: EngineNode = { type: spec.type, parameters: merge(structuredClone(spec.defaults), (i.parameters ?? {}) as Record<string, unknown>) }
      for (const k of Object.keys(node.parameters!)) if (node.parameters![k] === undefined) delete node.parameters![k]
      const lines: ChangeLine[] = [{ what: 'New step', to: `${prettyName(id)} (${spec.label})` }]
      if (str(i.then)) { const t = stepId(wf, i.then); node.next = t; lines.push({ what: `${prettyName(id)} continues to`, to: prettyName(t) }) }
      wf.nodes[id] = node
      if (str(i.after)) {
        const a = stepId(wf, i.after)
        const via = str(i.via) || 'next'
        if (via === 'next') setNext(wf.nodes[a], [...nextOf(wf.nodes[a]), id])
        else {
          const maps = mappingsOf(wf.nodes[a])
          if (!maps || !(via in maps)) throw new Error(`“${a}” has no branch path “${via}”.`)
          maps[via] = id
        }
        lines.push({ what: `${prettyName(a)}${via === 'next' ? '' : ` (path “${via}”)`} now leads to`, to: prettyName(id) })
      }
      checked(wf)
      return { patch: { workflow: wf }, lines, where: ['Workflow'], page: 'workflow' }
    }),
  },
  {
    name: 'propose_remove_step',
    description: 'Propose removing a workflow step and every connection to it. Steps that led to it lose that connection (use propose_connections to rewire if needed). The first step can\'t be removed.',
    input: { type: 'object', required: ['flow', 'step'], properties: { flow: flowArg, step: { type: 'string' } } },
    label: (i) => `Proposed removing step “${i.step}”`,
    run: (me, i) => propose(me, i.flow, `Remove the “${prettyName(str(i.step))}” step`, (doc) => {
      const wf = structuredClone(doc.workflow)
      const id = stepId(wf, i.step)
      if (toGraph(wf).nodes[0]?.id === id) throw new Error('The first step can’t be removed; make another step first in the editor.')
      const lines: ChangeLine[] = [{ what: 'Removed step', from: `${prettyName(id)} (${specFor(wf.nodes[id].type).label})` }]
      delete wf.nodes[id]
      for (const [k, n] of Object.entries(wf.nodes)) {
        if (nextOf(n).includes(id)) { setNext(n, nextOf(n).filter((x) => x !== id)); lines.push({ what: `${prettyName(k)} no longer leads to`, from: prettyName(id) }) }
        const maps = mappingsOf(n)
        if (maps) for (const [v, t] of Object.entries(maps)) if (t === id || (Array.isArray(t) && t.includes(id))) { delete maps[v]; lines.push({ what: `${prettyName(k)} path “${v}” removed`, from: prettyName(id) }) }
      }
      checked(wf)
      return { patch: { workflow: wf }, lines, where: ['Workflow'], page: 'workflow' }
    }),
  },
  {
    name: 'propose_connections',
    description: 'Propose connecting or disconnecting steps. Each item: {from, to, via?: "next" or a branch path value, remove?: true}. A branch path points at one step, so connecting a path replaces where it went.',
    input: {
      type: 'object', required: ['flow', 'links'],
      properties: { flow: flowArg, links: { type: 'array', items: { type: 'object', required: ['from', 'to'], properties: { from: { type: 'string' }, to: { type: 'string' }, via: { type: 'string' }, remove: { type: 'boolean' } } } } },
    },
    label: (i) => `Proposed rewiring in ${i.flow}`,
    run: (me, i) => propose(me, i.flow, 'Rewire the workflow', (doc) => {
      const wf = structuredClone(doc.workflow)
      const lines: ChangeLine[] = []
      for (const l of (Array.isArray(i.links) ? i.links : []) as { from: string; to: string; via?: string; remove?: boolean }[]) {
        const a = stepId(wf, l.from), b = stepId(wf, l.to), via = l.via || 'next'
        if (via === 'next') {
          const list = nextOf(wf.nodes[a])
          if (l.remove) { if (!list.includes(b)) continue; setNext(wf.nodes[a], list.filter((x) => x !== b)) }
          else { if (list.includes(b)) continue; setNext(wf.nodes[a], [...list, b]) }
        } else {
          const maps = mappingsOf(wf.nodes[a])
          if (!maps) throw new Error(`“${a}” isn’t a branch, so it has no path “${via}”.`)
          if (l.remove) { if (maps[via] !== b) continue; delete maps[via] } else { if (maps[via] === b) continue; maps[via] = b }
        }
        lines.push({ what: `${prettyName(a)}${via === 'next' ? '' : ` path “${via}”`} ${l.remove ? 'no longer leads to' : 'leads to'}`, to: prettyName(b) })
      }
      checked(wf)
      return { patch: { workflow: wf }, lines, where: ['Workflow'], page: 'workflow' }
    }),
  },
  {
    name: 'propose_looks',
    description: 'Propose the flow\'s avatar looks: the full list, in order (first is the default). Each: {uuid (a face id from list_faces), label, usage (when to use it)}.',
    input: { type: 'object', required: ['flow', 'looks'], properties: { flow: flowArg, looks: { type: 'array', items: { type: 'object', required: ['uuid', 'label'], properties: { uuid: { type: 'string' }, label: { type: 'string' }, usage: { type: 'string' } } } } } },
    label: (i) => `Proposed looks for ${i.flow}`,
    run: (me, i) => propose(me, i.flow, 'Change the avatar looks', (doc) => {
      const looks = (Array.isArray(i.looks) ? i.looks : []) as { uuid: string; label: string; usage?: string }[]
      const faces = { ...doc.faces, expressions: looks.map((l) => ({ uuid: l.uuid, label: l.label, usage: l.usage ?? '' })) }
      const was = doc.faces.expressions.map((e) => `${e.label}`).join(', ') || '—'
      const now = faces.expressions.map((e) => `${e.label}`).join(', ') || '—'
      return { patch: { faces }, lines: same(doc.faces.expressions, faces.expressions) ? [] : [{ what: 'Looks', from: was, to: now }], where: ['Avatar', 'Looks'], page: 'avatar' }
    }),
  },
]

// The dashboard tools live in their own file (which imports this one); reach them lazily.
let dashTools: ToolDef[] = []
export const registerDashboardTools = (t: ToolDef[]) => { dashTools = t }
const DASHBOARD_TOOLS_REF = () => dashTools

/** Runs a propose tool; errors go back to the model as text so it can fix the proposal. */
export async function runWrite(me: AuthUser, name: string, input: Record<string, unknown>) {
  const tool = [...WRITE_TOOLS, ...DASHBOARD_TOOLS_REF()].find((t) => t.name === name)!
  try {
    return { ok: true, label: tool.label(input), result: cap(await tool.run(me, input)) }
  } catch (e) {
    return { ok: false, label: tool.label(input), result: { error: (e as Error).message } }
  }
}
