import { useState } from 'react'

import { Label } from '#/components/dashboard/controls'
import { CopySettingsMenu } from '#/components/dashboard/kit/CopySettingsMenu'
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
  /** Another AI step starts from the same step as this one (they race). */
  racing?: boolean
  /** The flow's voice service, for settings that work with one voice only. */
  ttsService?: string
}

const SERVICE_NAME: Record<string, string> = { deepgram: 'Deepgram', sarvam: 'Sarvam', elevenlabs: 'ElevenLabs', google: 'Google', resembleai: 'Resemble' }

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

export default function SettingsPanel({ id, data, isStart, issues, onParams, onRename, onStart, onDelete, onDuplicate, onClose, racing, ttsService }: Props) {
  const spec = specFor(data.type)
  // Every step opens on its main settings: what decides the step (Say's words or the AI's reply, what an AI decides) is there.
  const [tab, setTab] = useState<'setup' | 'more'>('setup')
  const [name, setName] = useState(prettyName(id))
  const p = data.parameters

  const set = (key: string, v: unknown) => {
    const next = { ...p }
    if (v === undefined) delete next[key]
    else next[key] = v
    onParams(next)
  }

  // Only settings that apply to this step as it is now.
  const applies = (f: Field) => (!f.requires || !!p[f.requires]) && (!f.when || f.when(p)) && (!f.racing || !!racing)
  const fields = spec.fields.filter((f) => (tab === 'more' ? f.advanced : !f.advanced) && applies(f))
  const hasMore = spec.fields.some((f) => f.advanced && applies(f))

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
          <button className={tab === 'setup' ? 'is-on' : ''} onClick={() => setTab('setup')}>Main settings</button>
          <button className={tab === 'more' ? 'is-on' : ''} onClick={() => setTab('more')}>Developer settings</button>
        </div>
      )}

      <div className="wf-panel-body">
        {groups(fields).map(([sec, list]) => {
          const rows = list.map((f, i) => {
            // A setting that needs another voice says so instead of a switch that does nothing.
            const off = f.tts && ttsService !== f.tts
            const inline = (f.kind === 'bool' || f.kind === 'hangup' || f.kind === 'aihangup' || f.kind === 'canend') && !off
            return (
              <div key={`${f.key}-${i}`} className={`wf-field${inline ? ' is-inline' : ''}${off ? ' is-off' : ''}`}>
                <Label>{f.label}</Label>
                {off
                  ? <p className="wf-help">Works only with an ElevenLabs voice. This flow speaks with {SERVICE_NAME[ttsService ?? ''] ?? 'another service'}.</p>
                  : <FieldInput field={f} value={p[f.key]} params={p} onChange={(v) => set(f.key, v)} onPatch={(patch) => onParams({ ...p, ...patch })} />}
                {/* The one line that decides the choice, in view, not only behind an (i). */}
                {f.help && !off && <p className="wf-help">{f.help}</p>}
              </div>
            )
          })
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
        {!fields.length && <p className="wf-help">{tab === 'setup' && spec.setupNote ? spec.setupNote : 'Nothing to set here. This step just works.'}</p>}
      </div>

      {/* Labelled actions; when "Make first step" needs the room they shrink to icons. */}
      <div className={`wf-panel-foot${isStart ? '' : ' is-tight'}`}>
        {!isStart && <button className="db-btn db-btn-icon db-btn-sm" onClick={onStart}><Icon name="play" size={15} />Make first step</button>}
        <span style={{ flex: 1 }} />
        <button className="wf-foot-btn" onClick={onDuplicate} aria-label="Duplicate"><Icon name="copy" size={16} /><span className="wf-foot-label">Duplicate</span></button>
        <button className="wf-foot-btn is-danger" onClick={onDelete} aria-label="Delete step" title="Undo (Ctrl+Z) brings it back"><Icon name="trash" size={16} /><span className="wf-foot-label">Delete</span></button>
        <CopySettingsMenu settings={p} />
      </div>
    </aside>
  )
}
