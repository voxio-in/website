// Shared dashboard building blocks.

import { BorderBeam } from 'border-beam'
import { motion, useReducedMotion } from 'motion/react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'

import { billedMinutes } from '#/lib/dashboard/client'
import type { FlowDoc, Session } from '#/lib/dashboard/types'
import { toast } from '#/components/ui/halo-toast'
import Icon, { type IconName } from './Icon'

// ------------------------------------------------------------ theme · AI glow · loading

export const ThemeCtx = createContext<'dark' | 'light'>('dark')

/** The animated beam around anything the AI reads: prompts, instructions, knowledge text. */
export function AiGlow({ children, active = true, size = 'md' }: { children: React.ReactNode; active?: boolean; size?: 'md' | 'sm' | 'line' }) {
  const theme = useContext(ThemeCtx)
  return (
    <BorderBeam className="db-aiglow" size={size} colorVariant="colorful" strength={theme === 'light' ? 0.55 : 0.7} theme={theme} active={active}>
      {children}
    </BorderBeam>
  )
}

/** The loading state everywhere in the dashboard. */
export function Loading({ label = 'Loading', inline = false }: { label?: string; inline?: boolean }) {
  if (inline) return <span className="db-loading is-inline" role="status"><ThinkingOrb state="working" size={20} />{label}</span>
  return (
    <div className="db-loading" role="status" aria-label={label}>
      <ThinkingOrb state="searching" size={64} />
      <span>{label}</span>
    </div>
  )
}

// ------------------------------------------------------------ flow context

export type FlowCtx = {
  flow: FlowDoc
  /** Saves a partial flow; resolves to a note or throws with the reason. */
  save: (patch: Partial<FlowDoc>) => Promise<string | undefined>
  reload: () => Promise<void>
}
export const FlowContext = createContext<FlowCtx | null>(null)
export function useFlow(): FlowCtx {
  const c = useContext(FlowContext)
  if (!c) throw new Error('useFlow outside a flow')
  return c
}

/** Local draft of some flow fields, with dirty tracking and a save action. */
export function useDraft<K extends keyof FlowDoc>(keys: K[]) {
  const { flow, save } = useFlow()
  const pick = () => Object.fromEntries(keys.map((k) => [k, structuredClone(flow[k] ?? null)])) as Pick<FlowDoc, K>
  const [draft, setDraft] = useState(pick)
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'err'; text?: string }>({ kind: 'idle' })
  const baseline = useMemo(() => JSON.stringify(pick()), [flow])
  const dirty = JSON.stringify(draft) !== baseline
  const set = <T extends K>(k: T, v: FlowDoc[T]) => setDraft((d) => ({ ...d, [k]: v }))
  const commit = async () => {
    setStatus({ kind: 'saving' })
    try {
      // Only what changed, so untouched fields never get written (or flagged mock).
      const base = JSON.parse(baseline) as Record<string, unknown>
      const changed = Object.fromEntries(
        Object.entries(draft).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(base[k])),
      ) as Partial<FlowDoc>
      const note = await save(changed)
      setStatus({ kind: 'ok', text: note ?? 'Saved' })
    } catch (e) {
      setStatus({ kind: 'err', text: (e as Error).message })
    }
  }
  const reset = () => setDraft(pick())
  return { draft, set, setDraft, dirty, commit, reset, status }
}

export function SaveBar({ dirty, status, onSave, onReset }: {
  dirty: boolean
  status: { kind: string; text?: string }
  onSave: () => void
  onReset: () => void
}) {
  // The result of a save is announced as a toast; the bar itself only says
  // "Saving…" or "Unsaved changes".
  useEffect(() => {
    if (status.kind === 'ok') toast.success(status.text && status.text !== 'Saved' ? 'Saved' : 'Changes saved', status.text && status.text !== 'Saved' ? status.text : undefined)
    if (status.kind === 'err') toast.error('Couldn’t save', status.text)
  }, [status])
  const saving = status.kind === 'saving'
  return (
    <div className={`db-savebar${dirty ? ' is-dirty' : ''}`}>
      <span className={`db-savemsg is-${status.kind}`}>{dirty && status.kind !== 'saving' ? 'Unsaved changes' : ''}</span>
      {/* Discard + Save as one group; while saving, the orb sits inside Save. */}
      <span className="db-btngroup db-savegroup" role="group" aria-label="Save changes">
        <button className="db-gbtn" onClick={onReset} disabled={!dirty || saving}>Discard</button>
        <button className="db-gbtn is-lead" onClick={onSave} disabled={!dirty || saving} aria-busy={saving}>
          {saving && <ThinkingOrb state="working" size={20} />}{saving ? 'Saving' : 'Save'}
        </button>
      </span>
    </div>
  )
}

// ------------------------------------------------------------ layout bits

export function Page({ title, actions, children, sub }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="db-page">
      <div className="db-head">
        <div>
          <h1 className="db-h1">{title}</h1>
          {sub && <p className="db-sub">{sub}</p>}
        </div>
        {actions && <div className="db-actions">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Card({ title, mock, children, actions, help }: { title?: React.ReactNode; mock?: boolean | string; help?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="db-card">
      {(title || actions) && (
        <div className="db-card-head">
          <h2 className="db-h2">{title}{mock && <Mock why={typeof mock === 'string' ? mock : undefined} />}</h2>
          {actions}
        </div>
      )}
      {help && <p className="db-help">{help}</p>}
      {children}
    </section>
  )
}

/** Marks data or controls the backend doesn't support yet. */
export function Mock(_: { why?: string }) {
  // The user knows which parts are demo data; keep the marker in code, show nothing.
  return null
}

/** True when a field on this flow comes from the mock store. */
export function isMock(flow: FlowDoc, key: string) {
  return flow.source === 'mock' || flow.mock.includes(key)
}

export function Field({ label, help, children, wide }: { label: React.ReactNode; help?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`db-field${wide ? ' is-wide' : ''}`}>
      <span className="db-flabel">{label}</span>
      {children}
      {help && <span className="db-fhelp">{help}</span>}
    </label>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`db-toggle${on ? ' is-on' : ''}`} onClick={() => onChange(!on)}>
      <span className="db-knob" />
      {label && <span>{label}</span>}
    </button>
  )
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="db-stat">
      <span className="db-stat-label">{label}</span>
      <span className="db-stat-value">{value}</span>
      {sub && <span className="db-stat-sub">{sub}</span>}
    </div>
  )
}

/**
 * Makes a whole row act like its main link. Clicks on buttons, links or inputs
 * inside the row still do their own thing; Enter works from the keyboard.
 */
export function rowLink(go: () => void) {
  const inner = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest('a, button, input, select, textarea, label, [data-norow]')
  return {
    role: 'link' as const,
    tabIndex: 0,
    'data-row-link': '',
    onClick: (e: React.MouseEvent) => { if (!inner(e.target) || (e.target as HTMLElement) === e.currentTarget) go() },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && e.target === e.currentTarget) go() },
  }
}

/** A centred modal. Esc or a click on the backdrop closes it. */
export function Dialog({ title, sub, onClose, children, wide, big, actions, layoutId }: {
  title: string
  sub?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
  /** Nearly full screen, for work done inside the dialog (e.g. a test call). */
  big?: boolean
  /** Buttons beside the close button. */
  actions?: React.ReactNode
  /**
   * Morph from the button that opened it (after Cult UI's Expandable Screen):
   * give that button the same layoutId, and render this inside AnimatePresence.
   */
  layoutId?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const reduce = useReducedMotion()
  const cls = `db-dialog${wide ? ' is-wide' : ''}${big ? ' is-big' : ''}`
  if (layoutId) {
    return (
      <motion.div className="db-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
        <motion.div className={`${cls} is-morph`} role="dialog" aria-modal="true" aria-label={title}
          layoutId={reduce ? undefined : layoutId} style={{ borderRadius: 24 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}>
          <motion.div className="db-dialog-morph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ delay: reduce ? 0 : 0.12, duration: reduce ? 0 : 0.25 }}>
            <DialogHead title={title} sub={sub} actions={actions} onClose={onClose} />
            {children}
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }
  return (
    <div className="db-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cls} role="dialog" aria-modal="true" aria-label={title}>
        <DialogHead title={title} sub={sub} actions={actions} onClose={onClose} />
        {children}
      </div>
    </div>
  )
}

function DialogHead({ title, sub, actions, onClose }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="db-dialog-head">
      <div>
        <h2 className="db-h2">{title}</h2>
        {sub && <p className="db-dialog-sub">{sub}</p>}
      </div>
      <span className="db-dialog-actions">
        {actions}
        <button className="db-iconbtn" onClick={onClose} aria-label="Close">
          <Icon name="close" size={20} />
        </button>
      </span>
    </div>
  )
}

/** Compact KPI card: icon, label, one big number. */
export function Kpi({ icon, label, value }: { icon: IconName; label: string; value: React.ReactNode }) {
  return (
    <div className="db-kpi">
      <span className="db-kpi-icon"><Icon name={icon} size={20} /></span>
      <span className="db-kpi-text">
        <span className="db-kpi-label">{label}</span>
        <span className="db-kpi-value">{value}</span>
      </span>
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="db-empty"><p>{children}</p></div>
}

export function Copy({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button className="db-btn" type="button" onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }}>
      {done ? 'Copied' : label}
    </button>
  )
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'ok' | 'err'; children: React.ReactNode }) {
  return <div className={`db-notice is-${kind}`}>{children}</div>
}

// ------------------------------------------------------------ usage + charts

export type DayBucket = { day: string; sessions: number; minutes: number; ai: number }

/**
 * A date range: one of the presets (last 7, 30 or 90 days) or a custom start and
 * end, each `YYYY-MM-DD` (the whole day) or `YYYY-MM-DDTHH:mm` (from/until that time).
 */
export type Range = { preset: 7 | 30 | 90 } | { from: string; to: string }

const dayStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The first and last day of a range, local time, as midnight dates. */
export function rangeDays(r: Range): { from: Date; to: Date } {
  if ('preset' in r) {
    const to = new Date(); to.setHours(0, 0, 0, 0)
    return { from: new Date(to.getTime() - (r.preset - 1) * 864e5), to }
  }
  const a = new Date(`${r.from.slice(0, 10)}T00:00:00`), b = new Date(`${r.to.slice(0, 10)}T00:00:00`)
  return a <= b ? { from: a, to: b } : { from: b, to: a }
}

/** The exact window a range covers, in ms: [start, end). A day without a time is the whole day. */
export function rangeSpan(r: Range): { start: number; end: number } {
  if ('preset' in r) {
    const { from, to } = rangeDays(r)
    return { start: from.getTime(), end: to.getTime() + 864e5 }
  }
  const start = (s: string) => new Date(s.length > 10 ? `${s}:00` : `${s}T00:00:00`).getTime()
  const end = (s: string) => (s.length > 10 ? new Date(`${s}:00`).getTime() + 6e4 : new Date(`${s}T00:00:00`).getTime() + 864e5)
  const [a, b] = r.from <= r.to ? [r.from, r.to] : [r.to, r.from]
  return { start: start(a), end: end(b) }
}

/** Whether a session started inside the range. */
export function inRange(r: Range, iso: string): boolean {
  const { start, end } = rangeSpan(r)
  const t = Date.parse(iso)
  return t >= start && t < end
}

/** One bucket per day of the range, oldest first. */
export function byRange(sessions: Session[], r: Range): DayBucket[] {
  const { from, to } = rangeDays(r)
  const out: DayBucket[] = []
  const idx = new Map<string, DayBucket>()
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 864e5)) {
    const b = { day: dayStr(d), sessions: 0, minutes: 0, ai: 0 }
    out.push(b); idx.set(b.day, b)
  }
  for (const s of sessions) {
    const b = idx.get(dayStr(new Date(s.startTime)))
    if (!b || !inRange(r, s.startTime)) continue
    b.sessions++
    b.minutes += billedMinutes(s.totalConnectedTime)
    b.ai += (s.totalAiTime || 0) / 60
  }
  return out
}

export function byDay(sessions: Session[], days = 30): DayBucket[] {
  const out: DayBucket[] = []
  const idx = new Map<string, DayBucket>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 864e5)
    const b = { day: d.toISOString().slice(0, 10), sessions: 0, minutes: 0, ai: 0 }
    out.push(b)
    idx.set(b.day, b)
  }
  for (const s of sessions) {
    const d = new Date(s.startTime)
    d.setHours(0, 0, 0, 0)
    const b = idx.get(d.toISOString().slice(0, 10))
    if (!b) continue
    b.sessions++
    b.minutes += billedMinutes(s.totalConnectedTime)
    b.ai += (s.totalAiTime || 0) / 60
  }
  return out
}

export function totals(sessions: Session[]) {
  const n = sessions.length
  const secs = sessions.reduce((a, s) => a + (s.totalConnectedTime || 0), 0)
  const ok = sessions.filter((s) => !s.status || s.status === 'completed').length
  return {
    sessions: n,
    minutes: sessions.reduce((a, s) => a + billedMinutes(s.totalConnectedTime), 0),
    avg: n ? secs / n : 0,
    success: n ? ok / n : 0,
    tokens: sessions.reduce((a, s) => a + (s.aiTokens || 0) + (s.humanTokens || 0), 0),
  }
}

const shortDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** Table view of the same buckets, for screen readers and exact numbers. */
export function DayTable({ data }: { data: DayBucket[] }) {
  return (
    <details className="db-details">
      <summary>Show as table</summary>
      <table className="db-table">
        <thead><tr><th>Day</th><th>Sessions</th><th>Minutes</th><th>AI minutes</th></tr></thead>
        <tbody>
          {data.filter((d) => d.sessions).reverse().map((d) => (
            <tr key={d.day}><td>{shortDay(d.day)}</td><td>{d.sessions}</td><td>{d.minutes}</td><td>{d.ai.toFixed(1)}</td></tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
