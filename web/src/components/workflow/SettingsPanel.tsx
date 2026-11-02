import { useEffect, useRef, useState } from 'react'

import { Label } from '#/components/dashboard/controls'
import { CopySettingsMenu } from '#/components/dashboard/kit/CopySettingsMenu'
import Icon from '#/components/dashboard/Icon'
import type { NodeData } from '#/lib/workflow/convert'
import { prettyName, specFor, type Field } from '#/lib/workflow/registry'
import type { Issue } from '#/lib/workflow/validate'
import { DevSettings } from './DevSettings'
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
  /** Developer mode: the engine's raw keys, grouped, instead of the plain settings. */
  dev?: boolean
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

const WIDTH_KEY = 'vx.wf.panel'
const MIN_W = 380

/** The panel's width, set by dragging its left edge and remembered in this browser; 0 means the stylesheet's. */
function usePanelWidth() {
  const [width, setWidth] = useState(0)
  const drag = useRef<{ x: number; w: number } | null>(null)
  useEffect(() => { try { setWidth(Number(localStorage.getItem(WIDTH_KEY)) || 0) } catch { /* private window */ } }, [])
  const save = (w: number) => { try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* private window: this visit only */ } }
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = e.currentTarget.parentElement
    if (!panel) return
    e.preventDefault()
    drag.current = { x: e.clientX, w: panel.getBoundingClientRect().width }
    const max = Math.max(MIN_W, Math.round(window.innerWidth * 0.7))
    let last = drag.current.w
    const move = (m: PointerEvent) => {
      if (!drag.current) return
      // The grip is on the left edge: dragging left widens.
      last = Math.round(Math.min(max, Math.max(MIN_W, drag.current.w + drag.current.x - m.clientX)))
      setWidth(last)
    }
    const up = () => {
      drag.current = null
      save(last)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.classList.remove('wf-resizing')
    }
    document.body.classList.add('wf-resizing')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const reset = () => { setWidth(0); try { localStorage.removeItem(WIDTH_KEY) } catch { /* private window */ } }
  return [width, { down, reset }] as const
}

export default function SettingsPanel({ id, data, isStart, issues, onParams, onRename, onStart, onDelete, onDuplicate, onClose, racing, ttsService, dev }: Props) {
  const spec = specFor(data.type)
  const [width, startDrag] = usePanelWidth()
  // Every step opens on its main settings: what decides the step (Say's words or the AI's reply, what an AI decides) is there.
  const [tab, setTab] = useState<'setup' | 'more'>('setup')
  const [name, setName] = useState(prettyName(id))
  const p = data.parameters

  const set = (key: string, v: unknown) => {
    const next = { ...p }
    if (v === undefined) delete next[key]
    else next[key] = v
    // A setting that only matters while its switch is on goes with it (emotion → emotion style).
    if (!v) for (const f of spec.fields) if (f.requires === key) delete next[f.key]
    onParams(next)
  }

  // Only settings that apply to this step as it is now.
  const applies = (f: Field) => (!f.requires || !!p[f.requires]) && (!f.when || f.when(p)) && (!f.racing || !!racing)
  const fields = spec.fields.filter((f) => (tab === 'more' ? f.advanced : !f.advanced) && applies(f))
  const hasMore = spec.fields.some((f) => f.advanced && applies(f))

  return (
    <aside className={`wf-panel${width ? ' is-sized' : ''}`} style={{ '--c': spec.color, ...(width ? { width } : {}) } as React.CSSProperties}>
      <div className="wf-panel-grip" role="separator" aria-orientation="vertical" aria-label="Resize settings" title="Drag to resize · double-click to reset"
        onPointerDown={startDrag.down} onDoubleClick={startDrag.reset}>
        <span />
      </div>
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

      {hasMore && !dev && (
        <div className="db-pills wf-panel-tabs">
          <button className={tab === 'setup' ? 'is-on' : ''} onClick={() => setTab('setup')}>Main settings</button>
          <button className={tab === 'more' ? 'is-on' : ''} onClick={() => setTab('more')}>Developer settings</button>
        </div>
      )}

      <div className="wf-panel-body">
        {dev && <DevSettings spec={spec} params={p} onParams={onParams} />}
        {!dev && groups(fields).map(([sec, list]) => {
          const rows = list.map((f, i) => {
            // A setting that needs another voice says so instead of a switch that does nothing.
            // If it's already on (an imported workflow, or the voice changed), the switch stays so it can be turned off.
            const wrongVoice = !!f.tts && ttsService !== f.tts
            const off = wrongVoice && !p[f.key]
            const voiceName = SERVICE_NAME[ttsService ?? ''] ?? 'another service'
            const inline = (f.kind === 'bool' || f.kind === 'hangup' || f.kind === 'aihangup' || f.kind === 'canend') && !off
            return (
              <div key={`${f.key}-${i}`} className={`wf-field${inline ? ' is-inline' : ''}${off ? ' is-off' : ''}`}>
                <Label>{f.label}</Label>
                {off
                  ? <p className="wf-help">Works only with an ElevenLabs voice. This flow speaks with {voiceName}.</p>
                  : <FieldInput field={f} value={p[f.key]} params={p} onChange={(v) => set(f.key, v)} onPatch={(patch) => onParams({ ...p, ...patch })} />}
                {wrongVoice && !off && <p className="wf-help is-warn">This flow speaks with {voiceName}, which reads cues like [laughs] out loud. Turn this off.</p>}
                {/* The one line that decides the choice, in view, not only behind an (i). */}
                {f.help && !off && !wrongVoice && <p className="wf-help">{f.help}</p>}
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
        {!dev && !fields.length && <p className="wf-help">{tab === 'setup' && spec.setupNote ? spec.setupNote : 'Nothing to set here. This step just works.'}</p>}
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
