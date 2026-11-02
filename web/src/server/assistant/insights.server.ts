// Reading a flow's calls without reading them all, cheapest first:
//   1. flow_profile  — a map: numbers, where calls end, words callers use, what the workflow records (no AI)
//   2. find_in_calls — grep: matching lines only, with turn numbers and call links (no AI)
//   3. get_session   — read one call or a turn range (tools.server.ts)
//   4. analyze_calls — a cheap model pulls a few facts from each sampled call; the code
//      counts them and only the totals (with example calls) reach the chat. Cached for a day.

import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'
import { toGraph, type Workflow } from '#/lib/workflow/convert'
import { complete, modelById } from './models.server'
import { asTurn, findFlow, type ToolDef } from './tools.server'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const ref = (id: string) => `vx:session/${id}`

type Line = { n: number; who: 'agent' | 'caller'; text: string }

/** Transcript as numbered spoken lines (data lines dropped, web {"user_input"} unwrapped). */
function lines(t: unknown): Line[] {
  const list = Array.isArray(t) ? t : []
  const out: Line[] = []
  list.forEach((x, i) => {
    const r = asTurn(x)
    if (r.data) return
    let text = typeof r.content === 'string' ? r.content : JSON.stringify(r.content ?? '')
    if (text.startsWith('{')) { try { const o = JSON.parse(text) as Record<string, unknown>; if (typeof o.user_input === 'string') text = o.user_input } catch { /* plain */ } }
    text = text.trim()
    if (text) out.push({ n: i + 1, who: /assist|ai|agent|bot/i.test(String(r.role ?? '')) ? 'agent' : 'caller', text })
  })
  return out
}

/** Call length: connected time, or start to end where older calls didn't record it. */
const secsOf = (r: { totalConnectedTime: number; startTime: Date; endTime: Date | null }) =>
  r.totalConnectedTime > 0 ? r.totalConnectedTime : r.endTime ? Math.max(0, (r.endTime.getTime() - r.startTime.getTime()) / 1000) : 0

/** Real (non-test) calls of a flow, newest first. */
async function callsOf(me: AuthUser, flow: unknown, days?: number) {
  const f = await findFlow(me, flow)
  const rows = await withDb(() => db.callSession.findMany({
    // Tests are dropped below, not in SQL: a JSON-path NOT is NULL (so false) for calls without the flag.
    where: { flowId: f.id, ...(days ? { startTime: { gte: new Date(Date.now() - days * 864e5) } } : {}) },
    orderBy: { startTime: 'desc' }, take: 2000,
    select: { sessionId: true, startTime: true, endTime: true, totalConnectedTime: true, status: true, type: true, transcription: true, extra: true },
  }))
  const period = rows.length ? `${days ? `last ${days} days` : 'all calls'}: ${rows[rows.length - 1].startTime.toISOString().slice(0, 10)} to ${rows[0].startTime.toISOString().slice(0, 10)}` : 'no calls'
  return { f, period, rows: rows.filter((r) => (r.extra as { test?: boolean } | null)?.test !== true).map((r) => ({ ...r, lines: lines(r.transcription), secs: secsOf(r) })) }
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const clipTo = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)
/** Lines that differ only by numbers, names in quotes or punctuation count as one. */
const norm = (s: string) => s.toLowerCase().replace(/[0-9०-९]+/g, '#').replace(/[^\p{L}\p{M}# ]+/gu, ' ').replace(/\s+/g, ' ').trim()
const STOP = new Set('the a an and or to of in on for is are was it i you me my we be this that with what how can do have has not no yes ok okay hello hi please sir madam ji hai hain ka ki ke ko se mein me main kya aap mujhe hum haan nahi na to bhi ho tha thi or ek par yeh ye woh wo hello हैं है का की के को से में मैं क्या आप मुझे हम हाँ हां नहीं ना तो भी हो था थी और एक पर यह ये वह जी'.split(' '))

/** What the workflow's AI steps work out each turn, and what steps read. */
function recorded(wf: unknown) {
  const g = toGraph(wf as Workflow)
  const decided = new Set<string>(), read = new Set<string>()
  for (const n of g.nodes) {
    const p = (n.data.parameters ?? {}) as Record<string, unknown>
    for (const k of Object.keys((p.llm_return_type as object) ?? {})) if (!['speak', 'hangup', 'response'].includes(k)) decided.add(k)
    for (const k of Object.keys((p.input_variables as object) ?? {})) if (k !== 'user_input') read.add(k)
  }
  return { decided: [...decided], read: [...read] }
}

// ------------------------------------------------------------------ tier 4 cache
const CACHE = new Map<string, { at: number; value: unknown }>()
const DAY = 864e5

const READER_PROMPT = `You read phone-call transcripts of a voice agent (often Hindi, Hinglish or English) and return facts about each call as JSON. Be literal: use only what the transcript says. Write every value in short plain English (translate), lowercase, 1-5 words, so the same thing gets the same words across calls.
Return exactly: {"calls":[{"i":<number>,"topic":"what the caller wanted","outcome":"resolved|partly|unresolved|dropped|not a real call","problem":"what went wrong, or none","details":["the KIND of each piece of information the caller gave, never the value itself: e.g. course, name, city, phone number"]}]}`

async function readBatch(batch: { i: number; text: string }[], question: string) {
  const m = modelById('or-gemini-lite')
  const body = batch.map((b) => `### Call ${b.i}\n${b.text}`).join('\n\n')
  const turn = await complete(m, READER_PROMPT + (question ? `\nAlso add "answer": a few words on this question for the call: ${question}` : ''), [{ role: 'user', content: body }], [])
  const json = turn.text.slice(turn.text.indexOf('{'), turn.text.lastIndexOf('}') + 1)
  try { return ((JSON.parse(json) as { calls?: unknown[] }).calls ?? []) as { i: number; topic?: string; outcome?: string; problem?: string; details?: string[]; answer?: string }[] }
  catch { return [] }
}

/** Call text for the reader: the opening and the ending, where intent and outcome are. */
function forReader(ls: Line[]) {
  const fmt = (l: Line) => `${l.who === 'agent' ? 'A' : 'C'}${l.n}: ${clipTo(l.text, 220)}`
  if (ls.length <= 16) return ls.map(fmt).join('\n')
  return [...ls.slice(0, 10).map(fmt), `… ${ls.length - 16} lines …`, ...ls.slice(-6).map(fmt)].join('\n')
}

function tally<T>(rows: T[], keyOf: (r: T) => string[], ex: (r: T) => string, top = 8) {
  const m = new Map<string, { count: number; examples: string[] }>()
  for (const r of rows) for (const k of new Set(keyOf(r).map((x) => x.trim().toLowerCase()).filter((x) => x && x !== 'none'))) {
    const e = m.get(k) ?? { count: 0, examples: [] }
    e.count++
    if (e.examples.length < 2) e.examples.push(ex(r))
    m.set(k, e)
  }
  return [...m].sort((a, b) => b[1].count - a[1].count).slice(0, top).map(([k, v]) => ({ value: k, calls: v.count, examples: v.examples }))
}

// ------------------------------------------------------------------ tools

export const INSIGHT_TOOLS: ToolDef[] = [
  {
    name: 'compare_periods',
    description: 'Did a change help? Compares a flow\'s real calls before and after a date (e.g. when a change was applied): calls, share where the caller never spoke, share that ended within 2 turns, median turns and seconds. Free. days: how many days each side (default 14).',
    input: { type: 'object', required: ['flow', 'date'], properties: { flow: { type: 'string' }, date: { type: 'string', description: 'ISO date or time the change went in' }, days: { type: 'number' } } },
    label: (i) => `Compared calls of ${str(i.flow)} around ${str(i.date).slice(0, 10)}`,
    run: async (me, i) => {
      const at = new Date(str(i.date))
      if (Number.isNaN(at.getTime())) throw new Error('date must be an ISO date, e.g. 2026-10-20.')
      const days = typeof i.days === 'number' && i.days > 0 ? i.days : 14
      const { rows } = await callsOf(me, i.flow)
      const side = (from: number, to: number) => {
        const rs = rows.filter((r) => r.startTime.getTime() >= from && r.startTime.getTime() < to)
        const spoke = rs.filter((r) => r.lines.some((l) => l.who === 'caller'))
        return {
          calls: rs.length,
          caller_never_spoke_pct: pct(rs.length - spoke.length, rs.length),
          ended_within_2_turns_pct: pct(spoke.filter((r) => r.lines.length <= 2).length, spoke.length),
          median_turns: median(spoke.map((r) => r.lines.length)),
          median_seconds: Math.round(median(spoke.map((r) => r.secs))),
        }
      }
      const t = at.getTime(), span = days * 864e5
      const before = side(t - span, t), after = side(t, t + span)
      return { before: { from: new Date(t - span).toISOString().slice(0, 10), ...before }, after: { to: new Date(Math.min(Date.now(), t + span)).toISOString().slice(0, 10), ...after }, ...(before.calls < 10 || after.calls < 10 ? { note: 'Fewer than 10 calls on a side: too few to call it a change.' } : {}) }
    },
  },
  {
    name: 'flow_profile',
    description: 'Start here to understand a flow\'s real calls (tests left out). A compact map, computed on the server: how many calls, length and turns, how many end early, busiest hours, the agent lines calls most often end on, the words callers use most, the language mix, and what the workflow records versus what is saved per call. Then use find_in_calls for a pattern, get_session for one call.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' }, days: { type: 'number', description: 'Only the last N days (default: all calls)' } } },
    label: (i) => `Profiled calls of ${str(i.flow)}`,
    run: async (me, i) => {
      const { f, rows: all, period } = await callsOf(me, i.flow, typeof i.days === 'number' && i.days > 0 ? i.days : undefined)
      if (!all.length) return { calls: 0, note: 'No real calls in this period.' }
      // Calls where the caller never spoke (no answer, silence) are counted apart, not mixed into the averages.
      const rows = all.filter((r) => r.lines.some((l) => l.who === 'caller'))
      if (!rows.length) return { period, calls: all.length, caller_never_spoke: all.length, note: 'No call has the caller speaking.' }
      const turns = rows.map((r) => r.lines.length)
      const secs = rows.map((r) => r.secs)
      const buckets: [string, (n: number) => boolean][] = [['0-2', (n) => n <= 2], ['3-5', (n) => n >= 3 && n <= 5], ['6-10', (n) => n >= 6 && n <= 10], ['11-20', (n) => n >= 11 && n <= 20], ['21+', (n) => n > 20]]
      const hours = new Map<number, number>()
      for (const r of rows) hours.set(r.startTime.getUTCHours(), (hours.get(r.startTime.getUTCHours()) ?? 0) + 1)
      // Where calls end: the last agent line, grouped.
      const ends = new Map<string, { count: number; text: string; example: string }>()
      let callerLast = 0
      for (const r of rows) {
        const last = r.lines[r.lines.length - 1]
        if (last?.who === 'caller') callerLast++
        const a = [...r.lines].reverse().find((l) => l.who === 'agent')
        if (!a) continue
        const k = norm(a.text).slice(0, 60)
        const e = ends.get(k) ?? { count: 0, text: clipTo(a.text, 120), example: ref(r.sessionId) }
        e.count++
        ends.set(k, e)
      }
      // Words callers use (a rough topic map, both scripts).
      const wc = new Map<string, number>()
      let deva = 0, latin = 0
      for (const r of rows) {
        const seen = new Set<string>()
        for (const l of r.lines) if (l.who === 'caller') {
          deva += (l.text.match(/[ऀ-ॿ]/g) ?? []).length
          latin += (l.text.match(/[A-Za-z]/g) ?? []).length
          for (const w of l.text.toLowerCase().split(/[^\p{L}\p{M}]+/u)) if (w.length > 2 && !STOP.has(w)) seen.add(w)
        }
        for (const w of seen) wc.set(w, (wc.get(w) ?? 0) + 1)
      }
      const flow = await withDb(() => db.flow.findUniqueOrThrow({ where: { id: f.id }, select: { agent: { select: { workflow: true } } } }))
      const rec = recorded(flow.agent.workflow)
      const savedExtra = new Set(rows.flatMap((r) => Object.keys((r.extra as object) ?? {})).filter((k) => !['test', 'webActions', 'avatarVideoUrl'].includes(k)))
      return {
        period,
        calls: all.length,
        caller_never_spoke: all.length - rows.length,
        calls_with_caller_speaking: rows.length,
        note: 'Everything below is over the calls where the caller spoke.',
        seconds: { median: Math.round(median(secs)), longest: Math.round(Math.max(...secs)) },
        turns: { median: median(turns), longest: Math.max(...turns), spread: Object.fromEntries(buckets.map(([k, t]) => [k, turns.filter(t).length])) },
        ended_by_caller_speaking_last_pct: pct(callerLast, rows.length),
        busiest_hours_utc: [...hours].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => `${h}:00 (${n})`),
        most_common_last_agent_lines: [...ends.values()].sort((a, b) => b.count - a.count).slice(0, 6).map((e) => ({ calls: e.count, line: e.text, example: e.example })),
        caller_words: [...wc].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([w, n]) => `${w} ${n}`).join(', '),
        caller_script: { devanagari_pct: pct(deva, deva + latin), latin_pct: pct(latin, deva + latin) },
        workflow_records: { ai_decides: rec.decided, steps_read: rec.read },
        saved_per_call: savedExtra.size ? [...savedExtra] : 'only the transcript and timing; nothing the AI decides is saved per call',
      }
    },
  },
  {
    name: 'find_in_calls',
    description: 'Grep over a flow\'s real calls: how many calls contain any of the words, and the matching lines only (turn number, who, call link). Callers speak Hindi, Hinglish and English in two scripts, so pass several spellings of one idea, e.g. ["certificate","सर्टिफिकेट","praman patra"]. part: "end" = only each call\'s last 3 lines (why calls end), "start" = first 4.',
    input: {
      type: 'object', required: ['flow', 'words'],
      properties: {
        flow: { type: 'string' }, words: { type: 'array', items: { type: 'string' }, minItems: 1 },
        who: { type: 'string', enum: ['any', 'caller', 'agent'] }, part: { type: 'string', enum: ['any', 'start', 'end'] }, days: { type: 'number', description: 'Only the last N days (default: all calls)' },
      },
    },
    label: (i) => `Searched calls for ${(Array.isArray(i.words) ? i.words : []).slice(0, 3).map((w) => `“${w}”`).join(', ')}`,
    run: async (me, i) => {
      const ws = (Array.isArray(i.words) ? i.words : []).map((w) => String(w).toLowerCase().trim()).filter(Boolean)
      if (!ws.length) throw new Error('Give at least one word.')
      const { rows, period } = await callsOf(me, i.flow, typeof i.days === 'number' && i.days > 0 ? i.days : undefined)
      const per = new Map(ws.map((w) => [w, 0]))
      // Lines said the same way (a scripted greeting) are shown once with how many calls have them.
      const hits = new Map<string, { calls: number; call: string; turn: number; who: string; line: string }>()
      let matched = 0
      for (const r of rows) {
        const scope = i.part === 'end' ? r.lines.slice(-3) : i.part === 'start' ? r.lines.slice(0, 4) : r.lines
        const found = scope.filter((l) => (!i.who || i.who === 'any' || l.who === i.who) && ws.some((w) => l.text.toLowerCase().includes(w)))
        if (!found.length) continue
        matched++
        for (const w of ws) if (found.some((l) => l.text.toLowerCase().includes(w))) per.set(w, per.get(w)! + 1)
        for (const l of found.slice(0, 2)) {
          const k = norm(l.text).slice(0, 80)
          const h = hits.get(k)
          if (h) h.calls++
          else if (hits.size < 40) hits.set(k, { calls: 1, call: ref(r.sessionId), turn: l.n, who: l.who, line: clipTo(l.text, 180) })
        }
      }
      const distinct = [...hits.values()].sort((a, b) => b.calls - a.calls)
      const shown = distinct.slice(0, 10).map(({ calls, ...h }) => (calls > 1 ? { ...h, same_line_in_calls: calls } : h))
      return { period, calls_searched: rows.length, calls_matched: matched, by_word: Object.fromEntries(per), lines: shown, ...(distinct.length > shown.length ? { note: `${distinct.length - shown.length} more different lines match; narrow with who/part or more specific words. Read around a line with get_session turns [n-3, n+3].` } : {}) }
    },
  },
  {
    name: 'analyze_calls',
    description: 'The thorough, slower read: a reader model goes through a sample of real calls (default 60, max 120) and the server counts what it found: what callers wanted, how calls ended, what went wrong, and what information callers give (candidates for values the workflow should record). Returns totals with example calls only. Use it for open questions ("why do people call", "what goes wrong", "what should we record") after flow_profile; results are kept for a day. question: an optional extra question answered per call and counted.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' }, sample: { type: 'number' }, question: { type: 'string' }, days: { type: 'number' } } },
    label: (i) => `Analysed calls of ${str(i.flow)}`,
    run: async (me, i) => {
      const sample = Math.min(120, Math.max(10, typeof i.sample === 'number' ? i.sample : 60))
      const question = str(i.question).trim()
      const { f, rows, period } = await callsOf(me, i.flow, typeof i.days === 'number' && i.days > 0 ? i.days : undefined)
      const key = `${f.id}|${sample}|${question}|${rows.length}`
      const hit = CACHE.get(key)
      if (hit && Date.now() - hit.at < DAY) return { ...(hit.value as object), cached: true }
      // An even spread over the period, not just the latest.
      const real = rows.filter((r) => r.lines.some((l) => l.who === 'caller'))
      const step = Math.max(1, real.length / sample)
      const picked = Array.from({ length: Math.min(sample, real.length) }, (_, k) => real[Math.floor(k * step)])
      const batches: { i: number; text: string }[][] = []
      picked.forEach((r, k) => { if (k % 10 === 0) batches.push([]); batches[batches.length - 1].push({ i: k, text: forReader(r.lines) }) })
      const results = (await Promise.all(batches.map((b) => readBatch(b, question).catch(() => [])))).flat()
      const read = results.filter((x) => typeof x.i === 'number' && picked[x.i]).map((x) => ({ ...x, call: ref(picked[x.i].sessionId) }))
      if (!read.length) throw new Error('The reader returned nothing usable; try again or a smaller sample.')
      const value = {
        period, calls_in_period: rows.length, calls_read: read.length, calls_where_caller_never_spoke: rows.length - real.length,
        topics: tally(read, (x) => [str(x.topic)], (x) => x.call, 10),
        outcomes: tally(read, (x) => [str(x.outcome)], (x) => x.call, 6),
        problems: tally(read, (x) => [str(x.problem)], (x) => x.call, 8),
        details_callers_give: tally(read, (x) => (Array.isArray(x.details) ? x.details.map((d) => String(d).split(':')[0]) : []), (x) => x.call, 12),
        ...(question ? { answers: tally(read, (x) => [str(x.answer)], (x) => x.call, 8) } : {}),
        note: 'Counts are over the calls read, not all calls. details_callers_give that the workflow does not record (flow_profile workflow_records) are candidates to add as AI-decided values.',
      }
      CACHE.set(key, { at: Date.now(), value })
      return value
    },
  },
]
