// The dashboard's one audio player: play, a waveform you click or arrow
// through to seek, the time, and volume. Session replays and voice samples
// both use it, so audio looks the same everywhere.

import { useEffect, useRef, useState } from 'react'
import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react'

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

export function AudioPlayer({ src, bars = 72, autoPlay = true, compact = false }: {
  src: string
  bars?: number
  autoPlay?: boolean
  /** Shorter, for a few seconds of sample inside a form. */
  compact?: boolean
}) {
  const ref = useRef<HTMLAudioElement>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [failed, setFailed] = useState(false)

  // Decode once to draw the real waveform; fall back to flat bars if it can't be read.
  useEffect(() => {
    let dead = false
    setPeaks(null)
    setFailed(false)
    ;(async () => {
      try {
        const buf = await (await fetch(src)).arrayBuffer()
        const ctx = new AudioContext()
        const audio = await ctx.decodeAudioData(buf)
        ctx.close()
        const data = audio.getChannelData(0)
        const step = Math.floor(data.length / bars)
        const out: number[] = []
        for (let i = 0; i < bars; i++) {
          let max = 0
          for (let j = i * step; j < (i + 1) * step; j += 16) max = Math.max(max, Math.abs(data[j]))
          out.push(max)
        }
        const top = Math.max(...out, 0.001)
        if (!dead) setPeaks(out.map((p) => Math.max(0.06, p / top)))
      } catch {
        if (!dead) setPeaks(Array(bars).fill(0.3))
      }
    })()
    return () => { dead = true }
  }, [src, bars])

  useEffect(() => {
    if (autoPlay) ref.current?.play().catch(() => {})
  }, [src, autoPlay])

  useEffect(() => {
    if (ref.current) { ref.current.volume = volume; ref.current.muted = muted }
  }, [volume, muted])

  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (a.paused) a.play().catch(() => setFailed(true))
    else a.pause()
  }
  const seekTo = (sec: number) => {
    const a = ref.current
    if (!a || !dur) return
    a.currentTime = Math.max(0, Math.min(dur, sec))
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    seekTo(((e.clientX - r.left) / r.width) * dur)
  }
  const onSeekKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = Math.max(1, dur / 20)
    if (e.key === 'ArrowRight') { e.preventDefault(); seekTo(t + step) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seekTo(t - step) }
    if (e.key === 'Home') { e.preventDefault(); seekTo(0) }
    if (e.key === 'End') { e.preventDefault(); seekTo(dur) }
  }
  const progress = dur ? t / dur : 0
  const level = muted ? 0 : volume
  const VolIcon = level === 0 ? VolumeXIcon : level < 0.5 ? Volume1Icon : Volume2Icon

  return (
    <div className={`db-player${compact ? ' is-compact' : ''}`}>
      <audio ref={ref} src={src} preload="auto"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} />
      <button className="db-playbtn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" /></svg>}
      </button>
      {failed ? (
        <span className="db-player-err">This audio couldn’t be played.</span>
      ) : (
        <div className="db-wave" onClick={seek} onKeyDown={onSeekKey} tabIndex={0} role="slider" aria-label="Playback position"
          aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)} aria-valuetext={`${clock(t)} of ${clock(dur)}`}>
          {(peaks ?? Array(bars).fill(0.15)).map((p, i) => (
            <span key={i} className={i / bars < progress ? 'is-played' : undefined} style={{ height: `${Math.round(p * 100)}%` }} />
          ))}
        </div>
      )}
      <span className="db-player-time">{clock(t)} <small>/ {clock(dur)}</small></span>
      <span className="db-player-vol">
        <button type="button" className="db-iconbtn" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute' : 'Mute'}><VolIcon size={18} /></button>
        <input type="range" min={0} max={1} step={0.05} value={level} aria-label="Volume"
          onChange={(e) => { const v = Number(e.target.value); setVolume(v); setMuted(v === 0) }}
          style={{ '--fill': `${Math.round(level * 100)}%` } as React.CSSProperties} />
      </span>
    </div>
  )
}
