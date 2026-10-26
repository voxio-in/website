import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { UsageChart } from '#/components/dashboard/Charts'
import Icon from '#/components/dashboard/Icon'
import KeyChip from '#/components/dashboard/KeyChip'
import SessionsTable from '#/components/dashboard/SessionsTable'
import { Kpi, Notice, byRange, inRange, totals, useFlow, type Range } from '#/components/dashboard/ui'
import { NAME_MAX, clipName, fmtDur, showsData, unwire } from '#/lib/dashboard/client'
import { LIVE_DAYS, ago, connectionsOf, countSessions, nextStepOf, statusOf, type FlowStatusId, type StatusInput } from '#/lib/dashboard/flowStatus'
import { isTestSession, testSessionIds } from '#/lib/dashboard/testSessions'
import type { Session } from '#/lib/dashboard/types'
import { duplicateFlow, rotateFlowKey } from '#/server/dashboard/api'
import { ExportDialog } from '#/components/workflow/Transfer'
import { DownloadIcon } from 'lucide-react'


export const Route = createFileRoute('/dashboard/flows/$flowId/')({
  // ?session=<id> opens the sessions list on that session (from the Test tab).
  validateSearch: (s: Record<string, unknown>): { session?: string } => (typeof s.session === 'string' ? { session: s.session } : {}),
  component: FlowOverview,
})

/**
 * One flow, answering "is it working, and what do I do now?" (mindsets/voxio-users.md,
 * Flow overview): status and the one next step first, then what it is built from, then
 * real sessions, with their chart above them.
 */
function FlowOverview() {
  const { flow, save } = useFlow()
  const { session: highlight } = Route.useSearch()
  const navigate = useNavigate()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Read after mount: tests run from this browser are remembered here too.
  const [localTests, setLocalTests] = useState<Set<string>>(() => new Set())
  useEffect(() => setLocalTests(testSessionIds()), [flow.sessions])
  const isTest = (s: Session) => isTestSession(s, localTests)
  const real = useMemo(() => flow.sessions.filter((s) => !isTestSession(s, localTests)), [flow.sessions, localTests])
  const connections = connectionsOf(flow)
  const input: StatusInput = { ...countSessions(flow.sessions, isTest), connections }
  const lastReal = real.reduce<Session | undefined>((m, s) => (!m || s.startTime > m.startTime ? s : m), undefined)

  const [copying, setCopying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const duplicate = async () => {
    setCopying(true)
    const r = unwire<string>(await duplicateFlow({ data: { key: flow.key } }))
    setCopying(false)
    if (!r.ok) return setMsg({ kind: 'err', text: r.reason })
    navigate({ to: '/dashboard/flows/$flowId', params: { flowId: r.data } })
  }

  const rotate = async () => {
    const r = unwire<string>(await rotateFlowKey({ data: { key: flow.key } }))
    if (!r.ok) return setMsg({ kind: 'err', text: r.reason })
    setMsg({ kind: 'ok', text: 'New key issued. The old one no longer works.' })
    navigate({ to: '/dashboard/flows/$flowId', params: { flowId: r.data } })
  }

  const created = flow.created_at
    ? new Date(flow.created_at as string).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const st = statusOf(input)
  const nodes = Object.keys(flow.workflow.nodes).length

  return (
    <div className="db-page db-overview">
      <header className="db-flowtitle">
        <div className="db-flowtitle-main">
          <EditableName value={flow.flow_name} onSave={async (flow_name) => { await save({ flow_name }) }} />
          <p className="db-ov-meta">
            <span className={`db-state db-state-${st.id}`} title={st.why}>{st.label}</span>
            {flow.owner && <span>{flow.owner}’s flow</span>}
            {created && <span>Created {created}</span>}
          </p>
          <KeyChip value={flow.key} onRotate={rotate} />
        </div>
        <span className="db-btngroup db-ov-tools" role="group" aria-label="Flow actions">
          {/* Filled and always here, as before: testers come to this page to test. */}
          <Link to="/dashboard/flows/$flowId/test" params={{ flowId: flow.key }} className="db-gbtn is-lead"><Icon name="play" size={18} />Test</Link>
          <button className="db-gbtn" onClick={duplicate} disabled={copying} aria-busy={copying}><Icon name="copy" size={18} />{copying ? 'Copying…' : 'Duplicate'}</button>
          <button className="db-gbtn" onClick={() => setExporting(true)}><DownloadIcon size={18} />Export</button>
        </span>
      </header>

      {exporting && <ExportDialog workflow={flow.workflow} title={flow.flow_name} onClose={() => setExporting(false)} />}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <NextStepCard flowKey={flow.key} input={input} lastReal={lastReal} recent={real.filter((s) => Date.now() - Date.parse(s.startTime) < LIVE_DAYS * 86_400_000).length} />

      {/* What the agent is built from and where it is reachable: one quiet row each, its action at the end. */}
      <nav className="db-needsyou db-ov-build" aria-label="Build">
        <Link to="/dashboard/flows/$flowId/workflow" params={{ flowId: flow.key }} className="db-needsyou-row">
          <span className="db-ov-rowtext"><Icon name="flows" size={20} /><span><b>Workflow</b> · {nodes ? `${nodes} step${nodes === 1 ? '' : 's'}` : 'No steps yet'}</span></span>
          <span className="db-needsyou-step">{nodes ? 'Edit workflow' : 'Add the first step'}<Icon name="back" size={16} /></span>
        </Link>
        <Link to="/dashboard/flows/$flowId/numbers" params={{ flowId: flow.key }} className="db-needsyou-row">
          <span className="db-ov-rowtext"><Icon name="plug" size={20} />
            <span><b>Connected to</b> · {connections.length ? connections.map((c) => c.label).join(', ') : 'Nothing yet'}</span>
          </span>
          <span className="db-needsyou-step">Numbers & calls<Icon name="back" size={16} /></span>
        </Link>
      </nav>

      <Activity sessions={real} tests={flow.sessions.filter(isTest)} />

      <SessionsTable sessions={flow.sessions} flowKey={flow.key} showData={showsData(flow)} highlight={highlight}
        empty={input.tests ? 'No sessions yet.' : 'No sessions yet. Try it in Test, and the session shows here.'} />
    </div>
  )
}

const HEADLINE: Record<FlowStatusId, string> = {
  new: 'Not tried yet',
  tested: 'Tested, not live yet',
  quiet: `Quiet: no real sessions in ${LIVE_DAYS} days`,
  live: 'Live',
}

/** The page's one filled action, with the reason for it in the same card (the D, as on Echobotics' Next step). */
function NextStepCard({ flowKey, input, lastReal, recent }: { flowKey: string; input: StatusInput; lastReal?: Session; recent: number }) {
  const st = statusOf(input)
  const step = nextStepOf(input)
  const why = st.id === 'live'
    ? `${recent} real session${recent === 1 ? '' : 's'} in the last ${LIVE_DAYS} days, the last ${lastReal ? ago(lastReal.startTime) : 'recently'}. Test a change before it reaches callers.`
    : st.id === 'new' ? 'Talk to it in Test before anyone else does.' : st.why
  const body = (
    <>
      <span className="db-wfcard-text"><b>{HEADLINE[st.id]}</b><span>{why}</span></span>
      <span className="db-dbtn"><Icon name={step.icon} size={20} />{step.label}</span>
    </>
  )
  // "Last session" opens it here, in the sessions list below.
  if (step.to === '') {
    return (
      <Link to="/dashboard/flows/$flowId" params={{ flowId: flowKey }} search={lastReal ? { session: lastReal.sessionId } : {}} className="db-softcard db-wfcard is-d db-ov-next">
        {body}
      </Link>
    )
  }
  return (
    <Link to={`/dashboard/flows/$flowId/${step.to}` as '/dashboard/flows/$flowId/test'} params={{ flowId: flowKey }} className="db-softcard db-wfcard is-d db-ov-next">
      {body}
    </Link>
  )
}

/**
 * Usage over a range. Real sessions once there is one; before that the tests are the
 * only history, so they are charted, and the title says so (as the sessions table does).
 */
function Activity({ sessions, tests }: { sessions: Session[]; tests: Session[] }) {
  const [range, setRange] = useState<Range>({ preset: 30 })
  const charted = sessions.length ? sessions : tests
  const shown = useMemo(() => charted.filter((s) => inRange(range, s.startTime)), [charted, range])
  const buckets = useMemo(() => byRange(charted, range), [charted, range])
  const t = totals(shown)
  const testsIn = tests.filter((s) => inRange(range, s.startTime)).length
  if (!charted.length) return null
  return (
    <section className="db-ov-activity" aria-label="Activity">
      <UsageChart data={buckets} range={range} onRange={setRange} title={sessions.length ? 'Real sessions' : 'Tests so far'}
        earliest={charted.reduce<string | undefined>((m, s) => (!m || s.startTime < m ? s.startTime : m), undefined)} />
      {/* The same range as the chart, so both show one number. */}
      <div className="db-kpis">
        <Kpi icon="list" label={sessions.length ? 'Real sessions' : 'Tests'} value={t.sessions.toLocaleString()} />
        <Kpi icon="chart" label="Minutes" value={t.minutes.toLocaleString()} />
        <Kpi icon="voice" label="Avg. length" value={t.sessions ? fmtDur(t.avg) : '—'} />
        {sessions.length > 0 && <Kpi icon="play" label="Tests" value={testsIn.toLocaleString()} />}
      </div>
    </section>
  )
}

function EditableName({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)
  const [busy, setBusy] = useState(false)
  const commit = async () => {
    const v = text.trim()
    if (!v || v === value) return setEditing(false)
    setBusy(true)
    try { await onSave(v) } finally { setBusy(false); setEditing(false) }
  }
  if (!editing) {
    return (
      <div className="db-nameline">
        <h1 className="db-h1 db-flowname" title={value.length > NAME_MAX ? value : undefined}>{clipName(value)}</h1>
        <button className="db-iconbtn" onClick={() => { setText(value); setEditing(true) }} title="Rename" aria-label="Rename flow">
          <Icon name="edit" size={22} />
        </button>
      </div>
    )
  }
  return (
    <div className="db-nameline">
      <input className="db-in db-nameinput" autoFocus value={text} disabled={busy} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} />
      <button className="db-iconbtn" onClick={commit} title="Save" aria-label="Save name"><Icon name="check" size={18} /></button>
      <button className="db-iconbtn" onClick={() => setEditing(false)} title="Cancel" aria-label="Cancel"><Icon name="close" size={18} /></button>
    </div>
  )
}
