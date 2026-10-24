// One answer to "is this agent working?", shared by the Flows list and a flow's Overview
// (mindsets/voxio-users.md, Flows list and Flow overview).

import type { Connection, FlowDoc, Session } from './types'

const DAY = 86_400_000
export const LIVE_DAYS = 7

export type FlowStatusId = 'live' | 'quiet' | 'tested' | 'new'
export type FlowStatus = { id: FlowStatusId; label: string; why: string }
/** What the status is read from: real sessions and tests counted apart, and where it is connected. */
export type StatusInput = { sessions: number; tests: number; lastAt?: string; connections: Connection[] }

/** "3 hours ago", "12 days ago": when something was, at a glance. */
export function ago(iso: string) {
  const ms = Date.now() - Date.parse(iso)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (ms < 3_600_000) return rtf.format(-Math.max(1, Math.round(ms / 60_000)), 'minute')
  if (ms < DAY) return rtf.format(-Math.round(ms / 3_600_000), 'hour')
  if (ms < 30 * DAY) return rtf.format(-Math.round(ms / DAY), 'day')
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const times = (n: number) => `${n} time${n === 1 ? '' : 's'}`

export function statusOf(f: StatusInput): FlowStatus {
  if (f.lastAt && Date.now() - Date.parse(f.lastAt) < LIVE_DAYS * DAY) return { id: 'live', label: 'Live', why: `Real sessions in the last ${LIVE_DAYS} days` }
  if (f.sessions) return { id: 'quiet', label: 'Quiet', why: f.lastAt ? `Last real session ${ago(f.lastAt)}` : 'No recent real sessions' }
  if (f.tests) return {
    id: 'tested', label: 'Tested',
    why: f.connections.length ? `Tested ${times(f.tests)} and connected. Waiting for its first real session.` : `Tested ${times(f.tests)}. Connect a number or website to go live.`,
  }
  return { id: 'new', label: 'Not tried', why: 'Try it in Test first.' }
}

/** The one step that moves a flow on: `to` is the flow tab, '' for Overview. */
export type NextStepInfo = { to: '' | 'test' | 'numbers'; icon: 'play' | 'phone' | 'list'; label: string }

/** Not tried → try it; tested but not connected → connect it; quiet → see what happened last; live → test a change. */
export function nextStepOf(f: StatusInput): NextStepInfo {
  const st = statusOf(f)
  if (st.id === 'new') return { to: 'test', icon: 'play', label: 'Try it' }
  if (st.id === 'tested' && !f.connections.length) return { to: 'numbers', icon: 'phone', label: 'Connect' }
  if (st.id === 'quiet') return { to: '', icon: 'list', label: 'Last session' }
  return { to: 'test', icon: 'play', label: 'Test' }
}

/** Where a flow is reachable from, as the Flows list reads it on the server. */
export function connectionsOf(f: FlowDoc): Connection[] {
  return [
    ...f.numbers.map((n) => ({ kind: 'number' as const, label: n.phone_number })),
    ...(f.integrations ?? []).map(() => ({ kind: 'integration' as const, label: 'Shop' })),
    ...(f['webhook-url'] ? [{ kind: 'webhook' as const, label: 'Webhook' }] : []),
    ...(f['web-actions']?.length ? [{ kind: 'web' as const, label: 'Website' }] : []),
  ]
}

/** Real sessions and tests counted apart, and the last real one, from a flow's own sessions. */
export function countSessions(sessions: Session[], isTest: (s: Session) => boolean): Pick<StatusInput, 'sessions' | 'tests' | 'lastAt'> {
  let real = 0, tests = 0
  let lastAt: string | undefined
  for (const s of sessions) {
    if (isTest(s)) { tests++; continue }
    real++
    if (!lastAt || s.startTime > lastAt) lastAt = s.startTime
  }
  return { sessions: real, tests, lastAt }
}
