// The website-navigation demo on /webnav: the agent fills the form in front of
// you while it talks.

import { useCallback, useEffect, useRef, useState } from 'react'

import { ClinicSurface, RailSurface, ShopSurface, UniversitySurface } from '#/components/surfaces'
import { DEFAULT_SURFACE, SURFACES, surfaceById, type SurfaceId } from '#/lib/surfaces'
import { endRoomSession, startRoomSession, type RoomStart } from '#/server/room'

const SURFACE_VIEWS: Record<SurfaceId, () => React.ReactElement> = {
  clinic: ClinicSurface,
  university: UniversitySurface,
  rail: RailSurface,
  shop: ShopSurface,
}

type Phase = 'idle' | 'asking' | 'connecting' | 'live' | 'ended' | 'failed'

type Action = {
  action: 'focus' | 'fill_field' | 'click' | 'scroll_to'
  selector?: string
  value?: string
}

type LogEntry = { id: string; label: string; status: 'pending' | 'ok' | 'error' }

const TYPE_MS = 55

const SILENCE_MS = 320

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check)
      clearTimeout(timer)
      resolve()
    }
    const check = () => pc.iceGatheringState === 'complete' && done()
    const timer = setTimeout(done, 5000)
    pc.addEventListener('icegatheringstatechange', check)
  })
}

/** A human sentence for the log, from the action the model sent. */
function describe(a: Action): string {
  const field = (a.selector || '').replace(/^#(hp|uni|rail|shop)-/, '').replace(/-/g, ' ')
  switch (a.action) {
    case 'fill_field':
      return `Typed “${a.value ?? ''}” into ${field}`
    case 'click':
      return `Pressed ${field}`
    case 'focus':
      return `Moved to ${field}`
    case 'scroll_to':
      return `Scrolled to ${field}`
    default:
      return 'Did something unrecognised'
  }
}

export default function WebActionRoom() {
  const [surfaceId, setSurfaceId] = useState<SurfaceId>(DEFAULT_SURFACE)
  const surface = surfaceById(surfaceId)
  const Surface = SURFACE_VIEWS[surfaceId]
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [left, setLeft] = useState<number | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [pinned, setPinned] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const sessionRef = useRef<{ id: string; startedAt: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const queueRef = useRef<{ id: string; action: Action }[]>([])
  const heardSpeechRef = useRef(false)
  const runningRef = useRef(false)

  const hangUp = useCallback((next: Phase = 'ended') => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    queueRef.current = []
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    dcRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    void audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    if (audioRef.current) audioRef.current.srcObject = null

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

  const open = phase === 'connecting' || phase === 'live'
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

  const run = useCallback(async (action: Action): Promise<'ok' | 'error'> => {
    const stage = stageRef.current
    if (!stage || !action.selector) return 'error'

    let el: HTMLElement | null = null
    try {
      el = stage.querySelector<HTMLElement>(action.selector)
    } catch {
      return 'error'
    }
    if (!el) return 'error'

    el.classList.add('wa-hit')
    const clear = (ms: number) =>
      new Promise<void>((r) => setTimeout(() => {
        el?.classList.remove('wa-hit')
        r()
      }, ms))

    switch (action.action) {
      case 'fill_field': {
        const value = action.value ?? ''
        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        input.focus({ preventScroll: true })
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (input.tagName === 'SELECT') {
          const select = input as HTMLSelectElement
          const want = value.trim().toLowerCase()
          const option =
            Array.from(select.options).find((o) => o.text.toLowerCase() === want) ??
            Array.from(select.options).find((o) => o.text.toLowerCase().includes(want))
          if (!option) {
            await clear(300)
            return 'error'
          }
          select.value = option.value
          select.dispatchEvent(new Event('change', { bubbles: true }))
          await clear(500)
          return 'ok'
        }
        input.value = ''
        for (const ch of value) {
          input.value += ch
          input.dispatchEvent(new Event('input', { bubbles: true }))
          await new Promise((r) => setTimeout(r, TYPE_MS))
        }
        await clear(400)
        return 'ok'
      }
      case 'click': {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await new Promise((r) => setTimeout(r, 500))
        el.click()
        await clear(300)
        return 'ok'
      }
      case 'focus': {
        el.focus({ preventScroll: true })
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await clear(800)
        return 'ok'
      }
      case 'scroll_to': {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await clear(600)
        return 'ok'
      }
      default:
        await clear(200)
        return 'error'
    }
  }, [])

  const drain = useCallback(async () => {
    if (runningRef.current) return
    if (!heardSpeechRef.current) return
    const next = queueRef.current.shift()
    if (!next) return

    runningRef.current = true
    heardSpeechRef.current = false
    const status = await run(next.action)
    setLog((prev) => prev.map((e) => (e.id === next.id ? { ...e, status } : e)))
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(
        JSON.stringify({ type: 'web_action_ack', id: next.id, status }),
      )
    }
    runningRef.current = false
  }, [run])

  const watchLevel = useCallback(
    (stream: MediaStream) => {
      const ctx = audioCtxRef.current ?? new AudioContext()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.7
      ctx.createMediaStreamSource(stream).connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)
      let wasSpeaking = false
      let quietSince = 0

      const tick = (now: number) => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (const v of data) sum += v
        const loud = sum / data.length > 10

        if (loud) {
          heardSpeechRef.current = true
          quietSince = 0
        } else if (wasSpeaking) {
          quietSince = now
        }

        if (!loud && quietSince && now - quietSince > SILENCE_MS) {
          quietSince = 0
          void drain()
        }

        wasSpeaking = loud
        setSpeaking(loud)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [drain],
  )

  const connect = useCallback(
    async (config: Extract<RoomStart, { ok: true }>) => {
      let iceServers: RTCIceServer[] = []
      for (let i = 0; i < 2; i++) {
        try {
          const r = await fetch(`https://${config.server}/rtc/ice-servers`, {
            signal: AbortSignal.timeout(5000),
            headers: { 'ngrok-skip-browser-warning': 'true' },
          })
          if (r.ok) {
            iceServers = (await r.json()).ice_servers || []
            break
          }
        } catch {
        }
        if (i === 0) await new Promise((r) => setTimeout(r, 800))
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const pc = new RTCPeerConnection({ iceServers })
      pcRef.current = pc
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      const dc = pc.createDataChannel('web_actions', { ordered: true })
      dcRef.current = dc
      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg?.type !== 'web_action') return
          const action = msg.action as Action
          setLog((prev) => [
            ...prev,
            { id: msg.id, label: describe(action), status: 'pending' },
          ])
          queueRef.current.push({ id: msg.id, action })
          heardSpeechRef.current = false
        } catch {
        }
      }

      pc.ontrack = (e) => {
        const remote = e.streams[0]
        if (e.track.kind !== 'audio' || !remote || !audioRef.current) return
        audioRef.current.srcObject = remote
        void audioRef.current.play().catch(() => {})
        watchLevel(remote)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          sessionRef.current = { id: config.sessionId, startedAt: Date.now() }
          setPhase('live')
          setLeft(config.maxSeconds)
        }
        if (pc.connectionState === 'failed') {
          setError('The connection dropped.')
          hangUp('failed')
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForIceGathering(pc)

      const res = await fetch(`https://${config.server}/rtc/offer/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_key: config.apiKey,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
          participants: config.participants,
          customs: config.customs,
          session_id: config.sessionId,
        }),
      })
      if (!res.ok) throw new Error(`offer rejected: ${res.status}`)
      await pc.setRemoteDescription(new RTCSessionDescription(await res.json()))
    },
    [hangUp, watchLevel],
  )

  const start = useCallback(async () => {
    setError(null)
    setLog([])
    setPhase('asking')
    try {
      const config = await startRoomSession({ data: { demo: `wa-${surfaceId}` } })
      if (!config.ok) {
        setError(config.reason)
        setPhase('failed')
        return
      }
      setPhase('connecting')
      await connect(config)
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
  }, [connect, surfaceId])

  const busy = phase === 'asking' || phase === 'connecting'

  return (
    <div className="wa">
      <audio ref={audioRef} hidden />

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
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

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
              </div>
              <div className="wastage-body">
                <div
                  className="wa-stage"
                  ref={stageRef}
                  onSubmitCapture={(e) => e.preventDefault()}
                >
                  <Surface />
                </div>
                {/* The fold. The visitor cannot scroll this — the agent does —
                    so the bottom edge has to say "there is more down here"
                    rather than ending on a sliced word. */}
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
            <span className="wa-room-k">Voxio is driving</span>
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
