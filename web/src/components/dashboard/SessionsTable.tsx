// Paginated sessions. Each opens a replay dialog by type:
//   phone  → the call recording, with a real waveform
//   avatar → the agent's video beside the caller's camera, played in sync
//   web    → the steps the agent took on the page

import { useEffect, useMemo, useRef, useState } from 'react'

import { billedMinutes, channelOf, fmtDate, fmtMin, unwire } from '#/lib/dashboard/client'
import { getSessionRecording } from '#/server/dashboard/api'
import { isTestSession, testSessionIds } from '#/lib/dashboard/testSessions'
import type { Session, WebActionEvent } from '#/lib/dashboard/types'
import Icon, { type IconName } from './Icon'
import { Pager, TableCard, TableFilter, usePaged } from './TableCard'
import { Dialog, Loading, rowLink } from './ui'
import WirePanel from './test/WirePanel'
import { VideoPlayer } from './kit/VideoPlayer'
import { AudioPlayer } from './kit/AudioPlayer'

const PAGE = 10

const CHANNELS = [
  { value: 'all', label: 'All channels' },
  { value: 'phone', label: 'Phone' },
  { value: 'browser', label: 'Web' },
  { value: 'avatar', label: 'Video' },
  { value: 'chat', label: 'Chat' },
]
// Most sessions record no status, so "unknown" is its own answer, never counted as completed.
const STATES = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'other', label: 'Didn’t finish' },
  { value: 'unknown', label: 'Not recorded' },
]
// Real sessions first: tests are the owner's own tries, one click away.
const WHO = [
  { value: 'real', label: 'Real sessions' },
  { value: 'all', label: 'With tests' },
  { value: 'tests', label: 'Only tests' },
]

const CHANNEL = {
  phone: { label: 'Phone', icon: 'phone', replay: 'Play recording', title: 'Call recording' },
  avatar: { label: 'Video', icon: 'avatar', replay: 'Watch', title: 'Video session' },
  browser: { label: 'Web', icon: 'cursor', replay: 'View steps', title: 'Web session' },
  chat: { label: 'Chat', icon: 'list', replay: 'Open', title: 'Chat' },
} satisfies Record<string, { label: string; icon: IconName; replay: string; title: string }>
const channel = (t: string) => CHANNEL[channelOf(t)]
const stateOf = (s: Session) => (!s.status ? 'unknown' : s.status === 'completed' ? 'completed' : 'other')

export default function SessionsTable({ sessions, empty = 'No sessions yet.', highlight, flowKey }: {
  sessions: Session[]
  /** The flow these belong to; lets the replay fetch a recording from the voice server. */
  flowKey?: string
  empty?: string
  /** A session to show and mark, e.g. the one a test just made. */
  highlight?: string
}) {
  const [open, setOpen] = useState<Session | null>(null)
  const [q, setQ] = useState('')
  const [chan, setChan] = useState('all')
  const [state, setState] = useState('all')
  // Read after mount: the list lives in this browser only.
  const [tests, setTests] = useState<Set<string>>(() => new Set())
  useEffect(() => setTests(testSessionIds()), [sessions])
  // A test that was just run (?session=) must be visible, so it opens with tests shown.
  const [picked, setWho] = useState(() => (highlight && sessions.find((s) => s.sessionId === highlight)?.test ? 'all' : 'real'))
  // Until there is a real session, the tests are the history: show them, and no Show filter.
  const anyReal = useMemo(() => sessions.some((s) => !isTestSession(s, tests)), [sessions, tests])
  const who = anyReal ? picked : 'all'
  const rowsAll = useMemo(() => {
    // "/filter refund" (or just "refund") matches numbers, date, type, status and the transcript.
    const needle = q.trim().replace(/^\/filter\s*/i, '').toLowerCase()
    const said = (t: unknown) => (typeof t === 'string' ? t : Array.isArray(t) ? t.map((x) => (x as { content?: string })?.content ?? '').join(' ') : '')
    return sessions
      .filter((s) => who === 'all' || (who === 'tests') === isTestSession(s, tests))
      .filter((s) => chan === 'all' || channelOf(s.type) === chan)
      .filter((s) => state === 'all' || state === stateOf(s))
      .filter((s) => !needle || `${s.from ?? ''} ${s.to ?? ''} ${s.status ?? ''} ${s.type} ${fmtDate(s.startTime)} ${said(s.transcription)}`.toLowerCase().includes(needle))
  }, [sessions, q, chan, state, who, tests])
  const paged = usePaged(rowsAll, PAGE)
  const { setPage } = paged
  const hasTests = useMemo(() => sessions.some((s) => isTestSession(s, tests)), [sessions, tests])
  const marked = useRef<HTMLTableRowElement>(null)
  useEffect(() => {
    const i = highlight ? rowsAll.findIndex((s) => s.sessionId === highlight) : -1
    if (i >= 0) setPage(Math.floor(i / PAGE) + 1)
  }, [highlight, rowsAll, setPage])
  useEffect(() => { marked.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [highlight, paged.page])


  return (
    <TableCard
      title="Sessions"
      search={sessions.length ? { value: q, onChange: setQ, placeholder: 'Search, or /filter <keyword>', count: `${rowsAll.length.toLocaleString()} of ${sessions.length.toLocaleString()}` } : undefined}
      filters={sessions.length ? <>
        {hasTests && anyReal && <TableFilter label="Show" value={who} options={WHO} onChange={setWho} />}
        <TableFilter label="Filter by channel" value={chan} options={CHANNELS} onChange={setChan} />
        <TableFilter label="Filter by status" value={state} options={STATES} onChange={setState} />
      </> : undefined}
      footer={<Pager {...paged} />}
    >
      {!sessions.length ? <p className="db-tcard-empty">{empty}</p> : !rowsAll.length ? <p className="db-tcard-empty">No sessions match. Try another search or filter.</p> : (
      <table className="db-flows db-sesstable">
        <thead>
          <tr><th>When</th><th>What was said</th><th>Channel</th><th>Caller</th><th className="db-num">Minutes</th><th>Status</th><th aria-label="Replay" /></tr>
        </thead>
        <tbody>
          {paged.shown.map((s) => {
            const c = channel(s.type)
            const replayable = !!(s.recordingUrl || s.avatarVideoUrl || s.webActions?.length)
            // A web call with a recording but no steps (imported ones) plays like a call.
            const steps = channelOf(s.type) === 'browser' && !!s.webActions?.length
            return (
              <tr key={s.sessionId} {...rowLink(() => setOpen(s))} ref={s.sessionId === highlight ? marked : undefined}
                className={s.sessionId === highlight ? 'is-marked' : undefined}>
                <td className="db-whencell">{fmtDate(s.startTime)}{isTestSession(s, tests) && <span className="db-testchip">Test</span>}</td>
                <td className="db-saidcell">{firstWords(s) || <span className="db-muted">—</span>}</td>
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
      )}
      {open && <ReplayDialog s={open} flowKey={flowKey} onClose={() => setOpen(null)} />}
    </TableCard>
  )
}

/** An unrecorded status reads as unknown, not as completed. */
function StatusText({ s }: { s: Session }) {
  const st = stateOf(s)
  if (st === 'unknown') return <span className="db-status" title="This session didn’t record how it ended">—</span>
  if (st === 'completed') return <span className="db-status is-ok">Completed</span>
  return <span className={`db-status ${s.status?.startsWith('scheduled') ? '' : 'is-err'}`}>{s.status}</span>
}

/** The caller's first words, or the agent's when the caller said nothing: what the session was about. */
function firstWords(s: Session): string {
  const turns = transcript(s).filter((t) => !t.data)
  // Speaker tags ("<speaker_1>") are the recogniser's, not words anyone said.
  return (turns.find((t) => !t.ai) ?? turns[0])?.text.replace(/<speaker_\d+>\s*/g, '').slice(0, 140) ?? ''
}

// ------------------------------------------------------------------ dialog

function ReplayDialog({ s: given, flowKey, onClose }: { s: Session; flowKey?: string; onClose: () => void }) {
  // Web and video sessions are recorded by the voice server; fetch it (and its
  // two-sided transcript) only when the stored session has no recording: the
  // list already carries a signed link, and swapping it would restart the load.
  const [s, setS] = useState(given)
  const [asking, setAsking] = useState(false)
  useEffect(() => {
    setS(given)
    if (given.recordingUrl || !flowKey || channelOf(given.type) === 'chat') return
    let gone = false
    setAsking(true)
    getSessionRecording({ data: { key: flowKey, id: given.sessionId } }).then((raw) => {
      if (gone) return
      const r = unwire<{ recordingUrl?: string; cameraUrl?: string; transcript: { role: string; content: string }[] }>(raw)
      if (r.ok) setS((x) => ({
        ...x,
        recordingUrl: r.data.recordingUrl ?? x.recordingUrl,
        clientVideoUrl: r.data.cameraUrl ?? x.clientVideoUrl,
        // Keep the saved transcript when it carries the agent's extra data (frame, score…): the server's has only words.
        transcription: Array.isArray(x.transcription) && x.transcription.some((t: { data?: boolean }) => t?.data) ? x.transcription
          : r.data.transcript.length >= (Array.isArray(x.transcription) ? x.transcription.length : 0) && r.data.transcript.length ? r.data.transcript : x.transcription,
      }))
    }).catch(() => {}).finally(() => { if (!gone) setAsking(false) })
    return () => { gone = true }
  }, [given, flowKey])
  const c = channel(s.type)
  const kind = channelOf(s.type)
  const turns = transcript(s)
  const steps = s.webActions ?? []
  // Who the agent talked to, named for the channel.
  const them = kind === 'phone' ? 'Caller' : 'User'
  // Read back like the live test: copy the transcript, see what it did on the page, open the raw log.
  const actions = s.actions ?? []
  const wireLog = s.wire ?? []
  const [raw, setRaw] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTranscript = () => {
    const text = turns.map((t) => `${t.ai ? 'Agent' : them}: ${t.text}`).join('\n')
    void navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  const tools = wireLog.length > 0 && (
    <button type="button" className={`db-btn db-btn-icon${raw ? ' is-on' : ''}`} aria-pressed={raw} onClick={() => setRaw(!raw)}><Icon name="code" size={18} />Raw</button>
  )
  const media = (s.avatarVideoUrl ?? s.recordingUrl) && !(kind === 'browser' && steps.length)
    ? <Recording src={(s.avatarVideoUrl ?? s.recordingUrl)!} camera={s.clientVideoUrl} />
    : asking ? <Loading label="Looking for the recording" />
    : kind !== 'chat' ? <p className="db-muted">No recording for this session yet. It can take a minute after the call ends.</p>
    : null

  return (
    <Dialog title={c.title} sub={fmtDate(s.startTime)} onClose={onClose} wide actions={tools || undefined}>
      {/* Transcript on the left, the recording on the right. */}
      <div className={`db-replay${media ? '' : ' is-one'}`}>
        <section className="db-replay-text">
          <div className="db-replay-texthead">
            <h3 className="db-replay-title">Transcript</h3>
            {turns.length > 0 && (
              <button type="button" className="db-iconbtn" onClick={copyTranscript} title={copied ? 'Copied' : 'Copy transcript'} aria-label="Copy transcript">
                <Icon name={copied ? 'check' : 'copy'} size={20} />
              </button>
            )}
          </div>
          {turns.length > 0 ? (
            <div className="db-transcript">
              {turns.map((t, i) => (
                <div key={i} className={`db-turn is-${t.ai ? 'ai' : 'user'}`}>
                  <span className="db-turn-who">{t.ai ? (t.data ? 'Agent · data' : 'Agent') : them}</span>
                  {t.data ? <pre className="db-turn-data">{t.text}</pre> : <p>{t.text}</p>}
                  {t.at != null && <time className="db-turn-time">{clock(t.at)}</time>}
                </div>
              ))}
            </div>
          ) : <p className="db-muted">No transcript for this session.</p>}
          {kind === 'browser' && steps.length > 0 && <Timeline events={steps} />}
          {actions.length > 0 && (
            <section className="db-live-actions db-replay-actions">
              <span className="db-flabel">What it did on your website</span>
              <ul>{actions.map((a) => <li key={a.id}><Icon name="cursor" size={15} />{a.label}<Icon name="check" size={14} className="db-live-ok" /></li>)}</ul>
            </section>
          )}
          {raw && wireLog.length > 0 && <div className="db-replay-wire"><WirePanel entries={wireLog} /></div>}
        </section>
        {media && <section className="db-replay-media">{media}</section>}
      </div>
    </Dialog>
  )
}

// ------------------------------------------------------------------ audio

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** Big play button, a waveform drawn from the actual audio, click-to-seek. */
/** Audio files play as audio. Anything else is checked for a picture first, with the orb up meanwhile. */
function Recording({ src, camera }: { src: string; camera?: string }) {
  const known = /\.(mp3|wav|m4a|ogg|opus|aac)(\?|$)/i.test(src) || src.startsWith('/api/sample-recording')
  const [kind, setKind] = useState<'audio' | 'video' | null>(known ? 'audio' : null)
  useEffect(() => {
    if (known) { setKind('audio'); return }
    setKind(null)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => setKind(v.videoWidth ? 'video' : 'audio')
    v.onerror = () => setKind('audio')
    v.src = src
    return () => { v.onloadedmetadata = v.onerror = null; v.removeAttribute('src'); v.load() }
  }, [src, known])
  if (!kind) return <Loading label="Loading recording" />
  return kind === 'audio' ? <AudioPlayer src={src} /> : <DualVideo agent={src} client={camera} />
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
        <VideoPlayer src={agent} name="session" autoPlay videoRef={a} videoProps={{ onPlay: sync, onPause: sync, onSeeked: sync }} />
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

/** The voice server stores user turns as `{"user_input": "…"}`; show just the words. */
function spoken(v: unknown): string {
  const text = String(v ?? '')
  if (!text.startsWith('{')) return text
  try {
    const o = JSON.parse(text)
    return typeof o?.user_input === 'string' ? o.user_input : text
  } catch { return text }
}

function transcript(s: Session): { ai: boolean; text: string; at?: number; data?: boolean }[] {
  const t = s.transcription
  const ai = (r: string) => /assist|ai|agent|bot/i.test(r)
  const at = (x: any) => (typeof x.at === 'number' ? x.at : typeof x.offset === 'number' ? x.offset : undefined)
  if (Array.isArray(t)) return t.map((x: any) => (x.data
    ? { ai: true, text: String(x.content ?? ''), at: at(x), data: true }
    : { ai: ai(String(x.role ?? x.speaker ?? '')), text: spoken(x.content ?? x.text), at: at(x) })).filter((x) => x.text)
  if (typeof t === 'string') return t.split('\n').filter(Boolean).map((line) => {
    const m = line.match(/^(\w+):\s*(.*)$/)
    return m ? { ai: ai(m[1]), text: m[2] } : { ai: false, text: line }
  })
  return []
}
