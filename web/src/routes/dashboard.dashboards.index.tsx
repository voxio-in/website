// Dashboards (VADs): the user's list, and a quick way to start one on a flow.
// The richer way is to ask Ask Voxio, which checks the workflow first.

import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import Icon from '#/components/dashboard/Icon'
import { Dropdown } from '#/components/dashboard/controls'
import { Notice } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import type { FlowSummary } from '#/lib/dashboard/types'
import { listFlows } from '#/server/dashboard/api'
import '#/styles/vad.css'

import { DASHBOARDS_ON } from '#/lib/features'

export const Route = createFileRoute('/dashboard/dashboards/')({
  loader: async () => unwire<FlowSummary[]>(await listFlows()),
  beforeLoad: () => { if (!DASHBOARDS_ON) throw redirect({ to: '/dashboard' }) },
  component: Dashboards,
})

type Item = { id: string; title: string; flows: string[]; widgets: number; updatedAt: string }

function Dashboards() {
  const flowsRes = Route.useLoaderData()
  const flows = flowsRes.ok ? flowsRes.data : []
  const navigate = useNavigate()
  const [list, setList] = useState<Item[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [flow, setFlow] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/vad').then((r) => r.json()).then((r) => (r.ok ? setList(r.data) : setErr(r.reason))).catch(() => setErr('Couldn’t load dashboards.'))
  }, [])

  const create = async () => {
    if (!flow) return
    setBusy(true)
    const r = await fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ create: { flow, title: '' } }) }).then((x) => x.json()).catch(() => null)
    setBusy(false)
    if (r?.ok) void navigate({ to: '/dashboard/dashboards/$dashId', params: { dashId: r.data.id } })
    else setErr(r?.reason ?? 'Couldn’t create it.')
  }
  const nameOf = (k: string) => flows.find((f) => f.key.startsWith(k.replace(/…$/, '')))?.name ?? k

  return (
    <div className="db-page">
      <header className="db-pagehead"><div><h1 className="db-h1">Dashboards</h1></div></header>
      {err && <Notice kind="err">{err}</Notice>}

      <section className="db-setcard vad-new">
        <div>
          <b>New dashboard</b>
          <span className="db-muted">Starts with the essentials for one flow; add and arrange widgets after. Or ask Ask Voxio to build one for a goal.</span>
        </div>
        <div className="vad-new-row">
          <div className="vad-new-flow">
            <Dropdown value={flow} placeholder="Choose a flow" aria-label="Flow" options={flows.map((f) => ({ value: f.key, label: f.name }))} onChange={setFlow} />
          </div>
          <button type="button" className="db-btn db-primary" disabled={!flow || busy} onClick={() => void create()}>{busy ? 'Creating…' : 'Create'}</button>
        </div>
      </section>

      {list === null ? <p className="db-muted">Loading…</p> : !list.length ? (
        <p className="db-muted">No dashboards yet.</p>
      ) : (
        <div className="vad-list">
          {list.map((d) => (
            <Link key={d.id} to="/dashboard/dashboards/$dashId" params={{ dashId: d.id }} className="vad-card">
              <span className="vad-card-icon"><Icon name="chart" size={20} /></span>
              <span className="vad-card-text">
                <b>{d.title}</b>
                <small>{d.flows.map(nameOf).join(', ')} · {d.widgets} widget{d.widgets === 1 ? '' : 's'} · updated {new Date(d.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
