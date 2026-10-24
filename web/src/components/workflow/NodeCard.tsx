import { createContext, memo, useContext, useEffect, useRef, useState } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import Icon, { type IconName } from '#/components/dashboard/Icon'
import { AiGlow } from '#/components/dashboard/ui'
import { NEXT_HANDLE, SIDES, inHandle, mapHandle, sideHandle, type NodeData, type Side } from '#/lib/workflow/convert'
import { MOVES, moveById, suggestionsAfter } from '#/lib/workflow/recipes'
import { NODE_SPECS, friendlyVar, prettyName, specFor } from '#/lib/workflow/registry'
import type { Issue } from '#/lib/workflow/validate'

export type CardData = NodeData & { issues: Issue[]; start: boolean; /** handle → names of the steps it leads to */ routes?: Record<string, string[]> }
export type CardNode = Node<CardData, 'vx'>

/** Something "Add next step" can add: one step, a conversation move, or a line back to the Listen before. */
export type AddItem = { kind: 'step'; type: string } | { kind: 'move'; id: string } | { kind: 'loop' }

/** Lets a card add the next step without putting callbacks in node data. */
export const CardActions = createContext<{
  insert: (from: string, handle: string, item: AddItem) => void
  /** The Listen a line from this step would loop back to, if there is one. */
  listenBefore: (from: string) => string | null
}>({ insert: () => {}, listenBefore: () => null })

// Steps that can't run on calls yet aren't offered as a next step.
const PICKABLE = NODE_SPECS.filter((s) => !s.hidden && !s.unsupported)

function QuickAdd({ from, handle, type, onPath, className }: { from: string; handle: string; type: string; onPath?: boolean; className?: string }) {
  const { insert, listenBefore } = useContext(CardActions)
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
  const back = open ? listenBefore(from) : null
  // What usually comes next first; a loop only when there is a Listen to go back to.
  const suggested = suggestionsAfter(type, !!onPath).filter((x) => x.kind !== 'loop' || back)
  const pick = (item: AddItem) => { setOpen(false); insert(from, handle, item) }
  const row = (item: AddItem, key: string, icon: IconName, color: string, label: string) => (
    <button key={key} onClick={() => pick(item)}>
      <span className="wf-tile" style={{ '--c': color } as React.CSSProperties}><Icon name={icon} size={16} /></span>{label}
    </button>
  )
  const itemRow = (x: AddItem, i: number) => {
    if (x.kind === 'loop') return row(x, `loop${i}`, 'back', '#7aa9ff', `Back to ${prettyName(back!)}`)
    if (x.kind === 'move') { const m = moveById(x.id)!; return row(x, m.id, m.icon, m.color, m.label) }
    const s = specFor(x.type)
    return row(x, s.type, s.icon, s.color, s.label)
  }
  return (
    <div ref={ref} className={`wf-quick ${className ?? ''}${open ? ' is-open' : ''}`}>
      <button className="wf-quick-btn nodrag" aria-label="Add the next step" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}>
        <Icon name="plus" size={16} /><span className="wf-quick-label">Add next step</span>
      </button>
      {open && (
        <div className="wf-quick-menu nodrag nowheel" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {suggested.length > 0 && <span className="wf-quick-title">Usually next</span>}
          {suggested.map(itemRow)}
          <span className="wf-quick-title">Conversation moves</span>
          {MOVES.filter((m) => !suggested.some((x) => x.kind === 'move' && x.id === m.id)).map((m) => itemRow({ kind: 'move', id: m.id }, 0))}
          <span className="wf-quick-title">Single steps</span>
          {PICKABLE.filter((s) => !suggested.some((x) => x.kind === 'step' && x.type === s.type)).map((s) => itemRow({ kind: 'step', type: s.type }, 0))}
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
  const hangsUp = !!(data.parameters.out_dict as { hangup?: unknown } | undefined)?.hangup
  // AI steps get the beam while they're the one being edited.
  const aiSelected = selected && (spec.group === 'AI' || data.type.includes('llm'))

  const card = (
    <div className={`wf-node${selected ? ' is-sel' : ''}${errors ? ' has-err' : ''}${spec.unsupported ? ' is-soon' : ''}`} style={{ '--c': spec.color } as React.CSSProperties}>
      {/* One connection point in the middle of every side. A one-way-out step's work both ways;
          a Branch is entered on top, left or bottom, and its paths leave on the right. */}
      {spec.out === 'mappings'
        ? (['top', 'left', 'bottom'] as Side[]).map((s) => <Handle key={s} type="target" id={inHandle(s)} position={POS[s]} className={`wf-h wf-h-side is-${s}`} />)
        : SIDES.map((s) => <Handle key={s} type="source" id={sideHandle(s)} position={POS[s]} className={`wf-h wf-h-side is-${s}`} />)}
      {data.start && <span className="wf-startflag"><Icon name="play" size={11} />Starts here</span>}

      <div className="wf-node-head">
        <span className="wf-tile"><Icon name={spec.icon} size={18} /></span>
        <span className="wf-node-titles">
          <span className="wf-node-name">{prettyName(id)}</span>
          <span className="wf-node-kind">{spec.label}</span>
        </span>
      </div>
      <p className="wf-node-sum">{spec.summary(data.parameters)}</p>

      {(hangsUp || interrupt === 'no' || interrupt === 'duration' || errors > 0 || warns > 0 || spec.unsupported) && (
        <div className="wf-node-foot">
          {hangsUp && <span className="wf-chip is-end">Hangs up</span>}
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
              <QuickAdd from={id} handle={mapHandle(m)} type={data.type} onPath className="is-path" />
            </div>
          ))}
          <div className="wf-path is-else" title={goes(data.routes?.[NEXT_HANDLE])}>
            <span>Otherwise</span>
            <span className="wf-goes">{goes(data.routes?.[NEXT_HANDLE])}</span>
            <Handle type="source" id={NEXT_HANDLE} position={Position.Right} className="wf-h wf-h-path" />
            <QuickAdd from={id} handle={NEXT_HANDLE} type={data.type} onPath className="is-path" />
          </div>
        </div>
      )}

      {spec.out === 'single' && (
        <>
          {!hangsUp && <QuickAdd from={id} handle={NEXT_HANDLE} type={data.type} className="is-below" />}
        </>
      )}
    </div>
  )
  return aiSelected ? <AiGlow>{card}</AiGlow> : card
}

const POS: Record<Side, Position> = { top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left }

const answer = (m: string) => (m === 'true' ? 'yes' : m === 'false' ? 'no' : m || '…')
const goes = (to?: string[]) => (to?.length ? `→ ${to.join(', ')}` : '→ nowhere yet')

export default memo(NodeCard)
