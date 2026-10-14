// The browser half of the Test tab: a real voice session through the Voxio
// SDK. The only module that imports @voxio/react (and so @voxio/client); the
// Test page loads it with React.lazy so nothing WebRTC runs on the server.
//
// Options are read once when this mounts (useVoxioSession works that way), so
// the page remounts it with a new `key` when they change while idle.

import { useVoxioSession } from 'voxioagent/react'
import type { ParticipantsGraph } from 'voxioagent/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Icon from '../Icon'
import type { TestSetup, TestTurn } from '#/lib/dashboard/types'
import { testErrorText } from './errors'
import LivePanel, { type Line, type LiveState, type PageAction } from './LivePanel'
import { loggingFetch, type WireLog } from './wire'

export type BrowserResult = {
  sessionId: string
  type: 'browser' | 'avatar'
  startTime: string
  seconds: number
  status: string
  transcript: TestTurn[]
  /** What it did on the page, in order. */
  actions?: PageAction[]
}

const VERB: Record<string, string> = {
  click: 'Click', fill_field: 'Fill in', focus: 'Go to', scroll_to: 'Scroll to', navigate: 'Open', highlight: 'Point at',
}

function describe(a: { action: string; target?: string; value?: string; url?: string }) {
  const verb = VERB[a.action] ?? a.action.replace(/_/g, ' ')
  const what = a.target ?? a.url ?? ''
  return `${verb}${what ? ` “${what}”` : ''}${a.action === 'fill_field' && a.value ? ` with “${a.value}”` : ''}`
}

/** The words in an agent `out`: a string, { speak | text | message | response }, or a list of those. */
function spoken(out: unknown): string {
  if (typeof out === 'string') return out.replace(/<\|[\w-]*\|>/g, '').trim()
  if (Array.isArray(out)) return out.map(spoken).filter(Boolean).join(' ')
  if (out && typeof out === 'object') {
    const o = out as Record<string, unknown>
    for (const k of ['speak', 'text', 'message', 'response', 'reply', 'out']) if (o[k] !== undefined) { const t = spoken(o[k]); if (t) return t }
  }
  return ''
}

// Keys of an `out` that aren't the spoken line or delivery settings: shown as raw JSON.
const NOT_EXTRA = new Set(['speak', 'text', 'message', 'response', 'reply', 'out', 'user_input', 'interruption_type', 'interruption_metadata'])
function extraOf(out: unknown): Record<string, unknown> | null {
  if (!out || typeof out !== 'object' || Array.isArray(out)) return null
  const rest = Object.fromEntries(Object.entries(out as Record<string, unknown>).filter(([k]) => !NOT_EXTRA.has(k)))
  return Object.keys(rest).length ? rest : null
}

export default function BrowserTest({ flowKey, setup, video, camera, customs, participants, log, onLive, onDone }: {
  flowKey: string
  setup: TestSetup
  /** Show the agent's avatar. */
  video: boolean
  /** Let the agent see the camera. */
  camera: boolean
  /** Overrides for this test only. */
  customs?: Record<string, unknown>
  /** Who sees and hears whom; the SDK's default when left out. */
  participants?: ParticipantsGraph
  /** Records what is sent and received, for the code view. */
  log: WireLog
  onLive: (live: boolean) => void
  onDone: (r: BrowserResult) => void
}) {
  const logRef = useRef(log)
  logRef.current = log
  // Every request the SDK makes (ICE servers, the offer) goes through this. It
  // adds the tester's own account key next to the flow key the SDK sends.
  const userKey = setup.userKey
  const fetchFn = useMemo<typeof fetch>(() => {
    const logged = loggingFetch((...a) => logRef.current(...a))
    if (!userKey) return logged
    return (input, init) => {
      const headers = new Headers(init?.headers)
      headers.set('user_api_key', userKey)
      return logged(input, { ...init, headers: Object.fromEntries(headers) })
    }
  }, [userKey])

  const options = {
    // A face runs on the GPU voice server.
    baseUrl: video ? setup.avatarUrl : setup.baseUrl,
    // The flow's own API key (the account key is added in fetchFn); customs only when the page passes them.
    flowKey,
    customs,
    media: { audio: true, video, camera },
    participants,
    recording: true,
    // Never let the agent click around the dashboard: list what it asks for instead.
    webActions: false,
  } as const
  // The agent's voice plays through an <audio> we hand the SDK, so the page can set its volume.
  const [agentVolume, setAgentVolume] = useState(100)
  const agentAudio = useRef<HTMLAudioElement | null>(null)
  const createAudioElement = useCallback(() => {
    const el = new Audio()
    el.autoplay = true
    el.volume = agentVolume / 100
    agentAudio.current = el
    return el
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (agentAudio.current) agentAudio.current.volume = agentVolume / 100 }, [agentVolume])
  const v = useVoxioSession({ ...options, env: { fetch: fetchFn, createAudioElement } })

  const live = v.state === 'connecting' || v.state === 'listening' || v.state === 'speaking'
  useEffect(() => onLive(live), [live, onLive])

  // The timer starts when the call is up, not when the button is pressed.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  useEffect(() => {
    if (v.state === 'connecting') setStartedAt(null)
    else if (live && startedAt === null) setStartedAt(Date.now())
  }, [v.state, live, startedAt])

  const [actions, setActions] = useState<PageAction[]>([])
  // The same list for the end-of-call summary, which is read inside the session's handlers.
  const actionsNow = useRef<PageAction[]>([])
  actionsNow.current = actions
  /* The voice server mirrors every agent packet on the data channel
     (voxioagent 2.0.2): `reply` gives the agent's words as they stream, and
     any packet carrying what the caller said adds a user line. Typed lines
     are added by `send` below. */
  const [lines, setLines] = useState<Line[]>([])
  const transcript = useRef(lines)
  transcript.current = lines
  const typed = useRef('')
  /** Counts the agent's turns: a new one each time it waits for input or you type. */
  const turnNo = useRef(0)
  const level = useRef(0)
  level.current = v.level.user
  const began = useRef<string>('')
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const s = v.session
    if (!s) return
    const say = (dir: 'out' | 'in', label: string, data?: unknown) => { logRef.current(dir, label, data) }
    const offAction = s.on('webAction', (msg, ack) => {
      say('in', `web_action · ${msg.action.action}`, msg)
      setActions((a) => [...a, { id: msg.id, label: describe(msg.action) }])
      ack('ok')
      say('out', 'web_action_ack', { type: 'web_action_ack', id: msg.id, status: 'ok' })
    })
    const offState = s.on('state', (st) => {
      say('in', `state · ${st}`)
      if (st === 'connecting') { setActions([]); setLines([]); began.current = new Date().toISOString() }
    })
    const addLine = (line: Line) => setLines((prev) => {
      const last = prev[prev.length - 1]
      return last && !last.final && last.role === line.role ? [...prev.slice(0, -1), line] : [...prev, line]
    })
    // Everything the server sends inside `{ agent: … }`, raw, for the code view.
    // Streamed chunks are logged once, as the finished reply, to keep it readable.
    const offAgent = s.on('agent', (p) => {
      if (typeof p.chunk === 'string' && p.is_last !== true) return
      say('in', `agent · ${Object.keys(p).slice(0, 3).join(', ')}`, { agent: p })
      // Non-streamed replies come as `out` (a node's output, e.g. { speak: "…" }).
      if (typeof p.chunk !== 'string' && p.out !== undefined) {
        const said = spoken(p.out)
        // One reply can come as several `out` packets (one per sentence). Sentences of
        // the same turn join; a new turn starts each time the agent waits for input.
        // The turn is read here, outside the updater, so the updater stays pure.
        const turn = turnNo.current
        if (said) setLines((prev) => {
          const last = prev[prev.length - 1]
          return last?.role === 'agent' && last.turn === turn && !last.data
            ? [...prev.slice(0, -1), { ...last, text: `${last.text} ${said}` }]
            : [...prev, { role: 'agent', text: said, final: true, turn }]
        })
        // Whatever else the node sent (frame, score, feedback…), as its own raw message.
        const extra = extraOf(p.out)
        if (extra) setLines((prev) => [...prev, { role: 'agent', text: JSON.stringify(extra, null, 2), final: true, turn, data: true }])
      }
      // The caller's words come top-level from some servers, and inside `out` from a
      // transcription step (`{ out: { user_input } }`).
      const inOut = p.out && typeof p.out === 'object' ? (p.out as Record<string, unknown>).user_input : undefined
      const heard = [p.user_input, inOut, p.transcript, p.user_text, p.stt].find((x) => typeof x === 'string' && x.trim())
      if (typeof heard === 'string' && heard === typed.current) typed.current = ''
      else if (typeof heard === 'string') setLines((prev) => {
        // Already shown from the voice server's own transcript: don't add it twice.
        const lastUser = [...prev].reverse().find((l) => l.role === 'user')
        if (inOut === heard && lastUser?.final && lastUser.text.trim() === heard.trim()) return prev
        const last = prev[prev.length - 1]
        const line: Line = { role: 'user', text: heard, final: p.is_final !== false }
        return last && !last.final && last.role === 'user' ? [...prev.slice(0, -1), line] : [...prev, line]
      })
    })
    const offReply = s.on('reply', (r) => {
      if (r.final || r.interrupted) say('in', `reply${r.interrupted ? ' · cut off' : ''}`, r)
      if (r.text.trim()) addLine({ role: 'agent', text: r.text, final: r.final || r.interrupted })
    })
    const offInput = s.on('inputRequest', (r) => { turnNo.current += 1; say('in', `waiting for input · ${r.key}`, r) })
    const offUsage = s.on('usage', (u) => say('in', 'usage', { promptTokens: u.promptTokens, completionTokens: u.completionTokens, totalTime: u.totalTime }))
    const offMsg = s.on('message', (m) => {
      const t = m as { type?: string; role?: string; text?: unknown; final?: boolean }
      if (t?.type === 'transcript' && typeof t.text === 'string' && (t.role === 'user' || t.role === 'agent')) {
        const line: Line = { role: t.role, text: t.text, final: t.final !== false }
        if (line.final) say('in', `transcript · ${line.role}`, t)
        addLine(line)
        return
      }
      say('in', 'message', m)
    })
    const offErr = s.on('error', (e) => say('in', `error · ${e.code}`, { code: e.code, message: e.message, status: e.status, detail: e.detail }))
    const offEnded = s.on('ended', (sum) => {
      say('in', 'ended', sum)
      done.current({
        sessionId: sum.sessionId,
        type: video ? 'avatar' : 'browser',
        startTime: began.current || new Date(Date.now() - sum.seconds * 1000).toISOString(),
        seconds: sum.seconds,
        status: sum.reason === 'error' ? 'failed' : 'completed',
        transcript: transcript.current
          .filter((t) => t.final && t.text.trim())
          .map((t) => ({ role: t.role === 'agent' ? 'assistant' : 'user', content: t.text, ...(t.data ? { data: true } : {}) })),
        actions: actionsNow.current,
      })
    })
    // Closing the tab or leaving the site must drop the call and the mic.
    const onHide = () => s.destroy()
    window.addEventListener('pagehide', onHide)
    return () => { offAction(); offState(); offAgent(); offReply(); offInput(); offUsage(); offMsg(); offErr(); offEnded(); window.removeEventListener('pagehide', onHide) }
  }, [v.session, video])

  /* Typed input goes to the agent on the call's own session, and the reply is
     spoken like any other. It's added here straight away; if the server echoes
     it back as user_input the line isn't doubled (same text, already final). */
  const send = (text: string) => {
    const sent = v.sendText(text)
    log('out', sent ? 'typed input' : 'typed input · not sent (call not connected)', { agent: { user_input: text } })
    if (sent) { typed.current = text; turnNo.current += 1; setLines((prev) => [...prev, { role: 'user', text, final: true }]) }
    return sent
  }

  const state: LiveState = v.state
  const err = testErrorText(v.error)

  return (
    <>
      <div className="db-test-go">
        {!live && (
          <button className="db-btn db-primary db-btn-icon db-btn-lg" disabled={!v.session}
            onClick={() => { log('out', 'start session', { ...options, flowKey }); void v.start() }}>
            <Icon name="voice" size={18} />{v.state === 'ended' || v.state === 'error' ? 'Talk again' : 'Start talking'}
          </button>
        )}
        {err && <span className="db-err-text">{err}</span>}
      </div>
      {(live || lines.length > 0) && (
        <LivePanel
          state={state}
          startedAt={startedAt}
          lines={lines}
          actions={actions}
          userLevel={() => level.current}
          agentStream={v.agentStream}
          selfStream={camera ? v.session?.localStream ?? null : null}
          voice
          muted={v.muted}
          onMute={() => { log('out', `mute · ${!v.muted}`); v.mute(!v.muted) }}
          agentVolume={agentVolume}
          onAgentVolume={setAgentVolume}
          onEnd={() => { log('out', 'stop session'); void v.stop() }}
          onSend={send}
        />
      )}
    </>
  )
}
