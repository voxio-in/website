// A VAD: range and filters on top, a grid of widgets below (docs §10.6–10.8).
// Viewing: the grid is fixed. Edit: a widget panel opens (Data, or Charts: pick the chart, then
// the data it shows); drag an item onto the grid, or click it to add it at the bottom. Widgets
// move by their grip and resize from the corner or edges (snapping to cells, within their type's
// min/max). Save stores the spec (validated on the server), Cancel puts it back. Under 768 px
// widgets stack in one column.

import { useMemo, useRef, useState } from 'react'
import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

import Icon from '#/components/dashboard/Icon'
import { TableFilter } from '#/components/dashboard/TableCard'
import { COLS, GAP, ROW_HEIGHT, sizeOf, type ChartKind, type Query, type Range, type Spec, type Where, type Widget as W } from '#/lib/vad/spec'
import { Widget } from './Widget'

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' },
]
const CHANNELS = [{ value: 'all', label: 'All channels' }, { value: 'phone', label: 'Phone' }, { value: 'web', label: 'Web' }, { value: 'video', label: 'Video' }, { value: 'chat', label: 'Chat' }]

type Make = (id: string) => W
type Item = { label: string; hint: string; make: Make }

/** Data: numbers, a table, a note. */
const DATA: Item[] = [
  { label: 'Calls', hint: 'Number', make: (id) => ({ id, type: 'kpi', title: 'Calls', query: { metric: 'count' }, spark: true }) },
  { label: 'Average length', hint: 'Number', make: (id) => ({ id, type: 'kpi', title: 'Avg length', query: { metric: 'avg', of: 'duration' }, format: 'duration' }) },
  { label: 'Talk time', hint: 'Number', make: (id) => ({ id, type: 'kpi', title: 'Talk time', query: { metric: 'sum', of: 'duration' }, format: 'duration' }) },
  { label: 'Completed', hint: 'Percent', make: (id) => ({ id, type: 'kpi', title: 'Completed', query: { metric: 'share', where: { status: 'completed' } }, format: 'percent', goodWhen: 'up' }) },
  { label: 'Callers', hint: 'Number', make: (id) => ({ id, type: 'kpi', title: 'Callers', query: { metric: 'distinct', of: 'caller' } }) },
  { label: 'Latest calls', hint: 'Table', make: (id) => ({ id, type: 'table', title: 'Latest calls', query: { rows: 'sessions', sort: '-startTime', limit: 20 }, columns: ['startTime', 'duration', 'channel', 'caller', 'status'] }) },
  { label: 'Note', hint: 'Text', make: (id) => ({ id, type: 'text', title: 'Note', body: 'Write a note for whoever reads this dashboard.' }) },
]

/** Charts: what each chart can show. Time series suit every chart; categories only bars. */
const SERIES: { label: string; title: string; query: Query; format?: 'duration'; time: boolean; stacked?: boolean }[] = [
  { label: 'Calls per day', title: 'Calls per day', query: { metric: 'count', by: 'startTime:day', split: 'channel' }, time: true, stacked: true },
  { label: 'Calls per week', title: 'Calls per week', query: { metric: 'count', by: 'startTime:week' }, time: true },
  { label: 'Calls by hour of day', title: 'Calls by hour', query: { metric: 'count', by: 'startTime:hour' }, time: true },
  { label: 'Average length per day', title: 'Avg length per day', query: { metric: 'avg', of: 'duration', by: 'startTime:day' }, format: 'duration', time: true },
  { label: 'Calls by channel', title: 'Calls by channel', query: { metric: 'count', by: 'channel' }, time: false },
  { label: 'Calls by status', title: 'Calls by status', query: { metric: 'count', by: 'status' }, time: false },
]
const CHARTS: { kind: ChartKind; label: string }[] = [{ kind: 'bar', label: 'Bar' }, { kind: 'line', label: 'Line' }, { kind: 'area', label: 'Area' }]

const chartOf = (kind: ChartKind, s: (typeof SERIES)[number]): Make => (id) => ({
  id, type: 'chart', chart: kind, title: s.title, query: s.query, ...(s.format ? { format: s.format } : {}),
  ...(kind === 'bar' && s.stacked ? { stacked: true } : {}), ...(kind === 'bar' && !s.time ? { horizontal: true } : {}),
})

export function Dashboard({ id, spec: saved, onSaved, view }: { id: string; spec: Spec; onSaved?: (s: Spec) => void; view?: string }) {
  const [spec, setSpec] = useState(saved)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [range, setRange] = useState<Range>(saved.defaults.range)
  const [channel, setChannel] = useState('all')
  const [shelf, setShelf] = useState<'data' | 'charts'>('data')
  const [kind, setKind] = useState<ChartKind>('bar')
  const dragging = useRef<Make | null>(null)
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true })
  const filters = useMemo<Where>(() => { const f: Where = {}; if (channel !== 'all') f.channel = channel; return f }, [channel])
  const dirty = JSON.stringify(spec) !== JSON.stringify(saved)

  // The grid's layout, with each widget's min/max from its type.
  const layout: Layout = useMemo(() => spec.layout.map((l) => {
    const w = spec.widgets.find((x) => x.id === l.i)
    const sz = w ? sizeOf(w) : null
    return { ...l, ...(sz ? { minW: sz.min[0], minH: sz.min[1], maxW: sz.max[0], maxH: sz.max[1] } : {}) }
  }), [spec])

  const onLayout = (next: Layout) => {
    if (!editing) return
    // While something is dragged in from the panel, the grid holds a placeholder: keep it out of the spec.
    setSpec((s) => ({ ...s, layout: next.filter((l) => s.widgets.some((w) => w.id === l.i)).map(({ i, x, y, w, h }) => ({ i, x, y, w, h })) }))
  }
  const remove = (wid: string) => setSpec((s) => ({ ...s, widgets: s.widgets.filter((w) => w.id !== wid), layout: s.layout.filter((l) => l.i !== wid) }))
  const place = (make: Make, at?: { x: number; y: number }) => {
    const wid = `w${Date.now().toString(36)}`
    const w = make(wid)
    const sz = sizeOf(w)
    setSpec((s) => {
      const bottom = Math.max(0, ...s.layout.map((l) => l.y + l.h))
      return { ...s, widgets: [...s.widgets, w], layout: [...s.layout, { i: wid, x: Math.max(0, Math.min(at?.x ?? 0, COLS - sz.def[0])), y: at?.y ?? bottom, w: sz.def[0], h: sz.def[1] }] }
    })
  }

  const save = async () => {
    setBusy(true); setErr(null)
    const r = await fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ save: { id, spec } }) }).then((x) => x.json()).catch(() => null)
    setBusy(false)
    if (!r?.ok) return setErr(r?.reason ?? 'Couldn’t save.')
    setSpec(r.data); onSaved?.(r.data); setEditing(false)
  }

  // Phones: one column, in reading order (top to bottom, left to right).
  const narrow = mounted && width < 768
  const ordered = [...spec.layout].sort((a, b) => a.y - b.y || a.x - b.x)

  /** One item in the widget panel: drag it onto the grid, or click to add it at the bottom. */
  const tile = (label: string, hint: string, make: Make) => (
    <button key={label} type="button" className="vad-tile" draggable
      onDragStart={(e) => { dragging.current = make; e.dataTransfer.setData('text/plain', label); e.dataTransfer.effectAllowed = 'copy' }}
      onDragEnd={() => { dragging.current = null }}
      onClick={() => place(make)} title="Drag onto the dashboard, or click to add it at the bottom">
      <span className="vad-tile-grip" aria-hidden>⋮⋮</span>
      <span className="vad-tile-text"><b>{label}</b><small>{hint}</small></span>
    </button>
  )

  return (
    <div className="vad">
      {/* One toolbar, like every list: filters joined on the left, the page's action at the right end. */}
      <div className="db-ltoolbar vad-bar">
        <div className="db-ltoolbar-cells vad-bar-cells">
          {RANGES.map((r) => (
            <button key={r.value} type="button" role="radio" aria-checked={range === r.value}
              className={`vad-cell${range === r.value ? ' is-on' : ''}`} onClick={() => setRange(r.value)}>{r.label}</button>
          ))}
          <TableFilter label="Channel" value={channel} options={CHANNELS} onChange={setChannel} />
        </div>
        <div className="db-ltoolbar-actions">
        {editing ? (
          <span className="db-btngroup" role="group" aria-label="Edit">
            <button type="button" className="db-gbtn" disabled={busy} onClick={() => { setSpec(saved); setEditing(false); setErr(null) }}>Cancel</button>
            <button type="button" className="db-gbtn is-lead" disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
          </span>
        ) : view ? null : (
          <button type="button" className="db-btn" onClick={() => setEditing(true)}><Icon name="edit" size={18} />Edit</button>
        )}
        </div>
      </div>
      {err && <p className="vad-err">{err}</p>}

      {editing && (
        <section className="db-setcard vad-shelf">
          <div className="vad-shelf-head">
            <span className="db-btngroup" role="tablist" aria-label="Widgets">
              <button type="button" role="tab" aria-selected={shelf === 'data'} className={`db-gbtn${shelf === 'data' ? ' is-on' : ''}`} onClick={() => setShelf('data')}><Icon name="list" size={18} />Data</button>
              <button type="button" role="tab" aria-selected={shelf === 'charts'} className={`db-gbtn${shelf === 'charts' ? ' is-on' : ''}`} onClick={() => setShelf('charts')}><Icon name="chart" size={18} />Charts</button>
            </span>
            {shelf === 'charts' && (
              <span className="db-btngroup" role="group" aria-label="Chart">
                {CHARTS.map((c) => <button key={c.kind} type="button" className={`db-gbtn${kind === c.kind ? ' is-on' : ''}`} onClick={() => setKind(c.kind)}>{c.label}</button>)}
              </span>
            )}
            <span className="vad-shelf-hint">Drag onto the dashboard, or click to add. Move a widget by its ⋮⋮ grip; resize it from its edges.</span>
          </div>
          <div className="vad-tiles">
            {shelf === 'data'
              ? DATA.map((d) => tile(d.label, d.hint, d.make))
              : SERIES.filter((s) => kind === 'bar' || s.time).map((s) => tile(s.label, `${CHARTS.find((c) => c.kind === kind)!.label} chart`, chartOf(kind, s)))}
          </div>
          {shelf === 'charts' && <p className="db-fhelp">For what the agent records on calls (course, outcome…), ask Ask Voxio: it charts any recorded field.</p>}
        </section>
      )}

      <div ref={containerRef} className={`vad-grid${editing ? ' is-editing' : ''}`}>
        {mounted && (narrow ? (
          <div className="vad-stack">
            {ordered.map((l) => {
              const w = spec.widgets.find((x) => x.id === l.i)
              return w ? <div key={w.id} style={{ height: (sizeOf(w).def[1]) * (ROW_HEIGHT + GAP) - GAP }}><Widget dashboard={id} view={view} widget={w} range={range} filters={filters} version={0} editing={false} /></div> : null
            })}
          </div>
        ) : (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [GAP, GAP], containerPadding: [0, 0] }}
            dragConfig={{ enabled: editing, handle: '.vad-grip', threshold: 4 }}
            resizeConfig={{ enabled: editing, handles: ['se', 'e', 's'] }}
            dropConfig={{
              enabled: editing,
              defaultItem: { w: 3, h: 2 },
              onDragOver: () => {
                const make = dragging.current
                if (!make) return false
                const sz = sizeOf(make('probe'))
                return { w: sz.def[0], h: sz.def[1] }
              },
            }}
            onDrop={(_l, item) => { if (dragging.current && item) place(dragging.current, { x: item.x, y: item.y }); dragging.current = null }}
            onLayoutChange={onLayout}
          >
            {spec.widgets.map((w) => (
              <div key={w.id}>
                <Widget dashboard={id} view={view} widget={w} range={range} filters={filters} version={0} editing={editing} onRemove={() => remove(w.id)} />
              </div>
            ))}
          </GridLayout>
        ))}
        {!spec.widgets.length && <p className="vad-empty">{view ? 'Nothing here yet.' : 'No widgets yet. Ask Voxio to add some, or press Edit and drag them in.'}</p>}
      </div>
    </div>
  )
}
