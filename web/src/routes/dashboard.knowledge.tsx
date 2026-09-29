import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { DropZone, Label } from '#/components/dashboard/controls'
import Icon, { type IconName } from '#/components/dashboard/Icon'
import { AiGlow, Dialog, Notice, Toggle } from '#/components/dashboard/ui'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { Account, KnowledgeBase } from '#/lib/dashboard/types'
import { accountOp, getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/knowledge')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: Knowledge,
})

const KIND: Record<string, { icon: IconName; label: string }> = {
  pdf: { icon: 'book', label: 'PDF' },
  csv: { icon: 'list', label: 'Spreadsheet' },
  docx: { icon: 'book', label: 'Document' },
  txt: { icon: 'book', label: 'Text file' },
  text: { icon: 'edit', label: 'Note' },
  web: { icon: 'cursor', label: 'Website' },
  shopify: { icon: 'plug', label: 'Shopify' },
}
const kindOf = (k: string) => KIND[k] ?? { icon: 'book' as IconName, label: k }
const extKind = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['pdf', 'csv', 'docx', 'txt'].includes(ext) ? ext : ext === 'xlsx' ? 'csv' : 'txt'
}

function Knowledge() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const kbs = res.ok ? res.data.knowledge : []
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState<KnowledgeBase | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const run = async (op: object) => {
    const r = unwire(await accountOp({ data: { op: JSON.stringify(op) } }))
    if (!r.ok) { setMsg({ kind: 'err', text: r.reason }); return false }
    await router.invalidate()
    return true
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Knowledge</h1>
          <p className="db-sub">What your agent can look things up in — documents, websites and notes. Turn a knowledge base on for a flow from its Knowledge tab.</p>
        </div>
        <button className="db-btn db-primary db-btn-icon" onClick={() => setCreating(true)}><Icon name="plus" size={17} />New knowledge base</button>
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {!kbs.length && (
        <div className="db-emptystate">
          <span className="db-emptystate-icon"><Icon name="book" size={28} /></span>
          <b>No knowledge yet</b>
          <span>Create a knowledge base, then add your FAQs, price lists or website.</span>
          <button className="db-btn db-primary" onClick={() => setCreating(true)}>New knowledge base</button>
        </div>
      )}

      <div className="db-kblist">
        {kbs.map((kb) => (
          <section key={kb.id} className="db-kb">
            <div className="db-kb-head">
              <span className="db-kb-icon"><Icon name="book" size={22} /></span>
              <div className="db-kb-title">
                <b>{kb.name}</b>
                <span>{kb.sources.length ? `${kb.sources.length} source${kb.sources.length > 1 ? 's' : ''}` : 'Empty'}</span>
              </div>
              <button className="db-btn db-btn-icon" onClick={() => setAdding(kb)}><Icon name="plus" size={16} />Add content</button>
              <button className="db-iconbtn is-danger" title="Delete knowledge base" aria-label={`Delete ${kb.name}`} onClick={() => run({ op: 'kb.delete', id: kb.id })}><Icon name="trash" size={17} /></button>
            </div>
            {kb.sources.length ? (
              <div className="db-sources">
                {kb.sources.map((s, i) => {
                  const k = kindOf(s.kind)
                  return (
                    <div key={i} className="db-source">
                      <span className="db-source-icon"><Icon name={k.icon} size={17} /></span>
                      <span className="db-source-text"><b>{s.label}</b><span>{k.label} · added {fmtDate(s.added_at)}</span></span>
                      <span className={`db-pill is-${s.status}`}>{s.status === 'ready' ? 'Ready' : s.status === 'indexing' ? 'Reading…' : 'Failed'}</span>
                      <button className="db-iconbtn" title="Remove" aria-label={`Remove ${s.label}`} onClick={() => run({ op: 'kb.removeSource', id: kb.id, index: i })}><Icon name="close" size={16} /></button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <button className="db-kb-empty" onClick={() => setAdding(kb)}>
                <Icon name="plus" size={18} /> Add files, a website or text
              </button>
            )}
          </section>
        ))}
      </div>

      {creating && (
        <Dialog title="New knowledge base" onClose={() => setCreating(false)}>
          <label className="db-field">
            <Label info="Only you see this. Pick something that says what’s inside.">Name</Label>
            <input className="db-in db-in-lg" autoFocus placeholder="e.g. Product FAQ" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && run({ op: 'kb.create', name: name.trim() }).then((ok) => { if (ok) { setCreating(false); setName('') } })} />
          </label>
          <div className="db-dialog-foot">
            <button className="db-btn" onClick={() => setCreating(false)}>Cancel</button>
            <button className="db-btn db-primary" disabled={!name.trim()}
              onClick={async () => { if (await run({ op: 'kb.create', name: name.trim() })) { setCreating(false); setName('') } }}>Create</button>
          </div>
        </Dialog>
      )}

      {adding && <AddContent kb={adding} onClose={() => setAdding(null)} run={run} onDone={(n) => { setAdding(null); setMsg({ kind: 'ok', text: `Added ${n} to “${adding.name}”.` }) }} />}
    </div>
  )
}

function AddContent({ kb, onClose, run, onDone }: { kb: KnowledgeBase; onClose: () => void; run: (op: object) => Promise<boolean>; onDone: (what: string) => void }) {
  const [tab, setTab] = useState<'files' | 'web' | 'text'>('files')
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [whole, setWhole] = useState(true)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const ready = tab === 'files' ? files.length > 0 : tab === 'web' ? /^https?:\/\/\S+\.\S+/.test(url.trim()) : !!text.trim()

  const add = async () => {
    setBusy(true)
    let ok = true
    if (tab === 'files') for (const f of files) ok = (await run({ op: 'kb.addSource', id: kb.id, kind: extKind(f.name), label: f.name })) && ok
    if (tab === 'web') ok = await run({ op: 'kb.addSource', id: kb.id, kind: url.includes('myshopify.com') ? 'shopify' : 'web', label: whole ? `${url.trim()} (whole site)` : url.trim() })
    if (tab === 'text') ok = await run({ op: 'kb.addSource', id: kb.id, kind: 'text', label: title.trim() || `${text.trim().slice(0, 40)}…` })
    setBusy(false)
    if (ok) onDone(tab === 'files' ? `${files.length} file${files.length > 1 ? 's' : ''}` : tab === 'web' ? 'the website' : 'your note')
  }

  return (
    <Dialog title={`Add to ${kb.name}`} onClose={onClose}>
      <div className="db-pills db-addtabs" role="tablist">
        <button role="tab" className={tab === 'files' ? 'is-on' : ''} onClick={() => setTab('files')}><Icon name="book" size={15} />Files</button>
        <button role="tab" className={tab === 'web' ? 'is-on' : ''} onClick={() => setTab('web')}><Icon name="cursor" size={15} />Website</button>
        <button role="tab" className={tab === 'text' ? 'is-on' : ''} onClick={() => setTab('text')}><Icon name="edit" size={15} />Text</button>
      </div>

      {tab === 'files' && (
        <>
          <DropZone accept=".pdf,.csv,.xlsx,.docx,.txt" multiple title="Drop files here" hint="PDF, Word, CSV, Excel or text · up to 20 MB each"
            onFiles={(f) => setFiles((cur) => [...cur, ...f.filter((x) => !cur.some((c) => c.name === x.name))])} />
          {files.length > 0 && (
            <div className="db-sources db-pickedfiles">
              {files.map((f) => (
                <div key={f.name} className="db-source">
                  <span className="db-source-icon"><Icon name={kindOf(extKind(f.name)).icon} size={17} /></span>
                  <span className="db-source-text"><b>{f.name}</b><span>{(f.size / 1024 / 1024).toFixed(1)} MB</span></span>
                  <button className="db-iconbtn" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x !== f))}><Icon name="close" size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'web' && (
        <div className="db-knobs">
          <div className="db-knob-row is-block">
            <Label info="A page on your site, or your Shopify store address.">Web address</Label>
            <div className="db-knob-ctl">
              <label className="db-urlfield"><Icon name="cursor" size={18} /><input autoFocus placeholder="https://your-site.com/help" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
            </div>
          </div>
          <div className="db-knob-row">
            <Label info="Follows the links on your site and reads every page, not just this one.">Include the whole site</Label>
            <div className="db-knob-ctl"><Toggle on={whole} onChange={setWhole} /></div>
          </div>
        </div>
      )}

      {tab === 'text' && (
        <>
          <label className="db-field">
            <Label>Title</Label>
            <input className="db-in" placeholder="e.g. Opening hours" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="db-field">
            <Label info="Write it the way you’d explain it to a new colleague.">Text</Label>
            <AiGlow><textarea className="db-in" rows={7} placeholder="We’re open 9am to 7pm, Monday to Saturday…" value={text} onChange={(e) => setText(e.target.value)} /></AiGlow>
          </label>
        </>
      )}

      <div className="db-dialog-foot">
        <button className="db-btn" onClick={onClose}>Cancel</button>
        <button className="db-btn db-primary" disabled={!ready || busy} onClick={add}>{busy ? 'Adding…' : 'Add'}</button>
      </div>
    </Dialog>
  )
}
