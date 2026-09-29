// Form controls for the dashboard: a styled dropdown, an (i) tooltip, a slider,
// a stepper, a tags input and a copy-as-JSON button.
//
// Popovers (the dropdown list, its info card, tooltips) are portalled into the
// dashboard root with fixed positioning, so no scrolling card or dialog can clip them.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { Option } from '#/lib/dashboard/providers'
import Icon from './Icon'

// ------------------------------------------------------------ floating layer

/** The `.db` root (so CSS variables still apply), or body. */
function layerFor(el: Element | null): Element | null {
  if (typeof document === 'undefined') return null
  return el?.closest('.db') ?? document.body
}

/** Tracks an element's viewport rect while `active`, following scrolls and resizes. */
function useRect(el: React.RefObject<HTMLElement | null>, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const update = useCallback(() => { if (el.current) setRect(el.current.getBoundingClientRect()) }, [el])
  useLayoutEffect(() => {
    if (!active) return
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [active, update])
  return rect
}

// ------------------------------------------------------------ dropdown

export function Dropdown({ value, options, onChange, placeholder = 'Choose…', info, 'aria-label': aria }: {
  value: string | undefined
  options: Option[]
  onChange: (v: string) => void
  placeholder?: string
  /** Optional per-option notes, keyed by value (in addition to `option.info`). */
  info?: Record<string, string>
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const rect = useRect(btn, open)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? options.filter((o) => `${o.label} ${o.value} ${o.hint ?? ''}`.toLowerCase().includes(t)) : options
  }, [options, q])
  const current = options.find((o) => o.value === value)
  const noteOf = (o?: Option) => (o ? info?.[o.value] ?? o.info : undefined)
  const hasNotes = options.some((o) => noteOf(o))
  const searchable = options.length > 8

  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [open])
  useEffect(() => { if (open) { setQ(''); setHi(Math.max(0, options.findIndex((o) => o.value === value))) } }, [open])

  const pick = (o: Option) => { onChange(o.value); setOpen(false); btn.current?.focus() }
  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter' && list[hi]) { e.preventDefault(); pick(list[hi]) }
  }

  // Place the list under the button (or above if there's no room), and the note beside it.
  let popStyle: React.CSSProperties = {}
  let noteStyle: React.CSSProperties = {}
  if (rect && typeof window !== 'undefined') {
    const width = Math.max(rect.width, 240)
    const below = window.innerHeight - rect.bottom
    const up = below < 320 && rect.top > below
    popStyle = { position: 'fixed', left: Math.min(rect.left, window.innerWidth - width - 8), width, ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) }
    const noteW = 260
    const right = rect.left + width + 10 + noteW < window.innerWidth
    noteStyle = { position: 'fixed', width: noteW, ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }), left: right ? rect.left + width + 10 : Math.max(8, rect.left - noteW - 10) }
  }
  const note = noteOf(list[hi])
  const layer = layerFor(btn.current)

  return (
    <div className={`db-dd${open ? ' is-open' : ''}`} onKeyDown={onKey}>
      <button ref={btn} type="button" className="db-dd-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={aria} onClick={() => setOpen(!open)}>
        <span className="db-dd-val">
          {current ? <>{current.label}{current.hint && <small>{current.hint}</small>}</> : <span className="db-dd-ph">{value || placeholder}</span>}
        </span>
        <svg className="db-dd-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && rect && layer && createPortal(
        <>
          <div ref={pop} className="db-dd-pop" role="listbox" style={popStyle} onKeyDown={onKey}>
            {searchable && (
              <label className="db-dd-search">
                <Icon name="search" size={16} />
                <input autoFocus placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} />
              </label>
            )}
            <div className="db-dd-list">
              {list.map((o, i) => (
                <div key={o.value} role="option" aria-selected={o.value === value}
                  className={`db-dd-opt${o.value === value ? ' is-sel' : ''}${i === hi ? ' is-hi' : ''}`}
                  onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(o) }}>
                  <span className="db-dd-optmain">
                    <span>{o.label}</span>
                    {o.hint && <small>{o.hint}</small>}
                  </span>
                  {noteOf(o) && <span className="db-dd-i" aria-hidden>i</span>}
                  {o.value === value && <Icon name="check" size={16} />}
                </div>
              ))}
              {!list.length && <div className="db-dd-empty">No matches</div>}
            </div>
          </div>
          {hasNotes && note && (
            <div className="db-dd-note" style={noteStyle} role="note">
              <b>{list[hi]?.label}</b>
              <p>{note}</p>
            </div>
          )}
        </>,
        layer,
      )}
    </div>
  )
}

// ------------------------------------------------------------ info tooltip

export function InfoTip({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [show, setShow] = useState(false)
  const rect = useRect(ref, show)
  const layer = layerFor(ref.current)
  let style: React.CSSProperties = {}
  if (rect && typeof window !== 'undefined') {
    const w = 260
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - 8)
    const above = rect.top > 120
    style = { position: 'fixed', width: w, left, ...(above ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }) }
  }
  return (
    <span ref={ref} className="db-info" tabIndex={0} aria-label={text}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)}
      onMouseDown={(e) => e.stopPropagation()}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
      </svg>
      {show && rect && layer && createPortal(<span className="db-info-pop" role="tooltip" style={style}>{text}</span>, layer)}
    </span>
  )
}

/** Label with an optional (i). */
export function Label({ children, info }: { children: React.ReactNode; info?: string }) {
  return <span className="db-flabel">{children}{info && <InfoTip text={info} />}</span>
}

// ------------------------------------------------------------ slider / stepper / tags

export function Slider({ value, min, max, step, unit, onChange }: { value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min || 1)) * 100
  const digits = step < 0.1 ? 2 : step < 1 ? 1 : 0
  return (
    <div className="db-slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties} />
      <span className="db-slider-val">{value.toFixed(digits)}{unit && <small>{unit}</small>}</span>
    </div>
  )
}

/** − value + with the unit inside; the value stays typeable. */
export function NumberUnit({ value, unit, min, max, step = 1, placeholder, onChange }: {
  value: number | undefined; unit?: string; min?: number; max?: number; step?: number; placeholder?: string; onChange: (v: number | undefined) => void
}) {
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  const round = (n: number) => Math.round(n / step) * step
  const nudge = (d: number) => onChange(clamp(round((value ?? min ?? 0) + d * step)))
  return (
    <div className="db-stepper">
      <button type="button" aria-label="Decrease" disabled={value !== undefined && min !== undefined && value <= min} onClick={() => nudge(-1)}>−</button>
      <label>
        <input type="number" min={min} max={max} step={step} placeholder={placeholder} value={value ?? ''}
          // Sized to its digits so the unit sits right next to the number.
          style={{ width: `${Math.max(2, String(value ?? placeholder ?? '').length) + 0.5}ch` }}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          onBlur={() => value !== undefined && onChange(clamp(value))} />
        {unit && <span>{unit}</span>}
      </label>
      <button type="button" aria-label="Increase" disabled={value !== undefined && max !== undefined && value >= max} onClick={() => nudge(1)}>+</button>
    </div>
  )
}

export function Tags({ value, placeholder, onChange }: { value: string[]; placeholder?: string; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('')
  const add = () => {
    const parts = text.split(',').map((x) => x.trim()).filter(Boolean)
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))])
    setText('')
  }
  return (
    <div className="db-tags">
      {value.map((t) => (
        <span key={t} className="db-tag">{t}<button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button></span>
      ))}
      <input value={text} placeholder={value.length ? '' : placeholder} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
        }} onBlur={add} />
    </div>
  )
}

// ------------------------------------------------------------ copy json

export function CopyJson({ value, label = 'Copy JSON' }: { value: unknown; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="db-copyjson" onClick={() => {
      navigator.clipboard?.writeText(JSON.stringify(value, null, 2))
      setDone(true)
      setTimeout(() => setDone(false), 1400)
    }}>
      <Icon name={done ? 'check' : 'copy'} size={15} />{done ? 'Copied' : label}
    </button>
  )
}

// ------------------------------------------------------------ drop zone

/** Drag files here or browse. Calls `onFiles` with what was dropped or chosen. */
export function DropZone({ accept, multiple, title, hint, onFiles }: {
  accept: string
  multiple?: boolean
  title: string
  hint: string
  onFiles: (files: File[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const take = (list: FileList | null) => { if (list?.length) onFiles(Array.from(list)) }
  return (
    <div className={`db-drop${over ? ' is-over' : ''}`} role="button" tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}>
      <span className="db-drop-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      </span>
      <b>{title}</b>
      <span>{hint}</span>
      <span className="db-drop-browse">Browse files</span>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { take(e.target.files); e.target.value = '' }} />
    </div>
  )
}
