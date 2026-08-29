// What the card BECOMES once a call is placed. Same surface, same position — the
// form is replaced in place rather than navigating, because you are holding a
// phone by this point and a page change is the last thing you want.

import { useEffect, useRef, useState } from 'react'

import type { Desk } from '#/lib/desks'
import { getCallProgress, type CallTurn } from '#/server/calling'

export default function CallLive({
  dialing,
  callId,
  desk,
  onReset,
}: {
  dialing: string
  callId: string
  desk: Desk
  onReset: () => void
}) {
  const [turns, setTurns] = useState<CallTurn[]>([])
  const [status, setStatus] = useState('dialing')
  const [gaveUp, setGaveUp] = useState(false)
  const [secs, setSecs] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)

  const done = status === 'completed'

  useEffect(() => {
    let alive = true
    const deadline = Date.now() + 15 * 60 * 1000

    const tick = async () => {
      try {
        const progress = await getCallProgress({ data: { callId } })
        if (!alive) return
        setStatus(progress.status)
        setTurns(progress.turns)
        if (progress.status === 'completed') return
      } catch {
      }
      if (!alive) return
      if (Date.now() > deadline) {
        setGaveUp(true)
        return
      }
      timer = setTimeout(tick, 2000)
    }

    let timer = setTimeout(tick, 2500)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [callId])

  useEffect(() => {
    if (done || gaveUp) return
    const id = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [done, gaveUp])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns.length])

  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  return (
    <div className="dcard dcard--live">
      <div className="dlive-top">
        <span className={`dlive-dot${done ? ' is-done' : ''}`} aria-hidden="true" />
        <span className="dlive-status">
          {done ? 'Call ended' : gaveUp ? 'Stopped waiting' : `Ringing ${dialing}`}
        </span>
        <span className="dlive-clock" aria-label="Call duration">{clock}</span>
      </div>

      <p className="dnote">
        {done
          ? `${turns.length} turn${turns.length === 1 ? '' : 's'} — here is how it went.`
          : gaveUp
            ? 'The call may still have happened; we just stopped polling for it.'
            : 'Answer it like any call. The conversation appears here when it ends.'}
      </p>

      {/* The prompts, moved here from the old sidebar. This is the moment they
          something to say to it. */}
      {!done && !gaveUp ? (
        <div className="dasks">
          <span className="dasks-k">Try asking it</span>
          <ul>
            {desk.asks.map((ask) => (
              <li key={ask}>{ask}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {done || turns.length > 0 ? (
        <div className="dfeed" ref={feedRef} aria-live="polite">
          {turns.length === 0 ? (
            <p className="dfeed-empty">Nothing was said before the call ended.</p>
          ) : (
            turns.map((turn, i) => (
              <div key={i} className={`dturn dturn--${turn.who}`}>
                <span className="dturn-who">{turn.who === 'agent' ? 'Agent' : 'You'}</span>
                <p className="dturn-text">{turn.text}</p>
              </div>
            ))
          )}
        </div>
      ) : null}

      <button type="button" className={done ? 'dgo' : 'dgo dgo--quiet'} onClick={onReset}>
        {done ? 'Call me again' : 'End'}
      </button>
    </div>
  )
}
