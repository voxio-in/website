import { createContext, memo, useContext, useEffect, useRef, useState } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import Icon from '#/components/dashboard/Icon'
import { AiGlow } from '#/components/dashboard/ui'
import { NEXT_HANDLE, mapHandle, type NodeData } from '#/lib/workflow/convert'
import { NODE_SPECS, friendlyVar, prettyName, specFor } from '#/lib/workflow/registry'
import type { Issue } from '#/lib/workflow/validate'

export type CardData = NodeData & { issues: Issue[]; start: boolean; /** handle → names of the steps it leads to */ routes?: Record<string, string[]> }
export type CardNode = Node<CardData, 'vx'>

/** Lets a card add the next step without putting callbacks in node data. */
export const CardActions = createContext<{ addAfter: (from: string, handle: string, type: string) => void }>({ addAfter: () => {} })

const PICKABLE = NODE_SPECS.filter((s) => !s.hidden)

function QuickAdd({ from, handle, className }: { from: string; handle: string; className?: string }) {
  const { addAfter } = useContext(CardActions)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as globalThis.Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={ref} className={`wf-quick ${className ?? ''}${open ? ' is-open' : ''}`}>
      <button className="wf-quick-btn nodrag" aria-label="Add the next step" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}>
        <Icon name="plus" size={13} />Add next step
      </button>
      {open && (
        <div className="wf-quick-menu nodrag nowheel" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <span className="wf-quick-title">Add the next step</span>
          {PICKABLE.map((s) => (
            <button key={s.type} disabled={!!s.unsupported} onClick={() => { setOpen(false); addAfter(from, handle, s.type) }}>
              <span className="wf-tile" style={{ '--c': s.color } as React.CSSProperties}><Icon name={s.icon} size={14} /></span>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NodeCard({ id, data, selected }: NodeProps<CardNode>) {
  const spec = specFor(data.type)
  const errors = data.issues.filter((i) => i.level === 'error').length
  const warns = data.issues.length - errors
  const paths = spec.out === 'mappings' ? Object.keys((data.parameters.mappings as object) ?? {}) : []
  const on = Object.keys((data.parameters.input_variables as object) ?? {})[0]
  const interrupt = data.parameters.interruption_type as string | undefined
  // AI steps get the beam while they're the one being edited.
  const aiSelected = selected && (spec.group === 'AI' || data.type.includes('llm'))

  const card = (
    <div className={`wf-node${selected ? ' is-sel' : ''}${errors ? ' has-err' : ''}${spec.unsupported ? ' is-soon' : ''}`} style={{ '--c': spec.color } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="wf-h wf-h-in" />
      {data.start && <span className="wf-startflag"><Icon name="play" size={11} />Starts here</span>}

      <div className="wf-node-head">
        <span className="wf-tile"><Icon name={spec.icon} size={18} /></span>
        <span className="wf-node-titles">
          <span className="wf-node-name">{prettyName(id)}</span>
          <span className="wf-node-kind">{spec.label}</span>
        </span>
      </div>
      <p className="wf-node-sum">{spec.summary(data.parameters)}</p>

      {(interrupt === 'no' || interrupt === 'duration' || errors > 0 || warns > 0 || spec.unsupported) && (
        <div className="wf-node-foot">
          {interrupt === 'no' && <span className="wf-chip">Can’t be interrupted</span>}
          {interrupt === 'duration' && <span className="wf-chip">Briefly protected</span>}
          {spec.unsupported && <span className="wf-chip is-soon">Coming soon</span>}
          {errors > 0 && <span className="wf-chip is-err">Needs attention</span>}
          {!errors && warns > 0 && <span className="wf-chip is-warn">{warns} tip{warns > 1 ? 's' : ''}</span>}
        </div>
      )}

      {paths.length > 0 && (
        <div className="wf-paths">
          {paths.map((m) => (
            <div className="wf-path" key={m} title={goes(data.routes?.[mapHandle(m)])}>
              <span>If {on ? <b>{friendlyVar(on).toLowerCase()}</b> : 'the answer'} is <b>{answer(m)}</b></span>
              <span className="wf-goes">{goes(data.routes?.[mapHandle(m)])}</span>
              <Handle type="source" id={mapHandle(m)} position={Position.Right} className="wf-h wf-h-path" />
            </div>
          ))}
          <div className="wf-path is-else" title={goes(data.routes?.[NEXT_HANDLE])}>
            <span>Otherwise</span>
            <span className="wf-goes">{goes(data.routes?.[NEXT_HANDLE])}</span>
            <Handle type="source" id={NEXT_HANDLE} position={Position.Right} className="wf-h wf-h-path" />
          </div>
        </div>
      )}

      {spec.out === 'single' && (
        <>
          <Handle type="source" id={NEXT_HANDLE} position={Position.Right} className="wf-h wf-h-out" />
          <QuickAdd from={id} handle={NEXT_HANDLE} className="is-below" />
        </>
      )}
    </div>
  )
  return aiSelected ? <AiGlow>{card}</AiGlow> : card
}

const answer = (m: string) => (m === 'true' ? 'yes' : m === 'false' ? 'no' : m || '…')
const goes = (to?: string[]) => (to?.length ? `→ ${to.join(', ')}` : '→ nowhere yet')

export default memo(NodeCard)
