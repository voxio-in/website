// A connection line with a delete button, shown on hover or when selected.
// The line has a wide invisible hit area so it's easy to hover.
// Two looks, picked for the whole canvas: right-angle lines (default) or curves.
//
// A right-angle line runs  start → (x1, sy) → (x1, y) → (x2, y) → (x2, ty) → end:
// up to three inner segments, each with its own grip. Dragging the first
// vertical segment of a straight Z apart from the second opens the line into
// that full shape. Positions are stored relative to the line's start, so a
// moved step keeps the shape. Double-click a grip to straighten the line.

import { createContext, useContext, useRef, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, Position, getBezierPath, getSmoothStepPath, useReactFlow, type EdgeProps } from '@xyflow/react'

import Icon from '#/components/dashboard/Icon'
import type { Bend, EdgeStyle } from '#/lib/workflow/convert'

export const EdgeLook = createContext<{ style: EdgeStyle; onBendStart: () => void }>({ style: 'step', onBendStart: () => {} })

const GAP = 28 // how far a line leaves a step before turning
const R = 10 // corner radius

type Pt = { x: number; y: number }

/** The bend this line uses: the stored one, or a sensible default. Absolute coords. */
function routeOf(sx: number, sy: number, tx: number, ty: number, bend: Bend | null) {
  if (bend) return { x1: sx + bend.x1, y: sy + bend.y, x2: sx + bend.x2 }
  if (tx - sx >= GAP * 2) { const m = (sx + tx) / 2; return { x1: m, y: (sy + ty) / 2, x2: m } }
  // Going backwards: out, round underneath both ends, back in.
  return { x1: sx + GAP, y: Math.max(sy, ty) + 90, x2: tx - GAP }
}

/** Corner points without repeats or straight-through points. */
function clean(pts: Pt[]) {
  const out: Pt[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue
    out.push(p)
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3)
      const straight = (Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5) || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)
      if (!straight) break
      out.splice(out.length - 2, 1)
    }
  }
  return out
}

/** SVG path through the points with rounded corners. */
function rounded(pts: Pt[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]]
    const r = Math.min(R, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2)
    const p1 = { x: b.x - Math.sign(b.x - a.x) * r, y: b.y - Math.sign(b.y - a.y) * r }
    const p2 = { x: b.x + Math.sign(c.x - b.x) * r, y: b.y + Math.sign(c.y - b.y) * r }
    d += ` L ${p1.x} ${p1.y} Q ${b.x} ${b.y} ${p2.x} ${p2.y}`
  }
  const z = pts[pts.length - 1]
  return `${d} L ${z.x} ${z.y}`
}

type Part = 'x1' | 'y' | 'x2'

export default function VxEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, selected, data } = props
  const look = useContext(EdgeLook)
  const { deleteElements, updateEdgeData, screenToFlowPosition } = useReactFlow()
  const [hover, setHover] = useState(false)
  const [dragging, setDragging] = useState<Part | null>(null)
  const show = selected || hover || !!dragging

  const stored = (data?.bend && typeof data.bend === 'object' ? data.bend : null) as Bend | null
  const r = routeOf(sourceX, sourceY, targetX, targetY, stored)
  const sx = sourceX + 0, tx = targetX
  const pts = clean([{ x: sx, y: sourceY }, { x: r.x1, y: sourceY }, { x: r.x1, y: r.y }, { x: r.x2, y: r.y }, { x: r.x2, y: targetY }, { x: tx, y: targetY }])

  // Hand-movable right angles are for the usual right → left line; other sides route themselves.
  const usual = sourcePosition === Position.Right && targetPosition === Position.Left
  let path: string, lx: number, ly: number
  if (look.style === 'curve') [path, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  else if (!usual) [path, lx, ly] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: R, offset: GAP })
  else { path = rounded(pts); lx = (r.x1 + r.x2) / 2; ly = r.y }

  // One grip per movable segment that actually exists.
  const open = Math.abs(r.x1 - r.x2) > 0.5
  const grips: { part: Part; x: number; y: number; dir: 'ew' | 'ns' }[] = look.style === 'step' && usual ? [
    ...(Math.abs(r.y - sourceY) > 8 || open ? [{ part: 'x1' as const, x: r.x1, y: (sourceY + r.y) / 2, dir: 'ew' as const }] : []),
    ...(open ? [{ part: 'y' as const, x: (r.x1 + r.x2) / 2, y: r.y, dir: 'ns' as const }] : []),
    ...(open && Math.abs(targetY - r.y) > 8 ? [{ part: 'x2' as const, x: r.x2, y: (r.y + targetY) / 2, dir: 'ew' as const }] : []),
  ] : []
  // A plain Z (one vertical) moves both verticals together unless pulled apart with Shift.
  const plainZ = !open

  const base = useRef<Bend | null>(null)
  const onDown = (part: Part) => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    base.current = { x1: r.x1 - sourceX, y: r.y - sourceY, x2: r.x2 - sourceX }
    look.onBendStart()
    setDragging(part)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging || !base.current) return
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const b = { ...base.current }
    if (dragging === 'y') b.y = p.y - sourceY
    else if (dragging === 'x1') { b.x1 = p.x - sourceX; if (plainZ && !e.shiftKey) b.x2 = b.x1 }
    else b.x2 = p.x - sourceX
    updateEdgeData(id, { bend: b })
  }
  const onUp = () => { base.current = null; setDragging(null) }
  const straighten = (e: React.MouseEvent) => { e.stopPropagation(); look.onBendStart(); updateEdgeData(id, { bend: undefined }) }

  return (
    <>
      <g onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={26} />
      </g>
      <EdgeLabelRenderer>
        {grips.map((g) => (
          <span key={g.part} className={`wf-edge-grip is-${g.dir} nodrag nopan${show ? ' is-on' : ''}${dragging === g.part ? ' is-drag' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${g.x}px, ${g.y}px)` }}
            title="Drag to move this part of the line · double-click to straighten" aria-label="Move line"
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            onPointerDown={onDown(g.part)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={straighten} />
        ))}
        <button className={`wf-edge-x nodrag nopan${show ? ' is-on' : ''}`}
          // Keep the × clear of every grip: above the line's middle, nudged further if a grip sits there.
          style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly - (grips.length ? (grips.some((g) => Math.abs(g.x - lx) < 30 && Math.abs(g.y - (ly - 30)) < 24) ? 56 : 30) : 0)}px)` }}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          onClick={(e) => { e.stopPropagation(); deleteElements({ edges: [{ id }] }) }}
          title="Remove this connection" aria-label="Remove this connection">
          <Icon name="close" size={13} />
        </button>
      </EdgeLabelRenderer>
    </>
  )
}
