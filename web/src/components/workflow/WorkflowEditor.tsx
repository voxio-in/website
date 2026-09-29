// The n8n-style workflow editor: palette · canvas · settings. Holds React Flow
// state; everything it saves goes through convert.toWorkflow, so the engine
// JSON is the single format on disk.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import {
  extractWorkflow,
  isMapHandle,
  mapHandle,
  mapValue,
  toGraph,
  toWorkflow,
  type Graph,
  type NodeData,
  type Workflow,
} from '#/lib/workflow/convert'
import { layout } from '#/lib/workflow/layout'
import { GROUPS, NODE_SPECS, prettyName, setKnowledgeNames, specFor } from '#/lib/workflow/registry'
import { issuesByNode, validate } from '#/lib/workflow/validate'
import { TEMPLATES } from '#/lib/workflow/templates'
import Icon from '#/components/dashboard/Icon'
import { Loading } from '#/components/dashboard/ui'
import { FieldOptions } from './Fields'
import VxEdge from './Edge'
import NodeCard, { CardActions, type CardNode } from './NodeCard'
import SettingsPanel from './SettingsPanel'

type Props = {
  title: string
  initial: Workflow
  onSave: (wf: Workflow) => Promise<{ ok: boolean; reason?: string }>
  /** Knowledge bases on the account, for the Look up knowledge step. */
  knowledge?: { value: string; label: string; hint?: string }[]
  /** Opens the Test tab. Tests run the saved version, so unsaved work is saved first. */
  onTest?: () => void
}

const EDGE = { type: 'vx', markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } }
const edgeTypes = { vx: VxEdge }

type Snap = { nodes: CardNode[]; edges: Edge[] }

const nodeTypes = { vx: NodeCard }

function fromWorkflow(wf: Workflow): Snap {
  const g = layout(toGraph(wf))
  return {
    nodes: g.nodes.map((n) => ({ id: n.id, type: 'vx', position: n.position!, data: { ...n.data, issues: [], start: false } })),
    edges: g.edges.map((e) => ({ ...e, ...EDGE })),
  }
}

function toGraphOf(nodes: CardNode[], edges: Edge[]): Graph {
  return {
    nodes: nodes.map((n) => {
      const { issues: _i, start: _s, ...data } = n.data
      return { id: n.id, position: n.position, data: data as NodeData }
    }),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? 'next' })),
    extra: {},
  }
}

export default function WorkflowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  )
}

function Editor({ title, initial, onSave, knowledge = [], onTest }: Props) {
  const first = useMemo(() => fromWorkflow(initial), [initial])
  const extra = useMemo(() => { const { nodes: _n, ui: _u, ...rest } = initial; return rest }, [initial])
  const [nodes, setNodes, onNodesChange] = useNodesState<CardNode>(first.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(first.edges)
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'canvas' | 'json'>('canvas')
  const [grid, setGrid] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [showIssues, setShowIssues] = useState(false)
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'err'; text?: string }>({ kind: 'idle' })
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(toWorkflow(toGraphOf(first.nodes, first.edges), { withUi: false })))
  const rf = useReactFlow()

  // Undo / redo over whole snapshots.
  const past = useRef<Snap[]>([])
  const future = useRef<Snap[]>([])
  const commit = useCallback(() => {
    past.current.push({ nodes, edges })
    if (past.current.length > 100) past.current.shift()
    future.current = []
  }, [nodes, edges])
  const restore = (from: React.MutableRefObject<Snap[]>, to: React.MutableRefObject<Snap[]>) => {
    const s = from.current.pop()
    if (!s) return
    to.current.push({ nodes, edges })
    setNodes(s.nodes)
    setEdges(s.edges)
  }
  const lastEdit = useRef({ id: '', at: 0 })
  const undo = () => restore(past, future)
  const redo = () => restore(future, past)

  const graph = useMemo(() => ({ ...toGraphOf(nodes, edges), extra }), [nodes, edges, extra])
  const issues = useMemo(() => validate(graph), [graph])
  const byNode = useMemo(() => issuesByNode(issues), [issues])
  const errors = issues.filter((i) => i.level === 'error').length
  const workflow = useMemo(() => toWorkflow(graph), [graph])
  const dirty = JSON.stringify(toWorkflow(graph, { withUi: false })) !== savedJson

  // Where each connector leads, so a card can say "goes to …".
  const routes = useMemo(() => {
    const m = new Map<string, Record<string, string[]>>()
    for (const e of edges) {
      const r = m.get(e.source) ?? {}
      ;(r[e.sourceHandle ?? 'next'] ??= []).push(prettyName(e.target))
      m.set(e.source, r)
    }
    return m
  }, [edges])

  const shown = useMemo(
    () => nodes.map((n, i) => ({ ...n, data: { ...n.data, issues: byNode.get(n.id) ?? [], start: i === 0, routes: routes.get(n.id) ?? {} } })),
    [nodes, byNode, routes],
  )

  // Values the steps produce, for Branch ("decide on") and "pass along".
  const variables = useMemo(() => {
    const seen = new Map<string, string>()
    const typeOf = (v: unknown) => (typeof v === 'string' ? v : (v as { type?: string })?.type ?? 'str')
    for (const n of nodes) {
      const p = n.data.parameters
      if (n.data.type === 'input') for (const [k, v] of Object.entries((p.input_variables as object) ?? {})) seen.set(k, typeOf(v))
      for (const [k, v] of Object.entries((p.llm_return_type as object) ?? {})) if (!seen.has(k)) seen.set(k, typeOf(v))
      for (const k of (p.output_variables as string[] | undefined) ?? []) if (!seen.has(k)) seen.set(k, 'str')
    }
    return [...seen].map(([value, type]) => ({ value, type }))
  }, [nodes])
  useMemo(() => setKnowledgeNames(knowledge), [knowledge])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select')
      if (typing || !(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
      else if (e.key === 's') { e.preventDefault(); save() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Wheel zoom around the pointer, faster than React Flow's default step.
  useEffect(() => {
    const el = canvasRef.current
    if (!el || mode !== 'canvas') return
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.nowheel, .wf-quick-menu')) return
      e.preventDefault()
      const { x, y, zoom } = rf.getViewport()
      const next = Math.min(2, Math.max(0.2, zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022))))
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left
      const py = e.clientY - r.top
      rf.setViewport({ x: px - ((px - x) * next) / zoom, y: py - ((py - y) * next) / zoom, zoom: next })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [rf, mode])

  // Dragging a line's end onto another step moves it; dropping it on empty space removes it.
  const reconnected = useRef(true)
  const onReconnectStart = useCallback(() => { reconnected.current = false }, [])
  const onReconnect = useCallback((old: Edge, c: Connection) => {
    reconnected.current = true
    if (c.source === c.target) return
    commit()
    const handle = c.sourceHandle ?? 'next'
    setEdges((es) => reconnectEdge(old, { ...c, sourceHandle: handle }, es, { shouldReplaceId: false })
      .map((e) => (e.id === old.id ? { ...e, id: `${c.source}|${handle}|${c.target}` } : e)))
  }, [commit, setEdges])
  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    if (!reconnected.current) {
      commit()
      setEdges((es) => es.filter((e) => e.id !== edge.id))
    }
    reconnected.current = true
  }, [commit, setEdges])

  const isOut = (h?: string | null) => h === 'next' || isMapHandle(h ?? '')
  const onConnect = useCallback((raw: Connection) => {
    // Loose mode lets a drag start from either dot; turn it round so it always
    // leaves from an output dot.
    const c: Connection = !isOut(raw.sourceHandle) && isOut(raw.targetHandle)
      ? { source: raw.target, sourceHandle: raw.targetHandle, target: raw.source, targetHandle: null }
      : raw
    if (c.source === c.target || !isOut(c.sourceHandle ?? 'next')) return
    if (edges.some((e) => e.source === c.source && e.target === c.target && (e.sourceHandle ?? 'next') === (c.sourceHandle ?? 'next'))) return
    commit()
    const handle = c.sourceHandle ?? 'next'
    setEdges((es) => addEdge({ ...c, ...EDGE, sourceHandle: handle, id: `${c.source}|${handle}|${c.target}` }, es))
  }, [commit, setEdges, edges])

  /** Releasing a line anywhere on a card connects to that card, not just on its dot. */
  const onConnectEnd = useCallback((ev: MouseEvent | TouchEvent, state: { isValid: boolean | null; fromNode: { id: string } | null; fromHandle: { id?: string | null; type: string } | null }) => {
    if (state.isValid || !state.fromNode || !state.fromHandle) return
    const pt = 'changedTouches' in ev ? ev.changedTouches[0] : ev
    const el = document.elementFromPoint(pt.clientX, pt.clientY)?.closest('.react-flow__node') as HTMLElement | null
    const other = el?.dataset.id
    if (!other || other === state.fromNode.id) return
    const fromOut = state.fromHandle.type === 'source'
    onConnect(fromOut
      ? { source: state.fromNode.id, sourceHandle: state.fromHandle.id ?? 'next', target: other, targetHandle: null }
      : { source: other, sourceHandle: 'next', target: state.fromNode.id, targetHandle: null })
  }, [onConnect])

  const uniqueName = (base: string) => {
    const taken = new Set(nodes.map((n) => n.id))
    const root = base.replace(/[^a-z0-9?]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'step'
    let name = root
    for (let i = 2; taken.has(name); i++) name = `${root}_${i}`
    return name
  }

  const addNode = (type: string, position?: { x: number; y: number }) => {
    const spec = specFor(type)
    const id = uniqueName(spec.label)
    const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    commit()
    setNodes((ns) => [...ns, {
      id, type: 'vx', position: position ?? { x: center.x - 120, y: center.y - 48 },
      data: { type: spec.type, parameters: structuredClone(stripUndefined(spec.defaults)), extra: {}, missing: [], hadParams: true, issues: [], start: false },
    }])
    setSelected(id)
  }

  /** The + on a card: a new step to the right of its parent, already connected. */
  const addAfter = useCallback((from: string, handle: string, type: string) => {
    const src = nodes.find((n) => n.id === from)
    if (!src) return
    const spec = specFor(type)
    const id = uniqueName(spec.label)
    const siblings = edges.filter((e) => e.source === from).length
    commit()
    setNodes((ns) => [...ns, {
      id, type: 'vx', position: { x: src.position.x + 330, y: src.position.y + siblings * 170 },
      data: { type: spec.type, parameters: structuredClone(stripUndefined(spec.defaults)), extra: {}, missing: [], hadParams: true, issues: [], start: false },
    }])
    setEdges((es) => [...es, { ...EDGE, id: `${from}|${handle}|${id}`, source: from, sourceHandle: handle, target: id }])
    setSelected(id)
  }, [nodes, edges, commit])
  const cardActions = useMemo(() => ({ addAfter }), [addAfter])

  const onDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData('application/x-vx-node')
    if (!type) return
    e.preventDefault()
    addNode(type, rf.screenToFlowPosition({ x: e.clientX - 120, y: e.clientY - 30 }))
  }

  const updateParams = (id: string, params: Record<string, unknown>) => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    // One undo step per burst of typing, not per keystroke.
    const now = Date.now()
    if (lastEdit.current.id !== id || now - lastEdit.current.at > 1000) commit()
    lastEdit.current = { id, at: now }
    // Renaming or removing a branch route carries its edges along.
    if (node.data.type === 'conditional') {
      const before = Object.keys((node.data.parameters.mappings as object) ?? {})
      const after = Object.keys((params.mappings as object) ?? {})
      if (before.join('\u0000') !== after.join('\u0000')) {
        const renamed = new Map<string, string>()
        if (before.length === after.length) before.forEach((b, i) => renamed.set(b, after[i]))
        setEdges((es) => es.flatMap((e) => {
          if (e.source !== id || !isMapHandle(e.sourceHandle ?? '')) return [e]
          const to = renamed.get(mapValue(e.sourceHandle!)) ?? (after.includes(mapValue(e.sourceHandle!)) ? mapValue(e.sourceHandle!) : null)
          return to == null ? [] : [{ ...e, sourceHandle: mapHandle(to), id: `${id}|${mapHandle(to)}|${e.target}` }]
        }))
      }
    }
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, parameters: params } } : n)))
  }

  const rename = (from: string, to: string) => {
    to = to.trim()
    if (!to || to === from || nodes.some((n) => n.id === to)) return false
    commit()
    setNodes((ns) => ns.map((n) => (n.id === from ? { ...n, id: to } : n)))
    setEdges((es) => es.map((e) => {
      const source = e.source === from ? to : e.source
      const target = e.target === from ? to : e.target
      return { ...e, source, target, id: `${source}|${e.sourceHandle}|${target}` }
    }))
    setSelected(to)
    return true
  }

  const makeStart = (id: string) => {
    commit()
    setNodes((ns) => [...ns.filter((n) => n.id === id), ...ns.filter((n) => n.id !== id)])
  }

  const remove = (id: string) => {
    commit()
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id))
    setSelected(null)
  }

  const duplicate = (id: string) => {
    const n = nodes.find((x) => x.id === id)
    if (!n) return
    const copy = uniqueName(`${id}_copy`)
    commit()
    setNodes((ns) => [...ns, { ...n, id: copy, selected: false, position: { x: n.position.x + 40, y: n.position.y + 120 }, data: structuredClone(n.data) }])
    setSelected(copy)
  }

  const relayout = () => {
    commit()
    const g = layout(toGraphOf(nodes, edges), true)
    setNodes((ns) => ns.map((n) => ({ ...n, position: g.nodes.find((x) => x.id === n.id)!.position! })))
    setTimeout(() => rf.fitView({ duration: 300, padding: 0.15 }), 0)
  }

  const load = (wf: Workflow) => {
    commit()
    const s = fromWorkflow(wf)
    setNodes(s.nodes)
    setEdges(s.edges)
    setSelected(null)
    setTimeout(() => rf.fitView({ duration: 300, padding: 0.15 }), 0)
  }

  /** Resolves true when the workflow is saved. */
  async function save(): Promise<boolean> {
    if (errors) { setShowIssues(true); setStatus({ kind: 'err', text: `Fix ${errors} error${errors > 1 ? 's' : ''} first.` }); return false }
    setStatus({ kind: 'saving' })
    const res = await onSave(workflow)
    if (res.ok) {
      setSavedJson(JSON.stringify(toWorkflow(graph, { withUi: false })))
      setStatus({ kind: 'ok', text: res.reason ?? 'Saved' })
    } else setStatus({ kind: 'err', text: res.reason ?? 'Save failed' })
    return res.ok
  }

  const test = async () => {
    if (!onTest) return
    if (!dirty || (await save())) onTest()
  }

  const sel = nodes.find((n) => n.id === selected) ?? null

  return (
    <div className="wf">
      <header className="wf-bar">
        <div className="wf-title">
          <strong>{title}</strong>
          <span className={`wf-state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
        <div className="wf-tools">
          <div className="wf-iconset">
            <button className="db-iconbtn" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl+Z)" aria-label="Undo"><Icon name="back" size={17} className="wf-undo" /></button>
            <button className="db-iconbtn" onClick={redo} disabled={!future.current.length} title="Redo (Ctrl+Y)" aria-label="Redo"><Icon name="back" size={17} className="wf-redo" /></button>
            <button className="db-iconbtn" onClick={relayout} title="Tidy up" aria-label="Tidy up"><Icon name="sliders" size={17} /></button>
            <button className="db-iconbtn" onClick={() => rf.fitView({ duration: 250, padding: 0.15 })} title="Fit to screen" aria-label="Fit to screen"><Icon name="eye" size={17} /></button>
            <button className={`db-iconbtn${grid ? ' is-on' : ''}`} onClick={() => setGrid(!grid)} title={grid ? 'Hide grid' : 'Show grid and snap to it'} aria-label="Toggle grid" aria-pressed={grid}><Icon name="grid" size={17} /></button>
          </div>
          <TemplateMenu onPick={load} />
          <button className={`wf-health${errors ? ' is-err' : issues.length ? ' is-warn' : ''}`} onClick={() => setShowIssues(!showIssues)}>
            <Icon name={errors ? 'close' : 'check'} size={14} />
            {errors ? `${errors} to fix` : issues.length ? `${issues.length} tip${issues.length > 1 ? 's' : ''}` : 'All good'}
          </button>
          <button className={`db-iconbtn${mode === 'json' ? ' is-on' : ''}`} onClick={() => setMode(mode === 'json' ? 'canvas' : 'json')} title={mode === 'json' ? 'Back to canvas' : 'View code'} aria-label="Toggle code view">
            <Icon name="code" size={17} />
          </button>
          {onTest && (
            <button className="db-btn db-btn-icon" onClick={test} disabled={status.kind === 'saving'}>
              <Icon name="play" size={15} />{dirty ? 'Save and test' : 'Test'}
            </button>
          )}
          <button className="db-btn db-primary" onClick={save} disabled={status.kind === 'saving' || (!dirty && status.kind !== 'err')}>
            {status.kind === 'saving' ? <Loading inline label="Saving…" /> : 'Save'}
          </button>
        </div>
      </header>
      {status.text && status.kind !== 'saving' && <div className={`wf-toast is-${status.kind}`} onAnimationEnd={() => setStatus({ kind: 'idle' })}>{status.text}</div>}

      <FieldOptions.Provider value={{ knowledge, variables }}>
      <CardActions.Provider value={cardActions}>
      <div className="wf-body">
        <Palette onAdd={addNode} />

        <div className="wf-canvas" ref={canvasRef} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          {mode === 'canvas' ? (
            <ReactFlow
              nodes={shown}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={(c) => { if (c.some((x) => x.type === 'remove')) commit(); onNodesChange(c) }}
              onEdgesChange={(c) => { if (c.some((x) => x.type === 'remove')) commit(); onEdgesChange(c) }}
              onNodeDragStart={() => commit()}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd as never}
              connectionMode={ConnectionMode.Loose}
              edgeTypes={edgeTypes}
              elevateEdgesOnSelect
              onReconnectStart={onReconnectStart}
              onReconnect={onReconnect}
              onReconnectEnd={onReconnectEnd}
              edgesReconnectable
              reconnectRadius={14}
              connectionRadius={36}
              onNodeClick={(_, n) => setSelected(n.id)}
              onPaneClick={() => setSelected(null)}
              deleteKeyCode={['Delete', 'Backspace']}
              defaultEdgeOptions={EDGE}
              colorMode="dark"
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.2}
              maxZoom={2}
              zoomOnScroll={false}
              snapToGrid={grid}
              snapGrid={[24, 24]}
              onlyRenderVisibleElements
              proOptions={{ hideAttribution: true }}
            >
              {grid
                ? <Background variant={BackgroundVariant.Lines} gap={24} lineWidth={1} />
                : <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />}
              <Controls showInteractive={false} position="bottom-right" />
            </ReactFlow>
          ) : (
            <JsonMode workflow={workflow} onApply={load} />
          )}

          {showIssues && issues.length > 0 && (
            <div className="wf-issues">
              {issues.map((i, k) => (
                <button key={k} className={`wf-issue is-${i.level}`} onClick={() => i.node && (setSelected(i.node), rf.fitView({ nodes: [{ id: i.node }], duration: 300, maxZoom: 1.2 }))}>
                  <b>{i.node ? prettyName(i.node) : 'Workflow'}</b> {i.message}
                </button>
              ))}
            </div>
          )}
        </div>

        {sel && (
          <SettingsPanel
            key={sel.id}
            id={sel.id}
            data={sel.data}
            isStart={nodes[0]?.id === sel.id}
            issues={byNode.get(sel.id) ?? []}
            onParams={(p) => updateParams(sel.id, p)}
            onRename={(to) => rename(sel.id, to)}
            onStart={() => makeStart(sel.id)}
            onDelete={() => remove(sel.id)}
            onDuplicate={() => duplicate(sel.id)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      </CardActions.Provider>
      </FieldOptions.Provider>
    </div>
  )
}

const stripUndefined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

const GROUP_TITLE: Record<string, string> = { Conversation: 'Talk & listen', AI: 'AI', Logic: 'Decide', Knowledge: 'Knowledge', Shopify: 'Shopify' }

function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  const [q, setQ] = useState('')
  const match = (s: (typeof NODE_SPECS)[number]) => !s.hidden && (!q || `${s.label} ${s.blurb}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <aside className="wf-palette">
      <div className="wf-palette-head">
        <b>Add a step</b>
        <span>Drag onto the canvas, or click.</span>
      </div>
      <label className="db-search wf-psearch">
        <Icon name="search" size={16} />
        <input placeholder="Search steps" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {GROUPS.map((g) => {
        const specs = NODE_SPECS.filter((s) => s.group === g && match(s))
        if (!specs.length) return null
        return (
          <div key={g} className="wf-pgroup">
            <div className="wf-plabel">{GROUP_TITLE[g] ?? g}</div>
            {specs.map((s) => (
              <button key={s.type} className="wf-pitem" draggable={!s.unsupported} disabled={!!s.unsupported} style={{ '--c': s.color } as React.CSSProperties}
                onDragStart={(e) => { e.dataTransfer.setData('application/x-vx-node', s.type); e.dataTransfer.effectAllowed = 'move' }}
                onClick={() => onAdd(s.type)}>
                <span className="wf-tile"><Icon name={s.icon} size={16} /></span>
                <span className="wf-ptext">
                  <span className="wf-pname">{s.label}{s.unsupported && <em>Soon</em>}</span>
                  <span className="wf-pblurb">{s.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        )
      })}
    </aside>
  )
}

function TemplateMenu({ onPick }: { onPick: (wf: Workflow) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="wf-menu">
      <button className="db-btn db-btn-icon" onClick={() => setOpen(!open)}><Icon name="list" size={16} />Templates</button>
      {open && (
        <div className="wf-menu-list" onMouseLeave={() => setOpen(false)}>
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => { setOpen(false); if (confirmReplace()) onPick(structuredClone(t.workflow)) }}>
              <b>{t.name}</b><span>{t.blurb}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// A template replaces the canvas; Undo brings it back, so no blocking dialog.
const confirmReplace = () => true

function JsonMode({ workflow, onApply }: { workflow: Workflow; onApply: (wf: Workflow) => void }) {
  const [text, setText] = useState(() => JSON.stringify(workflow, null, 2))
  const [err, setErr] = useState<string | null>(null)
  const apply = () => {
    try {
      const wf = extractWorkflow(JSON.parse(text))
      if (!wf) throw new Error('No "nodes" object found.')
      setErr(null)
      onApply(wf)
    } catch (e) { setErr((e as Error).message) }
  }
  return (
    <div className="wf-jsonmode">
      <div className="wf-jsonbar">
        <span>The workflow as code. Paste one here to replace the canvas.</span>
        <button className="db-btn" onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
        <button className="db-btn db-primary" onClick={apply}>Apply</button>
      </div>
      {err && <div className="wf-jsonerr">{err}</div>}
      <textarea className="db-in wf-jsonarea" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  )
}
