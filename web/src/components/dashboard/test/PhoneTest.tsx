// The phone half of the Test tab: the flow rings the owner's phone from one of
// its own numbers. Placed, followed and cancelled through server functions
// that use @voxio/server; nothing here talks to the call server directly.

import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { Dropdown, Label } from '../controls'
import Icon from '../Icon'
import { unwire } from '#/lib/dashboard/client'
import type { FlowDoc, TestCall, TestSetup, TestTurn } from '#/lib/dashboard/types'
import { cancelTestCall, startTestCall, testCallStatus } from '#/server/dashboard/api'
import LivePanel, { type LiveState } from './LivePanel'
import type { WireLog } from './wire'

export type PhoneResult = { sessionId: string; type: 'phone'; startTime: string; seconds: number; status: string; transcript: TestTurn[]; to: string }

const PHONE_KEY = 'vx.test.phone'
const POLL_MS = 2000
const GIVE_UP_MS = 10 * 60 * 1000
const ENDED = new Set<TestCall['status']>(['completed', 'failed', 'no-answer', 'busy', 'canceled'])

const ENDED_TEXT: Partial<Record<TestCall['status'], string>> = {
  'no-answer': 'Nobody picked up.',
  busy: 'The line was busy.',
  failed: 'The call didn’t go through.',
  canceled: 'Hung up.',
}

const liveState = (s: TestCall['status']): LiveState =>
  s === 'in-progress' ? 'in-call' : ENDED.has(s) ? 'ended' : 'ringing'

export default function PhoneTest({ flow, setup, customs, blocked, log, onLive, onDone }: {
  flow: FlowDoc
  setup: TestSetup
  customs?: Record<string, unknown>
  /** The flow is missing something a call needs; the page says what. */
  blocked?: boolean
  /** Records what is sent and received, for the code view. */
  log: WireLog
  onLive: (live: boolean) => void
  onDone: (r: PhoneResult) => void
}) {
  const numbers = flow.numbers.map((n) => n.phone_number)
  const [to, setTo] = useState('')
  const [from, setFrom] = useState(numbers[0] ?? '')
  const [call, setCall] = useState<TestCall | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  // One key per attempt: a double click, or a retry after a timeout, never rings twice.
  const attempt = useRef<string | null>(null)
  const placedAt = useRef(0)

  useEffect(() => { try { setTo(localStorage.getItem(PHONE_KEY) ?? '') } catch {} }, [])

  const clean = to.replace(/[^\d+]/g, '')
  const valid = /^\+\d{8,15}$/.test(clean)
  const live = !!call && !ENDED.has(call.status)
  useEffect(() => onLive(live || busy), [live, busy, onLive])

  // Follow the call every two seconds until it ends (or ten minutes pass).
  useEffect(() => {
    if (!call || ENDED.has(call.status)) return
    if (Date.now() - placedAt.current > GIVE_UP_MS) { setErr('Stopped following the call after ten minutes.'); return }
    const t = setTimeout(async () => {
      const r = unwire<TestCall>(await testCallStatus({ data: { key: flow.key, id: call.id } }))
      if (!r.ok) { log('in', 'call status · error', r); setErr(r.reason); setCall({ ...call, status: 'failed' }); return }
      // Only changes, so two-second polling doesn't flood the log.
      if (r.data.status !== call.status || r.data.transcript) log('in', `call status · ${r.data.status}`, r.data)
      if (r.data.status === 'in-progress' && startedAt === null) setStartedAt(Date.now())
      setCall(r.data)
    }, POLL_MS)
    return () => clearTimeout(t)
  }, [call, flow.key, startedAt])

  // Once it has ended: report it, and free the attempt key for the next call.
  const reported = useRef<string | null>(null)
  useEffect(() => {
    if (!call || !ENDED.has(call.status) || reported.current === call.id) return
    reported.current = call.id
    attempt.current = null
    onDone({
      sessionId: call.sessionId ?? call.id,
      type: 'phone',
      startTime: new Date(placedAt.current).toISOString(),
      seconds: call.seconds ?? (startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0),
      status: call.status,
      transcript: call.transcript ?? [],
      to: clean,
    })
  }, [call, onDone, startedAt, clean])

  const ring = async () => {
    if (busy || live) return
    setBusy(true)
    setErr(null)
    try { localStorage.setItem(PHONE_KEY, clean) } catch {}
    attempt.current ??= crypto.randomUUID()
    placedAt.current = Date.now()
    setStartedAt(null)
    const request = { key: flow.key, from, to: clean, customs: JSON.stringify(customs ?? {}), idempotencyKey: attempt.current }
    log('out', 'place call', { ...request, flow_api_key: request.key, key: undefined, customs: customs ?? {} })
    const r = unwire<TestCall>(await startTestCall({ data: request }))
    log('in', r.ok ? `call · ${r.data.status}` : 'call · refused', r)
    setBusy(false)
    if (!r.ok) return setErr(r.reason)
    setCall(r.data)
  }

  const hangUp = async () => {
    if (!call) return
    log('out', 'hang up', { id: call.id })
    const r = unwire<TestCall>(await cancelTestCall({ data: { key: flow.key, id: call.id } }))
    log('in', r.ok ? `call · ${r.data.status}` : 'hang up · refused', r)
    if (!r.ok) return setErr(r.reason)
    setCall(r.data)
  }

  // Closing the dialog mid-call hangs up rather than leaving the phone ringing.
  const liveCall = useRef<string | null>(null)
  liveCall.current = live && call ? call.id : null
  useEffect(() => () => {
    if (liveCall.current) void cancelTestCall({ data: { key: flow.key, id: liveCall.current } })
  }, [flow.key])

  const off = !setup.phone ? 'soon' : !numbers.length ? 'nonumber' : blocked && !live ? 'setup' : null

  return (
    <div className="db-testbody">
      {off === 'soon' && <p className="db-muted">Phone testing is coming soon. Until then, test in the browser.</p>}
      {off === 'nonumber' && (
        <p className="db-muted">
          Attach a number to this flow to test by phone — on <Link to="/dashboard/flows/$flowId/numbers" params={{ flowId: flow.key }} className="db-textlink">Numbers & calls</Link>.
        </p>
      )}

      <div className="db-knobs">
        <div className="db-knob-row">
          <Label>Your number</Label>
          <div className="db-knob-ctl">
            <input className="db-in" inputMode="tel" placeholder="+91 98xxxx xxxx" value={to} disabled={!!off || live}
              onChange={(e) => setTo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && valid && ring()} />
          </div>
        </div>
        <div className="db-knob-row">
          <Label info="The number you’ll see calling.">From</Label>
          <div className="db-knob-ctl">
            <Dropdown value={from} onChange={setFrom} aria-label="From" placeholder="No number"
              options={numbers.map((n) => ({ value: n, label: n }))} />
          </div>
        </div>
      </div>
      {to && !valid && !off && <span className="db-fhelp db-err-text">Use your number with its country code, e.g. +91…</span>}

      <div className="db-test-go">
        <button className="db-btn db-primary db-btn-icon db-btn-lg" disabled={!!off || !valid || !from || busy || live} onClick={ring}>
          <Icon name="phone" size={18} />{busy ? 'Calling…' : 'Call me'}
        </button>
        {err && <span className="db-err-text">{err}</span>}
        {call && ENDED.has(call.status) && ENDED_TEXT[call.status] && <span className="db-muted">{ENDED_TEXT[call.status]}</span>}
      </div>

      {call && (
        <LivePanel
          state={liveState(call.status)}
          startedAt={startedAt}
          lines={(call.transcript ?? []).map((t) => ({ role: t.role === 'assistant' ? 'agent' : 'user', text: t.content, final: true }))}
          onEnd={hangUp}
          endLabel="Hang up"
        />
      )}
    </div>
  )
}
