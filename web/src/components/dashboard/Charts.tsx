// Dashboard charts, built from bklit UI (vendored in components/bklit).

import { useState } from 'react'

import { AreaChart, Area } from '#/components/bklit/area-chart'
import { Grid } from '#/components/bklit/grid'
import { XAxis } from '#/components/bklit/x-axis'
import { ChartTooltip } from '#/components/bklit/tooltip/chart-tooltip'

import type { DayBucket } from './ui'

const METRICS = {
  minutes: { label: 'Minutes', value: (d: DayBucket) => Math.round(d.minutes) },
  sessions: { label: 'Sessions', value: (d: DayBucket) => d.sessions },
} as const
type Metric = keyof typeof METRICS

const RANGES = [7, 30, 90] as const

/**
 * One usage chart with a Minutes / Sessions switch and a range switch.
 * `data` must cover the longest range; the chart slices the tail.
 */
export function UsageChart({ data, title = 'Usage', days, onDays }: {
  data: DayBucket[]
  title?: string
  days: number
  onDays: (d: number) => void
}) {
  const [metric, setMetric] = useState<Metric>('minutes')
  const m = METRICS[metric]
  const rows = data.slice(-days).map((d) => ({ date: new Date(`${d.day}T00:00:00`), value: m.value(d) }))
  const total = rows.reduce((a, r) => a + r.value, 0)

  return (
    <section className="db-chartcard">
      <div className="db-chartcard-head">
        <div>
          <span className="db-chartcard-title">{title}</span>
          <span className="db-chartcard-total">{total.toLocaleString()} <small>{m.label.toLowerCase()}</small></span>
        </div>
        <div className="db-chartcard-controls">
          <div className="db-pills" role="tablist" aria-label="Metric">
            {(Object.keys(METRICS) as Metric[]).map((k) => (
              <button key={k} role="tab" aria-selected={metric === k} className={metric === k ? 'is-on' : ''} onClick={() => setMetric(k)}>
                {METRICS[k].label}
              </button>
            ))}
          </div>
          <div className="db-pills" role="tablist" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r} role="tab" aria-selected={days === r} className={days === r ? 'is-on' : ''} onClick={() => onDays(r)}>{r}d</button>
            ))}
          </div>
        </div>
      </div>
      {total === 0 ? (
        <p className="db-chartcard-empty">No activity in this period yet.</p>
      ) : (
        <AreaChart key={`${metric}-${days}`} data={rows} aspectRatio="3.4 / 1" animationDuration={450}>
          <Grid horizontal />
          <Area dataKey="value" fill="var(--chart-line-primary)" />
          <XAxis />
          <ChartTooltip rows={(p) => [{ color: 'var(--chart-line-primary)', label: m.label, value: Number(p.value).toLocaleString() }]} />
        </AreaChart>
      )}
    </section>
  )
}
