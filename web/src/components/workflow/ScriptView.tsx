// The Script view of the workflow editor (mindsets/voxio-users.md, Workflow editor):
// what the agent says and is told, in conversation order, each in a big editor.
// It edits the same steps as the canvas, through the editor's own updateParams,
// so Undo, the checks and Save all work the same.

import type { Edge } from '@xyflow/react'

import { Tags } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { AiGlow } from '#/components/dashboard/ui'
import { NEXT_HANDLE, handleRoute } from '#/lib/workflow/convert'
import { friendlyVar, prettyName, specFor } from '#/lib/workflow/registry'
import type { Issue } from '#/lib/workflow/validate'
import { GrowArea } from './GrowArea'
import type { CardNode } from './NodeCard'

const AI_TYPES = new Set(['llm', 'llm-streaming', 'llm_webnavigation', 'llm_shopify', 'shopify_llm', 'rag_shopify'])
const answer = (m: string) => (m === 'true' ? 'yes' : m === 'false' ? 'no' : m)

/** Steps in conversation order: depth first from the first step, along each step's paths in order. */
function order(nodes: CardNode[], edges: Edge[]) {
  const out = new Map<string, Edge[]>()
  for (const e of edges) out.set(e.source, [...(out.get(e.source) ?? []), e])
  const seen = new Set<string>()
  const list: { node: CardNode; back: string[] }[] = []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const visit = (id: string) => {
    const node = byId.get(id)
    if (!node || seen.has(id)) return
    seen.add(id)
    const item = { node, back: [] as string[] }
    list.push(item)
    for (const e of out.get(id) ?? []) {
      // A line to a step already shown is where the conversation loops back.
      if (seen.has(e.target)) item.back.push(e.target)
      else visit(e.target)
    }
  }
  if (nodes[0]) visit(nodes[0].id)
  return { list, unreached: nodes.filter((n) => !seen.has(n.id)) }
}

export function ScriptView({ nodes, edges, issues, onParams, onShow }: {
  nodes: CardNode[]
  edges: Edge[]
  issues: Map<string, Issue[]>
  onParams: (id: string, params: Record<string, unknown>) => void
  /** Open this step on the canvas. */
  onShow: (id: string) => void
}) {
  const { list, unreached } = order(nodes, edges)
  const item = (n: CardNode, back: string[] = []) => (
    <ScriptItem key={n.id} n={n} edges={edges} back={back} issues={issues.get(n.id) ?? []} onParams={(p) => onParams(n.id, p)} onShow={() => onShow(n.id)} />
  )
  return (
    <div className="wf-script">
      <div className="wf-script-inner">
        <p className="wf-script-lead">What your agent says and is told, in the order a conversation goes. Edit any of it here; the boxes and lines are under Flow.</p>
        {list.map(({ node, back }) => item(node, back))}
        {unreached.length > 0 && (
          <>
            <h2 className="wf-script-h">Not connected yet</h2>
            <p className="wf-script-note">Nothing leads to these steps, so they never run. Connect them under Flow, or delete them.</p>
            {unreached.map((n) => item(n))}
          </>
        )}
      </div>
    </div>
  )
}

/** A Say that speaks nothing of its own: what it passes on, in words. */
function passedOn(vars: string[]): React.ReactNode {
  if (vars.includes('speak')) return <>Speaks the AI’s reply{vars.includes('hangup') ? ', and hangs up when the AI says it’s over' : ''}</>
  if (vars.length === 1 && vars[0] === 'user_input') return <>Shows the caller’s words in the transcript</>
  return <>Sends {vars.map(friendlyVar).join(', ')} without speaking</>
}

function ScriptItem({ n, edges, back, issues, onParams, onShow }: {
  n: CardNode
  edges: Edge[]
  back: string[]
  issues: Issue[]
  onParams: (p: Record<string, unknown>) => void
  onShow: () => void
}) {
  const spec = specFor(n.data.type)
  const p = n.data.parameters
  const set = (k: string, v: unknown) => onParams({ ...p, [k]: v })
  const errors = issues.filter((i) => i.level === 'error').length
  const loop = back.length > 0 && <p className="wf-script-loop"><Icon name="back" size={18} />Then back to {back.map(prettyName).join(', ')}</p>

  // Steps with no words of their own read as one quiet line.
  const quiet = (text: React.ReactNode) => (
    <div className="wf-script-quiet" style={{ '--c': spec.color } as React.CSSProperties}>
      <span className="wf-tile"><Icon name={spec.icon} size={16} /></span>
      <span>{text}</span>
      <button type="button" className="wf-script-show" onClick={onShow}>Show in Flow</button>
      {loop}
    </div>
  )

  if (n.data.type === 'input') return quiet(<>Waits for the caller to speak</>)
  if (n.data.type === 'conditional') {
    const on = Object.keys((p.input_variables as object) ?? {})[0]
    const paths = edges.filter((e) => e.source === n.id)
    const route = (h: string) => paths.filter((e) => handleRoute(e.sourceHandle) === h).map((e) => prettyName(e.target)).join(', ') || 'nowhere yet'
    const maps = Object.keys((p.mappings as object) ?? {})
    return quiet(<>Decides on <b>{on ? friendlyVar(on).toLowerCase() : 'nothing yet'}</b>: {maps.map((m) => <span key={m}>if {answer(m)} → {route(`m:${m}`)} · </span>)}otherwise → {route(NEXT_HANDLE)}</>)
  }
  const speak = n.data.type === 'out' ? (p.out_dict as Record<string, unknown> | undefined)?.speak : undefined
  const ai = AI_TYPES.has(n.data.type)
  const filler = n.data.type === 'random-speak-out'
  if (n.data.type === 'out' && typeof speak !== 'string' && !Object.keys((p.out_dict as object) ?? {}).length && (p.variables as unknown[] | undefined)?.length)
    return quiet(passedOn(p.variables as string[]))
  if (!ai && !filler && n.data.type !== 'out') return quiet(<>{spec.label}: {spec.summary(p)}</>)

  return (
    <section className={`wf-script-item${errors ? ' has-err' : ''}`} style={{ '--c': spec.color } as React.CSSProperties}>
      <header className="wf-script-head">
        <span className="wf-tile"><Icon name={spec.icon} size={18} /></span>
        <span className="wf-script-titles">
          <b>{ai ? 'Told' : filler ? 'Fills the silence with' : (p.out_dict as { hangup?: unknown } | undefined)?.hangup ? 'Says, then hangs up' : 'Says'}</b>
          <span>{prettyName(n.id)} · {spec.label}</span>
        </span>
        <button type="button" className="wf-script-show" onClick={onShow}>Show in Flow</button>
      </header>
      {issues.length > 0 && (
        <ul className="wf-script-issues">{issues.map((i, k) => <li key={k} className={`is-${i.level}`}>{i.message}</li>)}</ul>
      )}
      {ai && (
        <GrowArea title={`Instructions · ${prettyName(n.id)}`} minRows={6} className="wf-prompt" value={String(p.system_prompt ?? '')}
          placeholder="Tell the agent who it is, what to do and how to talk." onChange={(v) => set('system_prompt', v)} glow={(a) => <AiGlow>{a}</AiGlow>} />
      )}
      {filler && <Tags value={Array.isArray(p.phrases) ? p.phrases.map(String) : []} placeholder="Type a phrase and press Enter" onChange={(v) => set('phrases', v)} />}
      {n.data.type === 'out' && (
        <GrowArea title={`What it says · ${prettyName(n.id)}`} value={typeof speak === 'string' ? speak : ''} placeholder="What the agent says here (leave empty to say nothing)"
          onChange={(t) => { const { speak: _s, ...rest } = (p.out_dict as Record<string, unknown>) ?? {}; set('out_dict', t ? { ...rest, speak: t } : rest) }} />
      )}
      {loop}
    </section>
  )
}
