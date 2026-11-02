// Developer mode for a step: the same controls as the plain settings, but
// labelled by the engine's own keys and grouped the way the engine reads them
// (main / interruption / remove for Say). Laid out like the Voice page's
// settings (ProviderEditor's FieldGroup): each key a tile, tiles that belong
// together side by side in one row, round corners only on the group's outer
// edge. A key that isn't set shows the engine's default and stays out of the
// workflow until it is changed; "reset" drops it again.

import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Dropdown, Label, NumberUnit, Tags } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { Toggle } from '#/components/dashboard/ui'
import { MODELS, PROVIDERS, devKeysOf, type DevGroup, type DevKey, type Field, type NodeSpec } from '#/lib/workflow/registry'
import { FieldInput, FieldOptions } from './Fields'

type Props = {
  spec: NodeSpec
  params: Record<string, unknown>
  onParams: (p: Record<string, unknown>) => void
}

type Ctx = {
  params: Record<string, unknown>
  /** The panel has room for two columns (it was widened with the grip). */
  wide: boolean
  /** 0 one column; 1 two columns; 2 three (variables, flags and input_variables in one row). */
  stage: number
  set: (key: string, v: unknown) => void
  patch: (p: Record<string, unknown>) => void
  /** Removes keys, so the engine's defaults apply again. */
  drop: (keys: string[]) => void
}

/** One tile: what it shows, and whether it lays out as label + switch on one line. */
type Cell = {
  key: string; node: React.ReactNode; inline?: boolean; narrow?: boolean
  /** Greyed and not editable. */
  off?: boolean
  /** Arrives with a short grow-in when it appears (a name beside its switch, duration ↔ length). */
  enter?: boolean
  /** Its share of the row's width (speak takes more than hangup). */
  grow?: number
  /** Keeps its row together in a narrow panel (key | value | ×); other rows stack one tile per row. */
  keep?: boolean
}

/** A control for a key no group lists, picked from its current value. */
const guessKind = (v: unknown): Field['kind'] =>
  typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'number' : typeof v === 'string' ? 'text'
    : Array.isArray(v) && v.every((x) => typeof x === 'string') ? 'list' : 'json'

const flat = (g: DevGroup): DevKey[] => [...g.keys, ...(g.groups ?? []).flatMap(flat)]

export function DevSettings({ spec, params, onParams }: Props) {
  const groups = spec.dev ?? []
  const listed = new Set(devKeysOf(groups))
  // Anything the step holds that no group lists, so developer mode never hides a key.
  const internal = new Set(spec.internal ?? [])
  const other = Object.keys(params).filter((k) => !listed.has(k) && !internal.has(k)).map((key): DevKey => ({ key, default: undefined, kind: guessKind(params[key]) }))
  const id = groups.length ? 'other' : 'parameters'
  const all = other.length ? [...groups, { id, title: id, keys: other }] : groups

  const box = useRef<HTMLDivElement>(null)
  const stage = useStage(box)
  const wide = stage > 0

  const ctx: Ctx = {
    params,
    wide,
    stage,
    set: (key, v) => {
      const next = { ...params }
      if (v === undefined) delete next[key]
      else next[key] = v
      // A key that only matters while its switch is on goes with it, all the way down
      // (remove → remove_tts → remove_tts_name).
      if (!v) {
        const gone = new Set([key])
        for (const k of all.flatMap(flat)) if (k.requires && gone.has(k.requires)) { delete next[k.key]; gone.add(k.key) }
      }
      onParams(next)
    },
    patch: (p) => onParams({ ...params, ...p }),
    // Dropping a switch drops what needs it too, all the way down.
    drop: (keys) => {
      const gone = new Set(keys)
      for (const k of all.flatMap(flat)) if (k.requires && gone.has(k.requires)) gone.add(k.key)
      onParams(Object.fromEntries(Object.entries(params).filter(([x]) => !gone.has(x))))
    },
  }

  if (!all.length) return <p className="wf-help">This step has no parameters.</p>
  // One group (Listen, Branch): its sections directly, with no main to open.
  const only = all.length === 1 && !all[0].lead ? all[0] : null
  return (
    <div ref={box} className={`wf-dev is-stage-${stage}${wide ? ' is-wide' : ''}${only ? ' is-flat' : ''}`}>
      {only ? <Parts group={only} sections={sectionsOf(only, ctx)} ctx={ctx} /> : all.map((g) => <Group key={g.id} group={g} ctx={ctx} />)}
    </div>
  )
}

/** Widths at which the sections rearrange: two columns, then three. */
const STAGES = [620, 900]

/**
 * The layout stage for the panel's width. It changes only when the width crosses a
 * stage, and the sections then glide from their old places to their new ones (FLIP:
 * measure, rearrange, animate the difference). Done by hand, not with a view
 * transition, so the motion stays inside the panel's scroll area and is clipped by
 * it instead of sliding over the step's title.
 */
function useStage(box: React.RefObject<HTMLDivElement | null>) {
  const [stage, setStage] = useState(0)
  const before = useRef<Map<string, DOMRect> | null>(null)
  const stageOf = (w: number) => STAGES.filter((at) => w >= at).length
  const parts = () => [...(box.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])]

  useLayoutEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let cur = stageOf(el.clientWidth)
    setStage(cur)
    const ro = new ResizeObserver(([e]) => {
      const next = stageOf(e.contentRect.width)
      if (next === cur) return
      cur = next
      before.current = new Map(parts().map((p) => [p.dataset.flip!, p.getBoundingClientRect()]))
      setStage(next)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [box])

  useLayoutEffect(() => {
    const old = before.current
    before.current = null
    if (!old || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    for (const p of parts()) {
      const was = old.get(p.dataset.flip!)
      if (!was) continue
      const now = p.getBoundingClientRect()
      const dx = was.left - now.left
      const dy = was.top - now.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      p.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2, .8, .2, 1)' })
    }
  }, [stage])
  return stage
}

/**
 * Shows or hides its children by opening or closing their height, with a short fade and
 * slide, so a setting that appears (interruption_metadata, remove_stt…) visibly grows out
 * of what caused it. While closing it keeps the last children, so they leave as they came.
 */
export function Reveal({ show, children, className = '' }: { show: boolean; children: React.ReactNode; className?: string }) {
  const last = useRef(children)
  if (show) last.current = children
  const [mounted, setMounted] = useState(show)
  const [open, setOpen] = useState(show)
  useEffect(() => {
    if (show) {
      setMounted(true)
      // Next frame, so the closed state is painted first and the opening transitions.
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
      return () => cancelAnimationFrame(id)
    }
    setOpen(false)
    const t = setTimeout(() => setMounted(false), 260)
    return () => clearTimeout(t)
  }, [show])
  if (!mounted) return null
  return (
    <div className={`wf-reveal${open ? ' is-open' : ''} ${className}`} aria-hidden={!show || undefined}>
      <div className="wf-reveal-in">{show ? children : last.current}</div>
    </div>
  )
}

/** A group as the Voice page's "More settings" row, or, for a led group, as its key's control. */
function Group({ group, ctx }: { group: DevGroup; ctx: Ctx }) {
  const [open, setOpen] = useState(group.id === 'main' || group.id === 'parameters')
  const keys = devKeysOf([group])
  const setCount = keys.filter((k) => k in ctx.params).length
  const sections = sectionsOf(group, ctx)
  const lead = group.lead ? group.keys.find((k) => k.key === group.lead) : undefined
  if (lead) return <LedGroup group={group} lead={lead} sections={sections.filter((sec) => sec.id !== lead.key)} ctx={ctx} />
  return (
    <div className={`db-more wf-dev-group${open ? ' is-open' : ''}`}>
      <button type="button" className="db-more-btn db-more-row" onClick={() => setOpen(!open)} aria-expanded={open}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
        {group.title} <span className="db-more-n">{setCount}/{keys.length}</span>
      </button>
      <Reveal show={open}><Parts group={group} sections={sections} ctx={ctx} /></Reveal>
    </div>
  )
}

/**
 * A group that is its lead key's control: the remove switch, the interruption_type
 * dropdown. While that turns nothing on it is just the control. Once it does, a chevron
 * fades in and the rest of the group opens below it: the control has become an expander.
 */
function LedGroup({ group, lead, sections, ctx }: { group: DevGroup; lead: DevKey; sections: Section[]; ctx: Ctx }) {
  const active = sections.some((sec) => sec.show !== false)
  const [open, setOpen] = useState(true)
  // Turning it on always shows what it turned on.
  const was = useRef(active)
  useEffect(() => { if (active && !was.current) setOpen(true); was.current = active }, [active])
  const cell = keyCell(lead, ctx, false)
  return (
    <div className={`wf-dev-lead${active ? ' is-active' : ''}${active && open ? ' is-open' : ''}`}>
      <div className="wf-dev-lead-row" data-flip={`lead-${group.id}`}>
        <header className="wf-dev-part-head wf-dev-lead-head">
          <KeyLabel k={lead} ctx={ctx} />
          <button type="button" className="wf-dev-lead-chev" aria-label={open ? `Hide ${group.title} settings` : `Show ${group.title} settings`}
            aria-expanded={active && open} tabIndex={active ? 0 : -1} onClick={() => setOpen(!open)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </header>
        <Tiles rows={[[cell]]} />
      </div>
      <Reveal show={active && open}><Parts group={group} sections={sections} ctx={ctx} /></Reveal>
    </div>
  )
}

/** A group's sections in the stage's columns, each opening or closing as it starts or stops applying. */
function Parts({ group, sections, ctx }: { group: DevGroup; sections: Section[]; ctx: Ctx }) {
  return (
    <div className="wf-dev-parts">
      {sections.map((sec) => (
        <Reveal key={sec.id} show={sec.show !== false} className={`wf-dev-slot${sec.span || !ctx.wide ? ' is-span' : ''}`}>
          <section className="wf-dev-part" data-flip={`${group.id}-${sec.id}`}>
            <header className="wf-dev-part-head">{sec.head}</header>
            {sec.blocks.map((b, i) => (
              <div key={i} className="wf-dev-block">
                {b.title && <span className="wf-dev-block-title"><Label info={b.info}>{b.title}</Label></span>}
                <Tiles rows={b.rows} stack={!ctx.wide} />
                {b.after}
              </div>
            ))}
          </section>
        </Reveal>
      ))}
    </div>
  )
}

/** A run of tiles inside a section, with an optional small title and something after it (an add button). */
type Block = { title?: string; info?: string; rows: Cell[][]; after?: React.ReactNode }
type Section = {
  id: string; head: React.ReactNode; blocks: Block[]
  /** False while what it needs is off: it closes away rather than greying out. */
  show?: boolean
  /** Takes the full width in the two-column layout (out_dict). */
  span?: boolean
}

/**
 * A group's sections: each key its own (out_dict, variables, flags…), headed by
 * the key; a joined sub-group is one section, its keys side by side in a row.
 */
function sectionsOf(group: DevGroup, ctx: Ctx): Section[] {
  // A switch that isn't set counts as its default (summariser is on unless turned off).
  const defaultOf = (key: string) => flat(group).find((k) => k.key === key)?.default
  const on = (key?: string) => !key || !!(key in ctx.params ? ctx.params[key] : defaultOf(key))
  const out: Section[] = []
  if (group.join) {
    // A switch and what it switches on: the switch shows once what it needs is on (remove),
    // and the keys it needs slide in beside it once it is on.
    const inside = (k: DevKey) => !!k.requires && group.keys.some((x) => x.key === k.requires)
    const outer = group.keys.find((k) => k.requires && !inside(k))?.requires
    const head: DevKey = { key: group.title, default: false, kind: 'bool', help: group.help, owns: group.keys.map((k) => k.key) }
    out.push({
      id: group.id,
      show: on(outer),
      head: <KeyLabel k={head} ctx={ctx} />,
      blocks: [{ rows: [group.keys.filter((k) => !inside(k) || on(k.requires)).map((k) => ({ ...keyCell(k, ctx, true), enter: inside(k) }))] }],
    })
  } else {
    for (const k of group.keys) {
      const blocks: Block[] =
        k.kind === 'outdict' ? outDictBlocks(k, ctx)
        : k.kind === 'interruptmeta' ? interruptMetaBlocks(k, ctx)
        : k.kind === 'listenvars' ? listenBlocks(k, ctx)
        : k.kind === 'summarycfg' ? summaryBlocks(k, ctx)
        : k.kind === 'branchmaps' ? branchBlocks(k, ctx)
        : [{ rows: [[keyCell(k, ctx, false)]] }]
      const reads = k.kind === 'interruptmeta' ? [...BY_TIME, ...BY_WORDS].includes(String(ctx.params.interruption_type ?? 'full')) : true
      out.push({ id: k.key, head: <KeyLabel k={k} ctx={ctx} />, blocks, show: on(k.requires) && reads, span: ['outdict', 'listenvars', 'prompt', 'returntype', 'branchmaps', 'summarycfg'].includes(k.kind) })
    }
  }
  for (const g of group.groups ?? []) out.push(...sectionsOf(g, ctx))
  return out
}

/** Rows of tiles; each tile is round only where it touches the group's outer edge. */
function Tiles({ rows: given, stack }: { rows: Cell[][]; stack?: boolean }) {
  // Narrow panel: a row of tiles whose controls can't shrink (steppers, pickers) stacks instead of running off the edge.
  const rows = stack ? given.flatMap((row) => (row.length > 1 && !row.some((c) => c.keep) ? row.map((c) => [c]) : [row])) : given
  if (!rows.length) return null
  return (
    <div className="db-fgroup">
      {rows.map((row, r) => (
        <div className="db-fgroup-row wf-dev-row" key={r}>
          {row.map((c, i) => {
            const corner = [
              r === 0 && i === 0 ? 'tl' : '', r === 0 && i === row.length - 1 ? 'tr' : '',
              r === rows.length - 1 && i === 0 ? 'bl' : '', r === rows.length - 1 && i === row.length - 1 ? 'br' : '',
            ].filter(Boolean).join(' ')
            return (
              <div key={c.key} className={`db-field db-fcell${c.inline ? ' is-inline' : ''}${c.narrow ? ' wf-dev-narrow' : ''}${c.off ? ' wf-dev-off' : ''}${c.enter ? ' wf-dev-enter' : ''}`}
                data-corner={corner || undefined} aria-disabled={c.off || undefined} style={c.grow ? { flexGrow: c.grow } : undefined}>
                {c.node}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** The key's label, with "default" or "reset" beside it. */
function KeyLabel({ k, ctx, name = k.key }: { k: DevKey; ctx: Ctx; name?: string }) {
  const isSet = [k.key, ...(k.owns ?? [])].some((x) => x in ctx.params)
  return (
    <span className="wf-dev-label">
      <Label info={k.help}>{name}</Label>
      {isSet
        ? k.default !== undefined && <button type="button" className="wf-dev-reset" title="Back to the engine default" onClick={() => ctx.drop([k.key, ...(k.owns ?? [])])}><Icon name="rotate" size={12} />reset</button>
        : <em>default</em>}
    </span>
  )
}

/** A key's tile. In its own section the heading names it, so the tile holds the control only. */
function keyCell(k: DevKey, ctx: Ctx, labelled: boolean, off = false): Cell {
  const { params, set, patch } = ctx
  const value = k.key in params ? params[k.key] : k.default
  const field: Field = { key: k.key, label: k.key, kind: k.kind, options: k.options?.map((o) => ({ value: o, label: o })) }
  const control =
    k.kind === 'bool' ? <Toggle on={!!value} onChange={(b) => (b === !!k.default ? ctx.drop([k.key]) : set(k.key, b))} />
    // A fixed set: pick one; hovering an option shows what it does.
    : k.choices ? <Dropdown value={String(value ?? '')} options={k.choices} aria-label={k.key} onChange={(v) => (k.key === 'interruption_type' ? setInterruptType(v, ctx)
      : k.key === 'service' ? patch({ service: v, model: MODELS[v]?.[0]?.value ?? '' })
      : set(k.key, v))} />
    // A free string with known presets: type one, or pick from the list.
    : k.kind === 'select' && k.options ? <Combo value={String(value ?? '')} options={k.options} label={k.key} disabled={off} onChange={(v) => set(k.key, v)} />
    : k.kind === 'vars' || k.kind === 'schema' ? <VarPick value={value} asTypes={k.kind === 'schema'} onChange={(v) => set(k.key, v)} />
    : k.kind === 'returntype' ? <FieldInput field={{ ...field, kind: 'schema' }} value={value} params={params} onChange={(v) => set(k.key, v)} onPatch={patch} />
    : k.kind === 'branchon' ? <BranchOn value={value} ctx={ctx} />
    : <FieldInput field={field} value={value} params={{ ...params, [k.key]: value }} onChange={(v) => set(k.key, v)} onPatch={patch} />
  const cell = (node: React.ReactNode): Cell => ({ key: k.key, inline: k.kind === 'bool', off, node })
  if (!labelled) return cell(k.kind === 'bool' ? <><span className="wf-dev-state">{value ? 'On' : 'Off'}</span>{control}</> : control)
  return cell(<><Label info={k.help}>{k.key}</Label>{control}</>)
}

const BY_TIME = ['duration', 'inverse_duration']
const BY_WORDS = ['word_length', 'inverse_word_length']

/** Changing the type keeps only the metadata the new type reads, with a starting value for it. */
function setInterruptType(type: string, ctx: Ctx) {
  const meta = { ...((ctx.params.interruption_metadata ?? {}) as Record<string, unknown>) }
  if (BY_TIME.includes(type)) { delete meta.length; meta.duration ??= 2 }
  else if (BY_WORDS.includes(type)) { delete meta.duration; meta.length ??= 12 }
  else { delete meta.duration; delete meta.length }
  if (type === 'no') delete meta['ignore-words']
  ctx.patch({ interruption_type: type, interruption_metadata: meta })
}

/** interruption_metadata as tiles: duration or length (whichever the type reads), then ignore-words. */
function interruptMetaBlocks(k: DevKey, ctx: Ctx): Block[] {
  const type = String(ctx.params.interruption_type ?? 'full')
  const meta = (ctx.params[k.key] ?? {}) as Record<string, unknown>
  const put = (key: string, v: unknown) => {
    const next = { ...meta }
    if (v === undefined || (Array.isArray(v) && !v.length)) delete next[key]
    else next[key] = v
    ctx.set(k.key, next)
  }
  const raw = meta['ignore-words']
  const ignore = Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? raw.split(/\s+/).filter(Boolean) : []

  const rows: Cell[][] = []
  if (BY_TIME.includes(type)) rows.push([{ key: 'duration', enter: true, node: <>
    <Label info={type === 'duration' ? 'The caller can cut in only during the first this many seconds of a reply.' : 'The first this many seconds of a reply are protected; after that the caller can cut in.'}>duration</Label>
    <NumberUnit value={Number(meta.duration ?? 0)} unit="sec" min={0} step={0.5} onChange={(v) => put('duration', v)} />
  </> }])
  if (BY_WORDS.includes(type)) rows.push([{ key: 'length', enter: true, node: <>
    <Label info={type === 'word_length' ? 'Replies shorter than this many words can be cut into; longer ones always finish.' : 'Replies longer than this many words can be cut into; shorter ones always finish.'}>length</Label>
    <NumberUnit value={Number(meta.length ?? 0)} unit="words" min={0} step={1} onChange={(v) => put('length', v)} />
  </> }])
  rows.push([{ key: 'ignore', node: <>
    <Label info="Words the caller says that do not count as cutting in, like okay or hmm. Note: the call service does not apply this list yet (filter_text is only used in its tests).">ignore-words</Label>
    <Tags value={ignore} placeholder="okay, haan, hmm" onChange={(v) => put('ignore-words', v)} />
  </> }])
  return [{ rows }]
}

/** summariser_config (agent/summariser_.py): summarise once either threshold is reached, keeping the last turns as they were. */
function summaryBlocks(k: DevKey, ctx: Ctx): Block[] {
  const cfg = (ctx.params[k.key] ?? {}) as Record<string, unknown>
  const put = (key: string, v: unknown) => {
    const next = { ...cfg }
    if (v === undefined || v === '') delete next[key]
    else next[key] = v
    ctx.set(k.key, next)
  }
  const num = (key: string, def: number, unit: string, info: string): Cell => ({ key, node: <>
    <Label info={info}>{key}</Label>
    <NumberUnit value={Number(cfg[key] ?? def)} unit={unit} min={0} step={1} onChange={(v) => put(key, v)} />
  </> })
  const when = [num('max-turns', 2, 'turns', 'Summarise once the conversation has this many turns.'), num('max-len', 1000, 'words', 'Or once it has this many words.')]
  const keep = num('leave-last', 1, 'turns', 'The most recent turns kept word for word.')
  const service: Cell = { key: 'service', node: <>
    <Label info="Which provider writes the summary. Default groq.">service</Label>
    <Dropdown value={String(cfg.service ?? 'groq')} options={PROVIDERS.map((o) => ({ value: o.value, label: o.value, info: o.label }))} aria-label="service" onChange={(v) => put('service', v)} />
  </> }
  const model: Cell = { key: 'model', node: <>
    <Label info="Default openai/gpt-oss-20b.">model</Label>
    <input className="db-in" spellCheck={false} placeholder="openai/gpt-oss-20b" value={String(cfg.model ?? '')} onChange={(e) => put('model', e.target.value)} />
  </> }
  const prompt: Cell = { key: 'prompt', node: <>
    <Label info="How to summarise. Empty uses the built-in summariser prompt.">prompt</Label>
    <textarea className="db-in" rows={3} placeholder="Built-in summariser prompt" value={String(cfg.prompt ?? '')} onChange={(e) => put('prompt', e.target.value)} />
  </> }
  return [
    { title: 'When', rows: ctx.wide ? [[...when, keep]] : [when, [keep]] },
    { title: 'With', rows: ctx.wide ? [[service, model], [prompt]] : [[service], [model], [prompt]] },
  ]
}

/** Branch's input_variables: one value to decide on (only the first name is read). */
function BranchOn({ value, ctx }: { value: unknown; ctx: Ctx }) {
  const { variables } = useContext(FieldOptions)
  const cur = Object.keys((value ?? {}) as object)[0] ?? ''
  // Lists and groups can't be compared to a word.
  const usable = variables.filter((v) => v.type !== 'list' && v.type !== 'dict')
  const opts = usable.map((v) => ({ value: v.value, label: v.value, hint: v.type, info: v.description ?? `No description on this variable. Type: ${v.type}.` }))
  if (cur && !opts.some((o) => o.value === cur)) opts.unshift({ value: cur, label: cur, hint: '', info: 'Not produced by any step in this workflow.' })
  return <Dropdown value={cur} options={opts} placeholder="Choose a value" aria-label="input_variables"
    onChange={(name) => {
      const type = variables.find((v) => v.value === name)?.type ?? 'str'
      const maps = (ctx.params.mappings ?? {}) as Record<string, unknown>
      // A yes/no starts with its two paths.
      ctx.patch({ input_variables: { [name]: type }, ...(type === 'bool' ? { mappings: { true: maps.true ?? '', false: maps.false ?? '' } } : {}) })
    }} />
}

/**
 * Branch mappings: each key | where its line leads | ×, then default if there is one,
 * then where it goes when nothing matches (the step's next). Routes are the lines on
 * the canvas; renaming a key carries its line along.
 */
function branchBlocks(k: DevKey, ctx: Ctx): Block[] {
  const maps = (ctx.params[k.key] ?? {}) as Record<string, unknown>
  const put = (next: Record<string, unknown>) => ctx.set(k.key, next)
  const rename = (from: string, to: string) => put(Object.fromEntries(Object.entries(maps).map(([x, v]) => [x === from ? to : x, v])))
  const nextName = () => { let i = 1; while (`value${i}` in maps) i++; return `value${i}` }
  const rows: Cell[][] = Object.keys(maps).map((key, i) => {
    const keyCell: Cell = { key: `k${i}`, node: <>
      <Label>{key === 'default' ? 'default' : 'value'}</Label>
      <input className="db-in" spellCheck={false} value={key} placeholder="e.g. booking" onChange={(e) => rename(key, e.target.value)} />
    </> }
    const to: Cell = { key: `r${i}`, grow: 2, node: <><Label>leads to</Label><RouteTo handle={`m:${key}`} /></> }
    const x: Cell = { key: `x${i}`, narrow: true, keep: true, node: <button type="button" className="wf-dev-x" aria-label={`Remove ${key}`}
      onClick={() => put(Object.fromEntries(Object.entries(maps).filter(([y]) => y !== key)))}><Icon name="close" size={16} /></button> }
    return [keyCell, to, x]
  })
  const otherwise: Cell[] = [{ key: 'next', node: <>
    <Label info={'default' in maps ? 'Never reached while a default path exists.' : 'When the value matches no key and there is no default.'}>no match → next</Label>
    <RouteTo handle="next" />
  </> }]
  const add = <button type="button" className="wf-dev-add" onClick={() => put({ ...maps, [nextName()]: '' })}><Icon name="plus" size={15} />Add a value</button>
  return [
    { title: 'Paths', rows, after: add },
    { title: 'Otherwise', rows: [otherwise] },
  ]
}

/** Where a path's line on the canvas leads, as chips that open that step. */
function RouteTo({ handle }: { handle: string }) {
  const { routes, goTo } = useContext(FieldOptions)
  const to = routes?.[handle] ?? []
  if (!to.length) return <span className="wf-dev-route is-none">Not connected: drag from this path's dot on the card</span>
  return <span className="wf-dev-route">{to.map((t) => <button key={t} type="button" className="wf-pick is-on" onClick={() => goTo?.(t)} title={`Open ${t}`}>→ <code>{t}</code></button>)}</span>
}

const VAR_TYPES = ['str', 'bool', 'int', 'float', 'list', 'dict'].map((t) => ({ value: t, label: t }))

/**
 * Listen's input_variables, split by where each value comes from on a turn
 * (tasks/llm_/task_.py): the caller's words arrive as user_input; with the flow's
 * dominance check on, intervention comes with them; anything else only arrives when
 * your page or app sends it (typed input, `{agent: {...}}`), so a voice call would
 * wait on it forever. Each entry is a type, or {type, description}.
 */
function listenBlocks(k: DevKey, ctx: Ctx): Block[] {
  const vars = (ctx.params[k.key] ?? {}) as Record<string, unknown>
  const typeOf = (v: unknown) => (typeof v === 'string' ? v : String((v as { type?: unknown } | null)?.type ?? 'str'))
  const descOf = (v: unknown) => (v && typeof v === 'object' ? String((v as { description?: unknown }).description ?? '') : '')
  // A description makes the entry {type, description}; without one it stays a bare type.
  const entry = (type: string, description: string) => (description.trim() ? { type, description } : type)
  const put = (next: Record<string, unknown>) => ctx.set(k.key, next)
  const setVar = (name: string, type: string, description: string) => put({ ...vars, [name]: entry(type, description) })
  const toggle = (name: string, on: boolean) => {
    if (on) put({ ...vars, [name]: 'str' })
    else { const next = { ...vars }; delete next[name]; put(next) }
  }
  const rename = (from: string, to: string) => put(Object.fromEntries(Object.entries(vars).map(([x, v]) => [x === from ? to : x, v])))
  const nextName = () => { let i = 1; while (`value${i}` in vars) i++; return `value${i}` }

  const described = (name: string): Cell => ({ key: `${name}-d`, grow: 2, enter: true, node: <>
    <Label info="Optional. Shown when this value is picked in another step's variables or input_variables.">description</Label>
    <input className="db-in" placeholder="What this value is" value={descOf(vars[name])} onChange={(e) => setVar(name, typeOf(vars[name]), e.target.value)} />
  </> })
  const builtIn = (name: string, info: string): Cell[][] => {
    const on = name in vars
    const sw: Cell = { key: name, inline: true, node: <>
      <Label info={info}>{name}</Label>
      <Toggle on={on} onChange={(b) => toggle(name, b)} />
    </> }
    if (!on) return [[sw]]
    return ctx.wide ? [[sw, described(name)]] : [[sw], [described(name)]]
  }

  const custom = Object.keys(vars).filter((n) => n !== 'user_input' && n !== 'intervention')
  const customRows: Cell[][] = []
  custom.forEach((name, i) => {
    const nameCell: Cell = { key: `n${i}`, node: <>
      <Label>name</Label>
      <input className="db-in" spellCheck={false} value={name} onChange={(e) => rename(name, e.target.value)} />
    </> }
    const typeCell: Cell = { key: `t${i}`, node: <>
      <Label info="What kind of value your page sends.">type</Label>
      <Dropdown value={typeOf(vars[name])} options={VAR_TYPES} aria-label={`${name} type`} onChange={(t) => setVar(name, t, descOf(vars[name]))} />
    </> }
    const x: Cell = { key: `x${i}`, narrow: true, keep: true, node: <button type="button" className="wf-dev-x" aria-label={`Remove ${name}`} onClick={() => toggle(name, false)}><Icon name="close" size={16} /></button> }
    const d = { ...described(name), key: `d${i}` }
    // Wide: name | type | description | ×; narrow: name | type | × over the description.
    if (ctx.wide) customRows.push([nameCell, typeCell, d, x])
    else customRows.push([nameCell, typeCell, x], [d])
  })
  const add = <button type="button" className="wf-dev-add" onClick={() => put({ ...vars, [nextName()]: 'str' })}><Icon name="plus" size={15} />Add a value from your page</button>
  const warn = custom.length > 0
    ? <p className="wf-dev-note">Voice calls never send these, so a call reaching this step waits until your page sends {custom.map((n, i) => <span key={n}>{i ? ', ' : ''}<code>{n}</code></span>)}.</p>
    : null

  return [
    { title: "The caller's speech", rows: builtIn('user_input', 'What the caller said, as text. Set on every spoken turn.') },
    { title: 'Dominance check', info: "The flow's dominance setting watches for the caller dominating or derailing the conversation and, when it steps in, sends why as intervention with the turn. It is off unless the flow sets it; the dashboard has no switch for it yet.",
      rows: builtIn('intervention', 'Why the dominance check stepped in, or empty. Only sent while the dominance setting is on.') },
    { title: 'Sent by your page or app', rows: customRows, after: <>{warn}{add}</> },
  ]
}

/** out_dict as two sets of tiles: speak and hangup; then each other pair as key | value | remove, with Add a key below. */
function outDictBlocks(k: DevKey, ctx: Ctx): Block[] {
  const out = (ctx.params[k.key] ?? {}) as Record<string, unknown>
  const { speak, hangup, ...rest } = out
  const put = (next: Record<string, unknown>) => ctx.set(k.key, next)
  const patchOut = (patch: Record<string, unknown>) => {
    const next = { ...out, ...patch }
    for (const x of Object.keys(patch)) if (patch[x] === undefined) delete next[x]
    put(next)
  }
  const setRest = (r: Record<string, unknown>) => put({ ...(speak !== undefined ? { speak } : {}), ...(hangup !== undefined ? { hangup } : {}), ...r })
  const rename = (from: string, to: string) => setRest(Object.fromEntries(Object.entries(rest).map(([x, v]) => [x === from ? to : x, v])))
  const nextName = () => { let i = 1; while (`key${i}` in rest) i++; return `key${i}` }

  const speakCell: Cell = { key: 'speak', grow: 3, node: <>
      <Label info="What the caller hears.">speak</Label>
      <textarea className="db-in" rows={2} value={typeof speak === 'string' ? speak : ''} placeholder="Hi! Thanks for calling…" onChange={(e) => patchOut({ speak: e.target.value || undefined })} />
    </> }
  const hangupCell: Cell = { key: 'hangup', inline: true, node: <>
      <Label info="Ends the call once this is spoken.">hangup</Label>
      <Toggle on={!!hangup} onChange={(b) => patchOut({ hangup: b || undefined })} />
    </> }
  // Wide panel: hangup sits to the right of speak; narrow: under it.
  const spoken: Cell[][] = ctx.wide ? [[speakCell, hangupCell]] : [[speakCell], [hangupCell]]
  const pairs: Cell[][] = []
  Object.entries(rest).forEach(([name, v], i) => pairs.push([
    { key: `k${i}`, node: <>
      <Label>key</Label>
      <input className="db-in" spellCheck={false} placeholder="key" value={name} onChange={(e) => rename(name, e.target.value)} />
    </> },
    { key: `v${i}`, node: <>
      <Label>value</Label>
      {typeof v === 'boolean'
        ? <Toggle on={v} onChange={(b) => setRest({ ...rest, [name]: b })} />
        : <input className="db-in" placeholder="value" value={typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v)}
            readOnly={typeof v === 'object' && v !== null} title={typeof v === 'object' && v !== null ? 'Edit this in the code view' : undefined}
            onChange={(e) => setRest({ ...rest, [name]: e.target.value })} />}
    </> },
    { key: `x${i}`, narrow: true, keep: true, node: <button type="button" className="wf-dev-x" aria-label={`Remove ${name}`}
      onClick={() => setRest(Object.fromEntries(Object.entries(rest).filter(([x]) => x !== name)))}><Icon name="close" size={16} /></button> },
  ]))
  const add = <button type="button" className="wf-dev-add" onClick={() => setRest({ ...rest, [nextName()]: '' })}><Icon name="plus" size={15} />Add a key</button>
  // What is spoken, and the other keys sent with it, as two separate sets of tiles.
  return [
    { title: 'Spoken', rows: spoken },
    { title: 'Other keys', rows: pairs, after: add },
  ]
}

/** A combo box: a text input with its presets in a list under the arrow. */
function Combo({ value, options, label, onChange, disabled }: { value: string; options: string[]; label: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  return (
    <div className={`wf-combo${open ? ' is-open' : ''}`} ref={box}>
      <input className="db-in" spellCheck={false} aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} />
      <button type="button" className="wf-combo-btn" aria-label={`${label} presets`} aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <ul className="wf-combo-list" role="listbox">
          {options.map((o) => (
            <li key={o} role="option" aria-selected={o === value}>
              <button type="button" className={o === value ? 'is-on' : ''} onClick={() => { onChange(o); setOpen(false) }}>
                {o === value && <Icon name="check" size={14} />}{o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Values from earlier steps, picked from a dropdown and shown as removable chips.
 * `variables` is a list of names; `input_variables` maps each name to its type.
 * Hovering an option shows the variable's own description.
 */
function VarPick({ value, asTypes, onChange }: { value: unknown; asTypes: boolean; onChange: (v: unknown) => void }) {
  const { variables } = useContext(FieldOptions)
  // The chip whose description is open; clicking a chip shows it, only its × removes it.
  const [shown, setShown] = useState<string | null>(null)
  const map = asTypes && value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const names = asTypes ? Object.keys(map) : Array.isArray(value) ? value.map(String) : []
  // The pipeline's own outputs can always be passed along, even before a step produces them.
  const known: { value: string; type: string; description?: string }[] = [...variables, ...(asTypes ? [] : ['speak', 'hangup'].map((v) => ({ value: v, type: 'str' })))]
  const descOf = (name: string) => known.find((v) => v.value === name && v.description)?.description
  const left = known.filter((v, i) => !names.includes(v.value) && known.findIndex((x) => x.value === v.value) === i)
  const add = (name: string) => {
    const type = known.find((v) => v.value === name)?.type ?? 'str'
    onChange(asTypes ? { ...map, [name]: type } : [...names, name])
  }
  const remove = (name: string) => {
    if (asTypes) { const next = { ...map }; delete next[name]; onChange(next) }
    else onChange(names.filter((n) => n !== name))
  }
  return (
    <div className="wf-devpick">
      {names.length > 0 && (
        <div className="wf-chips">
          {names.map((n) => (
            <span key={n} className={`wf-pick is-on wf-devchip${shown === n ? ' is-shown' : ''}`}>
              <button type="button" className="wf-devchip-name" aria-expanded={shown === n} title={descOf(n)}
                onClick={() => setShown(shown === n ? null : n)}>
                <code>{n}</code>{asTypes && <small>{String(map[n])}</small>}
              </button>
              <button type="button" className="wf-devchip-x" aria-label={`Remove ${n}`} onClick={() => { remove(n); if (shown === n) setShown(null) }}>
                <Icon name="close" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      {shown && names.includes(shown) && (
        <p className="wf-devchip-desc"><code>{shown}</code> {descOf(shown) ?? 'No description on this variable.'}</p>
      )}
      <Dropdown value={undefined} placeholder={left.length ? 'Add a value…' : 'Nothing else to add'} aria-label="Add a value"
        options={left.map((v) => ({ value: v.value, label: v.value, hint: v.type, info: v.description ?? `No description on this variable. Type: ${v.type}.` }))} onChange={add} />
    </div>
  )
}
