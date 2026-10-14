// A chart inside an Assistant answer, drawn with bklit (like every dashboard
// chart). The model writes a fenced block:
//
//   ```chart
//   { "type": "bar", "title": "Sessions per day", "unit": "sessions",
//     "data": [{ "label": "Oct 8", "sessions": 1 }, { "label": "Oct 9", "sessions": 22 }],
//     "series": [{ "key": "sessions", "label": "Sessions" }] }
//   ```
//
// type: "bar" (categories), "stacked" (bars split by series), "area" (labels
// must be ISO dates). Anything malformed shows as a short note, never a crash.

import { Component, type ReactNode } from 'react'

import { AreaChart, Area } from '#/components/bklit/area-chart'
import { BarChart } from '#/components/bklit/bar-chart'
import { Bar } from '#/components/bklit/bar'
import { BarXAxis } from '#/components/bklit/bar-x-axis'
import { Grid } from '#/components/bklit/grid'
import { XAxis } from '#/components/bklit/x-axis'
import { ChartTooltip } from '#/components/bklit/tooltip/chart-tooltip'

type Spec = { type?: 'bar' | 'stacked' | 'area'; title?: string; unit?: string; data: Record<string, unknown>[]; series?: { key: string; label?: string }[] }

const COLORS = ['var(--chart-line-primary)', 'var(--chart-line-secondary)', '#c79bff', '#ffc670', '#ff8fa3', '#6fe3a1']

function parse(src: string): Spec | null {
  try {
    const s = JSON.parse(src) as Spec
    if (!Array.isArray(s.data) || !s.data.length) return null
    const keys = s.series?.length ? s.series : Object.keys(s.data[0]).filter((k) => k !== 'label' && typeof s.data[0][k] === 'number').map((key) => ({ key }))
    return { ...s, series: keys.slice(0, 6) }
  } catch { return null }
}

class Guard extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  render() { return this.state.bad ? <p className="as-chart-bad">Couldn’t draw this chart.</p> : this.props.children }
}

export function AnswerChart({ src }: { src: string }) {
  const spec = parse(src)
  if (!spec) return <p className="as-chart-bad">Couldn’t read this chart.</p>
  const series = spec.series!
  const fmt = (v: unknown) => `${Number(v).toLocaleString()}${spec.unit ? ` ${spec.unit}` : ''}`
  const area = spec.type === 'area' && spec.data.every((d) => !Number.isNaN(Date.parse(String(d.label))))
  const total = series.length === 1 ? spec.data.reduce((a, d) => a + Number(d[series[0].key] ?? 0), 0) : null

  return (
    <figure className="as-chart">
      {(spec.title || total !== null) && (
        <figcaption>
          {spec.title && <b>{spec.title}</b>}
          {total !== null && <span>{fmt(total)} total</span>}
        </figcaption>
      )}
      {series.length > 1 && (
        <div className="as-chart-legend">{series.map((s, i) => <span key={s.key}><i style={{ background: COLORS[i] }} />{s.label ?? s.key}</span>)}</div>
      )}
      <Guard>
        {area ? (
          <AreaChart data={spec.data.map((d) => ({ ...d, date: new Date(String(d.label)) }))} aspectRatio="2.2 / 1" animationDuration={500}>
            <Grid horizontal />
            {series.map((s, i) => <Area key={s.key} dataKey={s.key} fill={COLORS[i]} />)}
            <XAxis />
            <ChartTooltip rows={(p) => series.map((s, i) => ({ color: COLORS[i], label: s.label ?? s.key, value: fmt((p as Record<string, unknown>)[s.key]) }))} />
          </AreaChart>
        ) : (
          <BarChart data={spec.data} xDataKey="label" aspectRatio="2.2 / 1" stacked={spec.type === 'stacked'} animationDuration={600}>
            <Grid horizontal />
            {series.map((s, i) => <Bar key={s.key} dataKey={s.key} fill={COLORS[i]} />)}
            <BarXAxis showAllLabels={spec.data.length <= 10} />
            <ChartTooltip rows={(p) => series.map((s, i) => ({ color: COLORS[i], label: s.label ?? s.key, value: fmt((p as Record<string, unknown>)[s.key]) }))} />
          </BarChart>
        )}
      </Guard>
    </figure>
  )
}
