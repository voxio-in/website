// A test of a flow inside an Ask Voxio answer. It runs the Test tab's own
// components (ChatTest, BrowserTest), so it goes through the same Voxio SDK and
// widget, the same setup (getTestSetup) and is kept in Sessions the same way.

import { Link } from '@tanstack/react-router'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'

import Icon from '#/components/dashboard/Icon'
import { Loading } from '#/components/dashboard/ui'
import type { BrowserResult } from '#/components/dashboard/test/BrowserTest'
import type { ChatResult } from '#/components/dashboard/test/ChatTest'
import { useWire } from '#/components/dashboard/test/wire'
import { unwire } from '#/lib/dashboard/client'
import { rememberTestSession } from '#/lib/dashboard/testSessions'
import type { TestSetup } from '#/lib/dashboard/types'
import { getTestSetup, saveTestSession } from '#/server/dashboard/api'

// The SDK's browser parts only load in the browser, as on the Test tab.
const ChatTest = lazy(() => import('#/components/dashboard/test/ChatTest'))
const BrowserTest = lazy(() => import('#/components/dashboard/test/BrowserTest'))

export type TestSpec = { flow: string; name: string; how: 'chat' | 'voice' }

export default function TestCard({ test }: { test: TestSpec }) {
  const wire = useWire()
  const [setup, setSetup] = useState<TestSetup | null>(null)
  const [err, setErr] = useState('')
  const [run, setRun] = useState(0)
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let live = true
    void getTestSetup({ data: { key: test.flow } }).then((r) => {
      if (!live) return
      const s = unwire<TestSetup>(r)
      if (!s.ok) setErr(s.reason)
      else if (!s.data.testable || !s.data.flowKey) setErr(s.data.reason ?? 'This flow can’t be tested yet.')
      else if (test.how === 'chat' && !s.data.chatUrl) setErr('No chat server is configured.')
      else setSetup(s.data)
    })
    return () => { live = false }
  }, [test.flow, test.how])

  // Kept in Sessions like a test from the Test tab, with its message log.
  const onDone = useCallback(async (r: BrowserResult | ChatResult) => {
    rememberTestSession(r.sessionId)
    const s = unwire(await saveTestSession({ data: { key: test.flow, session: JSON.stringify({ ...r, wire: wire.entries }) } }))
    setSaved(s.ok ? { ok: true, text: 'Kept in Sessions.' } : { ok: false, text: `Couldn’t keep it in Sessions: ${s.reason}` })
  }, [test.flow, wire.entries])

  return (
    <div className="as-test">
      <div className="as-test-head">
        <Icon name={test.how === 'voice' ? 'voice' : 'list'} size={17} />
        <b>{test.how === 'voice' ? 'Talk to' : 'Chat with'} “{test.name}”</b>
      </div>
      {err ? <p className="as-err">{err}</p>
        : !setup ? <Loading inline label="Getting ready" />
        : (
          <Suspense fallback={<Loading inline label="Getting ready" />}>
            {test.how === 'chat'
              ? <ChatTest key={run} flowKey={setup.flowKey!} chatUrl={setup.chatUrl} log={wire.log} onLive={() => {}} onDone={onDone} />
              : <BrowserTest key={run} flowKey={setup.flowKey!} setup={setup} video={false} camera={false} log={wire.log} onLive={() => {}} onDone={onDone} />}
          </Suspense>
        )}
      {saved && (
        <div className="as-test-foot">
          <span className={saved.ok ? 'db-muted' : 'as-err'}>{saved.text}</span>
          <Link to="/dashboard/flows/$flowId" params={{ flowId: test.flow }} className="db-textlink">Open the flow</Link>
          <button type="button" className="db-btn db-btn-sm db-btn-icon" onClick={() => { setSaved(null); wire.clear(); setRun(run + 1) }}><Icon name="rotate" size={15} />Test again</button>
        </div>
      )}
    </div>
  )
}
