// Every dashboard table sits in one of these, after internal-shortlisting's
// tables: a card with a header bar (title and count on the left; search,
// filters and actions on the right), the table, and a "Page X of Y" footer.

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { ArrowUpDownIcon, CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/base-ui/popover'
import Icon from './Icon'

/**
 * A list, laid out like Echobotics' ListToolbar: a section heading, then one
 * connected toolbar (search cell with "x of y" inside it, then each filter as its
 * own cell, 2px apart, round outer ends), the page's actions at its right end,
 * the table in a bordered box, and the pager under it.
 */
export function TableCard({ title, description, search, filters, actions, footer, children, className }: {
  title: ReactNode
  description?: ReactNode
  search?: SearchProps
  /** TableFilter chips; each becomes its own cell. */
  filters?: ReactNode
  /** The page's buttons, at the toolbar's right end. */
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`db-tsection${className ? ` ${className}` : ''}`}>
      <div className="db-tsection-head">
        <h2 className="db-tsection-title">{title}</h2>
        {description && <p className="db-tsection-sub">{description}</p>}
      </div>
      {(search || filters || actions) && (
        <div className="db-ltoolbar">
          {(search || filters) && (
            <div className="db-ltoolbar-cells" role="group" aria-label="Search and filters">
              {search && <TableSearch {...search} />}
              {filters}
            </div>
          )}
          {actions && <div className="db-ltoolbar-actions">{actions}</div>}
        </div>
      )}
      <div className="db-tbox">{children}</div>
      {footer}
    </section>
  )
}

type SearchProps = { value: string; onChange: (v: string) => void; placeholder: string; count?: string }

/** M3 search field: a filled pill with a clear button once there is text, and the row count at its right end. */
export function TableSearch({ value, onChange, placeholder, count }: SearchProps) {
  return (
    <label className="db-tsearch">
      <Icon name="search" size={18} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && <button type="button" className="db-tsearch-clear" aria-label="Clear search" onClick={() => onChange('')}><XIcon size={16} /></button>}
      {count && <span className="db-tsearch-count">{count}</span>}
    </label>
  )
}

/**
 * M3 filter chip with a menu. The first option is the "All …" choice: while it
 * is chosen the chip is outlined; any other choice fills it and shows a check
 * and an × that goes back to "All". A `sort` chip never resets, so no ×.
 */
export function TableFilter({ value, options, onChange, label, sort }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  label: string
  sort?: boolean
}) {
  const [open, setOpen] = useState(false)
  // Open the menu inside the dashboard root so it keeps the dashboard's colours.
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const all = options[0]
  const current = options.find((o) => o.value === value) ?? all
  const on = !sort && current.value !== all.value
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span ref={(el) => setRoot((r) => r ?? (el?.closest<HTMLElement>('.db') ?? null))} className={`db-fchip${on ? ' is-on' : ''}${open ? ' is-open' : ''}`}>
        <PopoverTrigger asChild>
          <button type="button" className="db-fchip-btn" aria-label={`${label}: ${current.label}`}>
            {on ? <CheckIcon size={18} /> : sort && <ArrowUpDownIcon size={16} />}
            <span>{current.label}</span>
            {!on && <ChevronDownIcon size={18} className="db-fchip-chev" />}
          </button>
        </PopoverTrigger>
        {on && <button type="button" className="db-fchip-x" aria-label={`Clear ${label}`} onClick={() => onChange(all.value)}><XIcon size={16} /></button>}
      </span>
      <PopoverContent align="start" sideOffset={6} className="db-menu" container={root}>
        <div role="listbox" aria-label={label}>
          {options.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === current.value}
              className={`db-menu-item${o.value === current.value ? ' is-sel' : ''}`} onClick={() => { onChange(o.value); setOpen(false) }}>
              <span>{o.label}</span>
              {o.value === current.value && <CheckIcon size={18} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Splits rows into pages; goes back to page 1 when the rows change length. */
/** One page of `rows`; the person can change how many rows a page shows. */
export function usePaged<T>(rows: T[], initialPerPage = 10) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPageState] = useState(initialPerPage)
  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  useEffect(() => { if (page > pages) setPage(1) }, [page, pages])
  const shown = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page, perPage])
  const setPerPage = (n: number) => { setPerPageState(n); setPage(1) }
  return { page, pages, setPage, perPage, setPerPage, shown, from: rows.length ? (page - 1) * perPage + 1 : 0, to: Math.min(rows.length, page * perPage), total: rows.length }
}

export { Pager } from './kit/Pager'
