import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import Icon, { type IconName } from '#/components/dashboard/Icon'
import { Dialog, Mock, Notice, rowLink } from '#/components/dashboard/ui'
import { maskKey, unwire } from '#/lib/dashboard/client'
import type { Connection, FlowSummary } from '#/lib/dashboard/types'
import { TEMPLATES } from '#/lib/workflow/templates'
import { createFlow, deleteFlow, duplicateFlow, listFlows } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/')({
  validateSearch: (s: Record<string, unknown>): { new?: number } => (s.new ? { new: 1 } : {}),
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<FlowSummary[]>(await listFlows()),
  component: Flows,
})

function Flows() {
  const res = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(!!search.new)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState(TEMPLATES[0].id)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const flows = res.ok ? res.data : []

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? flows.filter((f) => `${f.name} ${f.key} ${f.connections.map((c) => c.label).join(' ')}`.toLowerCase().includes(t)) : flows
  }, [flows, q])

  const create = async () => {
    const r = unwire<string>(await createFlow({ data: { name, template } }))
    if (!r.ok) return setErr(r.reason)
    await router.invalidate()
    navigate({ to: '/dashboard/flows/$flowId/workflow', params: { flowId: r.data } })
  }

  const duplicate = async (key: string) => {
    const r = unwire<string>(await duplicateFlow({ data: { key } }))
    if (!r.ok) return setErr(r.reason)
    await router.invalidate()
  }

  const remove = async (key: string) => {
    const r = unwire(await deleteFlow({ data: { key } }))
    setConfirm(null)
    if (!r.ok) setErr(r.reason)
    else router.invalidate()
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Flows</h1>
          <p className="db-sub">Each flow is one agent — what it says, how it sounds, and where it answers.</p>
        </div>
      </header>

      {err && <Notice kind="err">{err}</Notice>}
      {!res.ok && <Notice kind="err">{res.reason}</Notice>}

      {res.ok && !flows.length ? (
        <div className="db-emptystate">
          <span className="db-emptystate-icon"><Icon name="flows" size={28} /></span>
          <b>Create your first flow</b>
          <span>A flow is one voice agent: what it says, how it sounds and where people can reach it. It takes about a minute.</span>
          <button className="db-btn db-primary db-btn-icon" onClick={() => setCreating(true)}><Icon name="plus" size={18} /> New flow</button>
          <span className="db-examples-label">Or start from an example</span>
          <div className="db-examples is-grid">
            {[...TEMPLATES.filter((t) => t.id === 'blank'), ...TEMPLATES.filter((t) => t.id !== 'blank')].map((t) => (
              <button key={t.id} className="db-example" onClick={() => { setTemplate(t.id); setName(t.name); setCreating(true) }}>
                <span className="db-example-icon"><Icon name={TEMPLATE_ICON[t.id] ?? 'flows'} size={20} /></span>
                <span><b>{t.name}</b><small>{t.blurb}</small></span>
                <Icon name="plus" size={16} />
              </button>
            ))}
          </div>
        </div>
      ) : (
      <div className="db-table-card">
        <div className="db-toolbar">
          <label className="db-search">
            <Icon name="search" size={18} />
            <input placeholder="Search flows" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button className="db-btn db-primary db-btn-icon" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> New flow
          </button>
        </div>


        <table className="db-flows">
          <thead>
            <tr><th>Name</th><th>API key</th><th className="db-num">Sessions</th><th className="db-num">Minutes</th><th>Connections</th><th aria-label="Actions" /></tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <tr key={f.key} {...rowLink(() => navigate({ to: '/dashboard/flows/$flowId', params: { flowId: f.key } }))}>
                <td>
                  <span className="db-namecell">
                    <span className="db-initial" data-live={f.source === 'live'}>{f.name.slice(0, 1).toUpperCase()}</span>
                    <span className="db-namecell-text">
                      <Link to="/dashboard/flows/$flowId" params={{ flowId: f.key }} className="db-flowlink">{f.name}</Link>
                      {f.error && <span className="db-namecell-meta"><span className="db-rowerr">{f.error}</span></span>}
                    </span>
                  </span>
                </td>
                <td><KeyCell value={f.key} /></td>
                <td className="db-num">{f.sessions.toLocaleString()}</td>
                <td className="db-num">{f.minutes.toLocaleString()}</td>
                <td><Connections list={f.connections} flowKey={f.key} /></td>
                <td className="db-actcell">
                  {confirm === f.key ? (
                    <span className="db-confirm">
                      Delete?
                      <button className="db-btn db-danger" onClick={() => remove(f.key)}>Delete</button>
                      <button className="db-btn" onClick={() => setConfirm(null)}>Keep</button>
                    </span>
                  ) : (
                    <>
                      <button className="db-iconbtn" title="Duplicate" aria-label={`Duplicate ${f.name}`} onClick={() => duplicate(f.key)}>
                        <Icon name="copy" size={18} />
                      </button>
                      <Link to="/dashboard/flows/$flowId/test" params={{ flowId: f.key }} className="db-iconbtn" title="Test" aria-label={`Test ${f.name}`}>
                        <Icon name="play" size={18} />
                      </Link>
                      <Link to="/dashboard/flows/$flowId/workflow" params={{ flowId: f.key }} className="db-iconbtn" title="Edit workflow" aria-label="Edit workflow">
                        <Icon name="edit" size={18} />
                      </Link>
                      <button className="db-iconbtn is-danger" title={f.source === 'mock' ? 'Delete' : 'Can’t be deleted from here yet'}
                        aria-label="Delete" disabled={f.source !== 'mock'} onClick={() => setConfirm(f.key)}>
                        <Icon name="trash" size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={6} className="db-tableempty">{flows.length ? 'No flows match your search.' : 'No flows yet — create one.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {creating && (
        <Dialog title="New flow" onClose={() => setCreating(false)}>
          <label className="db-field">
            <span className="db-flabel">Name</span>
            <input className="db-in db-in-lg" autoFocus placeholder="e.g. Clinic front desk" value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && create()} />
          </label>
          <span className="db-flabel db-dialog-label">Start from</span>
          <div className="db-tplgrid">
            {TEMPLATES.map((t) => (
              <button key={t.id} className={`db-tpl${template === t.id ? ' is-on' : ''}`} onClick={() => setTemplate(t.id)} aria-pressed={template === t.id}>
                <b>{t.name}</b><span>{t.blurb}</span>
              </button>
            ))}
          </div>
          <div className="db-dialog-foot">
            <Mock why="New flows are created in the mock store until accounts can sign in (POST /flow needs the account's own key)." />
            <button className="db-btn" onClick={() => setCreating(false)}>Cancel</button>
            <button className="db-btn db-primary" disabled={!name.trim()} onClick={create}>Create flow</button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function KeyCell({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  return (
    <span className="db-keycell">
      <code>{maskKey(value)}</code>
      <button className="db-iconbtn" title="Copy API key" aria-label="Copy API key"
        onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200) }}>
        <Icon name={done ? 'check' : 'copy'} size={16} />
      </button>
    </span>
  )
}

// What each starting template does, as an icon.
const TEMPLATE_ICON: Record<string, IconName> = { blank: 'edit', simple: 'voice', ack: 'bolt', hangup: 'phone', rag: 'book' }

const KIND_ICON = { number: 'phone', integration: 'plug', webhook: 'webhook', web: 'cursor' } as const
// The flow page where each kind of connection is set up.
const KIND_PAGE = { number: 'numbers', integration: 'integrations', webhook: 'webhook', web: 'integrations' } as const

function Connections({ list, flowKey }: { list: Connection[]; flowKey: string }) {
  if (!list.length) return <span className="db-muted">None</span>
  const [first, ...rest] = list
  const chip = (c: Connection, i?: number) => (
    <Link key={i} className="db-conn is-link" to={`/dashboard/flows/$flowId/${KIND_PAGE[c.kind]}` as '/dashboard/flows/$flowId'}
      params={{ flowId: flowKey }} title={`Open ${c.label}`}>
      <Icon name={KIND_ICON[c.kind]} size={14} />{c.label}
    </Link>
  )
  return (
    <span className="db-conns" data-norow>
      {chip(first)}
      {rest.length > 0 && (
        <span className="db-conn db-conn-more" tabIndex={0}>
          +{rest.length}
          <span className="db-conn-pop" role="tooltip">
            {rest.map((c, i) => chip(c, i))}
          </span>
        </span>
      )}
    </span>
  )
}
