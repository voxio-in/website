import { useState } from 'react'

import { CopyJson, Label } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import type { NodeData } from '#/lib/workflow/convert'
import { prettyName, specFor } from '#/lib/workflow/registry'
import type { Issue } from '#/lib/workflow/validate'
import { FieldInput } from './Fields'

type Props = {
  id: string
  data: NodeData
  isStart: boolean
  issues: Issue[]
  onParams: (p: Record<string, unknown>) => void
  onRename: (to: string) => boolean
  onStart: () => void
  onDelete: () => void
  onDuplicate: () => void
  onClose: () => void
}

/** Step names stay machine-safe; people type normal words. */
const toId = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9?]+/g, '_').replace(/^_+|_+$/g, '')

export default function SettingsPanel({ id, data, isStart, issues, onParams, onRename, onStart, onDelete, onDuplicate, onClose }: Props) {
  const spec = specFor(data.type)
  const [tab, setTab] = useState<'setup' | 'more'>('setup')
  const [name, setName] = useState(prettyName(id))
  const p = data.parameters

  const set = (key: string, v: unknown) => {
    const next = { ...p }
    if (v === undefined) delete next[key]
    else next[key] = v
    onParams(next)
  }

  const fields = spec.fields.filter((f) => (tab === 'more' ? f.advanced : !f.advanced))
  const hasMore = spec.fields.some((f) => f.advanced)

  return (
    <aside className="wf-panel" style={{ '--c': spec.color } as React.CSSProperties}>
      <div className="wf-panel-head">
        <span className="wf-tile is-lg"><Icon name={spec.icon} size={20} /></span>
        <div className="wf-panel-titles">
          <input className="wf-name" value={name} aria-label="Step name" onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (!onRename(toId(name) || id)) setName(prettyName(id)) }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          <span className="wf-panel-kind">{spec.label}{isStart && <em> · first step</em>}</span>
        </div>
        <button className="db-iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
      </div>
      <p className="wf-panel-blurb">{spec.blurb}</p>

      {issues.length > 0 && (
        <ul className="wf-panel-issues">
          {issues.map((i, k) => <li key={k} className={`is-${i.level}`}>{i.message}</li>)}
        </ul>
      )}

      {hasMore && (
        <div className="db-pills wf-panel-tabs">
          <button className={tab === 'setup' ? 'is-on' : ''} onClick={() => setTab('setup')}>Setup</button>
          <button className={tab === 'more' ? 'is-on' : ''} onClick={() => setTab('more')}>More</button>
        </div>
      )}

      <div className="wf-panel-body">
        {fields.map((f, i) => (
          <div key={`${f.key}-${i}`} className={`wf-field${f.kind === 'bool' ? ' is-inline' : ''}`}>
            <Label info={f.help}>{f.label}</Label>
            <FieldInput field={f} value={p[f.key]} params={p} onChange={(v) => set(f.key, v)} onPatch={(patch) => onParams({ ...p, ...patch })} />
          </div>
        ))}
        {!fields.length && <p className="db-muted">Nothing to set up — this step just works.</p>}
      </div>

      <div className="wf-panel-foot">
        {!isStart && <button className="db-btn db-btn-icon" onClick={onStart}><Icon name="play" size={15} />Make first step</button>}
        <span style={{ flex: 1 }} />
        <CopyJson value={p} />
        <button className="db-iconbtn" onClick={onDuplicate} title="Duplicate" aria-label="Duplicate"><Icon name="copy" size={17} /></button>
        <button className="db-iconbtn is-danger" onClick={onDelete} title="Delete" aria-label="Delete step"><Icon name="trash" size={17} /></button>
      </div>
    </aside>
  )
}
