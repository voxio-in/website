// Shared dashboard building blocks.

import { BorderBeam } from 'border-beam'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'

import { billedMinutes } from '#/lib/dashboard/client'
import type { FlowDoc, Session } from '#/lib/dashboard/types'
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
  return (
    <div className={`db-savebar${dirty ? ' is-dirty' : ''}`}>
      <span className={`db-savemsg is-${status.kind}`}>
        {status.kind === 'saving' ? <Loading inline label="Saving…" /> : status.text ?? (dirty ? 'Unsaved changes' : '')}
      </span>
      <button className="db-btn" onClick={onReset} disabled={!dirty}>Discard</button>
      <button className="db-btn db-primary" onClick={onSave} disabled={!dirty || status.kind === 'saving'}>Save</button>
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
export function Dialog({ title, sub, onClose, children, wide, big, actions }: {
  title: string
  sub?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
  /** Nearly full screen, for work done inside the dialog (e.g. a test call). */
  big?: boolean
  /** Buttons beside the close button. */
  actions?: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="db-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`db-dialog${wide ? ' is-wide' : ''}${big ? ' is-big' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
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
        {children}
      </div>
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
