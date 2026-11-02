// Acting on recorded fields (extra.variables, saved per call by the agent service):
//   follow_ups  — calls that need a callback, by a recorded value (e.g. call_outcome = dropped)
//                 or "unfinished" (the caller spoke last: the agent never answered them)
//   lead_export — a CSV of calls with their recorded values, handed to the browser as a download.
// Caller numbers go to the user (the list and the file), not into the model's context.

import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'
import { asTurn, findFlow, type ToolDef } from './tools.server'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
type Vars = Record<string, { value?: unknown; history?: unknown[] }>

const valuesOf = (extra: unknown): Record<string, unknown> => {
  const v = (extra as { variables?: Vars } | null)?.variables
  return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x?.value])) : {}
}
const same = (a: unknown, b: unknown) => String(a).toLowerCase() === String(b).toLowerCase()
const show = (v: unknown) => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

async function callsOf(me: AuthUser, flow: unknown, days?: number) {
  const f = await findFlow(me, flow)
  const rows = await withDb(() => db.callSession.findMany({
    where: { flowId: f.id, ...(days ? { startTime: { gte: new Date(Date.now() - days * 864e5) } } : {}) },
    orderBy: { startTime: 'desc' }, take: 5000,
    select: { sessionId: true, startTime: true, endTime: true, totalConnectedTime: true, type: true, from: true, to: true, transcription: true, extra: true },
  }))
  return { f, rows: rows.filter((r) => (r.extra as { test?: boolean } | null)?.test !== true) }
}

const secs = (r: { totalConnectedTime: number; startTime: Date; endTime: Date | null }) =>
  Math.round(r.totalConnectedTime > 0 ? r.totalConnectedTime : r.endTime ? Math.max(0, (r.endTime.getTime() - r.startTime.getTime()) / 1000) : 0)

/** Spoken lines only, as caller/agent. */
const spoken = (t: unknown) => (Array.isArray(t) ? t : []).map(asTurn).filter((x) => !x.data && typeof x.content === 'string' && x.content.trim())
  .map((x) => ({ agent: /assist|ai|agent|bot/i.test(String(x.role)), text: String(x.content) }))

export const LEAD_TOOLS: ToolDef[] = [
  {
    name: 'follow_ups',
    description: 'Calls to call back. Either by a recorded value (field + value, e.g. call_outcome = dropped, callback_wanted = true), or unfinished: true for calls where the caller spoke last and never got an answer. Shown to the user as a list with caller numbers and links; you get counts and examples without numbers. days: only recent calls (default 30).',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' }, field: { type: 'string' }, value: {}, unfinished: { type: 'boolean' }, days: { type: 'number' } } },
    label: (i) => `Found calls to follow up${i.field ? ` (${str(i.field)} = ${show(i.value)})` : i.unfinished ? ' (unfinished)' : ''}`,
    run: async (me, i) => {
      const field = str(i.field).replace(/^agent\./, '')
      if (!field && i.unfinished !== true) throw new Error('Give field and value (a recorded field), or unfinished: true.')
      const { f, rows } = await callsOf(me, i.flow, typeof i.days === 'number' && i.days > 0 ? i.days : 30)
      const hits = rows.filter((r) => {
        if (field) { const v = valuesOf(r.extra)[field]; return i.value === undefined ? v !== undefined && v !== '' && v !== null : same(v, i.value) }
        const t = spoken(r.transcription)
        return t.length >= 2 && !t[t.length - 1].agent
      })
      if (field && !rows.some((r) => field in valuesOf(r.extra))) throw new Error(`No call of “${f.flowName}” has “${field}” recorded yet (recorded_fields shows what it records, and values exist only for calls after the field was added).`)
      const list = hits.slice(0, 50).map((r) => {
        const t = spoken(r.transcription)
        return { call: `vx:session/${r.sessionId}`, when: r.startTime.toISOString(), caller: r.from ?? r.to ?? '', seconds: secs(r), recorded: valuesOf(r.extra), last_caller_line: [...t].reverse().find((x) => !x.agent)?.text.slice(0, 140) ?? '' }
      })
      return { followups: { title: `${f.flowName}: ${field ? `${field.replace(/_/g, ' ')} = ${show(i.value)}` : 'unfinished calls'}`, total: hits.length, calls: list } }
    },
  },
  {
    name: 'lead_export',
    description: 'A CSV file of a flow\'s calls with their recorded values (one column per recorded field), plus date, caller number, channel, length and a link. Optionally only calls where a field has a value (field + value). The file goes straight to the user as a download; you get the row count. days: only recent calls (default all).',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' }, field: { type: 'string' }, value: {}, days: { type: 'number' } } },
    label: (i) => `Prepared a CSV of ${str(i.flow)}'s calls`,
    run: async (me, i) => {
      const { f, rows } = await callsOf(me, i.flow, typeof i.days === 'number' && i.days > 0 ? i.days : undefined)
      const field = str(i.field).replace(/^agent\./, '')
      const pick = rows.filter((r) => !field || (i.value === undefined ? valuesOf(r.extra)[field] !== undefined : same(valuesOf(r.extra)[field], i.value)))
      const names = [...new Set(pick.flatMap((r) => Object.keys(valuesOf(r.extra))))].sort()
      if (!names.length) throw new Error(`No call of “${f.flowName}” has recorded values yet${field ? ` for ${field}` : ''}. Values exist only for calls after fields were added (record_fields).`)
      const withVals = pick.filter((r) => Object.keys(valuesOf(r.extra)).length)
      const cell = (v: unknown) => { const s = show(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
      const head = ['date', 'caller', 'channel', 'seconds', ...names, 'session']
      const lines = withVals.map((r) => { const v = valuesOf(r.extra); return [r.startTime.toISOString(), r.from ?? r.to ?? '', r.type, secs(r), ...names.map((n) => v[n]), r.sessionId].map(cell).join(',') })
      const name = `${f.flowName.replace(/[^\w-]+/g, '-')}-calls-${new Date().toISOString().slice(0, 10)}.csv`
      return { download: { name, mime: 'text/csv', text: `﻿${[head.join(','), ...lines].join('\n')}`, rows: withVals.length, columns: head } }
    },
  },
]
