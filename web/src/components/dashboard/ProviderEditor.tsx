// Edits one STT or TTS provider config: provider tiles, the main settings, and
// the rest under "More settings". Keys the form doesn't list are kept as-is.

import { useState } from 'react'

import { STT_PROVIDERS, TTS_PROVIDERS, activeFields, providerFor, type ProviderField } from '#/lib/dashboard/providers'
import type { ProviderConfig } from '#/lib/dashboard/types'
import { Dropdown, Label, NumberUnit, Slider, Tags } from './controls'
import { Toggle } from './ui'

export default function ProviderEditor({ kind, value, onChange }: { kind: 'stt' | 'tts'; value: ProviderConfig | null; onChange: (v: ProviderConfig) => void }) {
  const list = kind === 'stt' ? STT_PROVIDERS : TTS_PROVIDERS
  // Nothing set yet: show nothing as chosen. Showing the first provider as if
  // picked left nothing to click (it looked selected) and so nothing to save.
  const unset = !value?.service
  const cfg = value ?? { service: list[0].service, ...list[0].defaults }
  const prov = providerFor(kind, cfg.service)
  const [more, setMore] = useState(false)

  const set = (k: string, v: unknown) => {
    const next = { ...cfg }
    if (v === '' || v === undefined || (Array.isArray(v) && !v.length)) delete next[k]
    else next[k] = v
    onChange(next)
  }

  const fields = prov && !unset ? activeFields(prov, cfg) : []
  const basic = fields.filter((f) => f.basic)
  const rest = fields.filter((f) => !f.basic)

  return (
    <div className="db-provider">
      {/* Providers as one connected group; the chosen one is filled. */}
      <div className="db-provtiles db-provgroup" role="radiogroup" aria-label="Provider">
        {list.map((p) => (
          <button key={p.service} type="button" role="radio" aria-checked={!unset && p.service === cfg.service}
            className={`db-provtile${!unset && p.service === cfg.service ? ' is-on' : ''}`}
            onClick={() => (unset || p.service !== cfg.service) && onChange({ service: p.service, ...p.defaults })}>
            <b>{p.label}</b>
            <span>{p.blurb}</span>
          </button>
        ))}
        {!unset && !prov && <div className="db-provtile is-on"><b>{cfg.service}</b><span>Custom provider</span></div>}
      </div>

      {unset && (
        <p className="db-provider-unset">
          Not set up yet. Pick a provider above to {kind === 'stt' ? 'let your agent hear callers' : 'give your agent a voice'}, then save.
        </p>
      )}

      {basic.length > 0 && <FieldGroup fields={basic} cfg={cfg} set={set} />}

      {rest.length > 0 && (
        <div className={`db-more${more ? ' is-open' : ''}`}>
          <button type="button" className="db-more-btn db-more-row" onClick={() => setMore(!more)} aria-expanded={more}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
            More settings <span className="db-more-n">{rest.length}</span>
          </button>
          {more && <FieldGroup fields={rest} cfg={cfg} set={set} />}
        </div>
      )}
    </div>
  )
}

/**
 * Fields as connected rows, like the Echobotics opening form: short fields share a row
 * (up to three), sliders go two to a row, tag lists take a whole row below. Each cell
 * gets round corners only where it touches the group's outer edge.
 */
function FieldGroup({ fields, cfg, set }: { fields: ProviderField[]; cfg: ProviderConfig; set: (k: string, v: unknown) => void }) {
  const size = (f: ProviderField) => (f.kind === 'tags' ? 'wide' : f.kind === 'slider' ? 'slider' : 'short')
  const MAX = { short: 3, slider: 2, wide: 1 } as const
  const rows: ProviderField[][] = []
  for (const f of fields) {
    const last = rows[rows.length - 1]
    if (last && size(last[0]) === size(f) && last.length < MAX[size(f)]) last.push(f)
    else rows.push([f])
  }
  return (
    <div className="db-fgroup">
      {rows.map((row, r) => (
        <div className="db-fgroup-row" key={r}>
          {row.map((f, c) => {
            const corner = [
              r === 0 && c === 0 ? 'tl' : '', r === 0 && c === row.length - 1 ? 'tr' : '',
              r === rows.length - 1 && c === 0 ? 'bl' : '', r === rows.length - 1 && c === row.length - 1 ? 'br' : '',
            ].filter(Boolean).join(' ')
            return <FieldCtl key={`${f.key}-${f.label}`} f={f} value={cfg[f.key]} onChange={(v) => set(f.key, v)} corner={corner} />
          })}
        </div>
      ))}
    </div>
  )
}

function FieldCtl({ f, value, onChange, corner }: { f: ProviderField; value: unknown; onChange: (v: unknown) => void; corner?: string }) {
  const v = value ?? f.default
  const wide = f.kind === 'tags'
  return (
    <div className={`db-field db-fcell${wide ? ' is-wide' : ''}${f.kind === 'bool' ? ' is-inline' : ''}`} data-corner={corner || undefined}>
      <Label info={f.help}>{f.label}</Label>
      {f.kind === 'select' && <Dropdown value={v as string} options={f.options ?? []} onChange={onChange} aria-label={f.label} />}
      {f.kind === 'bool' && <Toggle on={!!v} onChange={onChange} />}
      {f.kind === 'slider' && <Slider value={Number(v ?? f.min ?? 0)} min={f.min ?? 0} max={f.max ?? 1} step={f.step ?? 0.1} unit={f.unit} onChange={onChange} />}
      {f.kind === 'number' && <NumberUnit value={v as number | undefined} unit={f.unit} min={f.min} max={f.max} step={f.step} onChange={onChange} />}
      {f.kind === 'text' && <input className="db-in" placeholder={f.placeholder} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />}
      {f.kind === 'tags' && <Tags value={Array.isArray(value) ? value.map(String) : typeof value === 'string' && value ? [value] : []} placeholder={f.placeholder} onChange={onChange} />}
    </div>
  )
}
