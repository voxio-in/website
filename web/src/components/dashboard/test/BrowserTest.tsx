// The browser half of the Test tab: a real voice session through the Voxio
// SDK. The only module that imports @voxio/react (and so @voxio/client); the
// Test page loads it with React.lazy so nothing WebRTC runs on the server.
//
// Options are read once when this mounts (useVoxioSession works that way), so
// the page remounts it with a new `key` when they change while idle.

import { useVoxioSession } from '@voxio/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import Icon from '../Icon'
import type { TestSetup, TestTurn } from '#/lib/dashboard/types'
import { testErrorText } from './errors'
import LivePanel, { type LiveState, type PageAction } from './LivePanel'
import { loggingFetch, type WireLog } from './wire'

export type BrowserResult = {
  sessionId: string
  type: 'browser' | 'avatar'
  startTime: string
  seconds: number
  status: string
  transcript: TestTurn[]
}

const VERB: Record<string, string> = {
  click: 'Click', fill_field: 'Fill in', focus: 'Go to', scroll_to: 'Scroll to', navigate: 'Open', highlight: 'Point at',
}

function describe(a: { action: string; target?: string; value?: string; url?: string }) {
  const verb = VERB[a.action] ?? a.action.replace(/_/g, ' ')
  const what = a.target ?? a.url ?? ''
  return `${verb}${what ? ` “${what}”` : ''}${a.action === 'fill_field' && a.value ? ` with “${a.value}”` : ''}`
}

export default function BrowserTest({ flowKey, setup, video, camera, customs, log, onLive, onDone }: {
  flowKey: string
  setup: TestSetup
  /** Show the agent's avatar. */
  video: boolean
  /** Let the agent see the camera. */
  camera: boolean
  /** Overrides for this test only. */
  customs?: Record<string, unknown>
  /** Records what is sent and received, for the code view. */
  log: WireLog
  onLive: (live: boolean) => void
  onDone: (r: BrowserResult) => void
}) {
  const logRef = useRef(log)
  logRef.current = log
  // Every request the SDK makes (ICE servers, the offer) goes through this.
  const fetchFn = useMemo(() => loggingFetch((...a) => logRef.current(...a)), [])

  const options = {
    baseUrl: setup.baseUrl,
    // The flow's own API key; customs only when the page passes them.
    flowKey,
    customs,
    media: { audio: true, video, camera },
    recording: true,
    // Never let the agent click around the dashboard: list what it asks for instead.
    webActions: false,
  } as const
  const v = useVoxioSession({ ...options, env: { fetch: fetchFn } })

  const live = v.state === 'connecting' || v.state === 'listening' || v.state === 'thinking' || v.state === 'speaking'
  useEffect(() => onLive(live), [live, onLive])

  // The timer starts when the call is up, not when the button is pressed.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  useEffect(() => {
    if (v.state === 'connecting') setStartedAt(null)
    else if (live && startedAt === null) setStartedAt(Date.now())
  }, [v.state, live, startedAt])

  const [actions, setActions] = useState<PageAction[]>([])
  const transcript = useRef(v.transcript)
  transcript.current = v.transcript
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
      if (st === 'connecting') { setActions([]); began.current = new Date().toISOString() }
    })
    const offText = s.on('transcript', (t) => { if (t.final) say('in', `transcript · ${t.role}`, t) })
    const offMsg = s.on('message', (m) => say('in', 'message', m))
    const offErr = s.on('error', (e) => say('in', `error · ${e.code}`, { code: e.code, message: e.message, status: e.status }))
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
          .map((t) => ({ role: t.role === 'agent' ? 'assistant' : 'user', content: t.text })),
      })
    })
    // Closing the tab or leaving the site must drop the call and the mic.
    const onHide = () => s.destroy()
    window.addEventListener('pagehide', onHide)
    return () => { offAction(); offState(); offText(); offMsg(); offErr(); offEnded(); window.removeEventListener('pagehide', onHide) }
  }, [v.session, video])

  const state: LiveState = v.state
  const err = testErrorText(v.error)

  return (
    <>
      <div className="db-test-go">
        {live ? (
          <span className="db-muted">Talking to it now — end the call below.</span>
        ) : (
          <button className="db-btn db-primary db-btn-icon db-btn-lg" disabled={!v.session}
            onClick={() => { log('out', 'start session', { ...options, flowKey }); void v.start() }}>
            <Icon name="voice" size={18} />{v.state === 'ended' || v.state === 'error' ? 'Talk again' : 'Start talking'}
          </button>
        )}
        {err && <span className="db-err-text">{err}</span>}
      </div>
      {/* No typing box here: the voice server drops `user_text` on the data channel
          (it only handles web_action_ack). Put `onSend` back once it handles it. */}
      {(live || v.transcript.length > 0) && (
        <LivePanel
          state={state}
          startedAt={startedAt}
          lines={v.transcript.map((t) => ({ role: t.role, text: t.text, final: t.final }))}
          actions={actions}
          userLevel={() => level.current}
          agentStream={v.agentStream}
          muted={v.muted}
          onMute={() => { log('out', `mute · ${!v.muted}`); v.mute(!v.muted) }}
          onEnd={() => { log('out', 'stop session'); void v.stop() }}
        />
      )}
    </>
  )
}
