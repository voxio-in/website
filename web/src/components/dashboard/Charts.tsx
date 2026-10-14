// Dashboard charts, built from bklit UI (vendored in components/bklit).

import { useState, type ReactNode } from 'react'

import { AreaChart, Area } from '#/components/bklit/area-chart'
import { Grid } from '#/components/bklit/grid'
import { XAxis } from '#/components/bklit/x-axis'
import { ChartTooltip } from '#/components/bklit/tooltip/chart-tooltip'

import { DateRangeButton } from './kit/DateRange'
import { rangeDays, type DayBucket, type Range } from './ui'

const METRICS = {
  minutes: { label: 'Minutes', value: (d: DayBucket) => Math.round(d.minutes) },
  sessions: { label: 'Sessions', value: (d: DayBucket) => d.sessions },
} as const
type Metric = keyof typeof METRICS

const PRESETS = [{ days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }] as const

/** A range end (YYYY-MM-DD or with a time) as "5 Oct 2026". */
const fmtDay = (d: string) => new Date(d.length > 10 ? d : `${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** A connected group of choices (Echobotics' ToggleGroup): the chosen one is filled. */
function Choice<T extends string>({ label, value, options, onChange, children }: {
  label: string
  value: T | null
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  /** Extra cells at the end, e.g. the Custom date button. */
  children?: ReactNode
}) {
  return (
    <span className="db-btngroup db-choice" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={`db-gbtn${o.value === value ? ' is-sel' : ''}`} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
      {children}
    </span>
  )
}


/** 7 days, 1 Month and 3 Months, plus a calendar button for any start and end. */
export function RangeControl({ value, onChange, earliest }: { value: Range; onChange: (r: Range) => void; earliest?: string }) {
  const custom = !('preset' in value)
  const { from, to } = rangeDays(value)
  return (
    <Choice label="Date range" value={custom ? null : String(value.preset)} options={PRESETS.map((p) => ({ value: String(p.days), label: p.label }))}
      onChange={(v) => onChange({ preset: Number(v) as 7 | 30 | 90 })}>
      <DateRangeButton cell earliest={earliest} from={from} to={to} active={custom} value={custom ? value : undefined} onPick={(a, b) => onChange({ from: a, to: b })} />
    </Choice>
  )
}

/**
 * One usage chart with a Minutes / Sessions switch and a range control.
 * `data` is exactly the days of `range` (see byRange).
 */
export function UsageChart({ data, title = 'Usage', range, onRange, earliest }: {
  /** The first session's time; the date picker goes no further back than this. */
  earliest?: string
  data: DayBucket[]
  title?: string
  range: Range
  onRange: (r: Range) => void
}) {
  const [metric, setMetric] = useState<Metric>('minutes')
  const m = METRICS[metric]
  const rows = data.map((d) => ({ date: new Date(`${d.day}T00:00:00`), value: m.value(d) }))
  const total = rows.reduce((t, r) => t + r.value, 0)
  const key = 'preset' in range ? `p${range.preset}` : `${range.from}-${range.to}`

  return (
    <section className="db-chartcard">
      {/* Echobotics' ChartHeader: title and one line on the left, controls on the right, a divider under. */}
      <div className="db-chartcard-head">
        <div className="db-chartcard-titles">
          <h2 className="db-chartcard-title">{title}</h2>
          <p className="db-chartcard-desc">{total.toLocaleString()} {m.label.toLowerCase()} · {'preset' in range ? `last ${range.preset} days` : `${fmtDay(range.from)} to ${fmtDay(range.to)}`}</p>
        </div>
        <div className="db-chartcard-controls">
          <Choice label="Metric" value={metric} options={(Object.keys(METRICS) as Metric[]).map((k) => ({ value: k, label: METRICS[k].label }))} onChange={setMetric} />
          <RangeControl value={range} onChange={onRange} earliest={earliest} />
        </div>
      </div>
      {total === 0 ? (
        <p className="db-chartcard-empty">No activity in this period yet.</p>
      ) : (
        <AreaChart key={`${metric}-${key}`} data={rows} aspectRatio="3.4 / 1" animationDuration={450}>
          <Grid horizontal />
          <Area dataKey="value" fill="var(--chart-line-primary)" />
          <XAxis />
          <ChartTooltip rows={(p) => [{ color: 'var(--chart-line-primary)', label: m.label, value: Number(p.value).toLocaleString() }]} />
        </AreaChart>
      )}
    </section>
  )
}
