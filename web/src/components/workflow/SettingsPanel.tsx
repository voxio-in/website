import { useState } from 'react'

import { CopyJson, Label } from '#/components/dashboard/controls'
import { Code2Icon } from 'lucide-react'
import Icon from '#/components/dashboard/Icon'
import type { NodeData } from '#/lib/workflow/convert'
import { prettyName, specFor, type Field } from '#/lib/workflow/registry'
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

// Headings for grouped settings, so the More tab reads as a few clear topics.
const SECTIONS = {
  output: { title: 'What it produces', text: 'The fields the AI fills in each turn. “Spoken reply” is what the caller hears.', icon: 'check' },
  memory: { title: 'What it remembers', text: 'What the AI can see from earlier, and how long chats stay quick.', icon: 'book' },
  timing: { title: 'Timing', text: 'Limits for slow replies.', icon: 'voice' },
} as const

/** Fields in order, with consecutive ones of the same section grouped. */
function groups(fields: Field[]): [Field['section'] | undefined, Field[]][] {
  const out: [Field['section'] | undefined, Field[]][] = []
  for (const f of fields) {
    const last = out[out.length - 1]
    if (last && f.section && last[0] === f.section) last[1].push(f)
    else out.push([f.section, [f]])
  }
  return out
}

/** Step names stay machine-safe; people type normal words. */
const toId = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9?]+/g, '_').replace(/^_+|_+$/g, '')

export default function SettingsPanel({ id, data, isStart, issues, onParams, onRename, onStart, onDelete, onDuplicate, onClose }: Props) {
  const spec = specFor(data.type)
  // Open on More when Setup has nothing filled in but More does, e.g. a Say
  // step that speaks nothing and only passes values along.
  const [tab, setTab] = useState<'setup' | 'more'>(() => {
    const filled = (k: string, v: unknown) => k === 'out_dict' ? !!(v as Record<string, unknown> | undefined)?.speak
      : v !== undefined && v !== '' && !(typeof v === 'object' && v && !Object.keys(v).length)
    const setup = spec.fields.filter((f) => !f.advanced && f.kind !== 'interrupt' && f.kind !== 'bool')
    const more = spec.fields.filter((f) => f.advanced)
    const moreFilled = more.some((f) => f.key === 'out_dict'
      ? Object.keys((data.parameters.out_dict as object) ?? {}).some((k) => k !== 'speak')
      : filled(f.key, data.parameters[f.key]))
    return setup.length && !setup.some((f) => filled(f.key, data.parameters[f.key])) && moreFilled ? 'more' : 'setup'
  })
  const [name, setName] = useState(prettyName(id))
  const p = data.parameters

  const set = (key: string, v: unknown) => {
    const next = { ...p }
    if (v === undefined) delete next[key]
    else next[key] = v
    onParams(next)
  }

  const fields = spec.fields.filter((f) => (tab === 'more' ? f.advanced : !f.advanced) && (!f.requires || !!p[f.requires]))
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
        {groups(fields).map(([sec, list]) => {
          const rows = list.map((f, i) => (
            <div key={`${f.key}-${i}`} className={`wf-field${f.kind === 'bool' ? ' is-inline' : ''}`}>
              <Label info={f.help}>{f.label}</Label>
              <FieldInput field={f} value={p[f.key]} params={p} onChange={(v) => set(f.key, v)} onPatch={(patch) => onParams({ ...p, ...patch })} />
            </div>
          ))
          if (!sec) return rows
          return (
            <section key={sec} className="wf-sec">
              <header className="wf-sec-head">
                <span className="wf-sec-icon"><Icon name={SECTIONS[sec].icon} size={16} /></span>
                <span><b>{SECTIONS[sec].title}</b><small>{SECTIONS[sec].text}</small></span>
              </header>
              {rows}
            </section>
          )
        })}
        {!fields.length && <p className="db-muted">Nothing to set up — this step just works.</p>}
      </div>

      {/* Labelled actions; when "Make first step" needs the room they shrink to icons. */}
      <div className={`wf-panel-foot${isStart ? '' : ' is-tight'}`}>
        {!isStart && <button className="db-btn db-btn-icon db-btn-sm" onClick={onStart}><Icon name="play" size={15} />Make first step</button>}
        <span style={{ flex: 1 }} />
        <CopyJson value={p} label="Copy JSON" icon={<Code2Icon size={16} />} />
        <button className="wf-foot-btn" onClick={onDuplicate} aria-label="Duplicate"><Icon name="copy" size={16} /><span className="wf-foot-label">Duplicate</span></button>
        <button className="wf-foot-btn is-danger" onClick={onDelete} aria-label="Delete step"><Icon name="trash" size={16} /><span className="wf-foot-label">Delete</span></button>
      </div>
    </aside>
  )
}
