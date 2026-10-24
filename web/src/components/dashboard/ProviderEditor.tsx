// Edits one STT or TTS provider config: provider tiles, the main settings, and
// the rest under "More settings". Keys the form doesn't list are kept as-is.

import { useState } from 'react'
import { PlayIcon, XIcon } from 'lucide-react'

import { PROVIDER_NOTES, STT_PROVIDERS, TTS_PROVIDERS, activeFields, providerFor, sampleVoiceOf, type ProviderField } from '#/lib/dashboard/providers'
import SAMPLES from '#/lib/dashboard/voice-samples.json'
import type { ProviderConfig } from '#/lib/dashboard/types'
import { Dropdown, Label, NumberUnit, Slider, Tags } from './controls'
import { Toggle } from './ui'
import { AudioPlayer } from './kit/AudioPlayer'

export default function ProviderEditor({ kind, value, onChange }: { kind: 'stt' | 'tts'; value: ProviderConfig | null; onChange: (v: ProviderConfig) => void }) {
  const list = kind === 'stt' ? STT_PROVIDERS : TTS_PROVIDERS
  // Nothing set yet: show nothing as chosen. Showing the first provider as if
  // picked left nothing to click (it looked selected) and so nothing to save.
  const unset = !value?.service
  const cfg = value ?? { service: list[0].service, ...list[0].defaults }
  const prov = providerFor(kind, cfg.service)
  const [more, setMore] = useState(false)
  // The sample player stays open while the person tries voices, so each new pick plays at once.
  const [hearing, setHearing] = useState(false)

  const set = (k: string, v: unknown) => {
    const next = { ...cfg }
    if (v === '' || v === undefined || (Array.isArray(v) && !v.length)) delete next[k]
    else next[k] = v
    // Turning speaker labels on starts with one speaker: the agent listens only to the first voice.
    if (k === 'enable-speaker-diarization' && cfg.service === 'soniox') {
      if (v === true) next['max-speakers'] ??= 1
      else delete next['max-speakers']
    }
    onChange(next)
  }

  const fields = prov && !unset ? activeFields(prov, cfg) : []
  const sample = kind === 'tts' && !unset ? sampleOf(cfg) : undefined
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
            {/* The reason to pick it, then where it handles the audio. */}
            {PROVIDER_NOTES[kind][p.service] && <em className="db-provtile-best">{PROVIDER_NOTES[kind][p.service].best}</em>}
            <span>{p.blurb}</span>
            {PROVIDER_NOTES[kind][p.service] && <small className="db-provtile-region">Audio processed in {PROVIDER_NOTES[kind][p.service].region}</small>}
          </button>
        ))}
        {!unset && !prov && <div className="db-provtile is-on"><b>{cfg.service}</b><span>Custom provider</span></div>}
      </div>

      {unset && (
        <p className="db-provider-unset">
          Not set up yet. Pick a provider above to {kind === 'stt' ? 'let your agent hear callers' : 'give your agent a voice'}, then save.
        </p>
      )}

      {basic.length > 0 && <FieldGroup fields={basic} cfg={cfg} set={set} sample={sample}
        sampleButton={<PlaySampleButton open={hearing} onToggle={() => setHearing(!hearing)} />} />}
      {hearing && sample && (
        <div className="db-sampleplayer">
          <span className="db-sampleplayer-label">Sample of {voiceLabel(prov, cfg, sample.key)}</span>
          <AudioPlayer key={sample.url} src={sample.url} bars={56} compact />
        </div>
      )}

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
function FieldGroup({ fields, cfg, set, sample, sampleButton }: { fields: ProviderField[]; cfg: ProviderConfig; set: (k: string, v: unknown) => void; sample?: { key: string; url: string }; sampleButton?: React.ReactNode }) {
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
            return <FieldCtl key={`${f.key}-${f.label}`} f={f} value={cfg[f.key]} onChange={(v) => set(f.key, v)} corner={corner}
              extra={sample && sample.key === f.key ? sampleButton : undefined} />
          })}
        </div>
      ))}
    </div>
  )
}

function FieldCtl({ f, value, onChange, corner, extra }: { f: ProviderField; value: unknown; onChange: (v: unknown) => void; corner?: string; extra?: React.ReactNode }) {
  const v = value ?? f.default
  const wide = f.kind === 'tags'
  return (
    <div className={`db-field db-fcell${wide ? ' is-wide' : ''}${f.kind === 'bool' ? ' is-inline' : ''}`} data-corner={corner || undefined}>
      <Label info={f.help}>{f.label}</Label>
      {f.kind === 'select' && (extra
        ? <span className="db-fcell-with">{<Dropdown value={v as string} options={f.options ?? []} onChange={onChange} aria-label={f.label} />}{extra}</span>
        : <Dropdown value={v as string} options={f.options ?? []} onChange={onChange} aria-label={f.label} />)}
      {f.kind === 'bool' && <Toggle on={!!v} onChange={onChange} />}
      {f.kind === 'slider' && <Slider value={Number(v ?? f.min ?? 0)} min={f.min ?? 0} max={f.max ?? 1} step={f.step ?? 0.1} unit={f.unit} onChange={onChange} />}
      {f.kind === 'number' && <NumberUnit value={v as number | undefined} unit={f.unit} min={f.min} max={f.max} step={f.step} onChange={onChange} />}
      {f.kind === 'text' && <input className="db-in" placeholder={f.placeholder} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />}
      {f.kind === 'tags' && <Tags value={Array.isArray(value) ? value.map(String) : typeof value === 'string' && value ? [value] : []} placeholder={f.placeholder} onChange={onChange} />}
    </div>
  )
}

/** Where this config's voice has a sample (scripts/voice-samples.py), and which field picks the voice. */
function sampleOf(cfg: ProviderConfig): { key: string; url: string } | undefined {
  const voice = sampleVoiceOf(cfg)
  if (!voice || !((SAMPLES as Record<string, string[]>)[cfg.service] ?? []).includes(voice)) return undefined
  return { key: cfg.service === 'deepgram' ? 'model' : 'voice', url: `/api/voice-sample?service=${encodeURIComponent(cfg.service)}&voice=${encodeURIComponent(voice)}` }
}

/** Opens and closes the sample player under the voice settings. */
function PlaySampleButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`db-playsample${open ? ' is-on' : ''}`} onClick={onToggle} aria-expanded={open}>
      {open ? <XIcon size={18} /> : <PlayIcon size={18} />}
      <span>{open ? 'Close sample' : 'Play sample'}</span>
    </button>
  )
}

/** The chosen voice's name as the dropdown shows it ("Thalia"), for the player's label. */
function voiceLabel(prov: ReturnType<typeof providerFor>, cfg: ProviderConfig, key: string) {
  const v = String(cfg[key] ?? '')
  return prov?.fields.find((f) => f.key === key && f.options?.some((o) => o.value === v))?.options?.find((o) => o.value === v)?.label ?? v
}
