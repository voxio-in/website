import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import Icon, { type IconName } from '#/components/dashboard/Icon'
import { Pager, TableCard, TableFilter, usePaged } from '#/components/dashboard/TableCard'
import { Dialog, Notice, rowLink } from '#/components/dashboard/ui'
import { undoToast } from '#/components/ui/halo-toast'
import { NAME_MAX, clipName, maskKey, unwire } from '#/lib/dashboard/client'
import type { Connection, FlowSummary } from '#/lib/dashboard/types'
import { TEMPLATES } from '#/lib/workflow/templates'
import { createFlow, deleteFlow, duplicateFlow, getFlow, listFlows } from '#/server/dashboard/api'
import { ExportDialog, ImportDialog, MultiImportDialog, type ImportItem } from '#/components/workflow/Transfer'
import type { Workflow } from '#/lib/workflow/convert'
import type { FlowDoc } from '#/lib/dashboard/types'
import { DownloadIcon, UploadIcon, XIcon } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'

// Bouncy: the selection group overshoots a little as it pushes New flow along.
const SPRING = { type: 'spring', stiffness: 520, damping: 24, mass: 0.9 } as const
import { DeleteFlowDialog } from '#/components/dashboard/kit/DeleteFlowDialog'

export const Route = createFileRoute('/dashboard/flows/')({
  validateSearch: (s: Record<string, unknown>): { new?: number } => (s.new ? { new: 1 } : {}),
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<FlowSummary[]>(await listFlows()),
  component: Flows,
})

/** The New flow dialog's "template" for an imported workflow. */
const IMPORT = '__import'

const LINKS = [
  { value: 'all', label: 'All connections' },
  { value: 'number', label: 'Phone number' },
  { value: 'web', label: 'Website' },
  { value: 'integration', label: 'Integration' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'none', label: 'Not connected' },
]
const ACTIVITY = [
  { value: 'all', label: 'All activity' },
  { value: 'used', label: 'Has sessions' },
  { value: 'unused', label: 'No sessions yet' },
]
const SORTS = [
  { value: 'new', label: 'Newest first' },
  { value: 'old', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'sessions', label: 'Most sessions' },
  { value: 'minutes', label: 'Most minutes' },
]
const SORT_BY: Record<string, (a: FlowSummary, b: FlowSummary) => number> = {
  new: (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  old: (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  name: (a, b) => a.name.localeCompare(b.name),
  sessions: (a, b) => b.sessions - a.sessions,
  minutes: (a, b) => b.minutes - a.minutes,
}

function Flows() {
  const res = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [link, setLink] = useState('all')
  const [activity, setActivity] = useState('all')
  const [sort, setSort] = useState('new')
  const [creating, setCreating] = useState(!!search.new)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState(TEMPLATES[0].id)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Import: a workflow from pasted/uploaded JSON, used instead of a template.
  const [imported, setImported] = useState<Workflow | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState<{ name: string; workflow?: Workflow; data?: unknown } | null>(null)
  // Ticked rows, for exporting or deleting several flows at once.
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [bulkDel, setBulkDel] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  // Flows deleted with Undo still pending: hidden at once, removed when the toast closes.
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const flows = (res.ok ? res.data : []).filter((f) => !hidden.has(f.key))

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return flows
      .filter((f) => !t || `${f.name} ${f.key} ${f.connections.map((c) => c.label).join(' ')}`.toLowerCase().includes(t))
      .filter((f) => link === 'all' || (link === 'none' ? !f.connections.length : f.connections.some((c) => c.kind === link)))
      .filter((f) => activity === 'all' || (activity === 'used') === f.sessions > 0)
      .sort(SORT_BY[sort])
  }, [flows, q, link, activity, sort])
  const paged = usePaged(shown, 10)

  // Creating takes a few seconds on the backend; a second press would make a second flow.
  const create = async () => {
    if (busy || !name.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const r = unwire<string>(await createFlow({ data: { name, template, workflow: template === IMPORT && imported ? JSON.stringify(imported) : undefined } }))
      if (!r.ok) return setErr(r.reason)
      await router.invalidate()
      navigate({ to: '/dashboard/flows/$flowId/workflow', params: { flowId: r.data } })
    } finally {
      setBusy(false)
    }
  }

  const exportFlow = async (key: string, name: string) => {
    const r = unwire<FlowDoc>(await getFlow({ data: { key } }))
    if (!r.ok) return setErr(r.reason)
    setExporting({ name, workflow: r.data.workflow })
  }
  const startImport = () => { setBulk(true) }
  // Import several workflows at once (Import button): each becomes a flow, voice included.
  const [bulk, setBulk] = useState(false)
  const importOne = async (it: ImportItem) => {
    const r = unwire<string>(await createFlow({ data: { name: it.name, template: TEMPLATES[0].id, workflow: JSON.stringify(it.workflow), tts: it.tts } }))
    return r.ok ? null : r.reason
  }

  const duplicate = async (key: string) => {
    const r = unwire<string>(await duplicateFlow({ data: { key } }))
    if (!r.ok) return setErr(r.reason)
    await router.invalidate()
  }

  const remove = async (key: string) => {
    const r = unwire(await deleteFlow({ data: { key } }))
    if (!r.ok) setErr(r.reason)
    else await router.invalidate()
    setConfirm(null)
  }
  const toggle = (key: string) => setPicked((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const pickedFlows = flows.filter((f) => picked.has(f.key))
  const deletable = pickedFlows.filter((f) => f.source === 'mock')
  const pageKeys = paged.shown.map((f) => f.key)
  const allOnPage = pageKeys.length > 0 && pageKeys.every((k) => picked.has(k))
  const togglePage = () => setPicked((p) => { const n = new Set(p); pageKeys.forEach((k) => (allOnPage ? n.delete(k) : n.add(k))); return n })

  // One file with every ticked flow (name, voice, workflow); Import reads it back as several flows.
  const exportPicked = async () => {
    setErr(null)
    const out: { title: string; tts: FlowDoc['tts']; workflow: Workflow }[] = []
    for (const [i, f] of pickedFlows.entries()) {
      setWorking(`Reading ${i + 1} of ${pickedFlows.length}…`)
      const r = unwire<FlowDoc>(await getFlow({ data: { key: f.key } }))
      if (!r.ok) { setWorking(null); return setErr(`${f.name}: ${r.reason}`) }
      out.push({ title: f.name, tts: r.data.tts, workflow: r.data.workflow })
    }
    setWorking(null)
    setExporting({ name: `flows-${out.length}`, data: out })
  }
  const deletePicked = async () => {
    setBulkDel(false)
    setErr(null)
    const failed: string[] = []
    for (const [i, f] of deletable.entries()) {
      setWorking(`Deleting ${i + 1} of ${deletable.length}…`)
      const r = unwire(await deleteFlow({ data: { key: f.key } }))
      if (!r.ok) failed.push(`${f.name}: ${r.reason}`)
    }
    setWorking(null)
    setPicked(new Set())
    if (failed.length) setErr(`${failed.length} couldn’t be deleted. ${failed.join(' · ')}`)
    await router.invalidate()
  }
  // A flow with a connection or past sessions may be called from outside: that one gets a dialog.
  // An unused flow goes at once, with Undo.
  const inUse = (f: (typeof flows)[number]) => f.connections.length > 0 || f.sessions > 0
  const deleteWithUndo = (list: typeof flows) => {
    const keys = list.map((f) => f.key)
    setErr(null)
    setPicked(new Set())
    setHidden((h) => new Set([...h, ...keys]))
    const unhide = () => setHidden((h) => { const n = new Set(h); keys.forEach((k) => n.delete(k)); return n })
    undoToast(list.length === 1 ? `Deleted “${list[0].name}”` : `Deleted ${list.length} flows`, {
      undo: unhide,
      commit: async () => {
        const failed: string[] = []
        for (const f of list) {
          const r = unwire(await deleteFlow({ data: { key: f.key } }))
          if (!r.ok) failed.push(`${f.name}: ${r.reason}`)
        }
        if (failed.length) setErr(`${failed.length} couldn’t be deleted. ${failed.join(' · ')}`)
        await router.invalidate()
        unhide()
      },
    })
  }
  const askDelete = (f: (typeof flows)[number]) => (inUse(f) ? setConfirm(f.key) : deleteWithUndo([f]))
  const askDeletePicked = () => (deletable.some(inUse) ? setBulkDel(true) : deleteWithUndo(deletable))
  const confirming = flows.find((f) => f.key === confirm)

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Flows</h1>
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
          <button className="db-btn db-btn-icon" onClick={startImport}><UploadIcon size={18} /> Import JSON</button>
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
      <TableCard
        title="All flows"
        search={{ value: q, onChange: setQ, placeholder: 'Search flows', count: `${shown.length.toLocaleString()} of ${flows.length.toLocaleString()}` }}
        filters={<>
          <TableFilter label="Filter by connection" value={link} options={LINKS} onChange={setLink} />
          <TableFilter label="Filter by activity" value={activity} options={ACTIVITY} onChange={setActivity} />
          <TableFilter label="Sort" sort value={sort} options={SORTS} onChange={setSort} />
        </>}
        actions={
          <LayoutGroup>
            {/* Ticking rows springs a second group in beside New flow, pushing it along; it springs out on Clear. */}
            <AnimatePresence initial={false}>
              {picked.size > 0 && (
                <motion.span key="picked" className="db-selwrap" layout
                  initial={{ width: 0, opacity: 0, scale: 0.7 }} animate={{ width: 'auto', opacity: 1, scale: 1 }} exit={{ width: 0, opacity: 0, scale: 0.7 }}
                  transition={SPRING}>
                  <span className="db-btngroup db-selgroup" role="group" aria-label="Selected flows">
                    <span className="db-gbtn db-selcount" aria-live="polite">{working ?? `${picked.size} selected`}</span>
                    <button type="button" className="db-gbtn" disabled={!!working} onClick={exportPicked}><DownloadIcon size={18} />Export</button>
                    <button type="button" className="db-gbtn is-danger" disabled={!!working || !deletable.length} onClick={askDeletePicked}
                      title={deletable.length < picked.size ? `${picked.size - deletable.length} can’t be deleted from here yet` : undefined}>
                      <Icon name="trash" size={18} />Delete{deletable.length < picked.size ? ` ${deletable.length}` : ''}
                    </button>
                    <button type="button" className="db-gbtn" disabled={!!working} onClick={() => setPicked(new Set())}><XIcon size={18} />Clear</button>
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
            <motion.span layout transition={SPRING} className="db-btngroup" role="group" aria-label="Add flows">
              <button type="button" className="db-gbtn" onClick={startImport}><UploadIcon size={18} />Import</button>
              <button type="button" className="db-gbtn is-lead" onClick={() => setCreating(true)}><Icon name="plus" size={18} />New flow</button>
            </motion.span>
          </LayoutGroup>
        }
        footer={<Pager {...paged} />}
      >


        <table className="db-flows">
          <thead>
            <tr><th className="db-pickcell"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all flows on this page" /></th><th>Name</th><th>API key</th><th className="db-num">Sessions</th><th className="db-num">Minutes</th><th>Connections</th><th aria-label="Actions" /></tr>
          </thead>
          <tbody>
            {paged.shown.map((f) => (
              <tr key={f.key} {...rowLink(() => navigate({ to: '/dashboard/flows/$flowId', params: { flowId: f.key } }))}>
                <td className="db-pickcell" data-norow onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={picked.has(f.key)} onChange={() => toggle(f.key)} aria-label={`Select ${f.name}`} />
                </td>
                <td>
                  <span className="db-namecell">
                    <span className="db-initial" data-live={f.source === 'live'}>{f.name.slice(0, 1).toUpperCase()}</span>
                    <span className="db-namecell-text">
                      <Link to="/dashboard/flows/$flowId" params={{ flowId: f.key }} className="db-flowlink" title={f.name.length > NAME_MAX ? f.name : undefined}>{clipName(f.name)}</Link>
                      {f.error && <span className="db-namecell-meta"><span className="db-rowerr">{f.error}</span></span>}
                    </span>
                  </span>
                </td>
                <td><KeyCell value={f.key} /></td>
                <td className="db-num">{f.sessions.toLocaleString()}</td>
                <td className="db-num">{f.minutes.toLocaleString()}</td>
                <td><Connections list={f.connections} flowKey={f.key} /></td>
                <td className="db-actcell">
                  {/* One connected icon group; the hovered button widens to show its label. */}
                  <span className="db-btngroup is-icons" role="group" aria-label={`${f.name} actions`}>
                    <Link to="/dashboard/flows/$flowId/test" params={{ flowId: f.key }} className="db-gbtn" aria-label={`Test ${f.name}`}>
                      <Icon name="play" size={18} /><span className="db-gbtn-label">Test</span>
                    </Link>
                    <Link to="/dashboard/flows/$flowId/workflow" params={{ flowId: f.key }} className="db-gbtn" aria-label={`Edit ${f.name}'s workflow`}>
                      <Icon name="edit" size={18} /><span className="db-gbtn-label">Edit</span>
                    </Link>
                    <button type="button" className="db-gbtn" aria-label={`Duplicate ${f.name}`} onClick={() => duplicate(f.key)}>
                      <Icon name="copy" size={18} /><span className="db-gbtn-label">Duplicate</span>
                    </button>
                    <button type="button" className="db-gbtn" aria-label={`Export ${f.name}`} onClick={() => exportFlow(f.key, f.name)}>
                      <DownloadIcon size={18} /><span className="db-gbtn-label">Export</span>
                    </button>
                    <button type="button" className="db-gbtn is-danger" title={f.source === 'mock' ? undefined : 'Can’t be deleted from here yet'}
                      aria-label={`Delete ${f.name}`} disabled={f.source !== 'mock'} onClick={() => askDelete(f)}>
                      <Icon name="trash" size={18} /><span className="db-gbtn-label">Delete</span>
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={7} className="db-tableempty">{flows.length ? 'No flows match. Try another search or filter.' : 'No flows yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </TableCard>
      )}

      {bulk && <MultiImportDialog onCreate={importOne} onClose={() => setBulk(false)} onDone={() => router.invalidate()} />}
      {importing && (
        <ImportDialog sub="Start a new flow from a workflow you exported." done="" onClose={() => setImporting(false)}
          onImport={(wf) => { setImported(wf); setTemplate(IMPORT); if (!name.trim()) setName('Imported flow'); setCreating(true) }} />
      )}
      {exporting && <ExportDialog workflow={exporting.workflow} data={exporting.data} title={exporting.name} onClose={() => setExporting(null)} />}

      <DeleteFlowDialog name={confirming?.name ?? ''} open={!!confirming} onOpenChange={(o) => !o && setConfirm(null)}
        onDelete={() => remove(confirm!)} />

      {bulkDel && (
        <Dialog title={`Delete ${deletable.length} flow${deletable.length === 1 ? '' : 's'}?`} sub="Their API keys stop working right away. This can’t be undone." onClose={() => setBulkDel(false)}>
          <ul className="db-bulklist">{deletable.map((f) => <li key={f.key}>{f.name}</li>)}</ul>
          <div className="db-dialog-foot">
            <button className="db-btn" onClick={() => setBulkDel(false)}>Cancel</button>
            <button className="db-btn db-danger" onClick={deletePicked}>Delete</button>
          </div>
        </Dialog>
      )}

      {creating && (
        <Dialog title="New flow" onClose={() => setCreating(false)}>
          <label className="db-field">
            <span className="db-flabel">Name</span>
            <input className="db-in db-in-lg" autoFocus placeholder="e.g. Clinic front desk" value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          </label>
          <span className="db-flabel db-dialog-label">Start from</span>
          <div className="db-tplgrid">
            {TEMPLATES.map((t) => (
              <button key={t.id} className={`db-tpl${template === t.id ? ' is-on' : ''}`} onClick={() => setTemplate(t.id)} aria-pressed={template === t.id}>
                <b>{t.name}</b><span>{t.blurb}</span>
              </button>
            ))}
            <button className={`db-tpl${template === IMPORT ? ' is-on' : ''}`} aria-pressed={template === IMPORT}
              onClick={() => (imported && template !== IMPORT ? setTemplate(IMPORT) : setImporting(true))}>
              <b><UploadIcon size={14} /> Import JSON</b>
              <span>{imported ? `${Object.keys(imported.nodes ?? {}).length} steps imported · click again to replace` : 'Paste or upload a workflow you exported.'}</span>
            </button>
          </div>
          <div className="db-dialog-foot">
            <button className="db-btn" disabled={busy} onClick={() => setCreating(false)}>Cancel</button>
            <button className="db-btn db-primary" disabled={!name.trim() || busy || (template === IMPORT && !imported)} onClick={create}>{busy ? 'Creating…' : 'Create flow'}</button>
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
