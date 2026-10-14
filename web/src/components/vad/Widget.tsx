// One VAD widget: asks the server for its numbers and draws them. Widgets
// adapt to their size (docs §10.8): a KPI gains its sparkline when tall
// enough, charts thin their labels and drop the legend when narrow, tables
// show more rows when taller.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { AreaChart, Area } from '#/components/bklit/area-chart'
import { BarChart } from '#/components/bklit/bar-chart'
import { Bar } from '#/components/bklit/bar'
import { BarXAxis } from '#/components/bklit/bar-x-axis'
import { Grid } from '#/components/bklit/grid'
import { XAxis } from '#/components/bklit/x-axis'
import { ChartTooltip } from '#/components/bklit/tooltip/chart-tooltip'
import { Markdown } from '#/components/assistant/Markdown'
import { fieldLabel, type Format, type Range, type Where, type Widget as W, type WidgetResult } from '#/lib/vad/spec'

const COLORS = ['var(--chart-line-primary)', 'var(--chart-line-secondary)', '#c79bff', '#ffc670', '#ff8fa3', '#6fe3a1', '#8fd3ff', '#e0a3ff']

export function fmt(v: number | null | undefined, f: Format = 'number') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  if (f === 'percent') return `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`
  if (f === 'duration') { const s = Math.round(v); return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s` }
  return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : String(Math.round(v * 10) / 10)
}

/** Fetches a widget's numbers; refetches when the range or filters change, and every 60 s. */
function useWidget(dashboard: string, id: string, range: Range, filters: Where, version: number) {
  const [data, setData] = useState<WidgetResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let gone = false
    const get = () => fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ widget: { dashboard, id, range, filters } }) })
      .then((r) => r.json()).then((r) => { if (!gone) { if (r.ok) { setData(r.data); setErr(null) } else setErr(r.reason) } })
      .catch(() => !gone && setErr('Couldn’t load.'))
    void get()
    const t = setInterval(() => document.visibilityState === 'visible' && void get(), 60_000)
    return () => { gone = true; clearInterval(t) }
  }, [dashboard, id, range, JSON.stringify(filters), version])
  return { data, err }
}

/** The widget's own size, so it can adapt. */
function useSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

export function Widget({ dashboard, widget, range, filters, version, editing, onRemove }: {
  dashboard: string; widget: W; range: Range; filters: Where; version: number; editing: boolean; onRemove?: () => void
}) {
  const { data, err } = useWidget(dashboard, widget.id, range, filters, version)
  const box = useSize()
  return (
    <div className={`vad-w is-${widget.type}${editing ? ' is-editing' : ''}`}>
      {(widget.title || editing) && (
        <header className="vad-w-head">
          {editing && <span className="vad-grip" title="Drag to move" aria-label="Drag to move">⋮⋮</span>}
          <span className="vad-w-titles">
            {widget.title && <b>{widget.title}</b>}
            {'subtitle' in widget && widget.subtitle && <small>{widget.subtitle}</small>}
          </span>
          {editing && onRemove && <button type="button" className="vad-w-x" onClick={onRemove} aria-label="Remove widget" title="Remove">×</button>}
        </header>
      )}
      <div className="vad-w-body" ref={box.ref}>
        {widget.type === 'text' ? <Markdown text={widget.body} />
          : err ? <p className="vad-w-note">{err}</p>
          : !data ? <div className="vad-w-skel" />
          : data.kind === 'waiting' ? <p className="vad-w-note">Waiting for agent data: {data.fields.map(fieldLabel).join(', ')}. These come from the workflow once the agent’s state is saved per call.</p>
          : data.kind === 'kpi' && widget.type === 'kpi' ? <Kpi w={widget} d={data} h={box.h} width={box.w} />
          : data.kind === 'series' && widget.type === 'chart' ? <Chart w={widget} d={data} width={box.w} height={box.h} />
          : data.kind === 'rows' ? <Table d={data} height={box.h} width={box.w} />
          : null}
      </div>
    </div>
  )
}

function Kpi({ w, d, h, width }: { w: Extract<W, { type: 'kpi' }>; d: Extract<WidgetResult, { kind: 'kpi' }>; h: number; width: number }) {
  const change = d.value !== null && d.previous ? (d.value - d.previous) / Math.abs(d.previous) : null
  const good = change === null ? null : (w.goodWhen === 'down' ? change < 0 : change > 0)
  const spark = d.spark && h > 70 ? d.spark : null
  return (
    <div className="vad-kpi">
      <span className="vad-kpi-value" style={{ fontSize: Math.max(24, Math.min(44, width / 6)) }}>{fmt(d.value, w.format)}</span>
      {change !== null && Number.isFinite(change) && (
        <span className={`vad-kpi-change ${good ? 'is-good' : 'is-bad'}`}>{change >= 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(1)}% <em>vs previous</em></span>
      )}
      {w.goal !== undefined && d.value !== null && h > 90 && (
        <span className="vad-kpi-goal"><i style={{ width: `${Math.min(100, (d.value / w.goal) * 100)}%` }} /><em>Goal {fmt(w.goal, w.format)}</em></span>
      )}
      {spark && spark.length > 1 && <Spark values={spark} />}
    </div>
  )
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(' ')
  return <svg className="vad-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="var(--chart-line-primary)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /></svg>
}

function Chart({ w, d, width, height }: { w: Extract<W, { type: 'chart' }>; d: Extract<WidgetResult, { kind: 'series' }>; width: number; height: number }) {
  const rows = d.labels.map((l, i) => ({ label: l, ...(d.time ? { date: new Date(l.length === 7 ? `${l}-01` : l) } : {}), ...Object.fromEntries(d.series.map((s) => [s.key, s.values[i]])) }))
  const tip = (p: Record<string, unknown>) => d.series.map((s, i) => ({ color: COLORS[i], label: s.key === 'value' ? w.title : s.key, value: fmt(Number(p[s.key]), w.format) }))
  const aspect = `${Math.max(1, width)} / ${Math.max(1, height - (d.series.length > 1 && width >= 360 ? 26 : 0))}`
  if (!rows.length) return <p className="vad-w-note">No sessions in this range.</p>
  return (
    <div className="vad-chart">
      {d.series.length > 1 && width >= 360 && (
        <div className="vad-legend">{d.series.map((s, i) => <span key={s.key}><i style={{ background: COLORS[i] }} />{s.key}</span>)}</div>
      )}
      {(w.chart === 'line' || w.chart === 'area') && d.time ? (
        <AreaChart data={rows} aspectRatio={aspect} animationDuration={400}>
          <Grid horizontal />
          {d.series.map((s, i) => <Area key={s.key} dataKey={s.key} fill={COLORS[i]} fillOpacity={w.chart === 'line' ? 0 : 0.35} />)}
          {height > 160 && <XAxis />}
          <ChartTooltip rows={(p) => tip(p as Record<string, unknown>)} />
        </AreaChart>
      ) : (
        <BarChart data={rows} xDataKey="label" aspectRatio={aspect} stacked={!!w.stacked} orientation={w.horizontal ? 'horizontal' : 'vertical'} animationDuration={500}>
          <Grid horizontal={!w.horizontal} />
          {d.series.map((s, i) => <Bar key={s.key} dataKey={s.key} fill={COLORS[i]} />)}
          {height > 160 && <BarXAxis maxLabels={Math.max(3, Math.floor(width / 70))} />}
          <ChartTooltip rows={(p) => tip(p as Record<string, unknown>)} />
        </BarChart>
      )}
    </div>
  )
}

function Table({ d, height, width }: { d: Extract<WidgetResult, { kind: 'rows' }>; height: number; width: number }) {
  const navigate = useNavigate()
  // A row opens that call on its flow's page (the same resolver Ask Voxio's links use).
  const openSession = async (id: string) => {
    const r = await fetch(`/api/assistant?open=${encodeURIComponent(`vx:session/${id}`)}`).then((x) => x.json()).catch(() => null) as { ok: boolean; data?: { path: string } } | null
    if (r?.ok && r.data) void navigate({ href: r.data.path })
  }
  // Narrow: keep the first columns (the order in the spec is their priority).
  const cols = d.columns.slice(0, Math.max(2, Math.floor(width / 120)))
  const cell = (c: string, v: unknown) => (v === null || v === undefined ? '—' : c === 'startTime' ? new Date(String(v)).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : c === 'duration' ? fmt(Number(v), 'duration') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v))
  if (!d.rows.length) return <p className="vad-w-note">No sessions match.</p>
  return (
    <div className="vad-table" style={{ maxHeight: Math.max(80, height) }}>
      <table>
        <thead><tr>{cols.map((c) => <th key={c}>{fieldLabel(c)}</th>)}</tr></thead>
        <tbody>
          {d.rows.map((r, i) => (
            <tr key={i} className={d.sessionIds ? 'is-link' : undefined}
              onClick={() => d.sessionIds && void openSession(d.sessionIds[i])}>
              {cols.map((c) => <td key={c}>{cell(c, r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
