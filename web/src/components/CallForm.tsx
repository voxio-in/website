// The demo on /calling: pick a desk, give a number, one button.

import { useState } from 'react'

import CallLive from '#/components/CallLive'
import { DEFAULT_DESK, DESKS, deskById, type DeskId } from '#/lib/desks'
import { requestDemoCall } from '#/server/calling'

type State =
  | { phase: 'idle' }
  | { phase: 'calling' }
  | { phase: 'ringing'; dialing: string; callId: string }
  | { phase: 'failed'; reason: string }

const DEFAULT_CC = '+91'

export default function CallForm() {
  const [deskId, setDeskId] = useState<DeskId>(DEFAULT_DESK)
  const [cc, setCc] = useState(DEFAULT_CC)
  const [phone, setPhone] = useState('')
  const [org, setOrg] = useState('')
  const [state, setState] = useState<State>({ phase: 'idle' })

  const desk = deskById(deskId)
  const busy = state.phase === 'calling'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setState({ phase: 'calling' })
    try {
      const full = `${cc.trim()} ${phone.trim()}`.trim()
      const result = await requestDemoCall({ data: { phone: full, org, desk: deskId } })
      setState(
        result.ok
          ? { phase: 'ringing', dialing: result.dialing, callId: result.callId }
          : { phase: 'failed', reason: result.reason },
      )
    } catch {
      setState({
        phase: 'failed',
        reason: 'Something went wrong on our side. Try again in a moment.',
      })
    }
  }

  if (state.phase === 'ringing') {
    return (
      <CallLive
        dialing={state.dialing}
        callId={state.callId}
        desk={desk}
        onReset={() => setState({ phase: 'idle' })}
      />
    )
  }

  return (
    <form className="dcard" onSubmit={onSubmit} noValidate>
      {/* ---------- 1 · the desk ---------- */}
      <div className="dstep">
        <span className="dstep-n" aria-hidden="true">1</span>
        <span className="dstep-t">Pick a desk</span>
      </div>

      {/* A segmented control, not four boxes. The four desks are one choice with
          things you might be about to do. */}
      <div className="seg" role="radiogroup" aria-label="Pick a desk">
        {DESKS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={d.id === deskId}
            className={`seg-o${d.id === deskId ? ' is-on' : ''}`}
            onClick={() => {
              setDeskId(d.id)
              setState({ phase: 'idle' })
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="dhint">{desk.blurb}</p>

      {/* ---------- 2 · the number ---------- */}
      <div className="dstep">
        <span className="dstep-n" aria-hidden="true">2</span>
        <label className="dstep-t" htmlFor="call-phone">Your phone number</label>
      </div>

      {/* The hero input. It is the only thing on this card that cannot be
          skipped, so it is the only thing sized like it matters. */}
      <div className="numrow">
        <input
          className="numcc"
          aria-label="Country code"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
          inputMode="tel"
          size={4}
        />
        <input
          id="call-phone"
          className="numin"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="80313 21074"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      {/* ---------- 3 · the optional bit ---------- */}
      <div className="dstep">
        <span className="dstep-n" aria-hidden="true">3</span>
        <label className="dstep-t" htmlFor="call-org">
          {desk.orgLabel} <span className="dopt">optional</span>
        </label>
      </div>

      {/* Visibly lighter than step 2 so it reads as skippable without a helper
          desk's answer into the next — the label above it has changed meaning. */}
      <input
        key={desk.id}
        id="call-org"
        className="softin"
        name="org"
        type="text"
        autoComplete="organization"
        placeholder={desk.orgPlaceholder}
        value={org}
        onChange={(e) => setOrg(e.target.value)}
      />

      {/* ---------- the action ---------- */}
      <button className="dgo" type="submit" disabled={busy}>
        {busy ? 'Calling…' : 'Call me'}
      </button>

      <p className="dnote" role="status" aria-live="polite">
        {state.phase === 'failed'
          ? state.reason
          : busy
            ? 'Placing the call…'
            : 'It rings within seconds. Answer it like any call.'}
      </p>

      {/* The three notes that used to be a paragraph in the sidebar. Closed by
          is reassuring once you have. */}
      <details className="dexpect">
        <summary>What to expect</summary>
        <p>
          It speaks Hinglish and switches to English when you do. Interrupt it, change
          your mind or go quiet — it handles all three. The call is recorded so the
          conversation can be shown back to you afterwards.
        </p>
      </details>
    </form>
  )
}
