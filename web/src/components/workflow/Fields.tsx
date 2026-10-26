// One input per registry FieldKind, built on the dashboard controls. Each
// takes the current value and reports a new one; empty values come back as
// undefined so the key is dropped.

import { createContext, useContext, useEffect, useState } from 'react'

import { Dropdown, NumberUnit, Slider, Tags } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { AiGlow, Toggle } from '#/components/dashboard/ui'
import { GrowArea } from './GrowArea'
import { INTERRUPT_OPTIONS, MODELS, PROVIDERS, SPECIAL_OUTPUTS, friendlyVar, prettyName, speaksAi, type Field } from '#/lib/workflow/registry'
import { useModels } from '#/lib/workflow/useModels'
import { SegmentTabs } from '#/components/dashboard/kit/SegmentTabs'
import { toast } from '#/components/ui/halo-toast'

/** Things fields need from outside the workflow, e.g. the account's knowledge bases. */
export const FieldOptions = createContext<{
  knowledge: { value: string; label: string; hint?: string }[]
  /** Values earlier steps produce, for Branch and "Pass along". */
  variables: { value: string; type: string }[]
  /** For the open step: where each of its outputs leads (handle → step names), and a way to jump there. */
  routes?: Record<string, string[]>
  goTo?: (id: string) => void
  /** The open step's id, e.g. to name its own memory. */
  stepId?: string
  /** Conversation memories the workflow's AI steps use (history_key values). */
  memories?: string[]
}>({ knowledge: [], variables: [] })

type Props = {
  field: Field
  value: unknown
  params: Record<string, unknown>
  onChange: (v: unknown) => void
  /** For fields that own more than one key (interruption type + its settings). */
  onPatch: (patch: Record<string, unknown>) => void
}

const TYPES = [
  { value: 'str', label: 'Text' },
  { value: 'bool', label: 'Yes / no' },
  { value: 'int', label: 'Whole number' },
  { value: 'float', label: 'Number' },
  { value: 'list', label: 'List' },
  { value: 'dict', label: 'Group of values' },
]

export function FieldInput({ field, value, params, onChange, onPatch }: Props) {
  const { knowledge, variables } = useContext(FieldOptions)
  switch (field.kind) {
    case 'text':
      return <input className="db-in" placeholder={field.placeholder} value={str(value)} onChange={(e) => onChange(e.target.value || undefined)} />
    case 'number':
      return <NumberUnit value={value as number | undefined} step={Number.isInteger(value ?? 1) ? 1 : 0.1} onChange={onChange} />
    case 'bool':
      return <Toggle on={!!value} onChange={onChange} />
    case 'hangup': {
      const out = obj(value)
      return <Toggle on={!!out.hangup} onChange={(b) => onChange(b ? { ...out, hangup: true } : drop(out, 'hangup'))} />
    }
    case 'saymode': {
      const vars = Array.isArray(params.variables) ? params.variables.map(String) : []
      const out = obj(value)
      return <SegmentTabs label="What it says" value={speaksAi(params) ? 'ai' : 'words'} options={SAY_MODES}
        onChange={(m) => m === 'ai'
          ? onPatch({ out_dict: drop(out, 'speak'), variables: [...new Set([...vars, 'speak'])] })
          : onPatch({ out_dict: { ...out, speak: String(out.speak ?? '') }, variables: vars.filter((v) => v !== 'speak' && v !== 'hangup') })} />
    }
    case 'aihangup': {
      const vars = Array.isArray(value) ? value.map(String) : []
      return <Toggle on={vars.includes('hangup')} onChange={(b) => onChange(b ? [...vars, 'hangup'] : vars.filter((v) => v !== 'hangup'))} />
    }
    case 'decides':
      return <Decides value={obj(value)} onChange={onChange} />
    case 'canend': {
      const cur = obj(value)
      return <Toggle on={'hangup' in cur} onChange={(b) => onChange(b ? { ...cur, hangup: RETURN_FIELDS.hangup } : drop(cur, 'hangup'))} />
    }
    case 'memory':
      return <Memory value={str(value)} onChange={onChange} />
    case 'percent':
      return <Slider value={Math.round(Number(value ?? 1) * 100)} min={0} max={100} step={5} unit="%" onChange={(v) => onChange(v / 100)} />
    case 'select':
      // Switching the AI provider also picks that provider's first model: the old model id means nothing there.
      if (field.key === 'service' && field.options === PROVIDERS) {
        return <Dropdown value={str(value)} options={field.options} aria-label={field.label}
          onChange={(service) => onPatch({ service, model: MODELS[service]?.[0]?.value ?? '' })} />
      }
      return <Dropdown value={str(value)} options={field.options ?? []} onChange={onChange} aria-label={field.label} />
    case 'model':
      return <ModelPicker service={str(params.service)} model={str(value)} onPatch={onPatch} />
    case 'knowledge': {
      const all = value && !knowledge.some((k) => k.value === value) ? [{ value: str(value), label: str(value) }, ...knowledge] : knowledge
      return all.length
        ? <Dropdown value={str(value)} options={all} placeholder="Choose a knowledge base" onChange={onChange} aria-label="Knowledge base" />
        : <input className="db-in" placeholder="Knowledge base name" value={str(value)} onChange={(e) => onChange(e.target.value)} />
    }
    case 'prompt':
      return <>
        <GrowArea title={field.label} minRows={4} value={typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)} placeholder={field.placeholder}
        onChange={onChange} className="wf-prompt" glow={(a) => <AiGlow>{a}</AiGlow>} />
        {/* An empty box starts from an example rather than nothing. */}
        {!str(value).trim() && (
          <div className="wf-chips wf-examples">
            <span>Start from an example:</span>
            {PROMPT_EXAMPLES.map((x) => <button type="button" key={x.label} className="wf-pick" onClick={() => onChange(x.text)}>{x.label}</button>)}
          </div>
        )}
      </>
    case 'speak': {
      const out = obj(value)
      return (
        // Empty is fine: the step then says nothing and only passes its values along.
        <GrowArea title={field.label} value={str(out.speak)} placeholder={`${field.placeholder ?? ''} (leave empty to say nothing)`}
          onChange={(t) => { const { speak: _s, ...rest } = out; onChange(t ? { ...out, speak: t } : rest) }} />
      )
    }
    case 'list':
      return <Tags value={Array.isArray(value) ? value.map(String) : []} placeholder="Type and press Enter" onChange={onChange} />
    case 'kv':
      return <KV value={obj(value)} onChange={onChange} />
    case 'typemap':
      return <TypeMap value={obj(value)} onChange={onChange} />
    case 'schema':
      return <Schema value={obj(value)} onChange={onChange} />
    case 'mappings':
      return <Mappings value={obj(value)} onChange={onChange} yesNo={typeOfDecision(params, variables) === 'bool'} />

    case 'json':
      return <JsonEdit value={value} onChange={onChange} />
    case 'seconds':
      return <NumberUnit value={value as number | undefined} unit="sec" min={0} step={0.5} onChange={onChange} />
    case 'interrupt':
      return <Interrupt type={str(value) || 'full'} meta={obj(params.interruption_metadata)}
        onChange={(type, meta) => onPatch({ interruption_type: type, interruption_metadata: meta })} />
    case 'vars': {
      const on = new Set(Array.isArray(value) ? value.map(String) : [])
      if (!variables.length) return <p className="db-muted wf-small">Nothing from earlier steps yet.</p>
      return (
        <div className="wf-chips">
          {variables.map((v) => (
            <button type="button" key={v.value} className={`wf-pick${on.has(v.value) ? ' is-on' : ''}`}
              onClick={() => onChange(on.has(v.value) ? [...on].filter((x) => x !== v.value) : [...on, v.value])}>
              {on.has(v.value) && <Icon name="check" size={13} />}{friendlyVar(v.value)}
            </button>
          ))}
        </div>
      )
    }
    case 'listen': {
      const cur = obj(value)
      const names = Object.keys(cur)
      return (
        <div className="wf-schema-list">
          {names.map((k, i) => (
            <div key={i} className={`wf-schema${k === 'user_input' ? ' is-special' : ''}`}>
              <div className="wf-row">
                {k === 'user_input' ? (
                  <span className="wf-special-name"><b>What the caller said</b><small>Their words, as text</small></span>
                ) : (
                  <>
                    <input className="db-in wf-key" value={k} placeholder="Name" aria-label="Name" onChange={(e) => onChange(renameKey(cur, k, e.target.value))} />
                    <Dropdown value={typeof cur[k] === 'string' ? String(cur[k]) : 'str'} options={TYPES} onChange={(t) => onChange({ ...cur, [k]: t })} aria-label="Kind" />
                  </>
                )}
                {names.length > 1 && <button type="button" className="db-iconbtn" aria-label="Remove" onClick={() => onChange(drop(cur, k))}><Icon name="close" size={15} /></button>}
              </div>
            </div>
          ))}
          <div className="wf-chips">
            {!('user_input' in cur) && (
              <button type="button" className="wf-pick" onClick={() => onChange({ user_input: 'str', ...cur })}><Icon name="plus" size={13} />What the caller said</button>
            )}
            <button type="button" className="wf-pick" onClick={() => onChange({ ...cur, [nextKey(cur, 'answer')]: 'str' })}><Icon name="plus" size={13} />Another name</button>
          </div>
        </div>
      )
    }
    case 'decideon': {
      const cur = Object.keys(obj(value))[0] ?? ''
      // Yes/no answers first; lists and groups (conversation history…) can't be branched on.
      const usable = variables.filter((v) => v.type !== 'list' && v.type !== 'dict').sort((a, b) => Number(b.type === 'bool') - Number(a.type === 'bool'))
      const opts = usable.map((v) => ({ value: v.value, label: friendlyVar(v.value), hint: TYPE_WORD[v.type] }))
      if (cur && !opts.some((o) => o.value === cur)) opts.unshift({ value: cur, label: friendlyVar(cur), hint: '' })
      return <Dropdown value={cur} options={opts} placeholder="Choose what to check" aria-label="Decide on"
        onChange={(k) => {
          const type = variables.find((v) => v.value === k)?.type ?? 'str'
          // A yes/no gets its two paths at once; Otherwise is always there.
          const maps = obj(params.mappings)
          onPatch({ input_variables: { [k]: type }, ...(type === 'bool' ? { mappings: { true: maps.true ?? '', false: maps.false ?? '' } } : {}) })
        }} />
    }
  }
}

const SAY_MODES = [{ value: 'words', label: 'These words' }, { value: 'ai', label: 'What the AI decided' }] as const

const PROMPT_EXAMPLES = [
  { label: 'Friendly assistant', text: 'You are a friendly, concise voice assistant. Keep replies to one or two sentences.' },
  { label: 'Takes a message', text: 'You take messages. Ask for the caller’s name, a number to call back and the reason, one at a time. Then read all three back, thank them and say someone will call back soon. Keep each reply short.' },
  { label: 'Short survey', text: 'Ask three short survey questions, one at a time. Set hangup to true once all three are answered.' },
]

/** The two answers the pipeline acts on by itself, as the templates describe them. */
const RETURN_FIELDS = {
  speak: { type: 'str', description: 'What to say to the caller.' },
  hangup: { type: 'bool', description: 'True once the conversation is over.' },
}

/** AI thinks: the answers people understand as switches; anything else stays in Developer settings. */
/** One picker for provider and model together: "GPT-OSS 120B · Groq". OpenRouter's whole live catalogue is in it; type to search. */
function ModelPicker({ service, model, onPatch }: { service: string; model: string; onPatch: Props['onPatch'] }) {
  const models = useModels()
  const all = PROVIDERS.flatMap((p) => (models[p.value] ?? []).map((m) => ({ ...m, value: `${p.value}::${m.value}`, hint: `${m.hint ? `${m.hint} · ` : ''}${p.label}` })))
  const cur = `${service}::${model}`
  const opts = model && !all.some((o) => o.value === cur) ? [{ value: cur, label: model, hint: service }, ...all] : all
  return <Dropdown value={cur} options={opts} aria-label="Model"
    onChange={(v) => { const [svc, ...m] = v.split('::'); onPatch({ service: svc, model: m.join('::') }) }} />
}

function Decides({ value, onChange }: { value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  const others = Object.keys(value).filter((k) => !(k in RETURN_FIELDS)).length
  const flip = (k: keyof typeof RETURN_FIELDS, on: boolean) => onChange(on ? { ...value, [k]: RETURN_FIELDS[k] } : drop(value, k))
  return (
    <div className="wf-decides">
      <label className="wf-decide"><span><b>What to say next</b><small>A Say step after it speaks this</small></span><Toggle on={'speak' in value} onChange={(b) => flip('speak', b)} /></label>
      <label className="wf-decide"><span><b>Whether the call is over</b><small>A Branch can act on it, or a Say can hang up</small></span><Toggle on={'hangup' in value} onChange={(b) => flip('hangup', b)} /></label>
      {others > 0 && <p className="wf-help">Also decides {others} other thing{others === 1 ? '' : 's'}, under Developer settings.</p>}
    </div>
  )
}

/** Shared memory as a choice of the memories in this workflow, never free text (a typo splits it). */
function Memory({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
  const { memories = [], stepId } = useContext(FieldOptions)
  const own = `${stepId ?? 'step'}_memory`
  const name = (m: string) => (m === 'conversation_history' ? 'The main conversation' : prettyName(m.replace(/^conversation_history_?/, '') || m))
  const all = [...new Set(['conversation_history', ...memories, ...(value ? [value] : [])])]
  const opts = [...all.map((m) => ({ value: m, label: name(m), hint: m === own ? 'Only this step' : undefined })), ...(all.includes(own) ? [] : [{ value: own, label: 'Its own memory', hint: 'Only this step' }])]
  return <Dropdown value={value || 'conversation_history'} options={opts} onChange={onChange} aria-label="Shares memory with" />
}

const TYPE_WORD: Record<string, string> = { str: 'Text', bool: 'Yes / no', int: 'Number', float: 'Number', list: 'List', dict: 'Group' }

/** Interruption behaviour plus the one setting it needs, and words that don't count. */
function Interrupt({ type, meta, onChange }: { type: string; meta: Record<string, unknown>; onChange: (type: string, meta: Record<string, unknown>) => void }) {
  const byTime = type === 'duration' || type === 'inverse_duration'
  const byWords = type === 'word_length' || type === 'inverse_word_length'
  const ignore = Array.isArray(meta['ignore-words']) ? (meta['ignore-words'] as unknown[]).map(String) : typeof meta['ignore-words'] === 'string' ? String(meta['ignore-words']).split(/\s+/).filter(Boolean) : []
  const set = (k: string, v: unknown) => {
    const next = { ...meta }
    if (v === undefined || (Array.isArray(v) && !v.length)) delete next[k]
    else next[k] = v
    onChange(type, next)
  }
  return (
    <div className="wf-interrupt">
      <Dropdown value={type} options={INTERRUPT_OPTIONS} aria-label="If the caller interrupts"
        onChange={(t) => {
          const m: Record<string, unknown> = { ...meta }
          if (t === 'duration' || t === 'inverse_duration') { delete m.length; m.duration ??= 2 }
          else if (t === 'word_length' || t === 'inverse_word_length') { delete m.duration; m.length ??= 12 }
          else { delete m.duration; delete m.length }
          onChange(t, m)
        }} />
      {byTime && (
        <div className="wf-subrow">
          <span>{type === 'duration' ? 'Can interrupt for the first' : 'Protected for the first'}</span>
          <NumberUnit value={Number(meta.duration ?? 2)} unit="sec" min={0} step={0.5} onChange={(v) => set('duration', v)} />
        </div>
      )}
      {byWords && (
        <div className="wf-subrow">
          <span>{type === 'word_length' ? 'Replies shorter than' : 'Replies longer than'}</span>
          <NumberUnit value={Number(meta.length ?? 12)} unit="words" min={1} step={1} onChange={(v) => set('length', v)} />
        </div>
      )}
      {type !== 'no' && (
        <div className="wf-subrow is-col">
          <span>Words that don’t count as interrupting</span>
          <Tags value={ignore} placeholder="okay, haan, hmm" onChange={(v) => set('ignore-words', v)} />
        </div>
      )}
    </div>
  )
}

const str = (v: unknown) => (v == null ? '' : String(v))
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Renames a key without reordering the object. */
function renameKey(o: Record<string, unknown>, from: string, to: string) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k === from ? to : k, v]))
}
const nextKey = (o: object, base: string) => {
  let i = 1
  while (`${base}${i}` in o) i++
  return `${base}${i}`
}
const drop = (o: Record<string, unknown>, k: string) => Object.fromEntries(Object.entries(o).filter(([x]) => x !== k))

function KV({ value, onChange }: { value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  const rows = Object.entries(value).filter(([k]) => k !== 'speak' && k !== 'hangup')
  return (
    <div className="wf-rows">
      {rows.map(([k, v], i) => (
        <div className="wf-row" key={i}>
          <input className="db-in wf-key" value={k} placeholder="Name" onChange={(e) => onChange(renameKey(value, k, e.target.value))} />
          {typeof v === 'string' || typeof v === 'number'
            ? <input className="db-in" value={String(v)} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
            : typeof v === 'boolean' ? <Toggle on={v} onChange={(b) => onChange({ ...value, [k]: b })} />
            : <input className="db-in" value={Array.isArray(v) ? v.join(', ') : JSON.stringify(v)} readOnly title="Edit this in the code view" />}
          <button type="button" className="db-iconbtn" aria-label="Remove" onClick={() => onChange(drop(value, k))}><Icon name="close" size={15} /></button>
        </div>
      ))}
      <button type="button" className="db-add" onClick={() => onChange({ ...value, [nextKey(value, 'detail')]: '' })}>+ Add a detail</button>
    </div>
  )
}

function TypeMap({ value, onChange }: { value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  return (
    <div className="wf-rows">
      {Object.entries(value).map(([k, v], i) => (
        <div className="wf-row" key={i}>
          <input className="db-in wf-key" value={k} onChange={(e) => onChange(renameKey(value, k, e.target.value))} />
          <Dropdown value={typeof v === 'string' ? v : 'str'} options={TYPES} onChange={(t) => onChange({ ...value, [k]: t })} aria-label="Kind" />
          <button type="button" className="db-iconbtn" aria-label="Remove" onClick={() => onChange(drop(value, k))}><Icon name="close" size={15} /></button>
        </div>
      ))}
      <button type="button" className="db-add" onClick={() => onChange({ ...value, [nextKey(value, 'value')]: 'str' })}>+ Add</button>
    </div>
  )
}

type SchemaEntry = { type?: string; description?: string }

function Schema({ value, onChange }: { value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  return (
    <div className="wf-schema-list">
      {Object.entries(value).map(([k, raw], i) => {
        // Input schemas are sometimes the short form {name: 'str'}; keep that shape.
        const short = typeof raw === 'string'
        const e: SchemaEntry = short ? { type: raw as string } : ((raw ?? {}) as SchemaEntry)
        const put = (patch: SchemaEntry) => onChange({ ...value, [k]: short && !patch.description ? patch.type ?? e.type : { ...e, ...patch } })
        const special = SPECIAL_OUTPUTS[k]
        return (
          <div className={`wf-schema${special ? ' is-special' : ''}`} key={i}>
            <div className="wf-row">
              {special ? (
                <span className="wf-special-name"><b>{special.label}</b><small>{special.note}</small></span>
              ) : (
                <>
                  <input className="db-in wf-key" value={k} placeholder="Name" onChange={(ev) => onChange(renameKey(value, k, ev.target.value))} aria-label="Name" />
                  <Dropdown value={e.type ?? 'str'} options={TYPES} onChange={(t) => put({ type: t })} aria-label="Kind" />
                </>
              )}
              <button type="button" className="db-iconbtn" aria-label="Remove" onClick={() => onChange(drop(value, k))}><Icon name="close" size={15} /></button>
            </div>
            {!short && (
              <input className="db-in wf-desc" placeholder="Describe it — the AI reads this" value={e.description ?? ''}
                onChange={(ev) => put({ description: ev.target.value })} />
            )}
          </div>
        )
      })}
      <div className="wf-chips">
        {Object.keys(SPECIAL_OUTPUTS).filter((k) => !(k in value)).map((k) => (
          <button type="button" key={k} className="wf-pick" onClick={() => onChange({ ...value, [k]: { type: k === 'speak' ? 'str' : k === 'hangup' ? 'bool' : 'list', description: SPECIAL_OUTPUTS[k].note } })}>
            <Icon name="plus" size={13} />{SPECIAL_OUTPUTS[k].label}
          </button>
        ))}
        <button type="button" className="wf-pick" onClick={() => onChange({ ...value, [nextKey(value, 'detail')]: { type: 'str', description: '' } })}>
          <Icon name="plus" size={13} />Something else
        </button>
      </div>
    </div>
  )
}

/** What a Branch decides on is: yes/no, or text, from the step that produces it. */
function typeOfDecision(params: Record<string, unknown>, variables: { value: string; type: string }[]) {
  const [k, v] = Object.entries(obj(params.input_variables))[0] ?? []
  if (!k) return ''
  return variables.find((x) => x.value === k)?.type ?? (typeof v === 'string' ? v : str((v as { type?: unknown } | undefined)?.type))
}

/** A Branch's paths, where each leads, and Otherwise. Yes/no paths are fixed; text paths match exactly. */
function Mappings({ value, onChange, yesNo }: { value: Record<string, unknown>; onChange: (v: unknown) => void; yesNo: boolean }) {
  const { routes, goTo } = useContext(FieldOptions)
  const to = (h: string) => routes?.[h] ?? []
  const remove = (k: string) => {
    onChange(drop(value, k))
    // Its line goes with it (the editor drops lines of removed paths); say so.
    const lines = to(`m:${k}`)
    if (lines.length) toast.success(`Removed the “${k}” path`, `Its line to ${lines.map(prettyName).join(', ')} went too. Undo (Ctrl+Z) brings it back.`)
  }
  const where = (h: string) => to(h).length
    ? to(h).map((t) => <button key={t} type="button" className="wf-pathto-chip" onClick={() => goTo?.(t)} title={`Open ${prettyName(t)}`}>→ {prettyName(t)}</button>)
    : <span className="wf-pathto-none">Not connected yet: drag from this path’s dot on the card</span>
  return (
    <div className="wf-rows">
      {!yesNo && <p className="wf-help">A path is taken when the answer is exactly its word, like “booking”. Tell the AI the words to use in its instructions.</p>}
      {Object.keys(value).map((k, i) => (
        <div className="wf-row wf-pathrow" key={i}>
          <span className="wf-pathdot" />
          {k === 'true' || k === 'false'
            ? <span className="wf-pathname">{k === 'true' ? 'Yes' : 'No'}</span>
            : <input className="db-in" value={k} placeholder="e.g. maybe" onChange={(e) => onChange(renameKey(value, k, e.target.value))} />}
          {!yesNo && <button type="button" className="db-iconbtn" aria-label="Remove path" onClick={() => remove(k)}><Icon name="close" size={18} /></button>}
          <span className="wf-pathto">{where(`m:${k}`)}</span>
        </div>
      ))}
      <div className="wf-row wf-pathrow is-else">
        <span className="wf-pathdot" />
        <span className="wf-pathname">Otherwise</span>
        <span className="wf-pathto">{where('next')}</span>
      </div>
      {!yesNo && <button type="button" className="db-add" onClick={() => onChange({ ...value, [nextKey(value, 'path')]: '' })}>+ Add path</button>}
    </div>
  )
}

export function JsonEdit({ value, onChange, inline, rows = 4 }: { value: unknown; onChange: (v: unknown) => void; inline?: boolean; rows?: number }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, inline ? 0 : 2))
  const [bad, setBad] = useState(false)
  useEffect(() => {
    // Take outside changes, but not while the user's text is mid-edit and invalid.
    try { if (JSON.stringify(JSON.parse(text)) === JSON.stringify(value ?? {})) return } catch { if (bad) return }
    setText(JSON.stringify(value ?? {}, null, inline ? 0 : 2))
  }, [value])
  return (
    <textarea className={`db-in wf-json${bad ? ' is-bad' : ''}`} rows={inline ? 1 : rows} spellCheck={false} value={text}
      onChange={(e) => {
        setText(e.target.value)
        try { onChange(JSON.parse(e.target.value)); setBad(false) } catch { setBad(true) }
      }} />
  )
}
