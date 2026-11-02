// Ask Voxio's follow-up list and CSV download. Caller numbers come here straight from the
// server; the model only sees counts and examples without them.

import { useContext } from 'react'
import { DownloadIcon, PhoneIcon } from 'lucide-react'
import { OpenRef } from './Markdown'

export type FollowUps = { title: string; total: number; calls: { call: string; when: string; caller: string; seconds: number; recorded: Record<string, unknown>; last_caller_line: string }[] }

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const show = (v: unknown) => (v === true ? 'yes' : v === false ? 'no' : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''))

export function FollowUpsCard({ data }: { data: FollowUps }) {
  const open = useContext(OpenRef)
  return (
    <div className="as-leads">
      <div className="as-leads-head"><PhoneIcon size={16} /> <strong>{data.title}</strong> <span className="as-leads-count">{data.total} call{data.total === 1 ? '' : 's'}{data.total > data.calls.length ? `, showing ${data.calls.length}` : ''}</span></div>
      {!data.calls.length && <p className="as-leads-note">No calls match.</p>}
      <ul>
        {data.calls.map((c) => (
          <li key={c.call}>
            <div className="as-leads-row">
              <strong>{c.caller || 'Unknown number'}</strong>
              <span>{when(c.when)} · {Math.floor(c.seconds / 60)}:{String(c.seconds % 60).padStart(2, '0')}</span>
              <button type="button" className="db-btn db-btn-sm" onClick={() => open(c.call)}>Open call</button>
            </div>
            {Object.keys(c.recorded).length > 0 && <div className="as-leads-vals">{Object.entries(c.recorded).map(([k, v]) => <span key={k}>{k.replace(/_/g, ' ')}: <b>{show(v)}</b></span>)}</div>}
            {c.last_caller_line && <p className="as-leads-said">“{c.last_caller_line}”</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DownloadCard({ file }: { file: { name: string; rows: number; mime?: string; text?: string } }) {
  const save = () => {
    if (!file.text) return
    const url = URL.createObjectURL(new Blob([file.text], { type: file.mime ?? 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="as-leads as-download">
      <div className="as-leads-head"><DownloadIcon size={16} /> <strong>{file.name}</strong> <span className="as-leads-count">{file.rows} row{file.rows === 1 ? '' : 's'}</span></div>
      {file.text
        ? <button type="button" className="db-btn db-primary db-btn-sm" onClick={save}>Download CSV</button>
        : <p className="as-leads-note">This file was made in an earlier session. Ask again for a fresh one.</p>}
    </div>
  )
}
