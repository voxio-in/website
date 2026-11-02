import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { DropZone, Dropdown, Label } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { Dialog, Notice, Toggle } from '#/components/dashboard/ui'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { Account, KbDocument, KbSettings, KnowledgeBase } from '#/lib/dashboard/types'
import { getAccount } from '#/server/dashboard/api'
import { documentLink, knowledgeOp } from '#/server/dashboard/knowledge'

export const Route = createFileRoute('/dashboard/knowledge')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: Knowledge,
})

// The embedding models the backend can build vectors with (models/embeddings EMBEDDING_MODELS).
const MODELS = [
  { value: 'all-minilm-l6-v2', label: 'MiniLM', hint: 'default' },
  { value: 'bge', label: 'BGE' },
  { value: 'gemma', label: 'Gemma' },
  { value: 'bart', label: 'BART' },
  { value: 'openai', label: 'OpenAI' },
]
const modelLabel = (m?: string) => MODELS.find((x) => x.value === (m || 'all-minilm-l6-v2'))?.label ?? m ?? 'MiniLM'

// The backend's chunking defaults and limits (KnowledgeBaseSettings).
const CHUNK = { def: 500, min: 200, max: 2000 }
const OVERLAP_DEF = 100
/** Why these settings can't be saved, or '' when they can. Overlap is at most half the chunk size. */
const settingsError = (s: KbSettings) => {
  const size = s.chunk_size ?? CHUNK.def
  if (s.chunk_size != null && (s.chunk_size < CHUNK.min || s.chunk_size > CHUNK.max)) return `Chunk size must be ${CHUNK.min} to ${CHUNK.max} characters.`
  if (s.overlap != null && (s.overlap < 0 || s.overlap > size / 2)) return `Overlap must be 0 to ${Math.floor(size / 2)} (half the chunk size).`
  return ''
}
const sum = (docs: KbDocument[], k: 'pages' | 'chunks') => docs.reduce((n, d) => n + d[k], 0)
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

type Dlg = { kind: 'create' } | { kind: 'add' | 'rename' | 'delete' | 'settings'; kb: KnowledgeBase } | { kind: 'deleteDoc'; doc: KbDocument }

function Knowledge() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const kbs = res.ok ? res.data.knowledge : []
  const [dlg, setDlg] = useState<Dlg | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const replaceFor = useRef<KbDocument | null>(null)
  const replacePick = useRef<HTMLInputElement>(null)

  // While any document is processing, read the rows again every 3 s; stop once none are.
  const processing = kbs.some((kb) => kb.documents.some((d) => d.status === 'processing'))
  useEffect(() => {
    if (!processing) return
    const t = setInterval(() => router.invalidate(), 3000)
    return () => clearInterval(t)
  }, [processing, router])

  const run = async (op: object) => {
    const r = unwire(await knowledgeOp({ data: { op: JSON.stringify(op) } }))
    if (!r.ok) { setMsg({ kind: 'err', text: r.reason }); await router.invalidate(); return false }
    setMsg(null)
    await router.invalidate()
    return true
  }
  const close = () => setDlg(null)

  const open = async (doc: KbDocument) => {
    // A fresh signed link each time (valid for an hour); never kept.
    const r = unwire<string>(await documentLink({ data: { doc: doc.id } }))
    if (r.ok) window.open(r.data, '_blank', 'noopener')
    else setMsg({ kind: 'err', text: r.reason })
  }
  const replace = async (file: File) => {
    const doc = replaceFor.current
    replaceFor.current = null
    if (!doc) return
    const form = new FormData()
    form.set('doc', doc.id)
    form.set('file', file)
    const r = await fetch('/api/knowledge', { method: 'PUT', body: form }).then((x) => x.json()).catch((e) => ({ ok: false, reason: String(e) }))
    setMsg(r.ok ? null : { kind: 'err', text: `${file.name}: ${r.reason}` })
    await router.invalidate()
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Knowledge</h1>
          <p className="db-sub">PDFs your agent can look things up in. Search one with a “Look up knowledge” step in a workflow; saving the workflow connects it to the flow.</p>
        </div>
        {kbs.length > 0 && <button className="db-btn db-primary db-btn-icon" onClick={() => setDlg({ kind: 'create' })}><Icon name="plus" size={17} />New knowledge base</button>}
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {!kbs.length && (
        <div className="db-emptystate">
          <span className="db-emptystate-icon"><Icon name="book" size={28} /></span>
          <b>No knowledge yet</b>
          <span>Create a knowledge base, then add your FAQs, brochures or price lists as PDFs.</span>
          <button className="db-btn db-primary" onClick={() => setDlg({ kind: 'create' })}>New knowledge base</button>
        </div>
      )}

      <input ref={replacePick} type="file" accept=".pdf,application/pdf" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void replace(f) }} />

      <div className="db-kblist">
        {kbs.map((kb) => (
          <section key={kb.id} className="db-kb">
            <div className="db-kb-head">
              <span className="db-kb-icon"><Icon name="book" size={22} /></span>
              <div className="db-kb-title">
                <b>{kb.name}</b>
                <span>{kb.documents.length ? `${plural(kb.documents.length, 'document')} · ${plural(sum(kb.documents, 'pages'), 'page')} · ${plural(sum(kb.documents, 'chunks'), 'passage')}` : 'Empty'}</span>
              </div>
              <span className="db-kb-model" title="The embedding model is fixed when the knowledge base is made.">
                <Icon name="lock" size={14} />{modelLabel(kb.model)}
              </span>
              <button className="db-btn db-btn-icon" onClick={() => setDlg({ kind: 'add', kb })}><Icon name="plus" size={16} />Add PDFs</button>
              <button className="db-iconbtn" title="Settings" aria-label={`Settings for ${kb.name}`} onClick={() => setDlg({ kind: 'settings', kb })}><Icon name="sliders" size={17} /></button>
              <button className="db-iconbtn" title="Rename" aria-label={`Rename ${kb.name}`} onClick={() => setDlg({ kind: 'rename', kb })}><Icon name="edit" size={17} /></button>
              <button className="db-iconbtn is-danger" title="Delete knowledge base" aria-label={`Delete ${kb.name}`} onClick={() => setDlg({ kind: 'delete', kb })}><Icon name="trash" size={17} /></button>
            </div>
            {kb.documents.length ? (
              <div className="db-sources">
                {kb.documents.map((d) => (
                  <div key={d.id} className="db-source">
                    <span className="db-source-icon"><Icon name="book" size={17} /></span>
                    <span className="db-source-text">
                      <b>{d.filename}</b>
                      <span>
                        {d.status === 'processing' ? 'Reading…' : `${plural(d.pages, 'page')} · ${plural(d.chunks, 'passage')}`} · added <span suppressHydrationWarning>{fmtDate(d.created_at)}</span>
                        {d.images_skipped > 0 && <span className="db-doc-note"> · {plural(d.images_skipped, 'image')} not indexed yet</span>}
                      </span>
                    </span>
                    <DocStatus doc={d} />
                    <span className="db-doc-acts">
                      <button className="db-iconbtn" title="Open" aria-label={`Open ${d.filename}`} onClick={() => open(d)}><Icon name="eye" size={17} /></button>
                      <button className="db-iconbtn" title={d.status === 'processing' ? 'Wait until it is read' : 'Replace with a new version'} aria-label={`Replace ${d.filename}`}
                        disabled={d.status === 'processing'} onClick={() => { replaceFor.current = d; replacePick.current?.click() }}><Icon name="copy" size={17} /></button>
                      {d.status === 'failed' && (
                        <button className="db-iconbtn" title="Try again" aria-label={`Retry ${d.filename}`} onClick={() => run({ op: 'retryDocument', doc: d.id })}><Icon name="rotate" size={17} /></button>
                      )}
                      <button className="db-iconbtn is-danger" title="Delete" aria-label={`Delete ${d.filename}`} onClick={() => setDlg({ kind: 'deleteDoc', doc: d })}><Icon name="trash" size={17} /></button>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <button className="db-kb-empty" onClick={() => setDlg({ kind: 'add', kb })}>
                <Icon name="plus" size={18} /> Add a PDF
              </button>
            )}
          </section>
        ))}
      </div>

      {dlg?.kind === 'create' && <CreateDialog onClose={close}
        onSave={async (name, model, settings) => { if (await run({ op: 'create', name, model, settings })) close() }} />}
      {dlg?.kind === 'rename' && <NameDialog title={`Rename ${dlg.kb.name}`} initial={dlg.kb.name} onClose={close}
        onSave={async (name) => { if (await run({ op: 'rename', id: dlg.kb.id, name })) close() }} />}
      {dlg?.kind === 'settings' && <SettingsDialog kb={dlg.kb} onClose={close}
        onSave={async (settings) => { if (await run({ op: 'settings', id: dlg.kb.id, settings })) close() }} />}
      {dlg?.kind === 'delete' && (
        <Confirm title={`Delete ${dlg.kb.name}?`} text="Its documents and passages are removed, and every flow that uses it loses it. This can’t be undone." onClose={close}
          onConfirm={async () => { if (await run({ op: 'delete', id: dlg.kb.id })) { close(); setMsg({ kind: 'ok', text: `Deleted “${dlg.kb.name}”.` }) } }} />
      )}
      {dlg?.kind === 'deleteDoc' && (
        <Confirm title={`Delete ${dlg.doc.filename}?`} text="Its passages are removed from the knowledge base, along with the original file." onClose={close}
          onConfirm={async () => { if (await run({ op: 'deleteDocument', doc: dlg.doc.id })) close() }} />
      )}
      {dlg?.kind === 'add' && <AddFiles kb={dlg.kb} onClose={close}
        onDone={async (errors) => { close(); setMsg(errors.length ? { kind: 'err', text: errors.join(' ') } : null); await router.invalidate() }} />}
    </div>
  )
}

function DocStatus({ doc }: { doc: KbDocument }) {
  if (doc.status === 'processing') return <span className="db-pill is-indexing db-pill-busy"><span className="db-spin" aria-hidden />Processing</span>
  if (doc.status === 'failed') return <span className="db-pill is-failed" title={doc.error || 'It could not be read.'}>Failed</span>
  return <span className="db-pill is-ready">Ready</span>
}

function Confirm({ title, text, onClose, onConfirm }: { title: string; text: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="db-muted">{text}</p>
      <div className="db-dialog-foot is-combo">
        <button className="db-btn" onClick={onClose}>Cancel</button>
        <button className="db-btn db-danger" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false) }}>{busy ? 'Deleting…' : 'Delete'}</button>
      </div>
    </Dialog>
  )
}

function NameDialog({ title, initial = '', onClose, onSave }: { title: string; initial?: string; onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  const save = async () => { if (!name.trim() || busy) return; setBusy(true); await onSave(name.trim()); setBusy(false) }
  return (
    <Dialog title={title} onClose={onClose}>
      <label className="db-field">
        <Label info="Only you see this. Pick something that says what’s inside.">Name</Label>
        <input className="db-in db-in-lg" autoFocus placeholder="e.g. Product FAQ" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      <div className="db-dialog-foot is-combo">
        <button className="db-btn" onClick={onClose}>Cancel</button>
        <button className="db-btn db-primary" disabled={!name.trim() || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Dialog>
  )
}

/** Chunk size and overlap as one joined pair. Empty fields fall back to `base`. */
function ChunkFields({ value, base, onChange }: { value: KbSettings; base: KbSettings; onChange: (s: KbSettings) => void }) {
  const num = (v: string) => (v.trim() === '' ? undefined : Math.round(Number(v)))
  return (
    <div className="db-fgroup db-chunkpair">
      <label className="db-fcell">
        <Label info={`Characters of page text in each passage, ${CHUNK.min} to ${CHUNK.max}. Smaller passages are more precise; larger ones carry more context.`}>Chunk size</Label>
        <input className="db-in" type="number" min={CHUNK.min} max={CHUNK.max} placeholder={String(base.chunk_size ?? CHUNK.def)}
          value={value.chunk_size ?? ''} onChange={(e) => onChange({ ...value, chunk_size: num(e.target.value) })} />
      </label>
      <label className="db-fcell">
        <Label info="Characters each passage shares with the one before it, so a sentence cut at the edge still reads whole. At most half the chunk size.">Overlap</Label>
        <input className="db-in" type="number" min={0} placeholder={String(base.overlap ?? OVERLAP_DEF)}
          value={value.overlap ?? ''} onChange={(e) => onChange({ ...value, overlap: num(e.target.value) })} />
      </label>
    </div>
  )
}
/** Only the fields that were filled in. */
const filled = (s: KbSettings): KbSettings => Object.fromEntries(Object.entries(s).filter(([, v]) => v != null && !Number.isNaN(v)))

function CreateDialog({ onClose, onSave }: { onClose: () => void; onSave: (name: string, model: string, settings: KbSettings) => Promise<void> }) {
  const [name, setName] = useState('')
  const [model, setModel] = useState(MODELS[0].value)
  const [chunks, setChunks] = useState<KbSettings>({})
  const [busy, setBusy] = useState(false)
  const err = settingsError(filled(chunks))
  const save = async () => { if (!name.trim() || busy || err) return; setBusy(true); await onSave(name.trim(), model, filled(chunks)); setBusy(false) }
  return (
    <Dialog title="New knowledge base" onClose={onClose}>
      <label className="db-field">
        <Label info="Only you see this. Pick something that says what’s inside.">Name</Label>
        <input className="db-in db-in-lg" autoFocus placeholder="e.g. Product FAQ" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      <div className="db-field">
        <Label info="Turns each passage into numbers for searching. Every document in this knowledge base uses the same one.">Embedding model</Label>
        <Dropdown value={model} options={MODELS} onChange={setModel} aria-label="Embedding model" />
        <span className="db-hint"><Icon name="lock" size={13} /> Can’t be changed later.</span>
      </div>
      <div className="db-field">
        <Label>Passages <span className="db-muted">(optional)</span></Label>
        <ChunkFields value={chunks} base={{}} onChange={setChunks} />
        {err && <span className="db-hint is-err">{err}</span>}
      </div>
      <div className="db-dialog-foot is-combo">
        <button className="db-btn" onClick={onClose}>Cancel</button>
        <button className="db-btn db-primary" disabled={!name.trim() || busy || !!err} onClick={save}>{busy ? 'Creating…' : 'Create'}</button>
      </div>
    </Dialog>
  )
}

function SettingsDialog({ kb, onClose, onSave }: { kb: KnowledgeBase; onClose: () => void; onSave: (s: KbSettings) => Promise<void> }) {
  const [chunks, setChunks] = useState<KbSettings>({ chunk_size: kb.settings.chunk_size, overlap: kb.settings.overlap })
  const [busy, setBusy] = useState(false)
  const err = settingsError(filled(chunks))
  return (
    <Dialog title={`${kb.name} settings`} onClose={onClose}>
      <div className="db-field">
        <Label>Passages</Label>
        <ChunkFields value={chunks} base={{}} onChange={setChunks} />
        {err ? <span className="db-hint is-err">{err}</span> : <span className="db-hint">Applies to documents added or replaced from now on. Documents already here keep the settings they were read with.</span>}
      </div>
      <div className="db-knobs">
        <div className="db-knob-row">
          <Label info="Describes the pictures in a PDF so they can be searched too.">Read images <span className="db-soon">Coming soon</span></Label>
          <div className="db-knob-ctl"><Toggle on={false} disabled onChange={() => {}} /></div>
        </div>
      </div>
      <div className="db-dialog-foot is-combo">
        <button className="db-btn" onClick={onClose}>Cancel</button>
        <button className="db-btn db-primary" disabled={busy || !!err} onClick={async () => { setBusy(true); await onSave(filled(chunks)); setBusy(false) }}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Dialog>
  )
}

const MAX_BYTES = 50 * 1024 * 1024

function AddFiles({ kb, onClose, onDone }: { kb: KnowledgeBase; onClose: () => void; onDone: (errors: string[]) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [advanced, setAdvanced] = useState(false)
  const [chunks, setChunks] = useState<KbSettings>({})
  const [meta, setMeta] = useState<{ k: string; v: string }[]>([])
  const [busy, setBusy] = useState(false)
  const err = settingsError(filled({ ...kb.settings, ...filled(chunks) }))

  const pick = (list: File[]) => setFiles((cur) => [...cur, ...list.filter((x) => /\.pdf$/i.test(x.name) && x.size <= MAX_BYTES && !cur.some((c) => c.name === x.name))])
  const tooBig = (list: File[]) => list.filter((x) => x.size > MAX_BYTES).map((x) => x.name)
  const [skipped, setSkipped] = useState<string[]>([])

  // Each upload returns at once with the document processing; the rows show the rest.
  const add = async () => {
    setBusy(true)
    const settings = filled(chunks)
    const metadata = Object.fromEntries(meta.filter((m) => m.k.trim()).map((m) => [m.k.trim(), m.v]))
    const errors: string[] = []
    for (const f of files) {
      const form = new FormData()
      form.set('kb', kb.id)
      form.set('file', f)
      if (Object.keys(settings).length) form.set('settings', JSON.stringify(settings))
      if (Object.keys(metadata).length) form.set('metadata', JSON.stringify(metadata))
      const r = await fetch('/api/knowledge', { method: 'POST', body: form }).then((x) => x.json()).catch((e) => ({ ok: false, reason: String(e) }))
      if (!r.ok) errors.push(`${f.name}: ${r.reason}`)
    }
    setBusy(false)
    onDone(errors)
  }

  return (
    <Dialog title={`Add to ${kb.name}`} onClose={() => !busy && onClose()}>
      <DropZone accept=".pdf,application/pdf" multiple title="Drop PDFs here" hint="PDF · up to 50 MB each"
        onFiles={(f) => { setSkipped(tooBig(f)); pick(f) }} />
      {skipped.length > 0 && <span className="db-hint is-err">Over 50 MB, left out: {skipped.join(', ')}</span>}
      {files.length > 0 && (
        <div className="db-sources db-pickedfiles">
          {files.map((f) => (
            <div key={f.name} className="db-source">
              <span className="db-source-icon"><Icon name="book" size={17} /></span>
              <span className="db-source-text"><b>{f.name}</b><span>{(f.size / 1024 / 1024).toFixed(1)} MB</span></span>
              {!busy && <button className="db-iconbtn" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x !== f))}><Icon name="close" size={16} /></button>}
            </div>
          ))}
        </div>
      )}

      <div className={`db-more${advanced ? ' is-open' : ''}`}>
        <button type="button" className="db-more-btn db-more-row" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
          Advanced
        </button>
        {advanced && (
          <div className="db-adv">
            <div className="db-field">
              <Label info="For these documents only. Empty uses the knowledge base’s settings.">Passages</Label>
              <ChunkFields value={chunks} base={kb.settings} onChange={setChunks} />
              {err && <span className="db-hint is-err">{err}</span>}
            </div>
            <div className="db-field">
              <Label info="Your own labels, stored with every passage from these documents, e.g. branch = Rambagh. A Look up knowledge step can filter on them.">Metadata</Label>
              {meta.map((m, i) => (
                <div key={i} className="db-fgroup db-metarow">
                  <label className="db-fcell"><input className="db-in" placeholder="key" value={m.k} onChange={(e) => setMeta(meta.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} /></label>
                  <label className="db-fcell"><input className="db-in" placeholder="value" value={m.v} onChange={(e) => setMeta(meta.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} /></label>
                  <span className="db-fcell is-narrow"><button type="button" className="db-iconbtn" aria-label="Remove" onClick={() => setMeta(meta.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button></span>
                </div>
              ))}
              <button type="button" className="db-btn db-btn-sm db-btn-icon db-addmeta" onClick={() => setMeta([...meta, { k: '', v: '' }])}><Icon name="plus" size={15} />Add a label</button>
            </div>
          </div>
        )}
      </div>

      <div className="db-dialog-foot is-combo">
        <button className="db-btn" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="db-btn db-primary" disabled={!files.length || busy || !!err} onClick={add}>{busy ? 'Uploading…' : 'Add'}</button>
      </div>
    </Dialog>
  )
}
