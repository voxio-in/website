// A live conversation with an agent, in the page.

import { useCallback, useEffect, useRef, useState } from 'react'

import { demoById, type DemoId } from '#/lib/demos'
import { endRoomSession, startRoomSession, type RoomStart } from '#/server/room'

type Phase = 'idle' | 'asking' | 'connecting' | 'live' | 'ended' | 'failed'

type Layout = 'split' | 'focus' | 'agent' | 'you'

const MAX_RECONNECTS = 5

/** Resolves when ICE gathering finishes, or after 5s — whichever comes first. */
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

export default function VoiceRoom({
  demoId,
  idleFace,
  children,
}: {
  demoId: DemoId
  /** What fills the stage before a session starts. See IdleFace. */
  idleFace?: React.ReactNode
  children?: React.ReactNode
}) {
  const demo = demoById(demoId)

  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [left, setLeft] = useState<number | null>(null)
  const [layout, setLayout] = useState<Layout>('focus')
  const [hasAgentVideo, setHasAgentVideo] = useState(false)
  const [hasOwnVideo, setHasOwnVideo] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const agentVideoRef = useRef<HTMLVideoElement>(null)
  const ownVideoRef = useRef<HTMLVideoElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const sessionRef = useRef<{ id: string; startedAt: number } | null>(null)

  const hangUp = useCallback((next: Phase = 'ended') => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    void audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    if (audioRef.current) audioRef.current.srcObject = null
    if (agentVideoRef.current) agentVideoRef.current.srcObject = null
    if (ownVideoRef.current) ownVideoRef.current.srcObject = null
    setHasAgentVideo(false)
    setHasOwnVideo(false)

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
    setAgentSpeaking(false)
    setLeft(null)
    setPhase(next)
  }, [])

  useEffect(() => () => hangUp('idle'), [hangUp])

  useEffect(() => {
    if (phase !== 'live' || left === null) return
    if (left <= 0) {
      hangUp('ended')
      return
    }
    const t = setTimeout(() => setLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [phase, left, hangUp])

  const watchLevel = useCallback((stream: MediaStream) => {
    const ctx = audioCtxRef.current ?? new AudioContext()
    audioCtxRef.current = ctx
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.7
    ctx.createMediaStreamSource(stream).connect(analyser)

    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      let sum = 0
      for (const v of data) sum += v
      setAgentSpeaking(sum / data.length > 10)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const connect = useCallback(
    async (config: Extract<RoomStart, { ok: true }>, wantsVideo: boolean) => {
      let attempts = 0

      const attempt = async (stream: MediaStream): Promise<void> => {
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

        const pc = new RTCPeerConnection({ iceServers })
        pcRef.current = pc
        stream.getTracks().forEach((t) => pc.addTrack(t, stream))

        pc.createDataChannel('chat')

        pc.ontrack = (e) => {
          const stream = e.streams[0]
          if (!stream) return
          if (e.track.kind === 'audio' && audioRef.current) {
            audioRef.current.srcObject = stream
            void audioRef.current.play().catch(() => {})
            watchLevel(stream)
          }
          if (e.track.kind === 'video' && agentVideoRef.current) {
            agentVideoRef.current.srcObject = stream
            void agentVideoRef.current.play().catch(() => {})
            setHasAgentVideo(true)
          }
        }

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState
          if (state === 'connected') {
            attempts = 0
            sessionRef.current = { id: config.sessionId, startedAt: Date.now() }
            setPhase('live')
            setLeft(config.maxSeconds)
          }
          if (state === 'failed' || state === 'disconnected') {
            pc.close()
            if (attempts < MAX_RECONNECTS) {
              attempts++
              setPhase('connecting')
              setTimeout(() => void attempt(stream), Math.min(1000 * attempts, 5000))
            } else {
              setError('The connection dropped and would not come back.')
              hangUp('failed')
            }
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
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: wantsVideo,
        })
      } catch (err) {
        if (!wantsVideo) throw err
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      streamRef.current = stream
      if (stream.getVideoTracks().length && ownVideoRef.current) {
        ownVideoRef.current.srcObject = stream
        void ownVideoRef.current.play().catch(() => {})
        setHasOwnVideo(true)
      }
      await attempt(stream)
    },
    [hangUp, watchLevel],
  )

  const start = useCallback(async () => {
    setError(null)
    setPhase('asking')
    try {
      const config = await startRoomSession({ data: { demo: demoId } })
      if (!config.ok) {
        setError(config.reason)
        setPhase('failed')
        return
      }
      setPhase('connecting')
      await connect(config, demo.video)
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
  }, [connect, demoId])

  const toggleMute = () => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMuted(!track.enabled)
  }

  const live = phase === 'live'
  const busy = phase === 'asking' || phase === 'connecting'

  return (
    <div className="room">
      <audio ref={audioRef} hidden />

      <div className={`room-stage${demo.video ? ' room-stage--video' : ''}`}>
        {demo.video ? (
          <div className={`stage stage--${layout}`}>
            {/* Both panes are always mounted — see the note on Layout. */}
            <div className="pane pane--agent">
              <video ref={agentVideoRef} playsInline autoPlay />
              {!hasAgentVideo ? (
                <span className="pane-empty">{live ? 'Waiting for the face…' : demo.role}</span>
              ) : null}
              <span className="pane-tag">{demo.role}</span>
            </div>
            <div className="pane pane--you">
              <video ref={ownVideoRef} playsInline autoPlay muted />
              {!hasOwnVideo ? <span className="pane-empty">Camera off</span> : null}
              <span className="pane-tag">You</span>
            </div>
          </div>
        ) : idleFace && !live ? (
          idleFace
        ) : (
          <div className={`orb${agentSpeaking ? ' is-speaking' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
        <p className="room-state" role="status" aria-live="polite">
          {phase === 'idle' && `${demo.role} — press start and talk.`}
          {phase === 'asking' && 'Asking for your microphone…'}
          {phase === 'connecting' && 'Connecting…'}
          {live && (agentSpeaking ? 'Speaking' : 'Listening — go ahead.')}
          {phase === 'ended' && 'Session ended.'}
          {phase === 'failed' && (error ?? 'That did not work.')}
        </p>
        {live && left !== null ? (
          <p className="room-clock">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left
          </p>
        ) : null}
      </div>

      {demo.video && live ? (
        <div className="layouts" role="group" aria-label="Layout">
          {(['split', 'focus', 'agent', 'you'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`layout-btn${layout === mode ? ' is-on' : ''}`}
              aria-pressed={layout === mode}
              onClick={() => setLayout(mode)}
            >
              {mode === 'agent' ? 'Them' : mode === 'you' ? 'You' : mode}
            </button>
          ))}
        </div>
      ) : null}

      {/* The prompts, in the live state only. As a sidebar block read BEFORE
          people dry up. */}
      {live ? (
        <div className="dasks">
          <span className="dasks-k">Try saying</span>
          <ul>
            {demo.asks.map((ask) => (
              <li key={ask}>{ask}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {children}

      <div className="room-actions">
        {live ? (
          <>
            <button className="btn btn-ghost" type="button" onClick={toggleMute}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button className="btn btn-solid" type="button" onClick={() => hangUp('ended')}>
              End session
            </button>
          </>
        ) : (
          <button className="btn btn-solid" type="button" onClick={start} disabled={busy}>
            {busy ? 'Starting…' : phase === 'ended' ? 'Start again' : 'Start talking'}
          </button>
        )}
        {phase === 'failed' && error ? <span className="form-note">{error}</span> : null}
      </div>
    </div>
  )
}
