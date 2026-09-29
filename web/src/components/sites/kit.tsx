// The widgets real sites are built from, so the agent meets the same things a
// person does. None of them is the browser's own control: the railway's class
// picker is a div that opens a list, the station box suggests as you type and
// only accepts what you pick, and a dialog blocks the page until it is dealt
// with. Every one carries the accessible name a well-built site would give it,
// and nothing else — no ids planted for the agent.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { addDays, DAYS, ddmmyyyy, MONTHS_LONG, parseDdmmyyyy } from '#/lib/sites/util'

function useOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, ref, close])
}

/** A dropdown that is not a <select>: a face you click and a list that opens. */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  searchable = false,
  invalid = false,
  className = '',
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  placeholder?: string
  searchable?: boolean
  invalid?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const list = `${useId()}-list`
  const close = useRef(() => setOpen(false)).current
  useOutside(ref, open, close)

  const shown = searchable && q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options

  return (
    <div ref={ref} className={`k-dd${open ? ' is-open' : ''}${invalid ? ' is-invalid' : ''} ${className}`}>
      <div
        role="combobox"
        tabIndex={0}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={list}
        className="k-dd-face"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
      >
        <span className={value ? 'k-dd-val' : 'k-dd-ph'}>{value || placeholder}</span>
        <span className="k-dd-caret" aria-hidden="true" />
      </div>
      {open ? (
        <div className="k-dd-panel">
          {searchable ? (
            <input
              className="k-dd-filter"
              aria-label={`Search ${label}`}
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          ) : null}
          <ul role="listbox" id={list} aria-label={label}>
            {shown.map((o) => (
              <li
                key={o}
                role="option"
                aria-selected={o === value}
                className={o === value ? 'is-on' : ''}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                  setQ('')
                }}
              >
                {o}
              </li>
            ))}
            {shown.length === 0 ? <li className="k-dd-none">No results found</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/* The station box. Typing does not set anything — only picking a suggestion
   does, exactly like the site it is copied from, which is why "Jaipur" typed
   and left there fails the search with "please select a valid station". */
export function Autocomplete({
  label,
  value,
  onChange,
  source,
  placeholder,
  invalid = false,
  className = '',
  minChars = 2,
  delay = 300,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  source: (q: string) => string[]
  placeholder?: string
  invalid?: boolean
  className?: string
  minChars?: number
  delay?: number
}) {
  const [text, setText] = useState(value)
  const [items, setItems] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const list = `${useId()}-list`

  useEffect(() => {
    if (value) setText(value)
  }, [value])

  useEffect(() => {
    if (text.trim().length < minChars || text === value) {
      setItems([])
      return
    }
    const t = setTimeout(() => {
      setItems(source(text))
      setOpen(true)
    }, delay)
    return () => clearTimeout(t)
  }, [text, value, minChars, delay, source])

  const showing = open && items.length > 0

  return (
    <div className={`k-ac${invalid ? ' is-invalid' : ''} ${className}`}>
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={list}
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (value) onChange('')
        }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {showing ? (
        <ul role="listbox" id={list} aria-label={`${label} suggestions`} className="k-ac-list">
          {items.map((o) => (
            <li
              key={o}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setText(o)
                onChange(o)
                setOpen(false)
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/* Positioned inside the site rather than over the whole window — the site is
   a specimen under glass, and its popups belong to it. The dialog is sticky so
   it stays in view however far down the page the frame has been scrolled. */
export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose?: () => void
  className?: string
}) {
  return (
    <div className="k-modal-back">
      <div role="dialog" aria-modal="true" aria-label={title} className={`k-modal ${className}`}>
        <div className="k-modal-head">
          <span>{title}</span>
          {onClose ? (
            <button type="button" className="k-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>
        <div className="k-modal-body">{children}</div>
      </div>
    </div>
  )
}

/** Something is loading. The agent's hands wait for aria-busy to clear. */
export function Busy({ label = 'Please wait...' }: { label?: string }) {
  return (
    <div className="k-busy" aria-busy="true" role="status">
      <div className="k-busy-card">
        <span className="k-spin" aria-hidden="true" />
        {label}
      </div>
    </div>
  )
}

/** Run `then` after a loading spell of `ms`, showing <Busy/> meanwhile. */
export function useBusy(): [boolean, (ms: number, then: () => void) => void] {
  const [busy, setBusy] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const run = useRef((ms: number, then: () => void) => {
    setBusy(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setBusy(false)
      then()
    }, ms)
  }).current
  return [busy, run]
}

/** A red line under a form, the way these sites say no. */
export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' | 'ok' }) {
  return (
    <div role="alert" className={`k-alert k-alert--${tone}`}>
      {children}
    </div>
  )
}

/** The small grey text every one of these sites ends with, in bulk. */
export function LinkColumns({ columns }: { columns: { head: string; links: string[] }[] }) {
  return (
    <div className="k-linkcols">
      {columns.map((c) => (
        <div key={c.head}>
          <p className="k-linkcols-head">{c.head}</p>
          <ul>
            {c.links.map((l) => (
              <li key={l}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** A typed date box with the month grid these sites pop under it. */
export function DateField({
  label,
  value,
  onChange,
  min,
  maxDays = 60,
  invalid = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  min: Date
  maxDays?: number
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const picked = parseDdmmyyyy(value)
  const [month, setMonth] = useState(() => {
    const base = picked ?? min
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(() => setOpen(false)).current
  useOutside(ref, open, close)

  const max = addDays(min, maxDays)
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const cells: (Date | null)[] = Array(first.getDay()).fill(null)
  for (let d = 1; d <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  }

  return (
    <div ref={ref} className={`k-date${invalid ? ' is-invalid' : ''}`}>
      <input
        type="text"
        aria-label={label}
        placeholder="DD/MM/YYYY"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => onChange(e.target.value)}
      />
      {open ? (
        <div className="k-cal" role="group" aria-label="Calendar">
          <div className="k-cal-head">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
            <span>{MONTHS_LONG[month.getMonth()]} {month.getFullYear()}</span>
            <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="k-cal-grid">
            {DAYS.map((d) => (
              <span key={d} className="k-cal-dow">{d.slice(0, 2)}</span>
            ))}
            {cells.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  aria-label={`${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`}
                  disabled={d < min || d > max}
                  className={picked && +d === +picked ? 'is-on' : ''}
                  onClick={() => {
                    onChange(ddmmyyyy(d))
                    setOpen(false)
                  }}
                >
                  {d.getDate()}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
