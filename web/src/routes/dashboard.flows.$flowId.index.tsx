import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { UsageChart } from '#/components/dashboard/Charts'
import Icon from '#/components/dashboard/Icon'
import KeyChip from '#/components/dashboard/KeyChip'
import SessionsTable from '#/components/dashboard/SessionsTable'
import { Kpi, Notice, byRange, totals, useFlow, type Range } from '#/components/dashboard/ui'
import { NAME_MAX, channelOf, clipName, fmtDur, unwire } from '#/lib/dashboard/client'
import { duplicateFlow, rotateFlowKey } from '#/server/dashboard/api'
import { ExportDialog } from '#/components/workflow/Transfer'
import { DownloadIcon } from 'lucide-react'


export const Route = createFileRoute('/dashboard/flows/$flowId/')({
  // ?session=<id> opens the sessions list on that session (from the Test tab).
  validateSearch: (s: Record<string, unknown>): { session?: string } => (typeof s.session === 'string' ? { session: s.session } : {}),
  component: FlowOverview,
})

function FlowOverview() {
  const { flow, save } = useFlow()
  const { session: highlight } = Route.useSearch()
  const navigate = useNavigate()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [range, setRange] = useState<Range>({ preset: 30 })
  const t = totals(flow.sessions)
  const buckets = useMemo(() => byRange(flow.sessions, range), [flow.sessions, range])
  const nodes = Object.keys(flow.workflow.nodes).length

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

  return (
    <div className="db-page">
      <header className="db-flowtitle">
        <div className="db-flowtitle-main">
          <EditableName value={flow.flow_name} onSave={async (flow_name) => { await save({ flow_name }) }} />
          <KeyChip value={flow.key} onRotate={rotate} />
        </div>
        <div className="db-flowtitle-side">
          <span className="db-btngroup" role="group" aria-label="Flow actions">
            <Link to="/dashboard/flows/$flowId/test" params={{ flowId: flow.key }} className="db-gbtn is-lead"><Icon name="play" size={16} />Test</Link>
            <button className="db-gbtn" onClick={duplicate} disabled={copying}><Icon name="copy" size={16} />{copying ? 'Copying…' : 'Duplicate'}</button>
            <button className="db-gbtn" onClick={() => setExporting(true)}><DownloadIcon size={16} />Export</button>
          </span>
          {created && <span className="db-createdchip"><Icon name="calendar" size={15} />Created {created}</span>}
        </div>
      </header>

      {exporting && <ExportDialog workflow={flow.workflow} title={flow.flow_name} onClose={() => setExporting(false)} />}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="db-kpis">
        <Kpi icon="list" label="Sessions" value={t.sessions.toLocaleString()} />
        <Kpi icon="chart" label="Minutes" value={t.minutes.toLocaleString()} />
        <Kpi icon="voice" label="Avg. length" value={fmtDur(t.avg)} />
        <ChannelKpi sessions={flow.sessions} />
      </div>

      {/* The workflow card with its action as a D on the right edge, as Echobotics' Next step. */}
      <Link to="/dashboard/flows/$flowId/workflow" params={{ flowId: flow.key }} className="db-softcard db-wfcard is-d">
        <span className="db-wfcard-icon"><Icon name="flows" size={24} /></span>
        <span className="db-wfcard-text">
          <b>Workflow</b>
          <span>{nodes} step{nodes === 1 ? '' : 's'} · what your agent says and does on each turn</span>
        </span>
        <span className="db-dbtn"><Icon name="edit" size={20} />Edit workflow</span>
      </Link>

      <UsageChart data={buckets} range={range} onRange={setRange} earliest={flow.sessions.reduce<string | undefined>((m, s) => (!m || s.startTime < m ? s.startTime : m), undefined)} />

      <SessionsTable sessions={flow.sessions} flowKey={flow.key} highlight={highlight} empty="No sessions yet. Place a call from Numbers & calls." />
    </div>
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

const CHANNELS = [
  { key: 'phone', label: 'Phone', color: '#5ee6c8' },
  { key: 'browser', label: 'Web', color: '#7aa9ff' },
  { key: 'avatar', label: 'Video', color: '#c79bff' },
  { key: 'chat', label: 'Chat', color: '#ffc670' },
] as const

/** Where people talk to this flow: one stacked bar plus a legend. */
function ChannelKpi({ sessions }: { sessions: { type: string }[] }) {
  const total = sessions.length || 1
  const parts = CHANNELS.map((c) => ({ ...c, n: sessions.filter((s) => channelOf(s.type) === c.key).length }))
  return (
    <div className="db-kpi db-kpi-channels">
      <span className="db-kpi-label">Where people talk to it</span>
      <div className="db-chbar" role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(', ')}>
        {parts.filter((p) => p.n).map((p) => <span key={p.key} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="db-chlegend">
        {parts.map((p) => (
          <span key={p.key}><i style={{ background: p.color }} />{p.label} <b>{Math.round((p.n / total) * 100)}%</b></span>
        ))}
      </div>
    </div>
  )
}
