// "Settings for this test": a side panel in the test dialog with every setting
// a call can take, in tabs. Nothing here is saved to the flow; it rides along
// as customs for this test only. Each tab shows how many settings differ from
// the flow, and each changed setting can be put back on its own or all at once.

import { useState } from 'react'
import { RotateCcwIcon, XIcon } from 'lucide-react'

import ProviderEditor from '../ProviderEditor'
import { KnobList } from '../KnobInput'
import { KNOBS, type Knob } from '#/lib/dashboard/knobs'
import type { FlowDoc, ProviderConfig, VoicePreset } from '#/lib/dashboard/types'

export type TestOverrides = { tts?: ProviderConfig; stt?: ProviderConfig; knobs: Record<string, unknown> }

type Tab = 'speaking' | 'listening' | 'turns' | 'more'
const TABS: { id: Tab; label: string; groups?: Knob['group'][] }[] = [
  { id: 'speaking', label: 'Speaking', groups: ['Speaking'] },
  { id: 'listening', label: 'Listening', groups: ['Listening'] },
  { id: 'turns', label: 'Turn-taking', groups: ['Turn-taking', 'Pipeline'] },
  { id: 'more', label: 'More', groups: ['Inactivity', 'Avatar'] },
]

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export function changedCount(o: TestOverrides) {
  return (o.tts ? 1 : 0) + (o.stt ? 1 : 0) + Object.keys(o.knobs).length
}

export default function TestSettings({ flow, voices, value, onChange, locked, onClose }: {
  flow: FlowDoc
  voices: VoicePreset[]
  value: TestOverrides
  onChange: (v: TestOverrides) => void
  /** While a call runs, settings can't change. */
  locked: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('speaking')
  const flowVal = (k: string) => (flow as Record<string, unknown>)[k]
  const knobsIn = (groups?: Knob['group'][]) => KNOBS.filter((k) => groups?.includes(k.group))
  const countFor = (t: (typeof TABS)[number]) =>
    knobsIn(t.groups).filter((k) => k.key in value.knobs).length + (t.id === 'speaking' && value.tts ? 1 : 0) + (t.id === 'listening' && value.stt ? 1 : 0)

  const setKnob = (k: string, v: unknown) => {
    const knobs = { ...value.knobs }
    if (same(v, flowVal(k))) delete knobs[k]
    else knobs[k] = v
    onChange({ ...value, knobs })
  }
  const values = { ...(flow as Record<string, unknown>), ...value.knobs }
  const current = TABS.find((t) => t.id === tab)!

  const voiceTab = (kind: 'tts' | 'stt') => {
    const own = flow[kind] as ProviderConfig | null
    const cfg = value[kind] ?? (typeof own === 'object' ? own : null)
    const saved = voices.filter((v) => v.kind === kind)
    return (
      <div className="db-tset-voice">
        {saved.length > 0 && (
          <div className="db-tset-presets">
            <span className="db-flabel">Start from a saved {kind === 'tts' ? 'voice' : 'setup'}</span>
            <div className="db-tset-chips">
              <button type="button" className={`db-fchip-btn db-tset-chip${!value[kind] ? ' is-on' : ''}`} onClick={() => onChange({ ...value, [kind]: undefined })}>The flow’s own</button>
              {saved.map((v) => (
                <button key={v.id} type="button" className={`db-fchip-btn db-tset-chip${same(value[kind], v.config) ? ' is-on' : ''}`}
                  onClick={() => onChange({ ...value, [kind]: v.config })}>{v.name}</button>
              ))}
            </div>
          </div>
        )}
        <ProviderEditor kind={kind} value={cfg} onChange={(v) => onChange({ ...value, [kind]: same(v, own) ? undefined : v })} />
      </div>
    )
  }

  return (
    <aside className="db-tset" aria-label="Settings for this test">
      <header className="db-tset-head">
        <div>
          <b>Settings for this test</b>
          <small>{locked ? 'End the call to change these.' : 'Not saved to the flow.'}</small>
        </div>
        {changedCount(value) > 0 && (
          <button type="button" className="db-btn db-btn-sm db-btn-icon" disabled={locked} onClick={() => onChange({ knobs: {} })}>
            <RotateCcwIcon size={15} />Reset {changedCount(value)}
          </button>
        )}
        <button type="button" className="db-iconbtn" onClick={onClose} aria-label="Close settings"><XIcon size={18} /></button>
      </header>

      <nav className="db-tset-tabs" role="tablist">
        {TABS.map((t) => {
          const n = countFor(t)
          return (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={`db-tset-tab${t.id === tab ? ' is-on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}{n > 0 && <span className="db-tset-n">{n}</span>}
            </button>
          )
        })}
      </nav>

      <div className={`db-tset-body${locked ? ' is-locked' : ''}`} inert={locked || undefined}>
        {tab === 'speaking' && voiceTab('tts')}
        {tab === 'listening' && voiceTab('stt')}
        {knobsIn(current.groups).length > 0 && (
          <KnobList knobs={knobsIn(current.groups)} values={values} onChange={setKnob} />
        )}
        {Object.keys(value.knobs).some((k) => knobsIn(current.groups).some((x) => x.key === k)) && (
          <div className="db-tset-changed">
            <span className="db-flabel">Changed here</span>
            {knobsIn(current.groups).filter((k) => k.key in value.knobs).map((k) => (
              <span key={k.key} className="db-fchip is-on">
                <span className="db-fchip-btn">{k.label}</span>
                <button type="button" className="db-fchip-x" aria-label={`Put ${k.label} back`} onClick={() => setKnob(k.key, flowVal(k.key))}><XIcon size={14} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
