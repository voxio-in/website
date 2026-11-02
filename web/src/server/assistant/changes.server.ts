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
import { STT_PROVIDERS, TTS_PROVIDERS, activeFields, providerFor, type ProviderField } from '#/lib/dashboard/providers'
import { startNodeOf, toGraph, type EngineNode, type Workflow } from '#/lib/workflow/convert'
import { validate } from '#/lib/workflow/validate'
import { NODE_SPECS, devKeysOf, prettyName, specFor } from '#/lib/workflow/registry'
import { applyFlowPatch, readFlowDoc } from '#/server/dashboard/api'
import { blankFlow, createFlowRow, flowKey, markFlowDeleted } from '#/server/dashboard/store.server'
import { OFFERED_TEMPLATES } from '#/lib/workflow/templates'
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
  /** Set for a new flow: Apply creates it (flowKey is set then), Undo deletes it. */
  newFlow?: FlowDoc
}

/** What the chat shows for a change: no patches, just the card. */
export const cardOf = (c: Change) => ({
  id: c.id, flow: c.flowName, title: c.title, where: c.where, lines: c.lines, status: c.status,
  page: c.dashboard ? (c.dashboard.id ? `vx:dash/${c.dashboard.id}` : undefined) : c.flowKey ? `vx:page/${c.flowKey.slice(0, 11)}/${c.page}` : undefined,
  // A VAD proposal shows what Apply makes: the layout as it will look, and the words for it.
  ...(c.dashboard ? {
    vad: {
      // New means no VAD before it; after Apply the id is set but it was still a new one.
      isNew: !c.dashboard.before,
      title: c.dashboard.spec.title,
      boxes: c.dashboard.spec.layout.map((l) => {
        const w = c.dashboard!.spec.widgets.find((x) => x.id === l.i)
        return { x: l.x, y: l.y, w: l.w, h: l.h, title: w ? ('title' in w && w.title ? String(w.title) : w.type) : l.i, type: w?.type ?? 'text' }
      }),
    },
  } : {}),
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
export async function propose(me: AuthUser, flowRef: unknown, title: string, build: (doc: FlowDoc) => Built) {
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

type ActResult = { ok: true; card: ReturnType<typeof cardOf> } | { ok: false; reason: string }
// One user's Apply / Discard / Undo run one at a time. Each save is several round trips to the
// database; clicking Apply on many cards (or Apply all on top) ran them all at once and used up
// the connection pool. In order, nothing waits on a connection and no card is applied twice.
const acting = new Map<string, Promise<unknown>>()

/** Apply, discard or undo, as the signed-in user. */
export function act(me: AuthUser, id: string, action: 'apply' | 'discard' | 'undo'): Promise<ActResult> {
  const prev = acting.get(me.id) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(() => actNow(me, id, action))
  acting.set(me.id, next)
  void next.finally(() => { if (acting.get(me.id) === next) acting.delete(me.id) }).catch(() => {})
  return next
}

async function actNow(me: AuthUser, id: string, action: 'apply' | 'discard' | 'undo'): Promise<ActResult> {
  const c = CHANGES.get(id)
  if (!c || c.userId !== me.id) return { ok: false, reason: 'This change has expired. Ask the Assistant to propose it again.' }
  if (action === 'discard') {
    if (c.status !== 'pending' && c.status !== 'stale') return { ok: false, reason: 'Only a change that hasn’t been applied can be discarded.' }
    c.status = 'discarded'
    return { ok: true, card: cardOf(c) }
  }
  if (c.dashboard) return actDashboard(me, c, action)
  if (c.newFlow) {
    if (action === 'apply') {
      if (c.status !== 'pending') return { ok: false, reason: `Already ${c.status}.` }
      const doc = { ...structuredClone(c.newFlow), key: flowKey(), created_at: new Date().toISOString() }
      try { await createFlowRow(me.id, doc) } catch (e) { return { ok: false, reason: `Couldn’t create the flow: ${(e as Error).message}` } }
      c.flowKey = doc.key
      c.status = 'applied'
      return { ok: true, card: cardOf(c) }
    }
    if (c.status !== 'applied') return { ok: false, reason: 'Only an applied change can be undone.' }
    await markFlowDeleted(me.id, c.flowKey)
    c.status = 'undone'
    return { ok: true, card: cardOf(c) }
  }
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



/** The workflow must still pass the editor's checks (errors only; tips are fine). */
function checked(wf: Workflow) {
  const errors = validate(toGraph(wf)).filter((i) => i.level === 'error')
  if (errors.length) throw new Error(`The workflow would have errors: ${errors.map((e) => `${e.node ? `${e.node}: ` : ''}${e.message}`).join('; ')}`)
  return wf
}


// ------------------------------------------------------------------ edit_workflow
// Every workflow change in one call: a list of changes applied in order to a draft,
// checked once at the end. Steps added early in the list can be used by later
// changes, and in-between states (a step not connected yet) are fine. One card.

type Op = {
  do: 'add' | 'remove' | 'set' | 'connect' | 'disconnect' | 'place' | 'rename' | 'start'
  id?: string; type?: string; set?: Record<string, unknown>
  step?: string; key?: string; value?: unknown
  from?: string; to?: string; path?: string
  after?: string; before?: string; bridge?: boolean
}

/** A setting's name as the editor shows it ("What it says"), not its raw key (out_dict.speak). */
function keyLabel(type: string, key: string) {
  const [root, part] = key.split('.')
  if (root === 'out_dict' && part === 'speak') return 'What it says'
  if (root === 'out_dict' && part === 'hangup') return 'Hangs up after saying it'
  if (root === 'llm_return_type' && part) return part === 'hangup' ? 'Can end the call' : `Decides “${part}”`
  if (root === 'input_variables' && part) return `Reads “${part}”`
  const f = specFor(type).fields.find((x) => x.key === root)
  return f ? (part ? `${f.label} · ${part}` : f.label) : key
}

/** Where a step goes is set with connect/place, never as a setting. */
const WIRING = ['mappings', 'next', 'default']
const WIRING_HINT = 'Where steps go is set with {do:"connect", from, to, path?} (a Branch path: path is the matched value), not as a setting.'

const ADDABLE = NODE_SPECS.filter((x) => !x.hidden && !x.unsupported)
/** Each step type and the parameter keys it reads (the registry's, minus internal ones). */
const STEP_KEYS = ADDABLE.map((x) => {
  const keys = new Set([...x.fields.map((f) => f.key), ...Object.keys(x.defaults), ...(x.dev ? devKeysOf(x.dev) : [])])
  for (const k of [...(x.internal ?? []), ...WIRING]) keys.delete(k)
  return `${x.type} (${x.label}): ${[...keys].join(', ')}`
}).join('; ')

const idOf = (v: unknown) => str(v).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')

/** Every place a step is pointed at: `next` lists and branch paths. */
function refsTo(wf: Workflow, id: string) {
  const out: { from: string; path?: string }[] = []
  for (const [k, n] of Object.entries(wf.nodes)) {
    if (nextOf(n).includes(id)) out.push({ from: k })
    for (const [v, t] of Object.entries(mappingsOf(n) ?? {})) if (t === id || (Array.isArray(t) && t.includes(id))) out.push({ from: k, path: v })
  }
  return out
}
/** Points whatever led to `id` at `to` instead (a list to keep several next steps). */
function repoint(wf: Workflow, id: string, to: string[]) {
  for (const [, n] of Object.entries(wf.nodes)) {
    const next = nextOf(n)
    if (next.includes(id)) setNext(n, [...new Set(next.flatMap((x) => (x === id ? to : [x])))])
    const maps = mappingsOf(n)
    if (maps) for (const [v, t] of Object.entries(maps)) {
      if (t === id) { if (to.length) maps[v] = to.length === 1 ? to[0] : to; else delete maps[v] }
      else if (Array.isArray(t) && t.includes(id)) maps[v] = [...new Set(t.flatMap((x) => (x === id ? to : [x])))]
    }
  }
}
/** Takes a step out of the chain, joining what led to it with where it went. */
function detach(wf: Workflow, id: string) {
  const next = nextOf(wf.nodes[id]).filter((x) => x !== id)
  repoint(wf, id, next)
  delete wf.nodes[id].next
}
/** Sets a dotted key ("out_dict.speak") in a step's parameters; null removes it. */
function setPath(params: Record<string, unknown>, key: string, value: unknown) {
  const parts = key.split('.').filter(Boolean)
  if (!parts.length) throw new Error('needs a key.')
  if (WIRING.includes(parts[0])) throw new Error(`“${parts[0]}” isn’t a setting. ${WIRING_HINT}`)
  // A plain list of names is the same as {name: "str"} (the engine's form).
  if (parts.length === 1 && parts[0] === 'input_variables' && Array.isArray(value) && value.every((v) => typeof v === 'string')) value = Object.fromEntries(value.map((v) => [v, 'str']))
  let o = params
  for (const k of parts.slice(0, -1)) {
    if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}
    o = o[k] as Record<string, unknown>
  }
  const last = parts[parts.length - 1]
  if (value === null || value === undefined) delete o[last]
  else o[last] = value
}
const getPath = (params: Record<string, unknown>, key: string) =>
  key.split('.').filter(Boolean).reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), params)

export function editWorkflow(src: Workflow, ops: Op[]): { wf: Workflow; lines: ChangeLine[] } {
  const wf = structuredClone(src)
  wf.nodes ??= {}
  const lines: ChangeLine[] = []
  const name = (id: string) => prettyName(id)
  ops.forEach((op, n) => {
    const step = (v: unknown) => {
      const r = str(v)
      if (wf.nodes[r]) return r
      const hit = Object.keys(wf.nodes).find((k) => prettyName(k).toLowerCase() === r.toLowerCase() || k === idOf(r))
      if (!hit) throw new Error(`no step “${r}”. Steps now: ${Object.keys(wf.nodes).join(', ')}`)
      return hit
    }
    try {
      switch (op.do) {
        case 'add': {
          const id = idOf(op.id)
          if (!id) throw new Error('give the new step an id (lowercase_with_underscores).')
          if (wf.nodes[id]) throw new Error(`a step “${id}” already exists.`)
          const spec = ADDABLE.find((x) => x.type === op.type)
          if (!spec) throw new Error(`unknown step type “${str(op.type)}”. Types: ${ADDABLE.map((x) => x.type).join(', ')}`)
          const params = structuredClone(spec.defaults) as Record<string, unknown>
          // The editor's placeholder paths ("true"/"false" leading nowhere): a Branch gets only the paths connected to it.
          if (spec.type === 'conditional') params.mappings = {}
          for (const [k, v] of Object.entries(op.set ?? {})) setPath(params, k, v)
          for (const k of Object.keys(params)) if (params[k] === undefined) delete params[k]
          wf.nodes[id] = { type: spec.type, parameters: params }
          if (!Object.keys(wf.nodes).some((k) => k !== id)) wf.start_node = id
          lines.push({ what: 'New step', to: `${name(id)} (${spec.label})` })
          break
        }
        case 'remove': {
          const id = step(op.step)
          const next = nextOf(wf.nodes[id]).filter((x) => x !== id)
          const isStart = startNodeOf(wf) === id
          if (isStart && next.length !== 1) throw new Error(`“${id}” is the start step; say which step starts instead with {do:"start"} first.`)
          // By default the steps around it are joined, so the flow keeps working.
          if (op.bridge === false) repoint(wf, id, []); else repoint(wf, id, next)
          delete wf.nodes[id]
          if (isStart) wf.start_node = next[0]
          lines.push({ what: 'Removed step', from: name(id) })
          break
        }
        case 'set': {
          const id = step(op.step)
          const key = str(op.key).trim()
          if (!key) throw new Error('needs a key, e.g. "out_dict.speak" or "system_prompt".')
          const params = (wf.nodes[id].parameters ??= {})
          const was = getPath(params, key)
          setPath(params, key, op.value)
          if (!same(was, op.value)) lines.push({ what: `${name(id)} · ${keyLabel(String(wf.nodes[id].type), key)}`, from: short(was), to: op.value === null ? 'removed' : short(op.value) })
          break
        }
        case 'connect': case 'disconnect': {
          const a = step(op.from)
          const path = str(op.path)
          const node = wf.nodes[a]
          if (path) {
            if (node.type !== 'conditional') throw new Error(`“${a}” isn’t a Branch, so it has no paths; leave "path" out.`)
            const maps = ((node.parameters ??= {}).mappings ??= {}) as Record<string, unknown>
            if (op.do === 'connect') { const b = step(op.to); maps[path] = b; lines.push({ what: `${name(a)} path “${path}” leads to`, to: name(b) }) }
            else { delete maps[path]; lines.push({ what: `${name(a)} path “${path}” removed` }) }
          } else {
            const b = step(op.to)
            const list = nextOf(node)
            if (op.do === 'connect') { if (!list.includes(b)) setNext(node, [...list, b]); lines.push({ what: `${name(a)} leads to`, to: name(b) }) }
            else { setNext(node, list.filter((x) => x !== b)); lines.push({ what: `${name(a)} no longer leads to`, from: name(b) }) }
          }
          break
        }
        case 'place': {
          // Moves a step (or puts a new one) right after `after`: between it and `before`,
          // or, without `before`, taking over where `after` went.
          const id = step(op.step), a = step(op.after)
          if (id === a) throw new Error('a step can’t follow itself.')
          if (refsTo(wf, id).length || nextOf(wf.nodes[id]).length) detach(wf, id)
          const out = nextOf(wf.nodes[a])
          if (op.before) {
            const b = step(op.before)
            if (!out.includes(b)) throw new Error(`“${a}” doesn’t lead to “${b}”; use connect instead.`)
            setNext(wf.nodes[a], out.map((x) => (x === b ? id : x)))
            setNext(wf.nodes[id], [b])
          } else {
            setNext(wf.nodes[id], out)
            setNext(wf.nodes[a], [id])
          }
          if (startNodeOf(wf) === undefined) wf.start_node = a
          lines.push({ what: `${name(id)} now comes after`, to: name(a) })
          break
        }
        case 'rename': {
          const id = step(op.step), to = idOf(op.to)
          if (!to) throw new Error('needs the new id in "to".')
          if (wf.nodes[to]) throw new Error(`a step “${to}” already exists.`)
          const wasStart = startNodeOf(wf) === id
          wf.nodes[to] = wf.nodes[id]
          delete wf.nodes[id]
          repoint(wf, id, [to])
          if (wasStart) wf.start_node = to
          if (wf.ui?.positions?.[id]) { wf.ui.positions[to] = wf.ui.positions[id]; delete wf.ui.positions[id] }
          lines.push({ what: 'Renamed step', from: name(id), to: name(to) })
          break
        }
        case 'start': {
          const id = step(op.step)
          wf.start_node = id
          lines.push({ what: 'Starts with', to: name(id) })
          break
        }
        default: throw new Error(`unknown change “${str((op as { do?: unknown }).do)}”.`)
      }
    } catch (e) {
      throw new Error(`Change ${n + 1} (${str(op.do)}): ${(e as Error).message}`)
    }
  })
  // A step nothing leads to never runs: say so on the card rather than hide it.
  const start = startNodeOf(wf)
  const loose = Object.keys(wf.nodes).filter((k) => k !== start && !refsTo(wf, k).length)
  if (loose.length) lines.push({ what: 'Not connected yet (never runs)', to: loose.map(name).join(', ') })
  // A value this change makes a step wait for, that no step provides: the step would never get it.
  const missing = (w: Workflow) => validate(toGraph(w)).filter((i) => i.level === 'warning' && /provides/.test(i.message)).map((i) => `${i.node}: ${i.message}`)
  const had = new Set(missing(src))
  const added = missing(wf).filter((m) => !had.has(m))
  if (added.length) throw new Error(`${added.join(' ')} Make the step that provides it in the same list (for an AI decision: set "llm_return_type.<name>" on the AI step).`)
  return { wf: checked(wf), lines }
}

// ------------------------------------------------------------------ edit_settings
// Flow name, webhook, behaviour and the two voice setups, every change in one call.
// Keys are closed lists (behaviour keys are an enum; voice keys are the provider's own
// fields), values are checked against the field's kind and options, and the errors
// say what is allowed. The avatar's settings and looks aren't part of it.

type SettingsOp = { area: 'name' | 'webhook' | 'behaviour' | 'speaking' | 'listening'; key?: string; value?: unknown }

const BEHAVIOUR = KNOBS.filter((k) => k.group !== 'Avatar')
const BEHAVIOUR_TEXT = BEHAVIOUR.map((k) => {
  const kind = k.kind === 'select' ? (k.options ?? []).map((o) => o.value).join('|')
    : k.kind === 'object' ? `parts ${Object.keys(k.default as object).join(', ')}; set only the parts asked for, each with key "${k.key}.<part>"`
    : k.kind === 'bool' ? 'true|false' : `number${k.min !== undefined ? ` ${k.min}–${k.max}` : ''}`
  return `${k.key} (${k.label}): ${kind}`
}).join('; ')
const providersText = (kind: 'stt' | 'tts') => (kind === 'stt' ? STT_PROVIDERS : TTS_PROVIDERS).map((x) => `${x.service} (${x.label})`).join(', ')

/** A value for one provider field, or why it can't be. */
function fieldValue(f: ProviderField, v: unknown): unknown {
  if (v === null) return null
  if (f.kind === 'bool') { if (typeof v !== 'boolean') throw new Error(`${f.key} takes true or false.`); return v }
  if (f.kind === 'number' || f.kind === 'slider') {
    const n = typeof v === 'string' ? Number(v) : v
    if (typeof n !== 'number' || Number.isNaN(n)) throw new Error(`${f.key} takes a number.`)
    if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) throw new Error(`${f.key} takes ${f.min} to ${f.max}.`)
    return n
  }
  if (f.kind === 'tags') return Array.isArray(v) ? v.map(String) : String(v).split(',').map((x) => x.trim()).filter(Boolean)
  if (f.kind === 'select' && f.options?.length && !f.options.some((o) => o.value === v)) {
    // Labels work too ("Thalia" for aura-2-thalia-en).
    const byLabel = f.options.find((o) => o.label.toLowerCase() === String(v).toLowerCase())
    if (byLabel) return byLabel.value
    throw new Error(`${f.key} takes one of: ${f.options.slice(0, 40).map((o) => o.value).join(', ')}${f.options.length > 40 ? ', …' : ''}. voice_options lists them with descriptions.`)
  }
  return String(v)
}

/** The backend's own rules for object settings (dcs voice_/inactivity_config_.py), checked before a card is made. */
function checkPart(key: string, obj: Record<string, unknown>) {
  if (key !== 'inactivity-metadata') return
  const t = obj['inactivity-type'] ?? 'static'
  if (t !== 'static' && t !== 'dynamic') throw new Error('inactivity-type is "static" (says message, a fixed text) or "dynamic" (message is a list of lines it picks from).')
  if (t === 'static' && typeof obj.message !== 'string') throw new Error('with inactivity-type "static", message is one text, e.g. "Are you still there?".')
  if (t === 'dynamic' && !Array.isArray(obj.message)) throw new Error('with inactivity-type "dynamic", message is a list of texts.')
  if (typeof obj['time-period'] !== 'number' || obj['time-period'] <= 0) throw new Error('time-period is seconds, above 0.')
  if (!Number.isInteger(obj['max-times']) || (obj['max-times'] as number) < 0) throw new Error('max-times is a whole number, 0 or more.')
}

export function editSettings(doc: FlowDoc, ops: SettingsOp[]): { patch: Record<string, unknown>; lines: ChangeLine[] } {
  const patch: Record<string, unknown> = {}
  const lines: ChangeLine[] = []
  const now = (k: string) => (k in patch ? patch[k] : (doc as Record<string, unknown>)[k])
  ops.forEach((op, n) => {
    try {
      switch (op.area) {
        case 'name': {
          const v = str(op.value).trim()
          if (!v) throw new Error('needs the new name in "value".')
          if (v !== now('flow_name')) { lines.push({ what: 'Name', from: now('flow_name'), to: v }); patch.flow_name = v }
          break
        }
        case 'webhook': {
          const v = str(op.value).trim()
          if (v && !/^https?:\/\/\S+$/.test(v)) throw new Error('the webhook must be an http(s) URL, or "" to turn it off.')
          if (v !== (now('webhook-url') ?? '')) { lines.push({ what: 'Webhook URL', from: short(now('webhook-url')), to: v || 'off' }); patch['webhook-url'] = v }
          break
        }
        case 'behaviour': {
          const [root, ...rest] = str(op.key).split('.')
          const knob = BEHAVIOUR.find((k) => k.key === root)
          if (!knob) throw new Error(`unknown behaviour setting “${root}”. Settings: ${BEHAVIOUR.map((k) => k.key).join(', ')}`)
          let v = op.value
          if (rest.length) {
            if (knob.kind !== 'object') throw new Error(`${knob.key} has no parts; set it whole.`)
            const obj = structuredClone((now(knob.key) ?? knob.default ?? {}) as Record<string, unknown>)
            // Only parts the backend reads (the defaults'), so a stray old key isn't offered.
            const parts = new Set(Object.keys(knob.default as object))
            if (!parts.has(rest[0])) throw new Error(`${knob.key} has no part “${rest[0]}”. Parts: ${[...parts].join(', ')}`)
            obj[rest[0]] = v
            checkPart(knob.key, obj)
            v = obj
          } else if (knob.kind === 'bool' && typeof v !== 'boolean') throw new Error(`${knob.key} takes true or false.`)
          else if ((knob.kind === 'number' || knob.kind === 'slider') && (typeof v !== 'number' || (knob.min !== undefined && v < knob.min) || (knob.max !== undefined && v > knob.max)))
            throw new Error(`${knob.key} takes a number${knob.min !== undefined ? ` from ${knob.min} to ${knob.max}` : ''}.`)
          else if (knob.kind === 'select' && !knob.options?.some((o) => o.value === v)) throw new Error(`${knob.key} takes one of: ${knob.options?.map((o) => o.value).join(', ')}.`)
          const cur = now(knob.key) ?? knob.default
          if (knob.kind === 'object' && !rest.length) {
            // Whole objects carry parts nobody asked to change; only the parts named are set.
            throw new Error(`set only the parts you need, each as its own change with key "${knob.key}.<part>". Parts: ${[...new Set([...Object.keys(knob.default as object), ...Object.keys((cur ?? {}) as object)])].join(', ')}`)
          }
          if (!same(cur, v)) { lines.push({ what: str(op.key) === knob.key ? knob.label : `${knob.label} · ${rest.join('.')}`, from: short(rest.length ? (cur as Record<string, unknown>)?.[rest[0]] : cur), to: short(op.value) }); patch[knob.key] = v }
          break
        }
        case 'speaking': case 'listening': {
          const kind = op.area === 'speaking' ? 'tts' : 'stt'
          const cur = ((now(kind) ?? {}) as Record<string, unknown>)
          let key = str(op.key)
          if (key === 'service') {
            const prov = providerFor(kind, str(op.value))
            if (!prov) throw new Error(`unknown provider “${str(op.value)}”. Providers: ${providersText(kind)}`)
            if (prov.service === cur.service) break
            // A new provider starts from its own defaults; later changes in the list adjust it.
            patch[kind] = { service: prov.service, ...structuredClone(prov.defaults) }
            lines.push({ what: `${op.area === 'speaking' ? 'Speaking' : 'Listening'} provider`, from: providerFor(kind, str(cur.service))?.label ?? short(cur.service), to: prov.label })
            break
          }
          const prov = providerFor(kind, str(cur.service))
          if (!prov) throw new Error(`no ${op.area} provider is set yet; set "service" first.`)
          // Some providers pick the voice through another setting (Deepgram Aura: each voice is a
          // model). "voice" then means that setting, instead of failing the same way every retry.
          const fields = activeFields(prov, cur)
          if (!fields.some((x) => x.key === key) && /^(voice|voice_?id|speaker)$/i.test(key)) {
            const alt = fields.find((x) => /^(voice|voice_?id|speaker|model)$/i.test(x.key))
            if (alt) key = alt.key
          }
          const f = fields.find((x) => x.key === key)
          if (!f) throw new Error(`${prov.label} has no setting “${key}”. Its settings (what voice_options would show): ${fields.map((x) => `${x.key}${x.label && x.label.toLowerCase() !== x.key ? ` (${x.label})` : ''}${x.options?.length ? `: ${x.options.slice(0, 40).map((o) => (o.value === o.label ? o.value : `${o.value} = ${o.label}`)).join(', ')}${x.options.length > 40 ? ', …' : ''}` : ''}`).join('; ')}. Use these exact keys and values.`)
          const v = fieldValue(f, op.value)
          const next = { ...cur }
          if (v === null) delete next[key]; else next[key] = v
          if (!same(cur[key], next[key])) {
            const label = (x: unknown) => f.options?.find((o) => o.value === x)?.label ?? x
            lines.push({ what: `${op.area === 'speaking' ? 'Speaking' : 'Listening'} · ${f.label}`, from: short(label(cur[key] ?? f.default)), to: v === null ? 'removed' : short(label(v)) })
            patch[kind] = next
          }
          break
        }
        default: throw new Error(`unknown area “${str((op as { area?: unknown }).area)}”.`)
      }
    } catch (e) {
      throw new Error(`Change ${n + 1} (${str(op.area)}${op.key ? ` ${op.key}` : ''}): ${(e as Error).message}`)
    }
  })
  return { patch, lines }
}

// ------------------------------------------------------------------ create_flow
// A new flow from a description: the model picks a starting template (closed list) and
// writes the words (name, greeting, instructions); the server builds it from the template,
// applies any settings with editSettings, checks the workflow, and shows one card.

const STARTS = OFFERED_TEMPLATES.filter((t) => t.id !== 'blank')

export function buildNewFlow(i: { name: string; start?: string; greeting?: string; instructions: string; language?: string; settings?: SettingsOp[] }) {
  const name = str(i.name).trim()
  if (!name) throw new Error('needs a name.')
  const instructions = str(i.instructions).trim()
  if (instructions.length < 20) throw new Error('needs instructions: what the agent is for, what it should ask and how it should answer (a few sentences).')
  const tpl = STARTS.find((t) => t.id === (i.start || 'simple'))
  if (!tpl) throw new Error(`start must be one of: ${STARTS.map((t) => `${t.id} (${t.blurb})`).join('; ')}`)
  const wf = structuredClone(tpl.workflow)
  const nodes = (wf.nodes ?? {}) as Record<string, EngineNode>
  const first = nodes[startNodeOf(wf) ?? '']
  const greeting = str(i.greeting).trim()
  if (greeting) {
    if (first?.type !== 'out') throw new Error(`the "${tpl.id}" start has no greeting step; leave greeting out.`)
    first.parameters = { ...first.parameters, out_dict: { ...((first.parameters?.out_dict as object) ?? {}), speak: greeting } }
  }
  let prompts = 0
  for (const n of Object.values(nodes)) if (n.parameters && 'system_prompt' in n.parameters) { n.parameters.system_prompt = instructions; prompts++ }
  if (!prompts) throw new Error(`the "${tpl.id}" start has no AI step to give instructions to.`)
  checked(wf)
  const doc = blankFlow('new', name, wf)
  const lines: ChangeLine[] = [
    { what: 'New flow', to: name },
    { what: 'Starts from', to: tpl.name },
    ...(greeting ? [{ what: 'Greeting', to: short(greeting) }] : []),
    { what: 'Instructions', to: short(instructions) },
  ]
  // The language the callers speak goes to listening too, or a Hindi agent would hear English.
  const lang = str(i.language).trim()
  const ops = [...(i.settings ?? [])]
  if (lang && !ops.some((o) => o.area === 'listening' && o.key === 'language')) {
    const stt = providerFor('stt', str((doc.stt as { service?: string })?.service))
    const lf = stt && activeFields(stt, doc.stt as Record<string, unknown>).find((f) => f.key === 'language')
    const opt = lf?.options?.find((o) => o.value.toLowerCase() === lang.toLowerCase() || o.value.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)))
    if (opt) ops.push({ area: 'listening', key: 'language', value: opt.value })
    else lines.push({ what: 'Listening · Language', to: `${lang} isn’t offered by ${stt?.label ?? 'the listening provider'}; choose a listening provider for it` })
  }
  if (ops.length) {
    const { patch, lines: more } = editSettings(doc, ops)
    Object.assign(doc, patch)
    lines.push(...more.map((l) => ({ what: l.what, to: l.to })))
  }
  return { doc, lines }
}

// ------------------------------------------------------------------ propose tools

const flowArg = { type: 'string', description: 'Flow key (shortened is fine), vx:flow ref, or name' }

export const WRITE_TOOLS: ToolDef[] = [
  {
    name: 'create_flow',
    description: `Make a NEW flow (voice agent) from what the user describes. One card; Apply creates it. You write: name; instructions (the AI's system prompt: who it is, its purpose, what to ask, how to answer, when to end — clear and complete, in the language the agent should speak or English); greeting (its first line). start picks the shape: ${STARTS.map((t) => `"${t.id}": ${t.blurb}`).join(' ')} (default "simple"). settings: optional list in edit_settings form for the voice and language, e.g. from voice_options. After it's applied, offer test_flow.`,
    input: {
      type: 'object', required: ['name', 'instructions'],
      properties: {
        name: { type: 'string' }, instructions: { type: 'string' }, greeting: { type: 'string' },
        language: { type: 'string', description: 'Language callers speak, as a code like hi-IN or en-IN; listening is set to it' },
        start: { type: 'string', enum: STARTS.map((t) => t.id) },
        settings: { type: 'array', items: { type: 'object', required: ['area'], properties: { area: { type: 'string', enum: ['speaking', 'listening', 'behaviour'] }, key: { type: 'string' }, value: {} } } },
      },
    },
    label: (i) => `Proposed a new flow “${str(i.name)}”`,
    run: async (me, i) => {
      const { doc, lines } = buildNewFlow(i as Parameters<typeof buildNewFlow>[0])
      prune()
      const c: Change = { id: randomUUID().slice(0, 8), userId: me.id, flowKey: '', flowName: doc.flow_name, title: `New flow “${doc.flow_name}”`, where: ['Flows'], page: '', lines: redact(lines), patch: {}, before: {}, newFlow: doc, status: 'pending', at: Date.now() }
      CHANGES.set(c.id, c)
      return { proposed: cardOf(c), note: 'The flow does NOT exist yet and has no key until the user presses Apply on the card. Do not link it or call other tools on it in this reply.' }
    },
  },
  {
    name: 'edit_settings',
    description: `Change a flow's settings: every change in ONE call. Each change: {area, key?, value}.
area "name": value = the new flow name.
area "webhook": value = an http(s) URL, or "" to turn it off.
area "behaviour": key is one of — ${BEHAVIOUR_TEXT}.
area "speaking" (text-to-speech voice) / "listening" (speech-to-text): key "service" switches provider (${'speaking'}: ${providersText('tts')}; listening: ${providersText('stt')}) and resets its settings to that provider's defaults; any other key is one of the provider's settings (voice_options lists them and their values). value null removes a setting.
Avatar settings and looks can't be changed here.`,
    input: {
      type: 'object', required: ['flow', 'changes'],
      properties: {
        flow: flowArg,
        changes: {
          type: 'array', minItems: 1,
          items: { type: 'object', required: ['area'], properties: { area: { type: 'string', enum: ['name', 'webhook', 'behaviour', 'speaking', 'listening'] }, key: { type: 'string' }, value: {} } },
        },
      },
    },
    label: (i) => `Proposed ${Array.isArray(i.changes) ? i.changes.length : ''} settings change${Array.isArray(i.changes) && i.changes.length === 1 ? '' : 's'}`,
    run: (me, i) => propose(me, i.flow, 'Change the flow’s settings', (doc) => {
      const { patch, lines } = editSettings(doc, (Array.isArray(i.changes) ? i.changes : []) as SettingsOp[])
      const keys = Object.keys(patch)
      const page = keys.some((k) => k === 'tts' || k === 'stt') ? 'voice' : keys.some((k) => k === 'flow_name') ? '' : keys.includes('webhook-url') ? 'webhook' : 'behaviour'
      const where = page === 'voice' ? ['Voice'] : page === 'webhook' ? ['Webhook'] : page === '' ? ['Overview'] : ['Behaviour']
      return { patch, lines, where: keys.length > 1 && new Set(keys.map((k) => (k === 'tts' || k === 'stt' ? 'v' : k === 'flow_name' ? 'n' : k === 'webhook-url' ? 'w' : 'b'))).size > 1 ? ['Several places'] : where, page }
    }),
  },
  {
    name: 'edit_workflow',
    description: `Change a flow's workflow: every change in ONE call, in order. Steps you add can be used by later changes; the whole workflow is checked once at the end. Changes:
{do:"set", step, key, value} set one setting; key may be dotted ("out_dict.speak"); value null removes it.
{do:"add", id, type, set?} new step (not connected yet; then place or connect it). set: {key: value} like "set".
{do:"place", step, after} put a step (new, or moved from elsewhere) right after "after": it takes over where "after" went, so it is fully connected; don't also connect it. Its old neighbours are joined. Optional before: when "after" leads to several steps, the one to go in front of.
{do:"connect"|"disconnect", from, to, path?} a line between steps; path is a Branch's matched value ("yes", "booked"…); without path it's the normal next.
{do:"remove", step, bridge?} remove a step; what led to it goes on to its next step (bridge:false to just cut).
{do:"rename", step, to}   {do:"start", step} make it the first step.
A Branch (conditional) follows the path whose value equals its input_variables value exactly (lowercased); when none matches it goes to its normal next (connect without path). It can't judge meaning: to branch on what the caller meant (wants to end, is angry…), add a field to an AI step's llm_return_type, e.g. set key "llm_return_type.wants_to_end" value {"type":"bool","description":"the caller is saying goodbye"}, and Branch on input_variables {"wants_to_end":"bool"} with paths "true"/"false".
A Say step ends the call after speaking when out_dict.hangup is true.
Step types and their settings: ${STEP_KEYS}. Read a step with get_step before changing text you need to keep.`,
    input: {
      type: 'object', required: ['flow', 'changes'],
      properties: {
        flow: flowArg,
        changes: {
          type: 'array', minItems: 1,
          items: {
            type: 'object', required: ['do'],
            properties: {
              do: { type: 'string', enum: ['set', 'add', 'place', 'connect', 'disconnect', 'remove', 'rename', 'start'] },
              step: { type: 'string' }, key: { type: 'string' }, value: {},
              id: { type: 'string' }, type: { type: 'string', enum: ADDABLE.map((x) => x.type) }, set: { type: 'object' },
              after: { type: 'string' }, before: { type: 'string' },
              from: { type: 'string' }, to: { type: 'string' }, path: { type: 'string' }, bridge: { type: 'boolean' },
            },
          },
        },
      },
    },
    label: (i) => `Proposed ${Array.isArray(i.changes) ? i.changes.length : ''} workflow change${Array.isArray(i.changes) && i.changes.length === 1 ? '' : 's'}`,
    run: (me, i) => propose(me, i.flow, 'Change the workflow', (doc) => {
      const { wf, lines } = editWorkflow(doc.workflow, (Array.isArray(i.changes) ? i.changes : []) as Op[])
      return { patch: { workflow: wf }, lines, where: ['Workflow'], page: 'workflow' }
    }),
  },
  {
    name: 'clone_flow',
    description: 'Copy an existing flow as a NEW flow (its workflow, voice, settings; not its calls or numbers), optionally renamed and with edit_settings-style changes such as another language or voice. One card; Apply creates it. To then change the copy\'s workflow, the user applies first.',
    input: {
      type: 'object', required: ['flow'],
      properties: {
        flow: flowArg, name: { type: 'string' },
        settings: { type: 'array', items: { type: 'object', required: ['area'], properties: { area: { type: 'string', enum: ['speaking', 'listening', 'behaviour', 'webhook'] }, key: { type: 'string' }, value: {} } } },
      },
    },
    label: (i) => `Proposed a copy of ${str(i.flow)}`,
    run: async (me, i) => {
      const f = await findFlow(me, i.flow)
      const src = await readFlowDoc(me, f.apiKey)
      const copy = structuredClone(src) as FlowDoc
      Object.assign(copy, { flow_name: str(i.name).trim() || `${src.flow_name} (copy)`, source: 'mock', mock: [], sessions: [], numbers: [], deliveries: [] })
      delete (copy as Record<string, unknown>).key_rotated_at
      const lines: ChangeLine[] = [{ what: 'New flow', to: copy.flow_name }, { what: 'Copied from', to: src.flow_name }]
      if (Array.isArray(i.settings) && i.settings.length) {
        const { patch, lines: more } = editSettings(copy, i.settings as SettingsOp[])
        Object.assign(copy, patch)
        lines.push(...more)
      }
      prune()
      const c: Change = { id: randomUUID().slice(0, 8), userId: me.id, flowKey: '', flowName: copy.flow_name, title: `New flow “${copy.flow_name}”`, where: ['Flows'], page: '', lines: redact(lines), patch: {}, before: {}, newFlow: copy, status: 'pending', at: Date.now() }
      CHANGES.set(c.id, c)
      return { proposed: cardOf(c), note: 'The copy does NOT exist yet and has no key until the user presses Apply on the card.' }
    },
  },
  {
    name: 'record_fields',
    description: 'Make the flow record values about each call: the AI step works each field out as the call goes (e.g. inquiry_type, course, call_outcome). Each field: name (snake_case), type (text, yes_no, number), values (the allowed answers, for text fields that are categories — keep them few and stable), meaning (what it is). One card. Use after analyze_calls shows what callers give or want.',
    input: {
      type: 'object', required: ['flow', 'fields'],
      properties: {
        flow: flowArg, step: { type: 'string', description: 'The AI step, if the flow has more than one' },
        fields: { type: 'array', minItems: 1, items: { type: 'object', required: ['name', 'type', 'meaning'], properties: { name: { type: 'string' }, type: { type: 'string', enum: ['text', 'yes_no', 'number'] }, values: { type: 'array', items: { type: 'string' } }, meaning: { type: 'string' } } } },
      },
    },
    label: (i) => `Proposed recording ${Array.isArray(i.fields) ? i.fields.length : ''} field(s)`,
    run: async (me, i) => ({ ...(await propose(me, i.flow, 'Record values on each call', (doc) => {
      const wf = doc.workflow as Workflow
      const ai = Object.entries((wf.nodes ?? {}) as Record<string, EngineNode>).filter(([, n]) => n.parameters && 'llm_return_type' in n.parameters).map(([id]) => id)
      const at = str(i.step) || (ai.length === 1 ? ai[0] : '')
      if (!at || !ai.includes(at)) throw new Error(ai.length ? `Say which AI step: ${ai.join(', ')}.` : 'This flow has no AI step to work values out.')
      const TYPE = { text: 'str', yes_no: 'bool', number: 'float' } as const
      const ops: Op[] = []
      const lines: ChangeLine[] = []
      for (const f of (Array.isArray(i.fields) ? i.fields : []) as { name: string; type: keyof typeof TYPE; values?: string[]; meaning: string }[]) {
        const name = str(f.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        if (!name || ['speak', 'hangup', 'user_input'].includes(name)) throw new Error(`“${f.name}” can’t be a field name.`)
        if (!TYPE[f.type]) throw new Error(`${name}: type is text, yes_no or number.`)
        const values = (f.values ?? []).map((v) => String(v).trim().toLowerCase()).filter(Boolean)
        const description = `${str(f.meaning).trim()}${values.length ? ` Exactly one of: ${values.join(', ')}.` : ''} Leave empty until the caller has made it clear; keep the last known value on later turns.`
        ops.push({ do: 'set', step: at, key: `llm_return_type.${name}`, value: { type: TYPE[f.type], description } })
        lines.push({ what: `Records ${name}`, to: values.length ? values.join(' · ') : { text: 'text', yes_no: 'yes / no', number: 'number' }[f.type] })
      }
      const { wf: out } = editWorkflow(wf, ops)
      // Declared in the flow's state like speak and hangup, so later steps and the webhook see them.
      const vars = { ...((out.variables ?? {}) as Record<string, unknown>) }
      for (const o of ops) { const n = str(o.key).split('.')[1]; vars[n] ??= { type: (o.value as { type: string }).type } }
      out.variables = vars as Workflow['variables']
      return { patch: { workflow: out }, lines, where: ['Workflow'], page: 'workflow' }
    })), saved: "Once applied, the AI works these out during each call. Each call saves the final value and its change history, so they show in the call replay, on dashboards (fields, funnels), in follow-ups and in CSV exports. Only calls made after applying have them; earlier calls stay empty." }),
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
let moreWrites: ToolDef[] = []
/** Card-making tools defined in other files (knowledge gaps), run like the ones here. */
export const registerWriteTools = (t: ToolDef[]) => { moreWrites = t }
export const registerDashboardTools = (t: ToolDef[]) => { dashTools = t }
const DASHBOARD_TOOLS_REF = () => dashTools

/** Runs a propose tool; errors go back to the model as text so it can fix the proposal. */
export async function runWrite(me: AuthUser, name: string, input: Record<string, unknown>) {
  const tool = [...WRITE_TOOLS, ...DASHBOARD_TOOLS_REF(), ...moreWrites].find((t) => t.name === name)!
  try {
    return { ok: true, label: tool.label(input), result: cap(await tool.run(me, input)) }
  } catch (e) {
    return { ok: false, label: tool.label(input), result: { error: (e as Error).message } }
  }
}
