// A connection line with a delete button at its middle, shown on hover or when
// selected. The line has a wide invisible hit area so it's easy to hover.

import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react'

import Icon from '#/components/dashboard/Icon'

export default function VxEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, selected } = props
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const { deleteElements } = useReactFlow()
  const [hover, setHover] = useState(false)
  const show = selected || hover

  return (
    <>
      <g onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={26} />
      </g>
      <EdgeLabelRenderer>
        <button
          className={`wf-edge-x nodrag nopan${show ? ' is-on' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={(e) => { e.stopPropagation(); deleteElements({ edges: [{ id }] }) }}
          title="Remove this connection" aria-label="Remove this connection">
          <Icon name="close" size={13} />
        </button>
      </EdgeLabelRenderer>
    </>
  )
}
