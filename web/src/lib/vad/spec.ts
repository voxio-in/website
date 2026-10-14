// VAD (Voxio Agents Dashboard) spec v1: types, sizes and validation.
// See docs/AI_ASSISTANT_AND_VAD_PLAN.md §10. A spec is data only: nothing in it
// runs. normalize() is the one gate every save goes through (user or Ask Voxio).

export type Range = 'today' | '7d' | '30d' | '90d' | 'month'
export type Metric = 'count' | 'share' | 'avg' | 'sum' | 'min' | 'max' | 'distinct'
export type Cond = string | number | boolean | (string | number)[] | { gte?: number; lte?: number; gt?: number; lt?: number; exists?: boolean }
export type Where = Record<string, Cond>

export type Query = {
  metric?: Metric
  of?: string
  where?: Where
  /** startTime:hour|day|week|month, or a category field. */
  by?: string
  split?: string
  top?: number
  /** Tables: list sessions, or one row per group. */
  rows?: 'sessions' | 'groups'
  sort?: string
  limit?: number
}

export type ChartKind = 'line' | 'area' | 'bar'
export type Format = 'number' | 'percent' | 'duration'

export type Widget =
  | { id: string; type: 'kpi'; title: string; subtitle?: string; query: Query; format?: Format; goal?: number; goodWhen?: 'up' | 'down'; spark?: boolean }
  | { id: string; type: 'chart'; title: string; subtitle?: string; chart: ChartKind; query: Query; stacked?: boolean; horizontal?: boolean; format?: Format; unit?: string }
  | { id: string; type: 'table'; title: string; subtitle?: string; query: Query; columns: string[] }
  | { id: string; type: 'text'; title?: string; body: string }

export type LayoutItem = { i: string; x: number; y: number; w: number; h: number }

export type Spec = {
  version: 1
  title: string
  description?: string
  /** Flow keys the numbers come from. */
  flows: string[]
  defaults: { range: Range; compare: boolean; test: boolean }
  filters: { field: string; label?: string }[]
  widgets: Widget[]
  layout: LayoutItem[]
}

/** What the server sends back for one widget (computed in server/vad/query.server.ts). */
export type WidgetResult =
  | { kind: 'waiting'; fields: string[] }
  | { kind: 'kpi'; value: number | null; previous: number | null; spark?: number[] }
  | { kind: 'series'; labels: string[]; series: { key: string; values: number[] }[]; time: boolean }
  | { kind: 'rows'; columns: string[]; rows: Record<string, unknown>[]; sessionIds?: string[] }
  | { kind: 'text' }

// ------------------------------------------------------------------ fields

export const BUILTIN_FIELDS = {
  startTime: { label: 'Date', kind: 'time' },
  duration: { label: 'Duration', kind: 'number' },
  channel: { label: 'Channel', kind: 'category' },
  status: { label: 'Status', kind: 'category' },
  turns: { label: 'Caller turns', kind: 'number' },
  caller: { label: 'Caller', kind: 'text' },
  flow: { label: 'Flow', kind: 'category' },
  test: { label: 'Test', kind: 'bool' },
} as const
export type BuiltinField = keyof typeof BUILTIN_FIELDS

export const isAgentField = (f: string) => f.startsWith('agent.')
export const fieldLabel = (f: string) => (isAgentField(f) ? f.slice(6).replace(/_/g, ' ') : BUILTIN_FIELDS[f as BuiltinField]?.label ?? f)

// ------------------------------------------------------------------ sizes (12-column grid)

type Size = { min: [number, number]; def: [number, number]; max: [number, number] }
const SIZES: Record<string, Size> = {
  kpi: { min: [2, 2], def: [3, 2], max: [6, 4] },
  chart: { min: [4, 4], def: [6, 5], max: [12, 10] },
  'chart-h': { min: [4, 4], def: [6, 6], max: [12, 12] },
  table: { min: [4, 4], def: [12, 6], max: [12, 16] },
  text: { min: [2, 1], def: [6, 2], max: [12, 8] },
}
export const sizeOf = (w: Widget): Size => SIZES[w.type === 'chart' && w.horizontal ? 'chart-h' : w.type]

export const COLS = 12
export const ROW_HEIGHT = 56
export const GAP = 16

// ------------------------------------------------------------------ validation

const METRICS: Metric[] = ['count', 'share', 'avg', 'sum', 'min', 'max', 'distinct']
const CHARTS: ChartKind[] = ['line', 'area', 'bar']
const RANGES: Range[] = ['today', '7d', '30d', '90d', 'month']
const BY_TIME = /^startTime:(hour|day|week|month)$/

function checkField(f: unknown, where: string, errors: string[]) {
  // Own keys only: `in` would also accept names like "toString".
  if (typeof f !== 'string' || !(Object.hasOwn(BUILTIN_FIELDS, f) || /^agent\.[a-zA-Z0-9_]+$/.test(f))) errors.push(`${where}: unknown field “${typeof f === 'string' ? f : typeof f}”.`)
}

function checkQuery(q: Query, where: string, errors: string[], kind: Widget['type']) {
  if (kind !== 'table' && q.metric && !METRICS.includes(q.metric)) errors.push(`${where}: unknown metric “${q.metric}”.`)
  if (q.metric && ['avg', 'sum', 'min', 'max', 'distinct'].includes(q.metric)) {
    if (!q.of) errors.push(`${where}: “${q.metric}” needs "of" (the field to measure).`)
    else checkField(q.of, where, errors)
  }
  if (q.by && !BY_TIME.test(q.by)) checkField(q.by, where, errors)
  if (q.split) checkField(q.split, where, errors)
  for (const k of Object.keys(q.where ?? {})) checkField(k, `${where} where`, errors)
  if (q.top !== undefined && (q.top < 1 || q.top > 50)) errors.push(`${where}: "top" must be 1–50.`)
  if (q.limit !== undefined && (q.limit < 1 || q.limit > 200)) errors.push(`${where}: "limit" must be 1–200.`)
}

/**
 * Checks a spec and returns a clean copy: unknown things are errors; layout is
 * repaired (sizes clamped, missing entries placed at the bottom, stray entries dropped).
 */
export function normalize(input: unknown): { ok: true; spec: Spec } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const s = (input ?? {}) as Partial<Spec>
  const title = String(s.title ?? '').trim().slice(0, 80)
  if (!title) errors.push('A dashboard needs a title.')
  const flows = Array.isArray(s.flows) ? s.flows.map(String).filter(Boolean) : []
  if (!flows.length) errors.push('Pick at least one flow.')
  const widgets = Array.isArray(s.widgets) ? s.widgets : []
  if (widgets.length > 40) errors.push('At most 40 widgets.')
  const ids = new Set<string>()
  for (const [n, w] of widgets.entries()) {
    const at = `Widget ${n + 1}${w?.id ? ` (${w.id})` : ''}`
    if (!w?.id || typeof w.id !== 'string') { errors.push(`${at}: needs an id.`); continue }
    if (ids.has(w.id)) errors.push(`${at}: id is used twice.`)
    ids.add(w.id)
    if (w.type === 'text') { if (typeof w.body !== 'string') errors.push(`${at}: needs a body.`); continue }
    if (!['kpi', 'chart', 'table'].includes(w.type)) { errors.push(`${at}: unknown type “${(w as { type: string }).type}”.`); continue }
    if (!w.title) errors.push(`${at}: needs a title.`)
    if (w.query !== undefined && (typeof w.query !== 'object' || w.query === null || Array.isArray(w.query))) {
      errors.push(`${at}: "query" must be an object like { "metric": "count" }, not ${typeof w.query}.`)
      continue
    }
    checkQuery(w.query ?? {}, at, errors, w.type)
    if (w.type === 'chart' && !CHARTS.includes(w.chart)) errors.push(`${at}: chart must be one of ${CHARTS.join(', ')}.`)
    if (w.type === 'table') for (const c of w.columns ?? []) checkField(c, `${at} columns`, errors)
  }
  for (const f of s.filters ?? []) checkField(f?.field, 'Filter', errors)
  if (errors.length) return { ok: false, errors }

  // Layout: one entry per widget, clamped to its sizes; missing ones go to the bottom.
  const given = new Map((Array.isArray(s.layout) ? s.layout : []).map((l) => [String(l.i), l]))
  let bottom = Math.max(0, ...[...given.values()].map((l) => (Number(l.y) || 0) + (Number(l.h) || 0)))
  const layout: LayoutItem[] = widgets.map((w) => {
    const sz = sizeOf(w)
    const l = given.get(w.id)
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, Math.round(v)))
    if (!l) { const item = { i: w.id, x: 0, y: bottom, w: sz.def[0], h: sz.def[1] }; bottom += sz.def[1]; return item }
    const width = clamp(Number(l.w) || sz.def[0], sz.min[0], sz.max[0])
    return { i: w.id, w: width, h: clamp(Number(l.h) || sz.def[1], sz.min[1], sz.max[1]), x: clamp(Number(l.x) || 0, 0, COLS - width), y: Math.max(0, Math.round(Number(l.y) || 0)) }
  })

  const d = s.defaults ?? ({} as Spec['defaults'])
  return {
    ok: true,
    spec: {
      version: 1, title, description: s.description ? String(s.description).slice(0, 300) : undefined, flows,
      defaults: { range: RANGES.includes(d.range) ? d.range : '30d', compare: d.compare !== false, test: !!d.test },
      filters: (s.filters ?? []).map((f) => ({ field: f.field, label: f.label })),
      widgets: widgets as Widget[], layout,
    },
  }
}

/** A blank dashboard on one flow: a few useful widgets on built-in fields. */
export function starter(title: string, flow: string): Spec {
  const widgets: Widget[] = [
    { id: 'calls', type: 'kpi', title: 'Sessions', query: { metric: 'count' }, spark: true },
    { id: 'minutes', type: 'kpi', title: 'Avg length', query: { metric: 'avg', of: 'duration' }, format: 'duration' },
    { id: 'done', type: 'kpi', title: 'Completed', query: { metric: 'share', where: { status: 'completed' } }, format: 'percent' },
    { id: 'channels', type: 'kpi', title: 'Callers', query: { metric: 'distinct', of: 'caller' } },
    { id: 'trend', type: 'chart', chart: 'bar', title: 'Sessions per day', query: { metric: 'count', by: 'startTime:day', split: 'channel' }, stacked: true },
    { id: 'recent', type: 'table', title: 'Recent sessions', query: { rows: 'sessions', sort: '-startTime', limit: 20 }, columns: ['startTime', 'duration', 'channel', 'caller', 'status'] },
  ]
  const r = normalize({ title, flows: [flow], defaults: { range: '30d', compare: true, test: false }, filters: [{ field: 'channel' }], widgets, layout: [
    { i: 'calls', x: 0, y: 0, w: 3, h: 2 }, { i: 'minutes', x: 3, y: 0, w: 3, h: 2 }, { i: 'done', x: 6, y: 0, w: 3, h: 2 }, { i: 'channels', x: 9, y: 0, w: 3, h: 2 },
    { i: 'trend', x: 0, y: 2, w: 12, h: 5 }, { i: 'recent', x: 0, y: 7, w: 12, h: 6 },
  ] })
  if (!r.ok) throw new Error(r.errors.join(' '))
  return r.spec
}
