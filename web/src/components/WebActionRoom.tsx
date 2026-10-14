// The website-navigation demo on /webnav: the agent fills the form in front of
// you while it talks.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createSession, type VoxioSession, type WebActionStatus } from 'voxioagent/client'

import { CareSurface } from '#/components/surfaces'
import { ClinicSite } from '#/components/sites/ClinicSite'
import { describe, pageStats, perform, type WebAction } from '#/components/sites/driver'
import { RailSite } from '#/components/sites/RailSite'
import { ShopSite } from '#/components/sites/ShopSite'
import { UniversitySite } from '#/components/sites/UniversitySite'
import { DEFAULT_SURFACE, SURFACES, surfaceById, type SurfaceId } from '#/lib/surfaces'
import AccentPicker from '#/components/AccentPicker'
import { DEFAULT_ACCENT, type AccentId } from '#/lib/accents'
import { endRoomSession, startRoomSession, type RoomStart } from '#/server/room'

const SURFACE_VIEWS: Record<SurfaceId, () => React.ReactElement> = {
  clinic: ClinicSite,
  university: UniversitySite,
  rail: RailSite,
  shop: ShopSite,
  care: CareSurface,
}

type Phase = 'idle' | 'asking' | 'connecting' | 'live' | 'ended' | 'failed'

type LogEntry = { id: string; label: string; status: 'pending' | 'ok' | 'error' }

const SILENCE_MS = 320

/* An action whose words never arrive — two markers back to back, or a reply
   that opens on one — would otherwise wait for speech that is not coming,
   while the runtime waits the full fifteen seconds for our ack. */
const NO_SPEECH_MS = 1200

/** Agent level above which its voice counts as heard (the SDK's own speaking gate). */
const LOUD = 0.06

function PageSize({ stats }: { stats: { elements: number; clickable: number; ids: number } }) {
  return (
    <span className="wachrome-stats" title="Counted live from the page in the frame">
      {stats.elements.toLocaleString('en-IN')} elements · {stats.clickable.toLocaleString('en-IN')} clickable · {stats.ids ? `${stats.ids} ids` : 'no ids planted for the agent'}
    </span>
  )
}

export default function WebActionRoom() {
  const [surfaceId, setSurfaceId] = useState<SurfaceId>(DEFAULT_SURFACE)
  const [accent, setAccent] = useState<AccentId>(DEFAULT_ACCENT)
  const surface = surfaceById(surfaceId)
  const Surface = SURFACE_VIEWS[surfaceId]
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [left, setLeft] = useState<number | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [pinned, setPinned] = useState<string | null>(null)

  const voxioRef = useRef<VoxioSession | null>(null)
  const sessionRef = useRef<{ id: string; startedAt: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const queueRef = useRef<
    { id: string; turn: number; action: WebAction; at: number; ack: (status: WebActionStatus) => void }[]
  >([])
  const heardSpeechRef = useRef(false)
  const lastLoudRef = useRef(0)
  const turnRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const [stats, setStats] = useState<{ elements: number; clickable: number; ids: number } | null>(null)

  const hangUp = useCallback((next: Phase = 'ended') => {
    queueRef.current = []
    turnRef.current = null
    const voxio = voxioRef.current
    voxioRef.current = null
    voxio?.destroy()

    const session = sessionRef.current
    sessionRef.current = null
    if (session) {
      void endRoomSession({
        data: {
          sessionId: session.id,
          seconds: (Date.now() - session.startedAt) / 1000,
        },
      }).catch(() => {})
    }
    setSpeaking(false)
    setLeft(null)
    setPhase(next)
  }, [])

  useEffect(() => () => hangUp('idle'), [hangUp])

  /* How big the page in the frame really is, counted live. It is the honest
     version of "this site is hard": the number a person would never count and
     the agent has to work through anyway. */
  const open = phase === 'connecting' || phase === 'live'
  useEffect(() => {
    const measure = () => {
      const stage = stageRef.current
      if (stage) setStats(pageStats(stage))
    }
    measure()
    const t = setInterval(measure, 1500)
    return () => clearInterval(t)
  }, [surfaceId, open])

  // Lets the page be driven by hand from the console while working on it.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __waPerform?: (a: WebAction) => Promise<string> }
    w.__waPerform = (a) => (stageRef.current ? perform(stageRef.current, a) : Promise.resolve('error'))
    return () => {
      delete w.__waPerform
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('wa-open')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hangUp('ended')
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.body.classList.remove('wa-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, hangUp])

  useEffect(() => {
    if (phase !== 'live' || left === null) return
    if (left <= 0) {
      hangUp('ended')
      return
    }
    const t = setTimeout(() => setLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [phase, left, hangUp])

  const drain = useCallback(async () => {
    if (runningRef.current) return
    const next = queueRef.current.shift()
    if (!next) return

    runningRef.current = true
    heardSpeechRef.current = false
    const stage = stageRef.current
    const status = stage ? await perform(stage, next.action) : 'error'
    setLog((prev) => prev.map((e) => (e.id === next.id ? { ...e, status } : e)))
    next.ack(status === 'ok' ? 'ok' : 'error')
    runningRef.current = false
  }, [])

  /* An action runs in the pause after the clause in front of it. The
     runtime sends it at the marker, usually while that clause is still
     playing here and sometimes just after — "heard speech" is set by the
     clause and cleared by the action that consumes it, so either order
     works. With no clause at all (two markers back to back) it runs once
     the line has been quiet for long enough. */
  const onLevel = useCallback(
    (agent: number) => {
      const now = performance.now()
      const loud = agent > LOUD
      if (loud) {
        heardSpeechRef.current = true
        lastLoudRef.current = now
      }

      const head = queueRef.current[0]
      if (head && !loud && !runningRef.current) {
        const quiet = now - lastLoudRef.current
        if (heardSpeechRef.current ? quiet > SILENCE_MS : now - head.at > NO_SPEECH_MS && quiet > SILENCE_MS) {
          void drain()
        }
      }

      setSpeaking(loud)
    },
    [drain],
  )

  /* The SDK runs the connection, the levels and the data channel. Its own
     action runner is off: the page driver below knows these demo sites. */
  const connect = useCallback(
    (config: Extract<RoomStart, { ok: true }>) => {
      const voxio = createSession({
        flowKey: config.apiKey,
        endpoints: { voice: `https://${config.server}` },
        sessionId: config.sessionId,
        customs: config.customs as Record<string, unknown>,
        webActions: false,
        maxRetries: 0,
      })
      voxioRef.current = voxio

      voxio.on('webAction', (msg, ack) => {
        const action = msg.action as unknown as WebAction
        const turn = typeof msg.turn_id === 'number' ? msg.turn_id : 0

        /* A new reply means the old one was talked over. The runtime has
           already abandoned its actions, so running them now would move the
           page under a reply that no longer mentions them. */
        if (turnRef.current !== null && turn !== turnRef.current) {
          const stale = new Set(queueRef.current.map((q) => q.id))
          queueRef.current = []
          if (stale.size) setLog((prev) => prev.filter((e) => !stale.has(e.id)))
        }
        turnRef.current = turn

        // Speech heard long before this action is from an earlier clause,
        // not the one in front of it — do not let it trigger the action.
        if (performance.now() - lastLoudRef.current > 1000) heardSpeechRef.current = false

        setLog((prev) => [...prev, { id: msg.id, label: describe(action), status: 'pending' }])
        queueRef.current.push({ id: msg.id, turn, action, at: performance.now(), ack })
      })
      voxio.on('level', ({ agent }) => onLevel(agent))
      voxio.on('state', (state) => {
        if (voxioRef.current !== voxio || state !== 'listening' || sessionRef.current) return
        sessionRef.current = { id: config.sessionId, startedAt: Date.now() }
        setPhase('live')
        setLeft(config.maxSeconds)
      })
      voxio.on('ended', ({ reason }) => {
        if (voxioRef.current === voxio && reason === 'remote') hangUp('ended')
      })
      voxio.on('error', (err) => {
        if (voxioRef.current !== voxio) return
        setError(
          err.code === 'mic-denied' || err.code === 'no-device'
            ? 'We need your microphone for this one. Allow it and press start again.'
            : err.code === 'connection-lost'
              ? 'The connection dropped.'
              : 'We could not start the session. Try again in a moment.',
        )
        hangUp('failed')
      })
      void voxio.start()
    },
    [hangUp, onLevel],
  )

  const start = useCallback(async () => {
    setError(null)
    setLog([])
    setPhase('asking')
    try {
      const config = await startRoomSession({ data: { demo: `wa-${surfaceId}`, accent } })
      if (!config.ok) {
        setError(config.reason)
        setPhase('failed')
        return
      }
      setPhase('connecting')
      connect(config)
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'NotFoundError')
      setError(
        denied
          ? 'We need your microphone for this one. Allow it and press start again.'
          : 'We could not start the session. Try again in a moment.',
      )
      setPhase('failed')
    }
  }, [connect, surfaceId, accent])

  const busy = phase === 'asking' || phase === 'connecting'

  return (
    <div className="wa">
      {!open ? (
        <>
          {/* ---------- 1 · which mess ---------- */}
          <div className="dstep">
            <span className="dstep-n" aria-hidden="true">1</span>
            <span className="dstep-t">Which site should it drive?</span>
          </div>

          <div className="seg" role="radiogroup" aria-label="Which site should it drive?">
            {SURFACES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === surfaceId}
                className={`seg-o${s.id === surfaceId ? ' is-on' : ''}`}
                onClick={() => {
                  setSurfaceId(s.id)
                  setLog([])
                  setPinned(null)
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <AccentPicker value={accent} onChange={setAccent} />

          {/* ---------- 2 · the specimen ----------
              The caption sits OUTSIDE the frame, in our type, saying why this
              screen is hard. That is what makes the ugliness inside read as the
              subject rather than as our own bad design. */}
          <figure className="waspec">
            <figcaption className="waspec-cap">
              <span className="waspec-site">{surface.site}</span>
              <span className="waspec-hard">{surface.hard}</span>
            </figcaption>

            <div className="wastage">
              <div className="wachrome">
                <i />
                <i />
                <i />
                <span className="wachrome-url">{surface.host}</span>
                {stats ? <PageSize stats={stats} /> : null}
              </div>
              <div className="wastage-body">
                <div
                  className="wa-stage"
                  ref={stageRef}
                  onSubmitCapture={(e) => e.preventDefault()}
                >
                  <Surface />
                </div>
                {/* The fold: the site carries on below, and the visitor can
                    scroll it to take the dare before handing it over. */}
                <div className="wastage-fold" aria-hidden="true" />
              </div>
            </div>

            <p className="waspec-dare">
              <span className="waspec-dare-k">Before you press start</span>
              {surface.dare}
            </p>
          </figure>
        </>
      ) : null}

      {open ? (
        /* ---------- the takeover ----------
           Still unmistakably our page — our ground, our type, our orb — with
           their site under glass in the middle of it. The frame is what carries
           the whole argument, so it is never edge to edge. */
        <div className="wa-room">
          <div className="wa-room-top">
            <span className="wa-room-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <g transform="rotate(-30 12 12)">
                  <circle cx="7.3" cy="3.2" r="1.45" />
                  <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <circle cx="16.7" cy="20.8" r="1.45" />
                </g>
              </svg>
            </span>
            <span className="wa-room-k">Voxio Agents is driving</span>
            <span className="wa-room-site">{surface.site}</span>
            <span className="wa-room-right">
              {left !== null ? (
                <span className="wa-room-clock">
                  {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left
                </span>
              ) : null}
              <button type="button" className="wa-close" onClick={() => hangUp('ended')}>
                End
              </button>
            </span>
          </div>

          <div className="wa-room-frame">
            <div className="wachrome">
              <i />
              <i />
              <i />
              <span className="wachrome-url">{surface.host}</span>
              {stats ? <PageSize stats={stats} /> : null}
            </div>
            <div
              className="wa-stage"
              ref={stageRef}
              onSubmitCapture={(e) => e.preventDefault()}
            >
              <Surface />
            </div>
          </div>

          {/* One strip, not two. This is the narration: what it is doing to
              their page, in our voice, where it cannot be missed. */}
          <div className="wa-dock">
            <span className={`orb${speaking ? ' is-speaking' : ''}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="wa-dock-state">
              {phase === 'connecting' ? 'Connecting' : speaking ? 'Speaking' : 'Listening'}
            </span>
            <span className="wa-dock-line">
              {log.length ? (
                <span className={`wa-dock-act is-${log[log.length - 1]!.status}`}>
                  {log[log.length - 1]!.label}
                </span>
              ) : (
                <span className="wa-dock-idle">
                  {pinned ? `Say “${pinned}”` : 'Say what you are looking for.'}
                </span>
              )}
            </span>
          </div>
        </div>
      ) : null}

      {!open ? (
        <>
          {/* ---------- 3 · the action ---------- */}
          <button className="dgo" type="button" onClick={start} disabled={busy}>
            {busy ? 'Starting…' : phase === 'ended' ? 'Start again' : 'Start talking'}
          </button>

          <p className="dnote" role="status" aria-live="polite">
            {phase === 'failed' && error
              ? error
              : phase === 'ended'
                ? 'Session ended.'
                : 'It drives the page while you talk. Nothing is submitted. Escape stops it.'}
          </p>

          <div className="wachips">
            <span className="wachips-k">Or start with one of these</span>
            {surface.asks.map((ask) => (
              <button
                key={ask}
                type="button"
                className="wachip"
                onClick={() => {
                  setPinned(ask)
                  start()
                }}
              >
                {ask}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
