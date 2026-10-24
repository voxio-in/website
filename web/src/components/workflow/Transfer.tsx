// Export and import a workflow as JSON. Export: copy it or download a .json file.
// Import: drop or pick a file, or paste JSON; it replaces the canvas (Undo brings it back).

import { useRef, useState } from 'react'
import { DownloadIcon, UploadIcon } from 'lucide-react'
import { extractWorkflow, type Workflow } from '#/lib/workflow/convert'
import { Dialog } from '#/components/dashboard/ui'
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
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const fromText = (raw: string) => {
    setText(raw)
    setErr(null)
    if (!raw.trim()) return setRows([])
    try {
      const found = extractMany(JSON.parse(raw))
      if (!found.length) throw new Error('No workflow found: each one needs a "nodes" object.')
      setRows(found.map((f) => ({ ...f, on: true })))
    } catch (e) { setRows([]); setErr(e instanceof SyntaxError ? `Not valid JSON: ${e.message}` : (e as Error).message) }
  }
  const fromFiles = async (files: File[]) => {
    if (!files.length) return
    setErr(null)
    const next: Row[] = []
    const bad: string[] = []
    for (const f of files) {
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
    // Never a greyed-out button: say what is missing.
    if (!chosen.length) return setErr(rows.length ? 'Tick at least one flow to create.' : 'Add a file or paste JSON first.')
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
    <Dialog title="Import flows" sub="Each workflow in the files becomes a new flow." onClose={running ? () => {} : onClose}>
      <div className="wf-xfer is-import">
        <DropBox multiple pasting={pasting} onPasting={(on) => { setPasting(on); setErr(null) }} text={text} onText={fromText} onFiles={fromFiles} disabled={running} />
        {/* A fixed slot under the box: the list scrolls inside it, so the dialog keeps its size. */}
        <div className="wf-queue">
          <p className="wf-queue-head">{rows.length ? `${rows.length} flow${rows.length === 1 ? '' : 's'} found` : 'No files yet'}</p>
          {err && <p className="wf-queue-err" role="alert">{err}</p>}
          <ul className="wf-queue-list">
            {rows.map((r, i) => (
              <li key={i} className={`wf-queue-row${r.state ? ` is-${r.state}` : ''}`}>
                <input type="checkbox" checked={r.on} disabled={running || r.state === 'done'} aria-label={`Import ${r.name}`} onChange={(e) => set(i, { on: e.target.checked })} />
                <input className="db-in wf-queue-name" value={r.name} disabled={running || r.state === 'done'} aria-label="Flow name" onChange={(e) => set(i, { name: e.target.value })} />
                <span className="wf-queue-meta">{Object.keys(r.workflow.nodes ?? {}).length} steps{r.tts ? ` · ${r.tts.service}` : ''}</span>
                <span className="wf-queue-state">
                  {r.state === 'busy' ? 'Creating…' : r.state === 'done' ? <><Icon name="check" size={16} /> Created</> : r.state === 'error' ? r.note : <><Icon name="check" size={16} /> Ready</>}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="db-btngroup db-dialog-split is-two" role="group">
          <button type="button" className="db-gbtn" disabled={running} onClick={onClose}>{rows.some((r) => r.state === 'done') ? 'Close' : 'Cancel'}</button>
          <button type="button" className="db-gbtn is-lead" disabled={running} onClick={run}>
            {running ? 'Creating…' : left && chosen.length === left ? `Retry ${left}` : chosen.length ? `Create ${chosen.length} flow${chosen.length === 1 ? '' : 's'}` : 'Create flows'}
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
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')
  const [file, setFile] = useState<string | null>(null)
  const [found, setFound] = useState<Workflow | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const parse = (raw: string) => {
    try {
      const wf = extractWorkflow(JSON.parse(raw))
      if (!wf) throw new Error('No workflow found: the JSON needs a "nodes" object.')
      setErr(null)
      return wf
    } catch (e) { setErr(e instanceof SyntaxError ? `Not valid JSON: ${e.message}` : (e as Error).message); return null }
  }
  const fromText = (raw: string) => {
    setText(raw)
    setFile(null)
    setFound(raw.trim() ? parse(raw) : null)
    if (!raw.trim()) setErr(null)
  }
  const fromFiles = async (files: File[]) => {
    const f = files[0]
    if (!f) return
    if (f.size > 5_000_000) { setErr(`${f.name} is over 5 MB.`); return }
    const raw = await f.text()
    setFile(f.name)
    setText(raw)
    setFound(parse(raw))
  }
  const clear = () => { setFile(null); setText(''); setFound(null); setErr(null) }
  const finish = () => {
    // Never a greyed-out button: say what is missing.
    if (!found) return setErr(err ?? (pasting ? 'Paste a workflow first.' : 'Add a file first.'))
    onImport(found)
    if (done) toast.success('Workflow imported', done)
    onClose()
  }
  const steps = found ? Object.keys(found.nodes ?? {}).length : 0

  return (
    <Dialog title="Import a flow" sub={sub} onClose={onClose}>
      <div className="wf-xfer is-import">
        <DropBox pasting={pasting} onPasting={(on) => { setPasting(on); clear() }} text={text} onText={fromText} onFiles={fromFiles} />
        {/* One row, always there: what was picked and whether it reads, or why not. */}
        <div className={`wf-filerow${err ? ' is-error' : found ? ' is-ready' : ''}`} role={err ? 'alert' : undefined}>
          <span className="wf-filerow-name">{err ?? (found ? (file ?? 'Pasted JSON') : pasting ? 'Nothing pasted yet' : 'No file chosen yet')}</span>
          {found && !err && <span className="wf-filerow-state"><Icon name="check" size={16} /> {steps} step{steps === 1 ? '' : 's'}</span>}
          {(found || err) && file && (
            <button type="button" className="db-iconbtn" onClick={clear} aria-label={`Remove ${file}`} title="Remove"><Icon name="trash" size={18} /></button>
          )}
        </div>
        <div className="db-btngroup db-dialog-split is-two" role="group">
          <button type="button" className="db-gbtn" onClick={onClose}>Cancel</button>
          <button type="button" className="db-gbtn is-lead" onClick={finish}>Import</button>
        </div>
      </div>
    </Dialog>
  )
}

/**
 * The drop area, after internal-shortlisting's Upload resumes dialog: line
 * tabs across the top (Upload | Paste JSON), then one dashed box with an icon,
 * a title and one line of help. Both tabs show a box of the same height, so
 * switching is instant and nothing on the screen moves.
 */
function DropBox({ multiple, pasting, onPasting, text, onText, onFiles, disabled }: {
  multiple?: boolean
  pasting: boolean
  onPasting: (on: boolean) => void
  text: string
  onText: (raw: string) => void
  onFiles: (files: File[]) => void
  disabled?: boolean
}) {
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="wf-dropwrap">
      <div className="wf-linetabs" role="tablist" aria-label="Import from">
        <button type="button" role="tab" aria-selected={!pasting} className="wf-linetab" disabled={disabled} onClick={() => onPasting(false)}>
          <UploadIcon size={20} />Upload
        </button>
        <button type="button" role="tab" aria-selected={pasting} className="wf-linetab" disabled={disabled} onClick={() => onPasting(true)}>
          <Icon name="code" size={20} />Paste JSON
        </button>
      </div>
      {pasting ? (
        <textarea className="db-in wf-dropbox wf-droparea" spellCheck={false} autoFocus disabled={disabled}
          placeholder={multiple ? '[ { "title": "…", "workflow": { "nodes": { … } } }, … ]' : '{ "nodes": { … } }'}
          value={text} onChange={(e) => onText(e.target.value)} />
      ) : (
        <button type="button" className={`wf-dropbox wf-drop2${over ? ' is-over' : ''}`} disabled={disabled} onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)) }}>
          <UploadIcon size={40} className="wf-drop2-icon" />
          <b>{over ? 'Drop it here' : multiple ? 'Add flow files' : 'Add a flow file'}</b>
          <span>{multiple ? 'Drop .json files here, or click to pick them.' : 'Drop a .json file here, or click to pick one.'}</span>
          <input ref={input} type="file" accept=".json,application/json" multiple={multiple} hidden
            onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
        </button>
      )}
    </div>
  )
}
