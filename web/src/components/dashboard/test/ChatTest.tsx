// The chat half of the Test tab: type to the flow through the SDK's chat
// (ChatbotLogic from @voxio/widget), authenticated with the flow's API key.
// Loaded with React.lazy: @voxio/widget defines custom elements on import,
// which only works in a browser.

import { ChatbotLogic } from '@voxio/widget'
import { useEffect, useRef, useState } from 'react'

import Icon from '../Icon'
import type { TestTurn } from '#/lib/dashboard/types'
import LivePanel, { type Line, type LiveState } from './LivePanel'
import { loggingFetch, type WireLog } from './wire'

export type ChatResult = { sessionId: string; type: 'chat'; startTime: string; seconds: number; status: string; transcript: TestTurn[] }

const LABELS = { listening: 'Your turn', thinking: 'Thinking…', speaking: 'Replying…' }

export default function ChatTest({ flowKey, chatUrl, log, onLive, onDone }: {
  flowKey: string
  chatUrl: string
  /** Records what is sent and received, for the code view. */
  log: WireLog
  onLive: (live: boolean) => void
  onDone: (r: ChatResult) => void
}) {
  const logic = useRef<ChatbotLogic | null>(null)
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'open' | 'ended'>('idle')
  const [lines, setLines] = useState<Line[]>([])
  const [reply, setReply] = useState<'none' | 'waiting' | 'streaming'>('none')
  const [err, setErr] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const linesRef = useRef(lines)
  linesRef.current = lines

  const open = phase === 'connecting' || phase === 'open'
  useEffect(() => onLive(open), [open, onLive])
  // Leaving the page ends the chat session on the server.
  useEffect(() => () => logic.current?.dispose(), [])

  const start = async () => {
    setErr(null)
    setLines([])
    setPhase('connecting')
    // Every request (start_session, process_input and its streamed reply) is logged.
    const l = new ChatbotLogic({ baseUrl: chatUrl, fetch: loggingFetch(log) })
    // A fresh conversation every time, not the one this tab used last.
    l.clearStorage()
    l.initSession()
    l.setApiKey(flowKey)
    logic.current = l
    if (!(await l.connect(null))) {
      setPhase('idle')
      logic.current = null
      setErr('Couldn’t start a chat with this flow. Check that its workflow is set up, then try again.')
      return
    }
    setStartedAt(Date.now())
    setPhase('open')
  }

  const send = (text: string) => {
    const l = logic.current
    if (!l || reply !== 'none') return false
    setLines((ls) => [...ls, { role: 'user', text, final: true }, { role: 'agent', text: '', final: false }])
    setReply('waiting')
    void l.sendMessage(null, text, (tok) => {
      setReply('streaming')
      setLines((ls) => [...ls.slice(0, -1), { ...ls[ls.length - 1], text: ls[ls.length - 1].text + tok }])
    }).then((res) => {
      setReply('none')
      setLines((ls) => {
        const last = ls[ls.length - 1]
        const text = last.text || res.text || ''
        // Nothing came back: drop the empty bubble and say so.
        return text ? [...ls.slice(0, -1), { ...last, text, final: true }] : ls.slice(0, -1)
      })
      if (!res.success) setErr('The agent didn’t answer. Try again.')
    })
    return true
  }

  const end = () => {
    const l = logic.current
    if (!l) return
    log('out', 'end chat', { session_id: l.sessionId })
    l.dispose()
    logic.current = null
    setPhase('ended')
    setReply('none')
    const seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
    onDone({
      sessionId: l.sessionId,
      type: 'chat',
      startTime: new Date(startedAt ?? Date.now()).toISOString(),
      seconds,
      status: 'completed',
      transcript: linesRef.current.filter((x) => x.final && x.text.trim()).map((x) => ({ role: x.role === 'agent' ? 'assistant' : 'user', content: x.text })),
    })
  }

  const state: LiveState = phase === 'connecting' ? 'connecting' : phase === 'ended' ? 'ended' : reply === 'waiting' ? 'thinking' : reply === 'streaming' ? 'speaking' : 'listening'

  return (
    <>
      <div className="db-test-go">
        {!open && (
          <button className="db-btn db-primary db-btn-icon db-btn-lg" onClick={() => void start()}>
            <Icon name="list" size={18} />{phase === 'ended' ? 'Chat again' : 'Start chatting'}
          </button>
        )}
        {err && <span className="db-err-text">{err}</span>}
      </div>
      {(open || lines.length > 0) && (
        <LivePanel state={state} labels={LABELS} startedAt={startedAt} lines={lines} onEnd={end} onSend={phase === 'open' ? send : undefined} />
      )}
    </>
  )
}
