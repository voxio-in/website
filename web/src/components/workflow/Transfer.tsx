// Export and import a workflow as JSON. Export: copy it or download a .json file.
// Import: paste JSON or upload a file; it replaces the canvas (Undo brings it back).

import { useRef, useState } from 'react'
import { DownloadIcon, UploadIcon } from 'lucide-react'
import { extractWorkflow, type Workflow } from '#/lib/workflow/convert'
import { Dialog } from '#/components/dashboard/ui'
import { SegmentTabs } from '#/components/dashboard/kit/SegmentTabs'
import { toast } from '#/components/ui/halo-toast'
import Icon from '#/components/dashboard/Icon'
import './workflow.css'

const fileName = (title: string) => `${title.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'workflow'}.json`

/** Export one workflow, or (with `data`) anything else, e.g. several flows as a list multi-import reads back. */
export function ExportDialog({ workflow, data, title, onClose }: { workflow?: Workflow; data?: unknown; title: string; onClose: () => void }) {
  const text = JSON.stringify(data ?? workflow, null, 2)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName(title) })
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Workflow downloaded', fileName(title))
  }
  return (
    <Dialog title="Export workflow" sub="Copy the JSON, or download it as a file." onClose={onClose} wide>
      <div className="wf-xfer">
        <div className="wf-xfer-acts">
          <button className="db-btn db-btn-icon" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={15} />{copied ? 'Copied' : 'Copy JSON'}</button>
          <button className="db-btn db-primary db-btn-icon" onClick={download}><DownloadIcon size={15} />Download .json</button>
        </div>
        <textarea className="db-in wf-xfer-area" readOnly spellCheck={false} value={text} onFocus={(e) => e.currentTarget.select()} />
      </div>
    </Dialog>
  )
}

/** One flow to create from an import file: its name, workflow and, if the file has one, its voice. */
export type ImportItem = { name: string; workflow: Workflow; tts?: { service: string; [k: string]: string } }

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** A voice block from a file ({service, model, voice | voice_id}) as a flow's TTS config. */
function ttsOf(t: unknown): ImportItem['tts'] {
  if (!t || typeof t !== 'object') return undefined
  const o = t as Record<string, unknown>
  const service = str(o.service)
  if (!service) return undefined
  const out: Record<string, string> = { service }
  const model = str(o.model)
  const voice = str(o.voice) ?? str(o.voice_id)
  if (model) out.model = model
  if (voice) out.voice = voice
  return out as ImportItem['tts']
}

/**
 * Every workflow in a JSON document: a single workflow, a list of them, or a list under
 * `scenarios` / `flows` / `workflows`. Entries without a workflow are skipped.
 */
export function extractMany(doc: unknown, fallback = 'Imported flow'): ImportItem[] {
  const d = doc as Record<string, unknown> | null
  const list = Array.isArray(doc) ? doc
    : d && typeof d === 'object' ? (['scenarios', 'flows', 'workflows'].map((k) => d[k]).find(Array.isArray) as unknown[] | undefined) : undefined
  const items = list ?? [doc]
  const out: ImportItem[] = []
  for (const it of items) {
    const wf = extractWorkflow(it)
    if (!wf) continue
    const o = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>
    const name = str(o.title) ?? str(o.name) ?? str(o.flow_name) ?? (items.length > 1 ? `${fallback} ${out.length + 1}` : fallback)
    out.push({ name, workflow: wf, tts: ttsOf(o.tts) })
  }
  return out
}

type Row = ImportItem & { on: boolean; state?: 'busy' | 'done' | 'error'; note?: string }

/**
 * Import several workflows at once, each as a new flow. Paste one JSON (a list, or one
 * workflow) or upload several files. Flows are created one after another; a failed one
 * doesn't stop the rest.
 */
export function MultiImportDialog({ onCreate, onClose, onDone }: {
  /** Creates one flow; resolves to an error message, or null when it worked. */
  onCreate: (item: ImportItem) => Promise<string | null>
  onClose: () => void
  /** Called once after the run, when at least one flow was made. */
  onDone: (made: number) => void
}) {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [running, setRunning] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const fromText = (raw: string) => {
    setErr(null)
    if (!raw.trim()) return setRows([])
    try {
      const found = extractMany(JSON.parse(raw))
      if (!found.length) throw new Error('No workflow found: each one needs a "nodes" object.')
      setRows(found.map((f) => ({ ...f, on: true })))
    } catch (e) { setRows([]); setErr(e instanceof SyntaxError ? `Not valid JSON: ${e.message}` : (e as Error).message) }
  }
  const fromFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setErr(null)
    const next: Row[] = []
    const bad: string[] = []
    for (const f of Array.from(files)) {
      if (f.size > 5_000_000) { bad.push(`${f.name} (over 5 MB)`); continue }
      try {
        const found = extractMany(JSON.parse(await f.text()), f.name.replace(/\.json$/i, ''))
        if (!found.length) bad.push(`${f.name} (no workflow)`)
        next.push(...found.map((x) => ({ ...x, on: true })))
      } catch { bad.push(`${f.name} (not valid JSON)`) }
    }
    setRows((r) => [...r.filter((x) => x.state !== 'done'), ...next])
    if (bad.length) setErr(`Skipped: ${bad.join(', ')}`)
  }

  const chosen = rows.filter((r) => r.on && r.state !== 'done')
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const run = async () => {
    setRunning(true)
    let made = 0
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.on || r.state === 'done') continue
      set(i, { state: 'busy', note: undefined })
      const fail = await onCreate({ name: r.name.trim() || 'Imported flow', workflow: r.workflow, tts: r.tts }).catch((e) => (e as Error).message || 'Something went wrong.')
      if (fail) set(i, { state: 'error', note: fail })
      else { set(i, { state: 'done' }); made++ }
    }
    setRunning(false)
    if (made) {
      toast.success(`${made} flow${made === 1 ? '' : 's'} created`, '')
      onDone(made)
    }
  }

  const left = rows.filter((r) => r.state === 'error').length
  return (
    <Dialog title="Import flows" sub="Each workflow becomes a new flow. Paste one JSON (a list or a single workflow) or upload several files." onClose={running ? () => {} : onClose} wide>
      <div className="wf-xfer">
        <SegmentTabs label="Import from" value={tab} onChange={(v) => { setTab(v); setErr(null) }}
          options={[{ value: 'paste', label: 'Paste JSON' }, { value: 'upload', label: 'Upload files' }]} />
        {tab === 'paste' ? (
          <textarea className="db-in wf-xfer-area is-short" spellCheck={false} autoFocus placeholder='[ { "title": "…", "workflow": { "nodes": { … } } }, … ]'
            value={text} disabled={running} onChange={(e) => { setText(e.target.value); fromText(e.target.value) }} />
        ) : (
          <button type="button" className={`wf-drop${over ? ' is-over' : ''}`} disabled={running} onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); fromFiles(e.dataTransfer.files) }}>
            <UploadIcon size={22} />
            <b>Drop .json files here</b>
            <small>or click to choose several</small>
            <input ref={input} type="file" accept=".json,application/json" multiple hidden onChange={(e) => { fromFiles(e.target.files); e.target.value = '' }} />
          </button>
        )}
        {err && <div className="wf-jsonerr">{err}</div>}
        {rows.length > 0 && (
          <ul className="wf-multi">
            {rows.map((r, i) => (
              <li key={i} className={`wf-multi-row${r.state ? ` is-${r.state}` : ''}`}>
                <input type="checkbox" checked={r.on} disabled={running || r.state === 'done'} aria-label={`Import ${r.name}`} onChange={(e) => set(i, { on: e.target.checked })} />
                <input className="db-in wf-multi-name" value={r.name} disabled={running || r.state === 'done'} aria-label="Flow name" onChange={(e) => set(i, { name: e.target.value })} />
                <span className="wf-multi-meta">
                  {Object.keys(r.workflow.nodes ?? {}).length} steps{r.tts ? ` · ${r.tts.service}${r.tts.model ? ` ${r.tts.model}` : ''}` : ''}
                </span>
                <span className="wf-multi-state">
                  {r.state === 'busy' ? 'Creating…' : r.state === 'done' ? <><Icon name="check" size={14} /> Created</> : r.state === 'error' ? r.note : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="wf-xfer-acts is-end">
          <button className="db-btn" disabled={running} onClick={onClose}>{rows.some((r) => r.state === 'done') ? 'Close' : 'Cancel'}</button>
          <button className="db-btn db-primary" disabled={running || !chosen.length} onClick={run}>
            {running ? 'Creating…' : left && chosen.length === left ? `Retry ${left}` : `Create ${chosen.length} flow${chosen.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export function ImportDialog({ onImport, onClose, sub = 'Replaces the canvas. Nothing is saved until you press Save.', done = 'Not saved yet. Undo brings back the old one.' }: {
  onImport: (wf: Workflow) => void
  onClose: () => void
  sub?: string
  /** Toast text after importing; empty for none. */
  done?: string
}) {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [text, setText] = useState('')
  const [file, setFile] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const parse = (raw: string) => {
    try {
      const wf = extractWorkflow(JSON.parse(raw))
      if (!wf) throw new Error('No workflow found: the JSON needs a "nodes" object.')
      return wf
    } catch (e) { setErr(e instanceof SyntaxError ? `Not valid JSON: ${e.message}` : (e as Error).message); return null }
  }
  const finish = (raw: string) => {
    const wf = parse(raw)
    if (!wf) return
    onImport(wf)
    if (done) toast.success('Workflow imported', done)
    onClose()
  }
  const read = async (f: File | undefined) => {
    if (!f) return
    setErr(null)
    if (f.size > 5_000_000) { setErr('That file is over 5 MB.'); return }
    const raw = await f.text()
    setFile(f.name)
    setText(raw)
    parse(raw)
  }

  return (
    <Dialog title="Import workflow" sub={sub} onClose={onClose} wide>
      <div className="wf-xfer">
        <SegmentTabs label="Import from" value={tab} onChange={(v) => { setTab(v); setErr(null) }}
          options={[{ value: 'paste', label: 'Paste JSON' }, { value: 'upload', label: 'Upload file' }]} />
        {tab === 'paste' ? (
          <textarea className="db-in wf-xfer-area" spellCheck={false} autoFocus placeholder='{ "nodes": { … } }'
            value={text} onChange={(e) => { setText(e.target.value); setErr(null) }} />
        ) : (
          <button type="button" className={`wf-drop${over ? ' is-over' : ''}${file ? ' has-file' : ''}`} onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]) }}>
            <UploadIcon size={22} />
            <b>{file ?? 'Drop a .json file here'}</b>
            <small>{file ? 'Click to pick another' : 'or click to choose one'}</small>
            <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => { read(e.target.files?.[0]); e.target.value = '' }} />
          </button>
        )}
        {err && <div className="wf-jsonerr">{err}</div>}
        <div className="wf-xfer-acts is-end">
          <button className="db-btn" onClick={onClose}>Cancel</button>
          <button className="db-btn db-primary" disabled={!text.trim() || (tab === 'upload' && !file)} onClick={() => finish(text)}>Import</button>
        </div>
      </div>
    </Dialog>
  )
}
