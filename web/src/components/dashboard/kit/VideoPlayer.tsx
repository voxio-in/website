// The dashboard's video player, in place of the browser's own controls: play,
// back and forward 10 seconds, a seek bar, time, mute, download and full screen.
// Controls fade out while playing and the pointer is still; keys work too
// (space or k to play, ← → to skip, m to mute, f for full screen).

import { Download, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const SKIP = 10
const IDLE_MS = 2200
const clock = (sec: number) => {
  if (!Number.isFinite(sec)) return '0:00'
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function VideoPlayer({ src, name = 'video', autoPlay, loop, muted: startMuted = false, className, videoRef, videoProps }: {
  src: string
  /** File name for Download, without the extension. */
  name?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  className?: string
  /** For callers that follow this video (e.g. the caller's camera beside it). */
  videoRef?: React.RefObject<HTMLVideoElement | null>
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>
}) {
  const own = useRef<HTMLVideoElement>(null)
  const ref = videoRef ?? own
  const box = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(startMuted)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [full, setFull] = useState(false)
  const [idle, setIdle] = useState(false)
  const [saving, setSaving] = useState(false)
  const [volume, setVolume] = useState(1)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  useEffect(() => () => clearTimeout(idleTimer.current), [])
  // Autoplay with sound when the browser allows it; when it refuses, play muted
  // and leave the mute button showing it, one click from sound.
  useEffect(() => {
    const v = ref.current
    if (!autoPlay || !v) return
    v.muted = startMuted
    v.play().catch(() => {
      v.muted = true
      setMuted(true)
      void v.play().catch(() => {})
    })
  }, [src, autoPlay, startMuted, ref])

  const wake = () => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS)
  }
  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play().catch(() => {})
    else v.pause()
  }
  const skip = (by: number) => {
    const v = ref.current
    if (!v) return
    v.currentTime = Math.min(Math.max(0, v.currentTime + by), v.duration || v.currentTime + by)
    wake()
  }
  const mute = () => {
    const v = ref.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    if (!v.muted && v.volume === 0) v.volume = 1
  }
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void box.current?.requestFullscreen?.()
  }
  // Signed links are on another origin, where <a download> is ignored: fetch the file, then save it.
  const download = async () => {
    setSaving(true)
    try {
      const blob = await (await fetch(src)).blob()
      const url = URL.createObjectURL(blob)
      const ext = blob.type.split('/')[1]?.split(';')[0] || 'mp4'
      const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.${ext}` })
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      window.open(src, '_blank', 'noopener')
    }
    setSaving(false)
  }
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === ' ' || k === 'k') toggle()
    else if (k === 'arrowleft' || k === 'j') skip(-SKIP)
    else if (k === 'arrowright' || k === 'l') skip(SKIP)
    else if (k === 'm') mute()
    else if (k === 'f') fullscreen()
    else return
    e.preventDefault()
  }

  const pct = dur ? (t / dur) * 100 : 0
  return (
    <div ref={box} className={`db-vplayer${playing ? ' is-playing' : ''}${idle && playing ? ' is-idle' : ''}${full ? ' is-full' : ''}${className ? ` ${className}` : ''}`}
      tabIndex={0} onKeyDown={onKey} onMouseMove={wake} onMouseLeave={() => playing && setIdle(true)}>
      <video ref={ref} src={src} loop={loop} playsInline preload="metadata" {...videoProps}
        onClick={toggle}
        onPlay={(e) => { setPlaying(true); wake(); videoProps?.onPlay?.(e) }}
        onPause={(e) => { setPlaying(false); setIdle(false); videoProps?.onPause?.(e) }}
        onTimeUpdate={(e) => { setT(e.currentTarget.currentTime); videoProps?.onTimeUpdate?.(e) }}
        onLoadedMetadata={(e) => { setDur(e.currentTarget.duration); videoProps?.onLoadedMetadata?.(e) }} />

      {!playing && (
        <button type="button" className="db-vplayer-big" onClick={toggle} aria-label="Play"><Play size={30} fill="currentColor" /></button>
      )}

      <div className="db-vplayer-bar">
        {/* M3 sliders, the same as the call bar's volume: thick track, a gap round a bar handle. */}
        <span className="db-slider db-vplayer-seek">
          <input type="range" min={0} max={dur || 0} step={0.1} value={t} aria-label="Seek"
            style={{ '--pct': `${pct}%` } as React.CSSProperties}
            onChange={(e) => { const v = ref.current; if (v) v.currentTime = Number(e.target.value); setT(Number(e.target.value)) }} />
        </span>
        <div className="db-vplayer-row">
          <button type="button" className="db-vplayer-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button type="button" className="db-vplayer-btn is-skip" onClick={() => skip(-SKIP)} aria-label="Back 10 seconds">
            <RotateCcw size={20} /><span>10</span>
          </button>
          <button type="button" className="db-vplayer-btn is-skip" onClick={() => skip(SKIP)} aria-label="Forward 10 seconds">
            <RotateCw size={20} /><span>10</span>
          </button>
          <span className="db-vplayer-time">{clock(t)} <small>/ {clock(dur)}</small></span>
          <span className="db-vplayer-gap" />
          <span className="db-vplayer-vol">
            <button type="button" className="db-vplayer-btn" onClick={mute} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted}>
              {muted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
            </button>
            <span className="db-slider">
              <input type="range" min={0} max={100} step={1} value={muted ? 0 : Math.round(volume * 100)} aria-label="Volume"
                style={{ '--pct': `${muted ? 0 : volume * 100}%` } as React.CSSProperties}
                onChange={(e) => {
                  const v = ref.current
                  const next = Number(e.target.value) / 100
                  setVolume(next)
                  if (v) { v.volume = next; v.muted = next === 0 }
                  setMuted(next === 0)
                }} />
            </span>
          </span>
          <button type="button" className="db-vplayer-btn" onClick={() => void download()} disabled={saving} aria-label="Download">
            <Download size={20} />
          </button>
          <button type="button" className="db-vplayer-btn" onClick={fullscreen} aria-label={full ? 'Exit full screen' : 'Full screen'}>
            {full ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  )
}
