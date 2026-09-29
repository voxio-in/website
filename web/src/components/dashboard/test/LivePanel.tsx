// The live view shared by browser and phone tests: orb, timer, controls,
// avatar video, transcript, typed input and the page actions it asked for.
// Presentational only — no SDK import, so it renders on the server too.

import { useContext, useEffect, useRef, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'
import { VoiceBeam } from 'voice-glow'

import Icon from '../Icon'
import { ThemeCtx } from '../ui'

export type LiveState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ringing' | 'in-call' | 'ended' | 'error'
export type Line = { role: 'user' | 'agent'; text: string; final: boolean }
export type PageAction = { id: string; label: string }

const ORB = {
  connecting: 'connecting',
  ringing: 'connecting',
  listening: 'listening',
  'in-call': 'listening',
  thinking: 'working',
  speaking: 'composing',
} as const

const LABEL: Record<LiveState, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  ringing: 'Ringing…',
  'in-call': 'In call',
  ended: 'Ended',
  error: 'Stopped',
}

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function LivePanel({
  state, labels, startedAt, lines, actions, userLevel, agentStream, muted, onMute, onEnd, endLabel = 'End', onSend,
}: {
  state: LiveState
  /** Replace the words for some states, e.g. "Your turn" in a chat. */
  labels?: Partial<Record<LiveState, string>>
  /** When the call connected, for the timer. */
  startedAt: number | null
  lines: Line[]
  actions?: PageAction[]
  /** Microphone level getter, 0–1, sampled every frame by the glow. */
  userLevel?: () => number
  agentStream?: MediaStream | null
  muted?: boolean
  onMute?: () => void
  onEnd?: () => void
  endLabel?: string
  /** Typed input; returns false if it could not be sent. */
  onSend?: (text: string) => boolean
}) {
  const theme = useContext(ThemeCtx)
  const live = state !== 'idle' && state !== 'ended' && state !== 'error'
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live || !startedAt) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [live, startedAt])
  const seconds = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0

  // Follow the transcript unless the reader scrolled up.
  const list = useRef<HTMLDivElement>(null)
  const stuck = useRef(true)
  useEffect(() => {
    const el = list.current
    if (el && stuck.current) el.scrollTop = el.scrollHeight
  }, [lines])

  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (video.current) video.current.srcObject = agentStream ?? null
  }, [agentStream])

  const [text, setText] = useState('')
  const send = () => {
    const t = text.trim()
    if (t && onSend?.(t)) setText('')
  }

  const orbState = ORB[state as keyof typeof ORB]

  return (
    <section className="db-setcard db-live" data-state={state}>
      <VoiceBeam className="db-live-head" level={userLevel ?? 0} processing={state === 'thinking'} theme={theme} scale={0.8}>
        <div className="db-live-bar">
          <span className="db-live-orb">
            {orbState ? <ThinkingOrb state={orbState} size={32} /> : <Icon name={state === 'ended' ? 'check' : 'voice'} size={22} />}
          </span>
          <span className="db-live-state">
            <b>{labels?.[state] ?? LABEL[state]}</b>
            {startedAt && <span className="db-mono">{clock(seconds)}</span>}
          </span>
          <span className="db-live-ctl">
            {onMute && live && (
              <button className={`db-btn db-btn-icon${muted ? ' is-on' : ''}`} onClick={onMute} aria-pressed={muted}>
                <Icon name="voice" size={16} />{muted ? 'Unmute' : 'Mute'}
              </button>
            )}
            {onEnd && live && (
              <button className="db-btn db-danger db-btn-icon" onClick={onEnd}><Icon name="close" size={16} />{endLabel}</button>
            )}
          </span>
        </div>
      </VoiceBeam>

      {agentStream && <video ref={video} className="db-live-video" autoPlay playsInline />}

      <div className="db-live-lines" ref={list}
        onScroll={(e) => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }}>
        {!lines.length && <p className="db-muted">{live ? 'Say hello — what you and the agent say shows up here.' : 'The conversation shows up here.'}</p>}
        {lines.map((l, i) => {
          return (
            <div key={i} className={`db-bubblerow is-${l.role}`}>
              <span className="db-bubble-who">{l.role === 'user' ? 'You' : 'Agent'}</span>
              <p className={`db-bubble is-${l.role}${l.final ? '' : ' is-partial'}`}>{l.text}</p>
            </div>
          )
        })}
      </div>

      {onSend && (
        <div className="db-live-type">
          <input className="db-in" placeholder="Type instead of speaking…" value={text} disabled={!live}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button className="db-btn" disabled={!live || !text.trim()} onClick={send}>Send</button>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="db-live-actions">
          <span className="db-flabel">What it would do on your website</span>
          <ul>
            {actions.map((a) => <li key={a.id}><Icon name="cursor" size={15} />{a.label}<Icon name="check" size={14} className="db-live-ok" /></li>)}
          </ul>
        </div>
      )}
    </section>
  )
}
