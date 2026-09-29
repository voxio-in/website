// Paginated sessions. Each opens a replay dialog by type:
//   phone  → the call recording, with a real waveform
//   avatar → the agent's video beside the caller's camera, played in sync
//   web    → the steps the agent took on the page

import { useEffect, useRef, useState } from 'react'

import { billedMinutes, channelOf, fmtDate, fmtMin } from '#/lib/dashboard/client'
import { isTestSession, testSessionIds } from '#/lib/dashboard/testSessions'
import type { Session, WebActionEvent } from '#/lib/dashboard/types'
import Icon, { type IconName } from './Icon'
import { Dialog, rowLink } from './ui'

const PAGE = 10

const CHANNEL = {
  phone: { label: 'Phone', icon: 'phone', replay: 'Play recording', title: 'Call recording' },
  avatar: { label: 'Video', icon: 'avatar', replay: 'Watch', title: 'Video session' },
  browser: { label: 'Web', icon: 'cursor', replay: 'View steps', title: 'Web session' },
  chat: { label: 'Chat', icon: 'list', replay: 'Open', title: 'Chat' },
} satisfies Record<string, { label: string; icon: IconName; replay: string; title: string }>
const channel = (t: string) => CHANNEL[channelOf(t)]
const isOk = (s: Session) => !s.status || s.status === 'completed'

export default function SessionsTable({ sessions, empty = 'No sessions yet.', highlight }: {
  sessions: Session[]
  empty?: string
  /** A session to show and mark, e.g. the one a test just made. */
  highlight?: string
}) {
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<Session | null>(null)
  const pages = Math.max(1, Math.ceil(sessions.length / PAGE))
  useEffect(() => { if (page >= pages) setPage(0) }, [pages, page])
  // Read after mount: the list lives in this browser only.
  const [tests, setTests] = useState<Set<string>>(() => new Set())
  useEffect(() => setTests(testSessionIds()), [sessions])
  const marked = useRef<HTMLTableRowElement>(null)
  useEffect(() => {
    const i = highlight ? sessions.findIndex((s) => s.sessionId === highlight) : -1
    if (i >= 0) setPage(Math.floor(i / PAGE))
  }, [highlight, sessions])
  useEffect(() => { marked.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [highlight, page])
  const rows = sessions.slice(page * PAGE, page * PAGE + PAGE)

  if (!sessions.length) return <p className="db-muted db-pad">{empty}</p>

  return (
    <div className="db-sessions">
      <table className="db-flows db-sesstable">
        <thead>
          <tr><th>When</th><th>Channel</th><th>Caller</th><th className="db-num">Minutes</th><th>Status</th><th aria-label="Replay" /></tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const c = channel(s.type)
            const replayable = !!(s.recordingUrl || s.avatarVideoUrl || s.webActions?.length)
            // A web call with a recording but no steps (imported ones) plays like a call.
            const steps = channelOf(s.type) === 'browser' && !!s.webActions?.length
            return (
              <tr key={s.sessionId} {...rowLink(() => setOpen(s))} ref={s.sessionId === highlight ? marked : undefined}
                className={s.sessionId === highlight ? 'is-marked' : undefined}>
                <td>{fmtDate(s.startTime)}{isTestSession(s, tests) && <span className="db-testchip">Test</span>}</td>
                <td><span className="db-channel"><Icon name={c.icon} size={16} />{c.label}</span></td>
                <td className="db-mono">{s.from ?? s.to ?? '—'}</td>
                <td className="db-num">{fmtMin(billedMinutes(s.totalConnectedTime))}</td>
                <td><StatusText s={s} /></td>
                <td className="db-actcell">
                  {replayable && (
                    <button className="db-replaybtn" onClick={() => setOpen(s)}>
                      <Icon name={steps ? 'list' : 'play'} size={14} />{steps ? c.replay : channelOf(s.type) === 'browser' ? 'Play recording' : c.replay}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="db-pager">
        <span className="db-muted">{page * PAGE + 1}–{Math.min(sessions.length, (page + 1) * PAGE)} of {sessions.length.toLocaleString()}</span>
        <button className="db-iconbtn" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><Icon name="back" size={18} /></button>
        <span className="db-pager-n">{page + 1} / {pages}</span>
        <button className="db-iconbtn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><Icon name="back" size={18} className="db-flip" /></button>
      </div>
      {open && <ReplayDialog s={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function StatusText({ s }: { s: Session }) {
  const ok = isOk(s)
  return <span className={`db-status ${ok ? 'is-ok' : s.status?.startsWith('scheduled') ? '' : 'is-err'}`}>{ok ? 'Completed' : s.status}</span>
}

// ------------------------------------------------------------------ dialog

function ReplayDialog({ s, onClose }: { s: Session; onClose: () => void }) {
  const c = channel(s.type)
  const kind = channelOf(s.type)
  const turns = transcript(s)
  const steps = s.webActions ?? []
  const facts: { icon: IconName; label: string; value: React.ReactNode }[] = [
    { icon: 'chart', label: 'Minutes', value: fmtMin(billedMinutes(s.totalConnectedTime)) },
    { icon: c.icon, label: 'Channel', value: c.label },
    kind === 'browser' && steps.length
      ? { icon: 'check', label: 'Steps done', value: `${steps.filter((e) => e.status === 'ok').length} / ${steps.length}` }
      : { icon: 'phone', label: 'Caller', value: s.from ?? s.to ?? '—' },
    { icon: 'check', label: 'Status', value: <StatusText s={s} /> },
  ]

  return (
    <Dialog title={c.title} sub={fmtDate(s.startTime)} onClose={onClose} wide>
      <div className="db-facts">
        {facts.map((f) => (
          <div key={f.label} className="db-fact">
            <span className="db-fact-icon"><Icon name={f.icon} size={16} /></span>
            <span className="db-fact-text"><span>{f.label}</span><b>{f.value}</b></span>
          </div>
        ))}
      </div>

      {kind === 'avatar' && s.avatarVideoUrl
        ? <DualVideo agent={s.avatarVideoUrl} client={s.clientVideoUrl} />
        : s.recordingUrl && !(kind === 'browser' && steps.length) && <AudioPlayer src={s.recordingUrl} />}
      {kind === 'browser' && steps.length > 0 && <Timeline events={steps} />}

      {turns.length > 0 && (
        <section className="db-transcriptbox">
          <h3 className="db-transcript-title">Transcript</h3>
          <div className="db-transcript">
            {turns.map((t, i) => (
              <div key={i} className={`db-turn is-${t.ai ? 'ai' : 'user'}`}>
                <span className="db-turn-who">{t.ai ? 'Agent' : 'Caller'}</span>
                <p>{t.text}</p>
                {t.at != null && <time className="db-turn-time">{clock(t.at)}</time>}
              </div>
            ))}
          </div>
        </section>
      )}
    </Dialog>
  )
}

// ------------------------------------------------------------------ audio

const BARS = 72
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** Big play button, a waveform drawn from the actual audio, click-to-seek. */
function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)

  // Decode once to draw the real waveform; fall back to flat bars if it can't be read.
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const buf = await (await fetch(src)).arrayBuffer()
        const ctx = new AudioContext()
        const audio = await ctx.decodeAudioData(buf)
        ctx.close()
        const data = audio.getChannelData(0)
        const step = Math.floor(data.length / BARS)
        const out: number[] = []
        for (let i = 0; i < BARS; i++) {
          let max = 0
          for (let j = i * step; j < (i + 1) * step; j += 16) max = Math.max(max, Math.abs(data[j]))
          out.push(max)
        }
        const top = Math.max(...out, 0.001)
        if (!dead) setPeaks(out.map((p) => Math.max(0.06, p / top)))
      } catch {
        if (!dead) setPeaks(Array(BARS).fill(0.3))
      }
    })()
    return () => { dead = true }
  }, [src])

  useEffect(() => {
    ref.current?.play().catch(() => {})
  }, [src])

  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (a.paused) a.play().catch(() => {})
    else a.pause()
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ref.current
    if (!a || !dur) return
    const r = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - r.left) / r.width) * dur
  }
  const progress = dur ? t / dur : 0

  return (
    <div className="db-player">
      <audio ref={ref} src={src} preload="auto"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} />
      <button className="db-playbtn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" /></svg>}
      </button>
      <div className="db-wave" onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)}>
        {(peaks ?? Array(BARS).fill(0.15)).map((p, i) => (
          <span key={i} className={i / BARS < progress ? 'is-played' : undefined} style={{ height: `${Math.round(p * 100)}%` }} />
        ))}
      </div>
      <span className="db-player-time">{clock(t)} <small>/ {clock(dur)}</small></span>
    </div>
  )
}

// ------------------------------------------------------------------ video

/** Agent video beside the caller's camera; the caller's follows the agent's play, pause and seek. */
function DualVideo({ agent, client }: { agent: string; client?: string }) {
  const a = useRef<HTMLVideoElement>(null)
  const b = useRef<HTMLVideoElement>(null)
  const sync = () => {
    if (!a.current || !b.current) return
    b.current.currentTime = a.current.currentTime
    if (a.current.paused) b.current.pause()
    else b.current.play().catch(() => {})
  }
  return (
    <div className={`db-dualvideo${client ? '' : ' is-single'}`}>
      <figure>
        <video ref={a} src={agent} controls autoPlay muted playsInline onPlay={sync} onPause={sync} onSeeked={sync} />
        <figcaption><span className="db-livedot" />Agent</figcaption>
      </figure>
      {client ? (
        <figure>
          <video ref={b} src={client} muted playsInline />
          <figcaption><span className="db-livedot is-user" />Caller’s camera</figcaption>
        </figure>
      ) : null}
    </div>
  )
}

// ------------------------------------------------------------------ steps

const STATUS: Record<WebActionEvent['status'], { label: string; cls: string }> = {
  ok: { label: 'Done', cls: 'is-ok' },
  error: { label: 'Failed on the page', cls: 'is-err' },
  timeout: { label: 'Page didn’t respond', cls: 'is-err' },
  interrupted: { label: 'Caller interrupted', cls: 'is-warn' },
  no_channel: { label: 'Page not connected', cls: 'is-err' },
}

function Timeline({ events }: { events: WebActionEvent[] }) {
  return (
    <ol className="db-timeline">
      {events.map((e, i) => {
        const st = STATUS[e.status]
        return (
          <li key={i} className={st.cls}>
            <span className="db-tl-dot">{e.status === 'ok' ? <Icon name="check" size={12} /> : i + 1}</span>
            <div className="db-tl-body">
              <div className="db-tl-top">
                <span className="db-tl-action"><b>{e.action.type[0].toUpperCase() + e.action.type.slice(1)}</b>{e.action.target && <code>{e.action.target}</code>}</span>
                <span className="db-tl-time">{clock(e.at)}</span>
              </div>
              <p className="db-tl-said">“{e.said}”</p>
              <span className={`db-tl-status ${st.cls}`}>{st.label}{e.status === 'ok' && <small> · page ready in {e.ms} ms</small>}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function transcript(s: Session): { ai: boolean; text: string; at?: number }[] {
  const t = s.transcription
  const ai = (r: string) => /assist|ai|agent|bot/i.test(r)
  const at = (x: any) => (typeof x.at === 'number' ? x.at : typeof x.offset === 'number' ? x.offset : undefined)
  if (Array.isArray(t)) return t.map((x: any) => ({ ai: ai(String(x.role ?? x.speaker ?? '')), text: String(x.content ?? x.text ?? ''), at: at(x) })).filter((x) => x.text)
  if (typeof t === 'string') return t.split('\n').filter(Boolean).map((line) => {
    const m = line.match(/^(\w+):\s*(.*)$/)
    return m ? { ai: ai(m[1]), text: m[2] } : { ai: false, text: line }
  })
  return []
}
