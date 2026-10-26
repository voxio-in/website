// The live view shared by browser, chat and phone tests.
//
// While a call connects, everything sits centred: the orb, the state and a
// hint to allow the microphone. Once connected the orb glides into the bar and
// the agent's face fades in (or the chat slides in), as one Motion layout
// animation. Next to the agent's controls a layout picker offers a few kinds
// of arrangement, which the tester then shapes by hand:
//   voice only  → Voice · Voice + chat · Chat
//   agent face  → Side by side · Floating face · Face only · Chat only
//   both faces  → Side by side · Floating me · Only them · Only me · Them + chat
// Side by side: drag the divider to resize, ⇄ (or double-click) swaps sides.
// Floating: drag the window anywhere, drag its corner to resize.
// Switching layouts always animates. Presentational only — no SDK import.

import { SendHorizontal } from 'lucide-react'
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowLeftRightIcon, MicIcon, Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'
import { VoiceBeam } from 'voice-glow'

import Icon from '../Icon'
import { ThemeCtx } from '../ui'

export type LiveState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ringing' | 'in-call' | 'ended' | 'error'
export type Line = {
  role: 'user' | 'agent'; text: string; final: boolean
  /** Agent turn number, to join one reply's sentences. */ turn?: number
  /** Extra keys a node sent besides the spoken line, shown as raw JSON. */ data?: boolean
}
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

type Layout = { id: string; label: string }
const LAYOUTS = {
  voice: [{ id: 'orb', label: 'Voice' }, { id: 'side', label: 'Voice + chat' }, { id: 'chat', label: 'Chat' }],
  face: [{ id: 'side', label: 'Side by side' }, { id: 'float', label: 'Floating face' }, { id: 'face', label: 'Face only' }, { id: 'chat', label: 'Chat only' }],
  duo: [{ id: 'side', label: 'Side by side' }, { id: 'float', label: 'Floating me' }, { id: 'them', label: 'Only them' }, { id: 'me', label: 'Only me' }, { id: 'chat', label: 'Them + chat' }],
} satisfies Record<string, Layout[]>
type Mode = keyof typeof LAYOUTS
// The layout a call opens in until the tester picks another. A face call starts as a floating face.
const DEFAULT_LAYOUT: Partial<Record<Mode, string>> = { face: 'float' }

type Arrange = { ratio: number; swap: boolean; fx: number; fy: number; fw: number }
const ARRANGE: Arrange = { ratio: 0.45, swap: false, fx: -1, fy: 12, fw: 200 }

const SPRING = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 } as const
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const stored = <T,>(key: string, fallback: T): T => {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return fallback }
}
const keep = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private window */ } }

export default function LivePanel({
  state: rawState, labels, startedAt, lines: allLines, showData = true, actions, userLevel, agentStream, selfStream, voice, muted, onMute, agentVolume, onAgentVolume, onEnd, endLabel = 'End', onSend,
}: {
  state: LiveState
  /** Replace the words for some states, e.g. "Your turn" in a chat. */
  labels?: Partial<Record<LiveState, string>>
  /** When the call connected, for the timer. */
  startedAt: number | null
  lines: Line[]
  /** False hides the agent's extra data bubbles (the flow's "Show extra data" setting). */
  showData?: boolean
  actions?: PageAction[]
  /** Microphone level getter, 0–1, sampled every frame by the glow. */
  userLevel?: () => number
  /** The agent's face, when the call has one. */
  agentStream?: MediaStream | null
  /** The tester's own camera, when they share it. */
  selfStream?: MediaStream | null
  /** A spoken call (browser or phone): offers layouts and the microphone hint. */
  voice?: boolean
  muted?: boolean
  onMute?: () => void
  /** The agent's loudness on this screen, 0–100; shows the volume control when given. */
  agentVolume?: number
  onAgentVolume?: (v: number) => void
  onEnd?: () => void
  endLabel?: string
  /** Typed input; returns false if it could not be sent. */
  onSend?: (text: string) => boolean
}) {
  const lines = showData ? allLines : allLines.filter((l) => !l.data)
  const theme = useContext(ThemeCtx)
  // Speaking, listening and thinking flip on short pauses; show a change only once it has held 200 ms.
  const state = useSteady(rawState)
  const live = state !== 'idle' && state !== 'ended' && state !== 'error'
  const connecting = state === 'connecting' || state === 'ringing'
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live || !startedAt) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [live, startedAt])
  const seconds = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0

  // Which arrangements fit this call, and the chosen one (kept per kind of call).
  const mode: Mode | null = !voice ? null : agentStream && selfStream ? 'duo' : agentStream ? 'face' : 'voice'
  const [picked, setPicked] = useState<Record<string, string>>(() => stored('vx-test-layout-v2', {}))
  const options = mode ? LAYOUTS[mode] : []
  const layout = mode ? (options.find((o) => o.id === (picked[mode] ?? DEFAULT_LAYOUT[mode])) ?? options[0]).id : 'chat'
  const pick = (id: string) => {
    if (!mode) return
    const next = { ...picked, [mode]: id }
    setPicked(next)
    keep('vx-test-layout-v2', next)
  }
  const [arr, setArr] = useState<Arrange>(() => stored('vx-test-arrange', ARRANGE))
  const arrange = (p: Partial<Arrange>) => setArr((a) => { const next = { ...a, ...p }; keep('vx-test-arrange', next); return next })
  const stageRef = useRef<HTMLDivElement>(null)

  // Follow the transcript unless the reader scrolled up.
  const list = useRef<HTMLDivElement>(null)
  const stuck = useRef(true)
  useEffect(() => {
    const el = list.current
    if (el && stuck.current) el.scrollTop = el.scrollHeight
  }, [lines, layout])

  const [text, setText] = useState('')
  // Telegram-style send: remember where the typed text sat, so the new bubble
  // can fly from the input to its place in the chat.
  const input = useRef<HTMLInputElement>(null)
  const flight = useRef<Flight | null>(null)
  const send = () => {
    const t = text.trim()
    if (!t) return
    const r = input.current?.getBoundingClientRect()
    const pad = input.current ? parseFloat(getComputedStyle(input.current).paddingLeft) : 0
    if (onSend?.(t)) {
      if (r) flight.current = { text: t, from: { x: r.left + pad, y: r.top + r.height / 2 }, after: lines.length }
      setText('')
    }
  }

  const orbState = ORB[state as keyof typeof ORB]
  const orb = (size: 32 | 64) => (
    <motion.span layoutId="live-orb" className="db-live-orb" transition={SPRING} style={{ width: size + 16, height: size + 16 }}>
      {orbState ? <ThinkingOrb state={orbState} size={size} /> : <Icon name={state === 'ended' ? 'check' : 'voice'} size={Math.round(size * 0.7)} />}
    </motion.span>
  )

  // Connecting: one calm centred stage, before anything else appears.
  if (connecting) {
    return (
      <LayoutGroup id="live">
        <section className="db-setcard db-live is-stage" data-state={state}>
          <motion.div className="db-live-stagebox" layout transition={SPRING}>
            <span className="db-live-halo">{orb(64)}</span>
            <motion.b layoutId="live-label" className="db-live-stagelabel">{labels?.[state] ?? LABEL[state]}</motion.b>
            {voice && (
              <motion.span className="db-live-mic" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <MicIcon size={16} />Allow the microphone in your browser to talk to it
              </motion.span>
            )}
            {onEnd && <button className="db-btn db-live-cancel" onClick={onEnd}>Cancel</button>}
          </motion.div>
        </section>
      </LayoutGroup>
    )
  }

  const chat = (
    <motion.div key="chat" layout="position" className="db-live-chat" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={SPRING}>
      <div className="db-live-lines" ref={list}
        onScroll={(e) => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }}>
        {lines.map((l, i) => (
          <div key={i} className={`db-bubblerow is-${l.role}`}>
            <span className="db-bubble-who">{l.role === 'user' ? 'You' : l.data ? 'Agent · data' : 'Agent'}</span>
            {l.data
              ? <pre className="db-bubble is-agent is-data">{l.text}</pre>
              : <Bubble line={l} index={i} flight={flight} />}
          </div>
        ))}
      </div>
      {onSend && (
        <div className="db-live-type db-btngroup" role="group">
          <input ref={input} className="db-in db-gin" placeholder={voice ? 'Type instead of speaking…' : 'Type a message…'} value={text} disabled={!live}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button className="db-gbtn is-lead" disabled={!live || !text.trim()} onClick={send}><SendHorizontal size={18} />Send</button>
        </div>
      )}
    </motion.div>
  )

  const them = agentStream ? <Feed key="them" who="them" stream={agentStream} /> : null
  const me = selfStream ? <Feed key="me" who="me" stream={selfStream} /> : null
  const voicePane = (
    <motion.div key="voice" className="db-live-bigorb" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
      <span className="db-live-halo is-big">{orb(64)}</span>
      <span className="db-muted">{state === 'speaking' ? 'The agent is talking' : state === 'thinking' ? 'Working on a reply' : 'Go ahead, it’s listening'}</span>
    </motion.div>
  )

  // What goes where, for this kind of call and layout.
  let main: React.ReactNode = chat
  let second: React.ReactNode = null
  let how: 'one' | 'side' | 'float' = 'one'
  if (mode === 'voice') {
    if (layout === 'orb') main = voicePane
    else if (layout === 'side') { main = voicePane; second = chat; how = 'side' }
  } else if (mode === 'face') {
    if (layout === 'side') { main = them; second = chat; how = 'side' }
    else if (layout === 'float') { main = chat; second = agentStream ? <Feed key="them" who="them" stream={agentStream} still /> : null; how = 'float' }
    else if (layout === 'face') main = them
  } else if (mode === 'duo') {
    if (layout === 'side') { main = them; second = me; how = 'side' }
    else if (layout === 'float') { main = them; second = selfStream ? <Feed key="me" who="me" stream={selfStream} still /> : null; how = 'float' }
    else if (layout === 'them') main = them
    else if (layout === 'me') main = me
    else { main = them; second = chat; how = 'side' }
  }

  let stage: React.ReactNode
  if (how === 'side') {
    const [a, b] = arr.swap ? [second, main] : [main, second]
    stage = (
      <div className="db-live-split" style={{ gridTemplateColumns: `minmax(0, ${arr.ratio}fr) 16px minmax(0, ${1 - arr.ratio}fr)` }}>
        <AnimatePresence mode="popLayout">{a}</AnimatePresence>
        <Divider stage={stageRef} onRatio={(ratio) => arrange({ ratio })} onSwap={() => arrange({ swap: !arr.swap })} />
        <AnimatePresence mode="popLayout">{b}</AnimatePresence>
      </div>
    )
  } else if (how === 'float') {
    stage = (
      <>
        <AnimatePresence mode="popLayout">{main}</AnimatePresence>
        <Floating stage={stageRef} x={arr.fx} y={arr.fy} w={arr.fw} onMove={(fx, fy) => arrange({ fx, fy })} onSize={(fw) => arrange({ fw })}>{second}</Floating>
      </>
    )
  } else stage = <AnimatePresence mode="popLayout">{main}</AnimatePresence>

  return (
    <LayoutGroup id="live">
      <section className="db-setcard db-live" data-state={state} data-layout={layout}>
        <VoiceBeam className="db-live-head" level={userLevel ?? 0} processing={state === 'thinking'} theme={theme} scale={0.8}>
          <div className="db-live-bar">
            {!(mode === 'voice' && layout !== 'chat') && orb(32)}
            <span className="db-live-state">
              <motion.b layoutId="live-label">{labels?.[state] ?? LABEL[state]}</motion.b>
              {startedAt && <span className="db-mono">{clock(seconds)}</span>}
            </span>
            <span className="db-live-ctl">
              {mode && live && (
                <span className="m3-seg db-live-layouts" role="radiogroup" aria-label="Layout">
                  {options.map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={o.id === layout} className={`m3-seg-btn${o.id === layout ? ' is-on' : ''}`} onClick={() => pick(o.id)}>
                      <span className="m3-seg-check" aria-hidden><Icon name="check" size={16} /></span>{o.label}
                    </button>
                  ))}
                </span>
              )}
              {onAgentVolume && agentVolume !== undefined && live && <InlineVolume value={agentVolume} onChange={onAgentVolume} />}
              {(onMute || onEnd) && live && (
                <span className="db-btngroup" role="group" aria-label="Call controls">
                  {onMute && (
                    <button className={`db-gbtn${muted ? ' is-on' : ''}`} onClick={onMute} aria-pressed={muted}>
                      <MicIcon size={18} />{muted ? 'Unmute mic' : 'Mute mic'}
                    </button>
                  )}
                  {onEnd && <button className="db-gbtn is-danger" onClick={onEnd}><Icon name="close" size={18} />{endLabel}</button>}
                </span>
              )}
            </span>
          </div>
        </VoiceBeam>

        <motion.div ref={stageRef} className="db-live-stage" data-how={how} layout transition={SPRING}>{stage}</motion.div>

        {actions && actions.length > 0 && (
          <div className="db-live-actions">
            <span className="db-flabel">What it would do on your website</span>
            <ul>
              {actions.map((a) => <li key={a.id}><Icon name="cursor" size={15} />{a.label}<Icon name="check" size={14} className="db-live-ok" /></li>)}
            </ul>
          </div>
        )}
      </section>
    </LayoutGroup>
  )
}

type Flight = { text: string; from: { x: number; y: number }; after: number }

/** One chat bubble. The one just sent flies in from where it was typed. */
function Bubble({ line, index, flight }: { line: Line; index: number; flight: React.MutableRefObject<Flight | null> }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => {
    const f = flight.current, el = ref.current
    if (!f || !el || line.role !== 'user' || index < f.after || line.text.trim() !== f.text) return
    flight.current = null
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Land where it will rest: bring the chat to the bottom before measuring.
    const list = el.closest('.db-live-lines')
    if (list) list.scrollTop = list.scrollHeight
    const r = el.getBoundingClientRect()
    const dx = f.from.x - r.left, dy = f.from.y - (r.top + r.height / 2)
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(0.92)`, borderRadius: '8px', opacity: 0.4, offset: 0 },
      { opacity: 1, offset: 0.35 },
      { transform: 'translate(0, 0) scale(1)', borderRadius: '16px', opacity: 1 },
    ], { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' })
  }, [line, index, flight])
  return <p ref={ref} className={`db-bubble is-${line.role}${line.final ? '' : ' is-partial'}`}>{line.text}</p>
}

/** The bar between side-by-side panes: drag to resize; ⇄ or double-click swaps sides. */
function Divider({ stage, onRatio, onSwap }: { stage: React.RefObject<HTMLDivElement | null>; onRatio: (r: number) => void; onSwap: () => void }) {
  const drag = useRef(false)
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !stage.current) return
    const r = stage.current.getBoundingClientRect()
    onRatio(Math.min(0.78, Math.max(0.22, (e.clientX - r.left) / r.width)))
  }
  return (
    <div className="db-live-divider" role="separator" aria-orientation="vertical" title="Drag to resize · double-click to swap sides"
      onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={move} onPointerUp={() => { drag.current = false }} onDoubleClick={onSwap}>
      <span className="db-live-divider-grip" />
      <button type="button" className="db-live-swap" onPointerDown={(e) => e.stopPropagation()} onClick={onSwap} aria-label="Swap sides" title="Swap sides">
        <ArrowLeftRightIcon size={14} />
      </button>
    </div>
  )
}

/** A window over the main view: drag it anywhere inside, drag its corner to resize. */
function Floating({ stage, x, y, w, onMove, onSize, children }: {
  stage: React.RefObject<HTMLDivElement | null>; x: number; y: number; w: number
  onMove: (x: number, y: number) => void; onSize: (w: number) => void; children: React.ReactNode
}) {
  const start = useRef<{ px: number; py: number; x: number; y: number; w: number; mode: 'move' | 'size' } | null>(null)
  const self = useRef<HTMLDivElement>(null)
  const [, redraw] = useState(0)
  // The stage's width is known after the first paint; place the window then.
  useEffect(() => { redraw(1) }, [])
  const width = stage.current?.getBoundingClientRect().width ?? 0
  // x < 0 means "not placed yet": start in the top-right corner.
  const left = x < 0 ? Math.max(0, width - w - 12) : Math.min(x, Math.max(0, width - w))
  const down = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { px: e.clientX, py: e.clientY, x: left, y, w, mode }
  }
  const moveTo = (e: React.PointerEvent) => {
    const s = start.current, r = stage.current?.getBoundingClientRect()
    if (!s || !r) return
    if (s.mode === 'size') onSize(Math.min(r.width * 0.7, Math.max(120, s.w + (e.clientX - s.px))))
    // Anywhere inside the stage, down to its bottom edge (less the window's own height).
    else onMove(Math.min(r.width - s.w, Math.max(0, s.x + e.clientX - s.px)), Math.min(r.height - (self.current?.offsetHeight ?? 60), Math.max(0, s.y + e.clientY - s.py)))
  }
  const up = () => { start.current = null }
  return (
    <div ref={self} className="db-live-float" style={{ left, top: y, width: w }} aria-label="Agent video, drag to move"
      onPointerDown={down('move')} onPointerMove={moveTo} onPointerUp={up}>
      {children}
      <span className="db-live-float-size" title="Drag to resize" onPointerDown={down('size')} onPointerMove={moveTo} onPointerUp={up} />
    </div>
  )
}

/** A video feed that fades in and keeps its place in layout animations. */
// `still`: no layout animation (inside the floating window it must move with the frame, not spring after it).
function Feed({ who, stream, still }: { who: 'them' | 'me'; stream: MediaStream; still?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
  return (
    <motion.div layoutId={still ? undefined : `feed-${who}`} className={`db-live-feed is-${who}`}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={SPRING}>
      <video ref={ref} autoPlay playsInline muted={who === 'me'} />
      <span className="db-live-feedtag">{who === 'me' ? 'You' : 'Agent'}</span>
    </motion.div>
  )
}

/** The agent's loudness on this screen: a speaker that mutes, and an M3 slider. */
function InlineVolume({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const last = useRef(value || 100)
  const Glyph = value === 0 ? VolumeXIcon : value < 50 ? Volume1Icon : Volume2Icon
  return (
    <span className="db-live-vol db-slider" title="Agent volume on this screen">
      <button type="button" className="db-iconbtn" aria-label={value ? 'Mute agent' : 'Unmute agent'}
        onClick={() => { if (value) { last.current = value; onChange(0) } else onChange(last.current) }}>
        <Glyph size={18} />
      </button>
      <input type="range" min={0} max={100} step={1} value={value} aria-label="Agent volume"
        style={{ '--pct': `${value}%` } as React.CSSProperties} onChange={(e) => onChange(Number(e.target.value))} />
    </span>
  )
}

const FLICKER = new Set<string>(['speaking', 'listening', 'thinking'])
/** The state to show: moves between speaking, listening and thinking only after the new one
 *  has held for `ms`; any other change (connecting, ended, error) shows at once. */
function useSteady<T extends string>(state: T, ms = 200): T {
  const [shown, setShown] = useState(state)
  useEffect(() => {
    if (state === shown) return
    if (!(FLICKER.has(state) && FLICKER.has(shown))) { setShown(state); return }
    const t = setTimeout(() => setShown(state), ms)
    return () => clearTimeout(t)
  }, [state, shown, ms])
  return shown
}
