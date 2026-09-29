// One flow setting as a form control. Object settings render as their named
// fields — never as JSON.

import type { Knob } from '#/lib/dashboard/knobs'
import { Dropdown, Label, NumberUnit, Slider } from './controls'
import { Toggle } from './ui'

export default function KnobInput({ knob, value, onChange }: { knob: Knob; value: unknown; onChange: (v: unknown) => void }) {
  const v = value == null ? knob.default : value
  switch (knob.kind) {
    case 'bool':
      return <Toggle on={!!v} onChange={onChange} />
    case 'select':
      return <Dropdown value={String(v)} options={knob.options ?? []} info={knob.optionInfo} onChange={onChange} aria-label={knob.label} />
    case 'number':
      return <NumberUnit value={v as number | undefined} unit={knob.unit} min={knob.min} max={knob.max} step={knob.step} onChange={onChange} />
    case 'slider':
      return <Slider value={Number(v)} min={knob.min ?? 0} max={knob.max ?? 1} step={knob.step ?? 0.05} unit={knob.unit} onChange={onChange} />
    case 'object': {
      const obj = { ...(knob.default as Record<string, unknown>), ...((v as Record<string, unknown>) ?? {}) }
      const set = (k: string, x: unknown) => onChange({ ...obj, [k]: x })
      return (
        <div className="db-subfields">
          {knob.fields!.map((f) => (
            <div key={f.key} className={`db-field${f.kind === 'text' ? ' is-wide' : ''}`}>
              <Label info={f.help}>{f.label}</Label>
              {f.kind === 'number' && <NumberUnit value={obj[f.key] as number | undefined} unit={f.unit} min={f.min} max={f.max} step={f.step} onChange={(x) => set(f.key, x)} />}
              {f.kind === 'text' && <input className="db-in" value={String(obj[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} />}
              {f.kind === 'select' && <Dropdown value={String(obj[f.key] ?? '')} options={f.options ?? []} onChange={(x) => set(f.key, x)} aria-label={f.label} />}
            </div>
          ))}
        </div>
      )
    }
  }
}

/** A group of settings as rows: label + (i) on the left, the control on the right. */
export function KnobList({ knobs, values, onChange }: { knobs: Knob[]; values: Record<string, unknown>; onChange: (key: string, v: unknown) => void }) {
  const on = (k: string) => {
    const kn = knobs.find((x) => x.key === k)
    return !!(values[k] ?? kn?.default)
  }
  return (
    <div className="db-knobs">
      {knobs.filter((k) => !k.requires || on(k.requires)).map((k) => (
        <div key={k.key} className={`db-knob-row${k.kind === 'object' ? ' is-block' : ''}${k.requires ? ' is-child' : ''}`}>
          <Label info={k.help}>{k.label}{k.surface === 'web' && <span className="db-chip">Web</span>}</Label>
          <div className="db-knob-ctl"><KnobInput knob={k} value={values[k.key]} onChange={(v) => onChange(k.key, v)} /></div>
        </div>
      ))}
    </div>
  )
}
