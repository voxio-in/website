// A sidebar menu drawn as a tree: each group is a heading, and its items hang
// off a trunk line on curved branches. Opening a group draws the branches in
// one after another; closing folds them away. The chosen item and its branch
// light up in the accent colour.
//
//   <BranchedMenu items={[{ label: 'Getting started', children: [{ value: 'install', label: 'Installation', icon: Download04Icon }] }]}
//     defaultOpen={[0]} defaultActive="install" onSelect={(value) => go(value)} />
//
// Icons are Hugeicons icon data (@hugeicons/core-free-icons).

import { useEffect, useId, useState } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

import '#/styles/branched-menu.css'

export type BranchedItem = {
  value: string
  label: string
  icon?: IconSvgElement
  /** Sub-pages. They show, on their own smaller branches, while this item or one of them is chosen. */
  children?: BranchedItem[]
}
export type BranchedGroup = { label: string; children: BranchedItem[] }

export function BranchedMenu({
  items,
  defaultOpen = [0],
  open: openProp,
  expandAll = false,
  defaultActive,
  active: activeProp,
  onSelect,
  color = '#f5f5f5',
  accentColor = '#f5f5f5',
  lineColor = '#3f3f46',
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
}: {
  items: BranchedGroup[]
  /** Groups open at first (by index). */
  defaultOpen?: number[]
  /** Show every sub-item, not only the chosen item's (e.g. while searching). */
  expandAll?: boolean
  /** Opens exactly these groups whenever it changes (people can still fold them). */
  open?: number[]
  defaultActive?: string
  /** Controlled: the chosen item's value. */
  active?: string
  onSelect?: (value: string, item: BranchedItem) => void
  color?: string
  accentColor?: string
  lineColor?: string
  width?: number
  rowHeight?: number
  /** Where an item's label starts, from the left edge. */
  indent?: number
  /** Where the trunk line runs, from the left edge. */
  trunk?: number
  /** Corner radius of a branch's bend and of an item's highlight. */
  radius?: number
  lineWidth?: number
  fontSize?: number
  /** How long the branches take to draw in, ms. */
  drawDuration?: number
  /** How long a group takes to fold away, ms. */
  foldDuration?: number
}) {
  const [openState, setOpen] = useState<number[]>(defaultOpen)
  const [activeState, setActive] = useState(defaultActive)
  const active = activeProp ?? activeState

  // A controlled `open` (e.g. while searching) still lets people fold groups.
  useEffect(() => { if (openProp) setOpen(openProp) }, [openProp?.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (i: number) => setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]))

  return (
    <nav
      className="bm"
      style={{
        width, fontSize,
        '--bm-color': color, '--bm-accent': accentColor, '--bm-line': lineColor,
        '--bm-row': `${rowHeight}px`, '--bm-indent': `${indent}px`, '--bm-radius': `${radius}px`,
        '--bm-draw': `${drawDuration}ms`, '--bm-fold': `${foldDuration}ms`,
      } as React.CSSProperties}
    >
      {items.map((g, i) => (
        <Group key={g.label} group={g} isOpen={openState.includes(i)} onToggle={() => toggle(i)}
          active={active} expandAll={expandAll} onPick={(it) => { setActive(it.value); onSelect?.(it.value, it) }}
          rowHeight={rowHeight} indent={indent} trunk={trunk} radius={radius} lineWidth={lineWidth} drawDuration={drawDuration} />
      ))}
    </nav>
  )
}

/** How far each level of sub-items steps in, px. */
const STEP = 24

type Row = { item: BranchedItem; depth: number; parent: number }

/** The rows a group shows: top items, and the sub-items of whichever item is chosen (or all of them). */
function rowsOf(items: BranchedItem[], active: string | undefined, all: boolean): Row[] {
  const holds = (it: BranchedItem): boolean => it.value === active || !!it.children?.some(holds)
  const out: Row[] = []
  const walk = (list: BranchedItem[], depth: number, parent: number) => {
    for (const it of list) {
      const at = out.push({ item: it, depth, parent }) - 1
      if (it.children?.length && (all || holds(it))) walk(it.children, depth + 1, at)
    }
  }
  walk(items, 0, -1)
  return out
}

function Group({ group, isOpen, onToggle, active, expandAll, onPick, rowHeight, indent, trunk, radius, lineWidth, drawDuration }: {
  group: BranchedGroup
  isOpen: boolean
  onToggle: () => void
  active?: string
  expandAll: boolean
  onPick: (it: BranchedItem) => void
  rowHeight: number; indent: number; trunk: number; radius: number; lineWidth: number; drawDuration: number
}) {
  const id = useId()
  const rows = rowsOf(group.children, active, expandAll)
  const n = rows.length
  const h = n * rowHeight
  const mid = (k: number) => k * rowHeight + rowHeight / 2
  const r = Math.min(radius, rowHeight / 2, indent - trunk - 4)
  const activeIdx = rows.findIndex((x) => x.item.value === active)
  // Rows on the chosen item's path light up (the item and its parents).
  const lit = new Set<number>()
  for (let k = activeIdx; k >= 0; k = rows[k].parent) lit.add(k)
  const lastTop = rows.reduce((m, x, k) => (x.depth === 0 ? k : m), 0)
  // Each branch starts once the trunk has reached it.
  const delay = (k: number) => Math.round((drawDuration * k) / Math.max(1, n))
  // A sub-item hangs off a smaller trunk under its parent's label.
  const trunkX = (depth: number) => (depth === 0 ? trunk : indent + 10 + (depth - 1) * STEP)
  const endX = (depth: number) => indent - 8 + depth * STEP
  const branch = (k: number) => {
    const { depth, parent } = rows[k]
    const x = trunkX(depth)
    const rr = depth === 0 ? r : Math.min(r, 5)
    const top = depth === 0 ? mid(k) - rr : mid(parent) + rowHeight / 2 - 6
    return depth === 0
      ? `M${x} ${top} Q${x} ${mid(k)} ${x + rr} ${mid(k)} H${endX(0)}`
      : `M${x} ${Math.min(top, mid(k) - rr)} V${mid(k) - rr} Q${x} ${mid(k)} ${x + rr} ${mid(k)} H${endX(depth)}`
  }

  return (
    <div className={`bm-group${isOpen ? ' is-open' : ''}`}>
      <button type="button" className="bm-head" aria-expanded={isOpen} aria-controls={id} onClick={onToggle} style={{ height: rowHeight }}>
        <span className="bm-head-label">{group.label}</span>
        <svg className="bm-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
      </button>
      <div className="bm-fold" id={id} style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
        <div className="bm-fold-inner">
          <div className="bm-tree" style={{ height: h, transition: 'height 0.25s ease' }}>
            {/* key on isOpen and the rows: reopening or expanding draws the branches again. */}
            <svg key={`${isOpen}${n}`} className="bm-lines" width={indent + 4 * STEP} height={h} aria-hidden>
              <path className="bm-draw" pathLength={1} d={`M${trunk} 0 V${Math.max(0, mid(lastTop) - r)}`}
                stroke="var(--bm-line)" strokeWidth={lineWidth} fill="none" style={{ animationDuration: `${drawDuration}ms` }} />
              {rows.map((x, k) => (
                <path key={x.item.value} className="bm-draw" pathLength={1} d={branch(k)}
                  stroke={lit.has(k) ? 'var(--bm-accent)' : 'var(--bm-line)'} strokeWidth={lineWidth} fill="none" strokeLinecap="round"
                  style={{ animationDuration: `${Math.round(drawDuration * 0.6)}ms`, animationDelay: `${delay(k)}ms` }} />
              ))}
              {/* The chosen top-level item's trunk, lit from the top down to it. */}
              {lit.size > 0 && (
                <path className="bm-draw" pathLength={1} d={`M${trunk} 0 V${mid(Math.min(...lit)) - r}`}
                  stroke="var(--bm-accent)" strokeOpacity={0.45} strokeWidth={lineWidth} fill="none" style={{ animationDuration: `${drawDuration}ms` }} />
              )}
            </svg>
            <ul className="bm-items">
              {rows.map((x, k) => (
                <li key={x.item.value} style={{ height: rowHeight, marginLeft: x.depth * STEP }}>
                  <button type="button" className={`bm-item${x.item.value === active ? ' is-on' : ''}${x.depth ? ' is-sub' : ''}`} aria-current={x.item.value === active ? 'page' : undefined}
                    tabIndex={isOpen ? 0 : -1} onClick={() => onPick(x.item)}
                    style={{ animationDelay: `${delay(k)}ms` }}>
                    {x.item.icon && <HugeiconsIcon icon={x.item.icon} size={16} strokeWidth={1.6} className="bm-icon" />}
                    <span>{x.item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
