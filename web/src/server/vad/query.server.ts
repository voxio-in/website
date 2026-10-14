// Computes one VAD widget from a saved spec: reads the owner's sessions for the
// spec's flows, applies the dashboard range/filters and the widget's query, and
// returns only the result. Built-in fields only for now; widgets that use
// agent.* fields come back as `waiting` until the agent's state is stored per
// session (docs §9.2).

import { db, withDb } from '#/server/db'
import { BUILTIN_FIELDS, isAgentField, type Cond, type Query, type Range, type Spec, type Where, type Widget, type WidgetResult } from '#/lib/vad/spec'
export type { WidgetResult }

export type Run = { range?: Range; filters?: Where; test?: boolean; maskCaller?: boolean }

type Row = { id: string; startTime: Date; duration: number; channel: string; status: string; turns: number; caller: string | null; flow: string; test: boolean }

const CHANNEL: Record<string, string> = { browser: 'web', avatar: 'video', phone: 'phone', chat: 'chat' }
const channelOf = (t: string) => CHANNEL[Object.keys(CHANNEL).find((k) => t.toLowerCase().includes(k)) ?? ''] ?? t

/** [from, to) for a range, and the same-length period before it. */
export function window(range: Range, now = new Date()) {
  const end = new Date(now)
  const start = new Date(now)
  if (range === 'today') start.setHours(0, 0, 0, 0)
  else if (range === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0) }
  else start.setTime(now.getTime() - { '7d': 7, '30d': 30, '90d': 90 }[range] * 86400_000)
  const len = end.getTime() - start.getTime()
  return { from: start, to: end, prevFrom: new Date(start.getTime() - len), prevTo: start }
}

function fieldsOf(w: Widget): string[] {
  if (w.type === 'text') return []
  const q = w.query
  return [q.of, q.by?.replace(/:.*/, ''), q.split, ...Object.keys(q.where ?? {}), ...(w.type === 'table' ? w.columns : [])].filter((x): x is string => !!x)
}

async function load(userId: string, spec: Spec, from: Date, to: Date, test: boolean): Promise<Row[]> {
  const flows = await withDb(() => db.flow.findMany({ where: { userId, OR: spec.flows.map((k) => ({ apiKey: { startsWith: k.replace(/…$/, '') } })) }, select: { id: true, flowName: true } }))
  if (!flows.length) return []
  const name = new Map(flows.map((f) => [f.id, f.flowName]))
  const rows = await withDb(() => db.callSession.findMany({
    where: { flowId: { in: flows.map((f) => f.id) }, startTime: { gte: from, lt: to } },
    select: { sessionId: true, flowId: true, startTime: true, totalConnectedTime: true, type: true, status: true, from: true, to: true, transcription: true, extra: true },
    orderBy: { startTime: 'asc' },
  }))
  return rows
    .map((r) => ({
      id: r.sessionId, startTime: r.startTime, duration: Math.round(r.totalConnectedTime), channel: channelOf(r.type),
      status: r.status ?? 'completed', caller: r.from ?? r.to ?? null, flow: name.get(r.flowId) ?? '', test: !!(r.extra as { test?: boolean }).test,
      turns: Array.isArray(r.transcription) ? r.transcription.filter((t) => !/assist|ai|agent|bot/i.test(String((t as { role?: string })?.role ?? ''))).length : 0,
    }))
    .filter((r) => test || !r.test)
}

const val = (r: Row, f: string): unknown => (f in BUILTIN_FIELDS ? r[f as keyof Row] : undefined)

function matches(r: Row, where: Where = {}) {
  return Object.entries(where).every(([f, c]: [string, Cond]) => {
    const v = val(r, f)
    if (Array.isArray(c)) return c.map(String).includes(String(v))
    if (c && typeof c === 'object') {
      if ('exists' in c && c.exists !== undefined) return c.exists ? v !== null && v !== undefined && v !== '' : v === null || v === undefined || v === ''
      const n = Number(v)
      return (c.gte === undefined || n >= c.gte) && (c.lte === undefined || n <= c.lte) && (c.gt === undefined || n > c.gt) && (c.lt === undefined || n < c.lt)
    }
    return String(v) === String(c)
  })
}

function measure(rows: Row[], q: Query, all: Row[]): number | null {
  const pick = rows.filter((r) => matches(r, q.where))
  const nums = q.of ? pick.map((r) => Number(val(r, q.of!))).filter((n) => Number.isFinite(n)) : []
  switch (q.metric ?? 'count') {
    case 'count': return pick.length
    case 'share': return all.length ? pick.length / all.length : null
    case 'avg': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
    case 'sum': return nums.reduce((a, b) => a + b, 0)
    case 'min': return nums.length ? Math.min(...nums) : null
    case 'max': return nums.length ? Math.max(...nums) : null
    case 'distinct': return new Set(pick.map((r) => val(r, q.of!)).filter((v) => v !== null && v !== undefined && v !== '')).size
  }
}

function bucket(d: Date, unit: string) {
  const x = new Date(d)
  if (unit === 'hour') { x.setMinutes(0, 0, 0); return x.toISOString().slice(0, 13) + ':00' }
  if (unit === 'week') { x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) }
  if (unit === 'month') return x.toISOString().slice(0, 7)
  return x.toISOString().slice(0, 10)
}

/** Every bucket between from and to, so quiet days show as 0 instead of disappearing. */
function buckets(from: Date, to: Date, unit: string) {
  const out: string[] = []
  const d = new Date(from)
  const step = unit === 'hour' ? 3600_000 : unit === 'week' ? 7 * 86400_000 : 86400_000
  while (d < to && out.length < 400) {
    const b = bucket(d, unit)
    if (out[out.length - 1] !== b) out.push(b)
    if (unit === 'month') d.setMonth(d.getMonth() + 1, 1); else d.setTime(d.getTime() + step)
  }
  // Stepping from `from` can stop just short of `to`: the current bucket must always be there.
  const last = bucket(new Date(to.getTime() - 1), unit)
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

export async function runWidget(userId: string, spec: Spec, w: Widget, run: Run = {}): Promise<WidgetResult> {
  if (w.type === 'text') return { kind: 'text' }
  const agent = fieldsOf(w).filter(isAgentField)
  if (agent.length) return { kind: 'waiting', fields: [...new Set(agent)] }
  const range = run.range ?? spec.defaults.range
  const win = window(range)
  const test = run.test ?? spec.defaults.test
  const scoped = (rows: Row[]) => rows.filter((r) => matches(r, run.filters))
  const rows = scoped(await load(userId, spec, win.from, win.to, test))
  const q = w.query

  if (w.type === 'kpi') {
    const prev = spec.defaults.compare ? scoped(await load(userId, spec, win.prevFrom, win.prevTo, test)) : null
    const spark = w.spark ? buckets(win.from, win.to, range === 'today' ? 'hour' : 'day').map((b) => {
      const day = rows.filter((r) => bucket(r.startTime, range === 'today' ? 'hour' : 'day') === b)
      return measure(day, q, day) ?? 0
    }) : undefined
    return { kind: 'kpi', value: measure(rows, q, rows), previous: prev ? measure(prev, q, prev) : null, spark }
  }

  if (w.type === 'chart') {
    const time = !!q.by?.startsWith('startTime:')
    const unit = q.by?.split(':')[1] ?? 'day'
    const keyOf = (r: Row) => (time ? bucket(r.startTime, unit) : String(val(r, q.by ?? 'channel') ?? '—'))
    let labels = time ? buckets(win.from, win.to, unit) : [...new Set(rows.map(keyOf))]
    const splits = q.split ? [...new Set(rows.map((r) => String(val(r, q.split!) ?? '—')))] : ['value']
    const cell = (label: string, s: string) => {
      const inGroup = rows.filter((r) => keyOf(r) === label)
      const inCell = q.split ? inGroup.filter((r) => String(val(r, q.split!) ?? '—') === s) : inGroup
      return measure(inCell, q, inGroup) ?? 0
    }
    // Categories: biggest first, the rest folded into "Other".
    if (!time) {
      const total = (l: string) => splits.reduce((a, s) => a + cell(l, s), 0)
      labels.sort((a, b) => total(b) - total(a))
      if (labels.length > (q.top ?? 12)) labels = labels.slice(0, q.top ?? 12)
    }
    return { kind: 'series', time, labels, series: splits.slice(0, 8).map((s) => ({ key: s, values: labels.map((l) => cell(l, s)) })) }
  }

  // table
  const pick = rows.filter((r) => matches(r, q.where))
  const [sortField, dir] = q.sort?.startsWith('-') ? [q.sort.slice(1), -1] : [q.sort ?? 'startTime', 1]
  pick.sort((a, b) => { const x = val(a, sortField), y = val(b, sortField); return (x! < y! ? -1 : x! > y! ? 1 : 0) * dir })
  const limited = pick.slice(0, q.limit ?? 50)
  const mask = (c: unknown) => (typeof c === 'string' && c.length > 4 ? `•••${c.slice(-4)}` : c)
  return {
    kind: 'rows', columns: w.columns,
    rows: limited.map((r) => Object.fromEntries(w.columns.map((c) => {
      const v = val(r, c)
      return [c, c === 'caller' && run.maskCaller ? mask(v) : v instanceof Date ? v.toISOString() : v]
    }))),
    sessionIds: run.maskCaller ? undefined : limited.map((r) => r.id),
  }
}
