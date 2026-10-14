// The Test tab: try the flow for real — by voice in the browser, by chat, or
// on your phone — through the Voxio SDK. Three tiles, one button each; the
// test itself runs in a large dialog that can also show, as code, everything
// sent and received. See docs/FLOW_TEST_PLAN.md.

import { Link, createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Icon, { type IconName } from '#/components/dashboard/Icon'
import type { BrowserResult } from '#/components/dashboard/test/BrowserTest'
import type { ParticipantsGraph } from 'voxioagent/client'
import { facesOn } from '#/lib/dashboard/participants'
import type { ChatResult } from '#/components/dashboard/test/ChatTest'
import PhoneTest, { type PhoneResult } from '#/components/dashboard/test/PhoneTest'
import WirePanel from '#/components/dashboard/test/WirePanel'
import TestSettings, { changedCount, type TestOverrides } from '#/components/dashboard/test/TestSettings'
import { useWire } from '#/components/dashboard/test/wire'
import { Dialog, Loading, Notice, Toggle, useFlow } from '#/components/dashboard/ui'
import { NAME_MAX, clipName, fmtDur, unwire } from '#/lib/dashboard/client'
import { KNOBS } from '#/lib/dashboard/knobs'
import { rememberTestSession } from '#/lib/dashboard/testSessions'
import type { Account, TestSetup } from '#/lib/dashboard/types'
import { getAccount, getTestSetup, saveTestSession } from '#/server/dashboard/api'

// WebRTC and the chat widget only exist in the browser: these chunks never load on the server.
const BrowserTest = lazy(() => import('#/components/dashboard/test/BrowserTest'))
const ChatTest = lazy(() => import('#/components/dashboard/test/ChatTest'))

export const Route = createFileRoute('/dashboard/flows/$flowId/test')({
  staleTime: 10_000,
  pendingMs: 800,
  loader: async ({ params }) => {
    const [setup, acct] = await Promise.all([getTestSetup({ data: { key: params.flowId } }), getAccount()])
    return { setup: unwire<TestSetup>(setup), acct: unwire<Account>(acct) }
  },
  component: TestTab,
})

const LIPSYNC = {
  s3fd: { value: 'wav2lip', label: 'Standard' },
  dwpose: { value: 'musetalk', label: 'Detailed' },
} as const

type Kind = 'browser' | 'chat' | 'phone'
type Result = (BrowserResult | PhoneResult | ChatResult) & { note?: string }

/** A provider config the voice server can use: a populated document, or an id it will look up. */
const isSet = (p: unknown) => (typeof p === 'string' ? !!p : !!(p && typeof p === 'object' && (p as { service?: unknown }).service))

type Gap = { key: 'stt' | 'tts' | 'agent'; title: string; text: string; page: 'voice' | 'workflow'; action: string }

const TITLES: Record<Kind, string> = { browser: 'Talk to', chat: 'Chat with', phone: 'Call me from' }

function TestTab() {
  const { setup: setupRes, acct } = Route.useLoaderData()
  const { flow, reload } = useFlow()
  const setup = setupRes.ok ? setupRes.data : null
  const voices = acct.ok ? acct.data.voices : []
  const avatars = acct.ok ? acct.data.avatars : []

  const hasVision = !!(flow.running_vision_id || flow.vision_id)
  // The avatar follows the flow's own setting on the Avatar tab.
  const avatar = facesOn(flow.participants as ParticipantsGraph | null | undefined)
  const [camera, setCamera] = useState(false)
  const [open, setOpen] = useState<Kind | null>(null)
  const [live, setLive] = useState(false)
  // The dialog opens small and grows once a test starts (or the code view opens), then stays big.
  const [started, setStarted] = useState(false)
  useEffect(() => { if (live) setStarted(true) }, [live])
  const [showCode] = useState(false)
  const wire = useWire()
  const wireNow = useRef(wire.entries)
  wireNow.current = wire.entries
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)

  // "Settings for this test": never saved to the flow; kept while the page is open.
  const [tsetOpen, setTsetOpen] = useState(false)
  const [over, setOver] = useState<TestOverrides>({ knobs: {} })
  const face = avatars.find((a) => a.uuid === flow.faces.expressions[0]?.uuid)
  const lipsync = LIPSYNC[face?.detector ?? 's3fd']

  const customs = useMemo(() => {
    const c: Record<string, unknown> = {}
    // Imported flows: the voice servers run their own copy (the backend's Mongo),
    // which dashboard saves don't reach. Send what's saved here with the call, so
    // the test runs the flow as it is in the dashboard.
    if (setup?.imported) {
      if (isSet(flow.stt)) c.stt_id = flow.stt
      if (isSet(flow.tts)) c.tts_id = flow.tts
      if (Object.keys(flow.workflow?.nodes ?? {}).length) {
        const { ui: _ui, ...workflow } = flow.workflow
        // The engine requires the key on the agent; empty is fine (no webhook is sent).
        c.agent_id = { workflow, 'webhook-url': flow['webhook-url'] ?? '' }
      }
      for (const k of KNOBS) if (flow[k.key] !== undefined && flow[k.key] !== null) c[k.key] = flow[k.key]
    }
    // "Settings for this test" go on top, for this test only.
    if (over.tts) c.tts_id = over.tts
    if (over.stt) c.stt_id = over.stt
    Object.assign(c, over.knobs)
    if (avatar && changedCount(over)) c['lipsync-model'] = lipsync.value
    return Object.keys(c).length ? c : undefined
  }, [setup?.imported, flow, over, avatar, lipsync.value])

  // What the flow is missing. A voice picked under "Try different settings" fills that gap.
  const gaps: Gap[] = []
  if (!isSet(flow.stt) && !customs?.stt_id) gaps.push({ key: 'stt', title: 'Listening isn’t set up', text: 'The agent can’t hear callers without a speech-to-text setup.', page: 'voice', action: 'Set up listening' })
  if (!isSet(flow.tts) && !customs?.tts_id) gaps.push({ key: 'tts', title: 'Speaking isn’t set up', text: 'The agent can’t talk without a voice.', page: 'voice', action: 'Choose a voice' })
  if (!Object.keys(flow.workflow?.nodes ?? {}).length) gaps.push({ key: 'agent', title: 'The workflow is empty', text: 'The agent has nothing to say or do yet.', page: 'workflow', action: 'Build the workflow' })
  const voiceReady = !gaps.length
  const chatReady = !gaps.some((g) => g.key === 'agent')
  // Only a missing voice can be patched from the dialog; an empty workflow can't.
  const voiceFixable = chatReady

  // The browser session is built once per set of options; they only change while idle.
  // Who sees and hears whom, from the Participants tab; the SDK's default when none are saved.
  const participants = (flow.participants as ParticipantsGraph | null | undefined) ?? undefined
  const sessionKey = `${flow.key}|${avatar}|${camera}|${JSON.stringify(customs ?? {})}|${JSON.stringify(participants ?? null)}`

  const onDone = useCallback(async (r: BrowserResult | PhoneResult | ChatResult) => {
    rememberTestSession(r.sessionId)
    setResult(r)
    // The message log goes with it, so the session can be read back like the live test.
    const saved = unwire(await saveTestSession({ data: { key: flow.key, session: JSON.stringify({ ...r, wire: wireNow.current }) } }))
    if (!saved.ok) setResult({ ...r, note: `Couldn’t keep it in Sessions: ${saved.reason}` })
    await reload()
  }, [flow.key, reload])

  const openTest = (k: Kind) => {
    wire.clear()
    setResult(null)
    setStarted(false)
    setOpen(k)
  }
  const close = useCallback(() => { setOpen(null); setLive(false) }, [])

  const turns = result ? result.transcript.filter((t) => t.role === 'user').length : 0
  const copyTranscript = () => {
    if (!result) return
    const text = result.transcript.map((t) => `${t.role === 'user' ? 'You' : 'Agent'}: ${t.content}`).join('\n')
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  if (!setup) {
    return (
      <div className="db-page">
        <header className="db-pagehead"><div><h1 className="db-h1">Test</h1></div></header>
        <Notice kind="err">{setupRes.ok ? 'Couldn’t load.' : setupRes.reason}</Notice>
      </div>
    )
  }

  const off = (why: string | false) => (why ? why : null)
  const tiles: { kind: Kind; icon: IconName; title: string; text: string; button: string; blocked: string | null }[] = [
    {
      kind: 'browser', icon: 'voice', title: 'Talk in the browser', text: 'Speak to it with your microphone, like a web call.', button: 'Start talking',
      blocked: off(!setup.testable ? 'Not on the voice servers yet' : !voiceFixable ? 'Build the workflow first' : false),
    },
    {
      kind: 'chat', icon: 'list', title: 'Chat with it', text: 'Type to it, like a chat window on your site.', button: 'Start chatting',
      blocked: off(!setup.testable ? 'Not on the voice servers yet' : !setup.chatUrl ? 'No chat server is configured' : !chatReady ? 'Build the workflow first' : false),
    },
    {
      kind: 'phone', icon: 'phone', title: 'Call my phone', text: 'It rings you from this flow’s number.', button: 'Call me',
      blocked: off(!setup.testable ? 'Not on the voice servers yet' : !setup.phone ? 'Coming soon' : !flow.numbers.length ? 'Attach a number first' : !voiceFixable ? 'Build the workflow first' : false),
    },
  ]
  // One filled button: the first test that can run.
  const lead = tiles.find((t) => !t.blocked)?.kind

  const gapList = (compact = false) => (
    <ul className={`db-testgaps-list${compact ? ' is-compact' : ''}`}>
      {gaps.map((g) => (
        <li key={g.key}>
          <Icon name={g.key === 'agent' ? 'flows' : 'voice'} size={18} />
          <span><b>{g.title}</b><span className="db-muted">{g.text}</span></span>
          <Link to={`/dashboard/flows/$flowId/${g.page}` as '/dashboard/flows/$flowId'} params={{ flowId: flow.key }} className="db-btn db-btn-icon">
            {g.action}<Icon name="back" size={15} className="db-flip" />
          </Link>
        </li>
      ))}
    </ul>
  )

  const settingsButton = (
    <button type="button" className={`db-btn db-btn-icon db-tset-open${changedCount(over) ? ' is-on' : ''}`} onClick={() => setTsetOpen(!tsetOpen)} aria-expanded={tsetOpen}>
      <Icon name="sliders" size={18} />Settings for this test{changedCount(over) > 0 && <span className="db-tset-n">{changedCount(over)} changed</span>}
    </button>
  )
  const resultCard = result && !live && (
    <section className="db-testresult">
      <Icon name="check" size={18} />
      <span><b>{fmtDur(result.seconds)}</b> · {turns} turn{turns === 1 ? '' : 's'}</span>
      {result.note && <span className="db-muted">{result.note}</span>}
      <span className="db-testresult-actions db-btngroup" role="group">
        <Link to="/dashboard/flows/$flowId" params={{ flowId: flow.key }} search={{ session: result.sessionId }} className="db-gbtn">
          <Icon name="list" size={18} />View in sessions
        </Link>
        {result.transcript.length > 0 && (
          <button className="db-gbtn" onClick={copyTranscript}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy transcript'}</button>
        )}
      </span>
    </section>
  )

  // Voice needs listening and speaking; the dialog can patch those for one test.
  const voiceBlocked = open !== 'chat' && !voiceReady

  return (
    <div className="db-page db-test">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1 db-flowname" title={flow.flow_name.length > NAME_MAX ? flow.flow_name : undefined}>Test “{clipName(flow.flow_name)}”</h1>
        </div>
      </header>

      {!setup.testable && <Notice>{setup.reason}</Notice>}

      {setup.testable && gaps.length > 0 && (
        <section className="db-setcard db-testgaps">
          <h2 className="db-h2">Finish setting it up first</h2>
          <p className="db-muted">
            {chatReady ? 'Voice tests need these. You can still test it by chat.' : 'This flow can’t be tested until these are done.'}
            {gaps.some((g) => g.key === 'stt' || g.key === 'tts') && ' For one test, you can also pick a saved voice under “Try different settings” in the test.'}
          </p>
          {gapList()}
        </section>
      )}

      {/* The three ways to test, as one connected group: each stays its own card. */}
      <div className="db-testtiles" role="group" aria-label="Ways to test">
        {tiles.map((t) => (
          <div key={t.kind} className={`db-testtile${t.blocked ? ' is-off' : ''}`}>
            <span className="db-testtile-icon"><Icon name={t.icon} size={26} /></span>
            <h2 className="db-h2">{t.title}</h2>
            <p className="db-muted">{t.text}</p>
            {/* The button grows into the test's dialog and shrinks back on close
                (Dialog's layoutId). While the dialog is open, a hidden copy keeps the tile's size. */}
            {open === t.kind ? (
              <span className="db-btn db-btn-lg db-morph-ghost" aria-hidden="true"><Icon name={t.icon} size={18} />{t.button}</span>
            ) : (
              <motion.span layoutId={`test-${t.kind}`} className="db-morph-from" style={{ borderRadius: 12 }}>
                <button className={`db-btn db-btn-icon db-btn-lg${t.kind === lead ? ' db-primary' : ''}`} disabled={!!t.blocked} onClick={() => openTest(t.kind)}>
                  <Icon name={t.icon} size={18} />{t.button}
                </button>
              </motion.span>
            )}
            {t.blocked && <span className="db-testtile-why">{t.blocked}</span>}
          </div>
        ))}
      </div>

      {result && !open && resultCard}

      <AnimatePresence>
      {open && setup.flowKey && (
        <Dialog key={open} layoutId={`test-${open}`} big={started || showCode || tsetOpen} title={`${TITLES[open]} “${clipName(flow.flow_name)}”`} onClose={close}
          sub={open === 'chat' ? 'Type to your agent. Uses the flow’s own settings.' : open === 'phone' ? 'It rings the number you enter, from this flow’s number.' : undefined}
>
          <div className={`db-testdlg${showCode || (tsetOpen && open !== 'chat') ? ' has-code' : ''}${started || showCode || tsetOpen ? '' : ' is-small'}`}>
            <div className="db-testdlg-main">
              {open === 'browser' && hasVision && (
                <div className="db-testopts">
                  {hasVision && (
                    <label className="db-testopt">
                      <Toggle on={camera} onChange={(v) => !live && setCamera(v)} />
                      <span>Let it see my camera</span>
                    </label>
                  )}
                </div>
              )}

              {open !== 'chat' && <div className="db-tset-bar">{settingsButton}</div>}
              {voiceBlocked && !live && gapList(true)}

              <Suspense fallback={<Loading inline label="Getting ready" />}>
                {open === 'browser' && (voiceBlocked && !live ? (
                  <div className="db-test-go"><button className="db-btn db-primary db-btn-icon db-btn-lg" disabled><Icon name="voice" size={18} />Start talking</button></div>
                ) : (
                  <BrowserTest key={sessionKey} flowKey={setup.flowKey} setup={setup} video={avatar} camera={camera} customs={customs} participants={participants} log={wire.log} onLive={setLive} onDone={onDone} />
                ))}
                {open === 'chat' && <ChatTest flowKey={setup.flowKey} chatUrl={setup.chatUrl} log={wire.log} onLive={setLive} onDone={onDone} />}
                {open === 'phone' && <PhoneTest flow={flow} setup={setup} customs={customs} blocked={voiceBlocked} log={wire.log} onLive={setLive} onDone={onDone} />}
              </Suspense>

              {resultCard}
            </div>
            {showCode && <WirePanel entries={wire.entries} onClear={wire.clear} />}
            {tsetOpen && open !== 'chat' && !showCode && (
              <TestSettings flow={flow} voices={voices} value={over} onChange={setOver} locked={live} onClose={() => setTsetOpen(false)} />
            )}
          </div>
        </Dialog>
      )}
      </AnimatePresence>
    </div>
  )
}

