// One input per registry FieldKind, built on the dashboard controls. Each
// takes the current value and reports a new one; empty values come back as
// undefined so the key is dropped.

import { createContext, useContext, useEffect, useState } from 'react'

import { Dropdown, NumberUnit, Tags } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { AiGlow, Toggle } from '#/components/dashboard/ui'
import { INTERRUPT_OPTIONS, MODELS, SPECIAL_OUTPUTS, friendlyVar, type Field } from '#/lib/workflow/registry'

/** Things fields need from outside the workflow, e.g. the account's knowledge bases. */
export const FieldOptions = createContext<{
  knowledge: { value: string; label: string; hint?: string }[]
  /** Values earlier steps produce, for Branch and "Pass along". */
  variables: { value: string; type: string }[]
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
    case 'select':
      return <Dropdown value={str(value)} options={field.options ?? []} onChange={onChange} aria-label={field.label} />
    case 'model': {
      const opts = MODELS[str(params.service)] ?? []
      const all = value && !opts.some((o) => o.value === value) ? [{ value: str(value), label: str(value) }, ...opts] : opts
      return <Dropdown value={str(value)} options={all} onChange={onChange} aria-label="Model" />
    }
    case 'knowledge': {
      const all = value && !knowledge.some((k) => k.value === value) ? [{ value: str(value), label: str(value) }, ...knowledge] : knowledge
      return all.length
        ? <Dropdown value={str(value)} options={all} placeholder="Choose a knowledge base" onChange={onChange} aria-label="Knowledge base" />
        : <input className="db-in" placeholder="Knowledge base name" value={str(value)} onChange={(e) => onChange(e.target.value)} />
    }
    case 'prompt':
      return <Prompt value={typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)} placeholder={field.placeholder} onChange={onChange} />
    case 'speak': {
      const out = obj(value)
      return (
        <textarea className="db-in wf-speak" rows={4} placeholder={field.placeholder} value={str(out.speak)}
          onChange={(e) => onChange({ ...out, speak: e.target.value })} />
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
      return <Mappings value={obj(value)} onChange={onChange} />
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
      const opts = variables.map((v) => ({ value: v.value, label: friendlyVar(v.value), hint: TYPE_WORD[v.type] }))
      if (cur && !opts.some((o) => o.value === cur)) opts.unshift({ value: cur, label: friendlyVar(cur), hint: '' })
      return <Dropdown value={cur} options={opts} placeholder="Choose what to check" aria-label="Decide on"
        onChange={(k) => onChange({ [k]: variables.find((v) => v.value === k)?.type ?? 'str' })} />
    }
  }
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

function Prompt({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (v: unknown) => void }) {
  const [big, setBig] = useState(false)
  const area = (
    <AiGlow>
      <textarea className={`db-in wf-prompt${big ? ' is-big' : ''}`} value={value} placeholder={placeholder} spellCheck
        onChange={(e) => onChange(e.target.value)} autoFocus={big} />
    </AiGlow>
  )
  return (
    <div className="wf-prompt-wrap">
      {big ? (
        <div className="db-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setBig(false)}>
          <div className="db-dialog is-wide wf-promptdialog">
            <div className="db-dialog-head">
              <h2 className="db-h2">Instructions</h2>
              <button className="db-iconbtn" onClick={() => setBig(false)} aria-label="Close"><Icon name="close" size={20} /></button>
            </div>
            {area}
          </div>
        </div>
      ) : area}
      <div className="wf-prompt-foot">
        <span>{value.trim() ? `${value.trim().split(/\s+/).length.toLocaleString()} words` : 'Empty'}</span>
        <button type="button" className="db-copyjson" onClick={() => setBig(true)}><Icon name="eye" size={14} />Open large</button>
      </div>
    </div>
  )
}

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
      <div className="wf-special">
        <span><b>End the call</b><small>Hang up after saying this</small></span>
        <Toggle on={!!value.hangup} onChange={(b) => onChange(b ? { ...value, hangup: true } : drop(value, 'hangup'))} />
      </div>
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

/** Path names only; where each path goes is drawn on the canvas. */
function Mappings({ value, onChange }: { value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  return (
    <div className="wf-rows">
      {Object.keys(value).map((k, i) => (
        <div className="wf-row wf-pathrow" key={i}>
          <span className="wf-pathdot" />
          <input className="db-in" value={k} placeholder="e.g. yes" title={k === 'true' ? 'Matches yes' : k === 'false' ? 'Matches no' : undefined}
            onChange={(e) => onChange(renameKey(value, k, e.target.value))} />
          <button type="button" className="db-iconbtn" aria-label="Remove path" onClick={() => onChange(drop(value, k))}><Icon name="close" size={15} /></button>
        </div>
      ))}
      <button type="button" className="db-add" onClick={() => onChange({ ...value, [nextKey(value, 'path')]: '' })}>+ Add path</button>
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
