// Computes one VAD widget from a saved spec: reads the owner's sessions for the
// spec's flows, applies the dashboard range/filters and the widget's query, and
// returns only the result. agent.<name> fields are the flow's recorded values,
// saved per call by the agent service as extra.variables.<name>.value
// (docs/VARIABLE_HISTORY_SPEC.md); a widget waits until some call has them.

import { db, withDb } from '#/server/db'
import { BUILTIN_FIELDS, fieldLabel, isAgentField, type Cond, type Query, type Range, type Spec, type Where, type Widget, type WidgetResult } from '#/lib/vad/spec'
export type { WidgetResult }

export type Run = { range?: Range; filters?: Where; test?: boolean; maskCaller?: boolean; /** The viewer's time zone: days and hours are counted in it, like the tables show them. */ tz?: string }

type Row = { id: string; startTime: Date; duration: number; channel: string; status: string; turns: number; caller: string | null; flow: string; test: boolean; vars: Record<string, unknown>; first: Record<string, { turn?: number; secs?: number }> }

/** When each recorded field first got a value: its turn and seconds into the call (from the history). */
const firstOf = (extra: unknown, start: Date): Row['first'] => {
  const v = (extra as { variables?: Record<string, { history?: { at?: string; turn?: number; value?: unknown }[] }> } | null)?.variables
  if (!v || typeof v !== 'object') return {}
  return Object.fromEntries(Object.entries(v).map(([k, x]) => {
    const h = (x?.history ?? []).find((e) => e?.value !== null && e?.value !== undefined && e?.value !== '')
    const at = h?.at ? new Date(h.at).getTime() : NaN
    return [k, { turn: typeof h?.turn === 'number' ? h.turn : undefined, secs: Number.isFinite(at) ? Math.max(0, (at - start.getTime()) / 1000) : undefined }]
  }))
}

/** The recorded values of a call: name → final value. */
const varsOf = (extra: unknown): Record<string, unknown> => {
  const v = (extra as { variables?: Record<string, { value?: unknown }> } | null)?.variables
  return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x?.value])) : {}
}

const CHANNEL: Record<string, string> = { browser: 'web', avatar: 'video', phone: 'phone', chat: 'chat' }
const channelOf = (t: string) => CHANNEL[Object.keys(CHANNEL).find((k) => t.toLowerCase().includes(k)) ?? ''] ?? t

/** Minutes a time zone is ahead of UTC at a moment (IST: 330). Unknown zones count as UTC. */
function offsetOf(tz: string | undefined, at: Date): number {
  if (!tz) return 0
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(at).map((x) => [x.type, x.value]))
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(at.getTime() / 60000) * 60000) / 60000)
  } catch { return 0 }
}
/** The wall-clock time in the viewer's zone, as a Date whose UTC fields read as that clock. */
const wall = (d: Date, tz?: string) => new Date(d.getTime() + offsetOf(tz, d) * 60000)
/** The real moment of a wall-clock time in the viewer's zone. */
const unwall = (w: Date, tz?: string) => new Date(w.getTime() - offsetOf(tz, w) * 60000)

/** [from, to) for a range, and the same-length period before it. "Today" and "this month" start at the viewer's midnight. */
export function window(range: Range, now = new Date(), tz?: string) {
  const end = new Date(now)
  let start = new Date(now)
  if (range === 'today') { const w = wall(now, tz); w.setUTCHours(0, 0, 0, 0); start = unwall(w, tz) }
  else if (range === 'month') { const w = wall(now, tz); w.setUTCDate(1); w.setUTCHours(0, 0, 0, 0); start = unwall(w, tz) }
  else start.setTime(now.getTime() - { '7d': 7, '30d': 30, '90d': 90 }[range] * 86400_000)
  const len = end.getTime() - start.getTime()
  return { from: start, to: end, prevFrom: new Date(start.getTime() - len), prevTo: start }
}

function fieldsOf(w: Widget): string[] {
  if (w.type === 'text') return []
  const q = w.query
  return [q.of, q.by?.replace(/:.*/, ''), q.split, ...(q.funnel ?? []), ...Object.keys(q.where ?? {}), ...(w.type === 'table' ? w.columns : [])].filter((x): x is string => !!x)
}

async function load(userId: string, spec: Spec, from: Date, to: Date, test: boolean): Promise<Row[]> {
  const flows = await withDb(() => db.flow.findMany({ where: { userId, OR: spec.flows.map((k) => ({ apiKey: { startsWith: k.replace(/…$/, '') } })) }, select: { id: true, flowName: true } }))
  if (!flows.length) return []
  const name = new Map(flows.map((f) => [f.id, f.flowName]))
  const rows = await withDb(() => db.callSession.findMany({
    where: { flowId: { in: flows.map((f) => f.id) }, startTime: { gte: from, lt: to } },
    select: { sessionId: true, flowId: true, startTime: true, endTime: true, totalConnectedTime: true, type: true, status: true, from: true, to: true, transcription: true, extra: true },
    orderBy: { startTime: 'asc' },
  }))
  return rows
    .map((r) => ({
      // Older calls didn't record connected time: start to end then.
      id: r.sessionId, startTime: r.startTime, duration: Math.round(r.totalConnectedTime > 0 ? r.totalConnectedTime : r.endTime ? Math.max(0, (r.endTime.getTime() - r.startTime.getTime()) / 1000) : 0), vars: varsOf(r.extra), first: firstOf(r.extra, r.startTime), channel: channelOf(r.type),
      status: r.status ?? 'completed', caller: r.from ?? r.to ?? null, flow: name.get(r.flowId) ?? '', test: !!(r.extra as { test?: boolean }).test,
      turns: Array.isArray(r.transcription) ? r.transcription.filter((t) => !/assist|ai|agent|bot/i.test(String((t as { role?: string })?.role ?? ''))).length : 0,
    }))
    .filter((r) => test || !r.test)
}

const val = (r: Row, f: string): unknown => {
  if (!isAgentField(f)) return f in BUILTIN_FIELDS ? r[f as keyof Row] : undefined
  const [name, when] = f.slice(6).split('@')
  return when === 'turn' ? r.first[name]?.turn : when === 'secs' ? r.first[name]?.secs : r.vars[name]
}
const known = (v: unknown) => v !== null && v !== undefined && v !== ''

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

/** The day, hour, week or month a moment falls in, on the viewer's clock (so it matches the tables). */
function bucket(d: Date, unit: string, tz?: string) {
  const x = wall(d, tz)
  if (unit === 'hour') return x.toISOString().slice(0, 13) + ':00'
  if (unit === 'week') x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7))
  if (unit === 'month') return x.toISOString().slice(0, 7)
  return x.toISOString().slice(0, 10)
}

/** Every bucket between from and to, so quiet days show as 0 instead of disappearing. */
function buckets(from: Date, to: Date, unit: string, tz?: string) {
  const out: string[] = []
  const d = new Date(from)
  // Hour steps: zones with half-hour offsets and DST never skip a day.
  const step = unit === 'month' || unit === 'week' ? 6 * 3600_000 : 3600_000
  while (d < to && out.length < 400) {
    const b = bucket(d, unit, tz)
    if (out[out.length - 1] !== b) out.push(b)
    d.setTime(d.getTime() + step)
  }
  // Stepping from `from` can stop just short of `to`: the current bucket must always be there.
  const last = bucket(new Date(to.getTime() - 1), unit, tz)
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

export async function runWidget(userId: string, spec: Spec, w: Widget, run: Run = {}): Promise<WidgetResult> {
  if (w.type === 'text') return { kind: 'text' }
  const agent = [...new Set(fieldsOf(w).filter(isAgentField))]
  const range = run.range ?? spec.defaults.range
  const tz = run.tz
  const win = window(range, new Date(), tz)
  const test = run.test ?? spec.defaults.test
  const scoped = (rows: Row[]) => rows.filter((r) => matches(r, run.filters))
  const rows = scoped(await load(userId, spec, win.from, win.to, test))
  const q = w.query
  // Recorded fields: wait until some call in the period has one (new fields, or calls before the backend saved them).
  if (agent.length && !rows.some((r) => agent.some((f) => r.vars[f.slice(6).split('@')[0]] !== undefined))) return { kind: 'waiting', fields: agent }

  if (w.type === 'kpi') {
    const prev = spec.defaults.compare ? scoped(await load(userId, spec, win.prevFrom, win.prevTo, test)) : null
    const spark = w.spark ? buckets(win.from, win.to, range === 'today' ? 'hour' : 'day', tz).map((b) => {
      const day = rows.filter((r) => bucket(r.startTime, range === 'today' ? 'hour' : 'day', tz) === b)
      return measure(day, q, day) ?? 0
    }) : undefined
    return { kind: 'kpi', value: measure(rows, q, rows), previous: prev ? measure(prev, q, prev) : null, spark }
  }

  if (w.type === 'chart' && q.funnel?.length) {
    // Each step: calls that got this field and every one before it.
    let left = rows
    const values = q.funnel.map((f) => (left = left.filter((r) => known(val(r, f)))).length)
    return { kind: 'series', time: false, labels: q.funnel.map(fieldLabel), series: [{ key: 'calls', values }] }
  }

  if (w.type === 'chart') {
    const time = !!q.by?.startsWith('startTime:')
    const unit = q.by?.split(':')[1] ?? 'day'
    const keyOf = (r: Row) => (time ? bucket(r.startTime, unit, tz) : String(val(r, q.by ?? 'channel') ?? '—'))
    let labels = time ? buckets(win.from, win.to, unit, tz) : [...new Set(rows.map(keyOf))]
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
