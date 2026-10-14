// A VAD: range and filters on top, a grid of widgets below (docs §10.6–10.8).
// Viewing: the grid is fixed. Edit: drag a widget by its header grip, resize it
// from the corner or edges (snapping to cells, within its type's min/max),
// remove it, or add a ready-made one; Save stores the spec (validated on the
// server), Cancel puts it back. Under 768 px widgets stack in one column.

import { useMemo, useState } from 'react'
import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

import { SegmentTabs } from '#/components/dashboard/kit/SegmentTabs'
import { TableFilter } from '#/components/dashboard/TableCard'
import { COLS, GAP, ROW_HEIGHT, sizeOf, type Range, type Spec, type Where, type Widget as W } from '#/lib/vad/spec'
import { Widget } from './Widget'

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' },
]
const CHANNELS = [{ value: 'all', label: 'All channels' }, { value: 'phone', label: 'Phone' }, { value: 'web', label: 'Web' }, { value: 'video', label: 'Video' }, { value: 'chat', label: 'Chat' }]

/** Ready-made widgets on built-in fields, for "Add widget". */
const PRESETS: { label: string; make: (id: string) => W }[] = [
  { label: 'Sessions (number)', make: (id) => ({ id, type: 'kpi', title: 'Sessions', query: { metric: 'count' }, spark: true }) },
  { label: 'Average length', make: (id) => ({ id, type: 'kpi', title: 'Avg length', query: { metric: 'avg', of: 'duration' }, format: 'duration' }) },
  { label: 'Completed (%)', make: (id) => ({ id, type: 'kpi', title: 'Completed', query: { metric: 'share', where: { status: 'completed' } }, format: 'percent' }) },
  { label: 'Sessions per day', make: (id) => ({ id, type: 'chart', chart: 'bar', title: 'Sessions per day', query: { metric: 'count', by: 'startTime:day' } }) },
  { label: 'Sessions by channel', make: (id) => ({ id, type: 'chart', chart: 'bar', horizontal: true, title: 'By channel', query: { metric: 'count', by: 'channel' } }) },
  { label: 'Length over time', make: (id) => ({ id, type: 'chart', chart: 'line', title: 'Avg length per day', query: { metric: 'avg', of: 'duration', by: 'startTime:day' }, format: 'duration' }) },
  { label: 'Recent sessions', make: (id) => ({ id, type: 'table', title: 'Recent sessions', query: { rows: 'sessions', sort: '-startTime', limit: 20 }, columns: ['startTime', 'duration', 'channel', 'caller', 'status'] }) },
  { label: 'Note', make: (id) => ({ id, type: 'text', title: 'Note', body: 'Write a note for whoever reads this dashboard.' }) },
]

export function Dashboard({ id, spec: saved, onSaved }: { id: string; spec: Spec; onSaved: (s: Spec) => void }) {
  const [spec, setSpec] = useState(saved)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [range, setRange] = useState<Range>(saved.defaults.range)
  const [channel, setChannel] = useState('all')
  const [adding, setAdding] = useState(false)
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
    setSpec((s) => ({ ...s, layout: next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })) }))
  }
  const remove = (wid: string) => setSpec((s) => ({ ...s, widgets: s.widgets.filter((w) => w.id !== wid), layout: s.layout.filter((l) => l.i !== wid) }))
  const add = (make: (id: string) => W) => {
    const wid = `w${Date.now().toString(36)}`
    const w = make(wid)
    const sz = sizeOf(w)
    const bottom = Math.max(0, ...spec.layout.map((l) => l.y + l.h))
    setSpec((s) => ({ ...s, widgets: [...s.widgets, w], layout: [...s.layout, { i: wid, x: 0, y: bottom, w: sz.def[0], h: sz.def[1] }] }))
    setAdding(false)
  }

  const save = async () => {
    setBusy(true); setErr(null)
    const r = await fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ save: { id, spec } }) }).then((x) => x.json()).catch(() => null)
    setBusy(false)
    if (!r?.ok) return setErr(r?.reason ?? 'Couldn’t save.')
    setSpec(r.data); onSaved(r.data); setEditing(false)
  }

  // Phones: one column, in reading order (top to bottom, left to right).
  const narrow = mounted && width < 768
  const ordered = [...spec.layout].sort((a, b) => a.y - b.y || a.x - b.x)

  return (
    <div className="vad">
      <div className="vad-bar">
        <SegmentTabs label="Range" value={range} options={RANGES} onChange={setRange} />
        <TableFilter label="Channel" value={channel} options={CHANNELS} onChange={setChannel} />
        <span style={{ flex: 1 }} />
        {editing ? (
          <>
            <div className="vad-add">
              <button type="button" className="db-btn db-btn-sm" onClick={() => setAdding(!adding)} aria-expanded={adding}>+ Add widget</button>
              {adding && (
                <div className="vad-add-menu" role="menu">
                  {PRESETS.map((p) => <button key={p.label} type="button" role="menuitem" onClick={() => add(p.make)}>{p.label}</button>)}
                </div>
              )}
            </div>
            <button type="button" className="db-btn db-btn-sm" disabled={busy} onClick={() => { setSpec(saved); setEditing(false); setErr(null) }}>Cancel</button>
            <button type="button" className="db-btn db-primary db-btn-sm" disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
          </>
        ) : (
          <button type="button" className="db-btn db-btn-sm" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      {err && <p className="vad-err">{err}</p>}
      {editing && <p className="vad-hint">Drag a widget by its ⋮⋮ grip, resize it from its edges or corner.</p>}

      <div ref={containerRef} className={`vad-grid${editing ? ' is-editing' : ''}`}>
        {mounted && (narrow ? (
          <div className="vad-stack">
            {ordered.map((l) => {
              const w = spec.widgets.find((x) => x.id === l.i)
              return w ? <div key={w.id} style={{ height: (sizeOf(w).def[1]) * (ROW_HEIGHT + GAP) - GAP }}><Widget dashboard={id} widget={w} range={range} filters={filters} version={0} editing={false} /></div> : null
            })}
          </div>
        ) : (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [GAP, GAP], containerPadding: [0, 0] }}
            dragConfig={{ enabled: editing, handle: '.vad-grip', threshold: 4 }}
            resizeConfig={{ enabled: editing, handles: ['se', 'e', 's'] }}
            onLayoutChange={onLayout}
          >
            {spec.widgets.map((w) => (
              <div key={w.id}>
                <Widget dashboard={id} widget={w} range={range} filters={filters} version={0} editing={editing} onRemove={() => remove(w.id)} />
              </div>
            ))}
          </GridLayout>
        ))}
        {!spec.widgets.length && <p className="vad-empty">No widgets yet. Press Edit, then Add widget.</p>}
      </div>
    </div>
  )
}
