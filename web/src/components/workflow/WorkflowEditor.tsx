// The n8n-style workflow editor: palette · canvas · settings. Holds React Flow
// state; everything it saves goes through convert.toWorkflow, so the engine
// JSON is the single format on disk.
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  type NodeChange,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import {
  NEXT_HANDLE,
  extractWorkflow,
  handleRoute,
  handleSide,
  inHandle,
  isMapHandle,
  sideHandle,
  type Side,
  mapHandle,
  mapValue,
  toGraph,
  toWorkflow,
  type Bend,
  type EdgeStyle,
  type Graph,
  type NodeData,
  type Workflow,
} from '#/lib/workflow/convert'
import { NODE_H, NODE_W, layout } from '#/lib/workflow/layout'
import { GROUPS, NODE_SPECS, prettyName, setKnowledgeNames, specFor } from '#/lib/workflow/registry'
import { issuesByNode, validate } from '#/lib/workflow/validate'
import { OFFERED_TEMPLATES } from '#/lib/workflow/templates'
import { LISTEN, LISTEN_STEPS, MOVES, SILENT_AI, moveById, type Move } from '#/lib/workflow/recipes'
import { ChevronDownIcon, ChevronsLeftIcon, ChevronsRightIcon, EllipsisIcon } from 'lucide-react'
import Icon, { type IconName } from '#/components/dashboard/Icon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/base-ui/popover'
import { toast } from '#/components/ui/halo-toast'
import { Dialog, Loading, Notice, ThemeCtx } from '#/components/dashboard/ui'
import { ScriptView } from './ScriptView'
import { FieldOptions } from './Fields'
import VxEdge, { EdgeLook } from './Edge'
import NodeCard, { CardActions, type AddItem, type CardNode } from './NodeCard'
import SettingsPanel from './SettingsPanel'
import { ExportDialog, ImportDialog } from './Transfer'

type Props = {
  title: string
  initial: Workflow
  onSave: (wf: Workflow) => Promise<{ ok: boolean; reason?: string }>
  /** Knowledge bases on the account, for the Look up knowledge step. */
  knowledge?: { value: string; label: string; hint?: string }[]
  /** Opens the Test tab. Tests run the saved version, so unsaved work is saved first. */
  onTest?: () => void
  /** The flow's voice service, for step settings that work with one voice only. */
  ttsService?: string
}

const EDGE = { type: 'vx', markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } }
const edgeTypes = { vx: VxEdge }

type Snap = { nodes: CardNode[]; edges: Edge[] }

const nodeTypes = { vx: NodeCard }

/** The connection point a line enters a step by, on a side: a Branch has its own entry points. */
const entryOf = (type: string | undefined, side: Side) => (type === 'conditional' ? inHandle(side) : sideHandle(side))

function fromWorkflow(wf: Workflow): Snap {
  const g = layout(toGraph(wf))
  const type = new Map(g.nodes.map((n) => [n.id, n.data.type]))
  return {
    nodes: g.nodes.map((n) => ({ id: n.id, type: 'vx', position: n.position!, data: { ...n.data, issues: [], start: false } })),
    edges: g.edges.map(({ bend, from, to, ...e }) => ({
      ...e, ...EDGE,
      sourceHandle: e.sourceHandle === NEXT_HANDLE && type.get(e.source) !== 'conditional' ? sideHandle(from ?? 'right') : e.sourceHandle,
      targetHandle: entryOf(type.get(e.target), to ?? 'left'),
      data: bend === undefined ? {} : { bend },
    })),
  }
}

/** The nearest Listen at or before a step, following lines backwards: where a conversation loops back to. */
function listenIn(nodes: CardNode[], edges: Edge[], from: string): string | null {
  const type = new Map(nodes.map((n) => [n.id, n.data.type]))
  const into = new Map<string, string[]>()
  for (const e of edges) into.set(e.target, [...(into.get(e.target) ?? []), e.source])
  const seen = new Set<string>()
  const queue = [from]
  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    if (type.get(id) === 'input') return id
    queue.push(...(into.get(id) ?? []))
  }
  return null
}

/** A unique, readable step id from a base name, given the ids already taken. */
function freeId(base: string, taken: Set<string>) {
  const root = base.replace(/[^a-z0-9?]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'step'
  let name = root
  for (let i = 2; taken.has(name); i++) name = `${root}_${i}`
  taken.add(name)
  return name
}

/** Where the editor remembers Script or Flow, per browser. */
const MODE_KEY = 'vx.wf.view'

// How close (px) a dragged step's middle must come to a connected step's to snap into line.
const SNAP = 16

const MOVE_DX = 380
const MOVE_DY = 190

/**
 * The steps and lines a conversation move adds, placed left to right from `at`. Connected
 * from `after` when given; lines to LISTEN go to the Listen before it, which is added
 * first when the move needs one and there is none.
 */
function buildMove(move: Move, at: { x: number; y: number }, after: { id: string; handle: string } | null, nodes: CardNode[], edges: Edge[]) {
  let steps = move.steps
  let lines = move.edges
  let back = after ? listenIn(nodes, edges, after.id) : null
  if (move.needsListen && !back) {
    steps = [...LISTEN_STEPS, ...move.steps]
    lines = [{ from: 'listen', to: 'words' }, { from: 'listen', to: move.steps[0].key }, ...move.edges.map((e) => (e.to === LISTEN ? { ...e, to: 'listen' } : e))]
  }
  const taken = new Set(nodes.map((n) => n.id))
  const idOf = new Map(steps.map((s) => [s.key, freeId(s.name, taken)]))
  if (move.needsListen && !back) back = idOf.get('listen') ?? null
  // Columns by how far each step is from the move's first step, rows within a column.
  const depth = new Map<string, number>([[steps[0].key, 0]])
  for (let changed = true; changed;) {
    changed = false
    for (const e of lines) {
      const d = depth.get(e.from)
      if (d !== undefined && e.to !== LISTEN && !depth.has(e.to)) { depth.set(e.to, d + 1); changed = true }
    }
  }
  const rows = new Map<number, number>()
  const added: CardNode[] = steps.map((s) => {
    const col = depth.get(s.key) ?? 0
    const row = rows.get(col) ?? 0
    rows.set(col, row + 1)
    return {
      id: idOf.get(s.key)!, type: 'vx', position: { x: at.x + col * MOVE_DX, y: at.y + row * MOVE_DY },
      data: { type: s.type, parameters: structuredClone(s.params), extra: {}, missing: [], hadParams: true, issues: [], start: false },
    }
  })
  const type = new Map([...nodes, ...added].map((n) => [n.id, n.data.type]))
  const line = (source: string, handle: string, target: string): Edge => ({ ...EDGE, id: `${source}|${handleRoute(handle)}|${target}`, source, sourceHandle: handle, target, targetHandle: entryOf(type.get(target), 'left') })
  const wired: Edge[] = lines.flatMap((e) => {
    const target = e.to === LISTEN ? back : idOf.get(e.to)
    return target ? [line(idOf.get(e.from)!, e.handle ?? NEXT_HANDLE, target)] : []
  })
  if (after) wired.push(line(after.id, after.handle, idOf.get(steps[0].key)!))
  return { nodes: [...nodes, ...added], edges: [...edges, ...wired], first: idOf.get(steps[0].key)!, exit: idOf.get(move.exit ?? steps[steps.length - 1].key)! }
}

function toGraphOf(nodes: CardNode[], edges: Edge[]): Graph {
  return {
    nodes: nodes.map((n) => {
      const { issues: _i, start: _s, ...data } = n.data
      return { id: n.id, position: n.position, data: data as NodeData }
    }),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: handleRoute(e.sourceHandle), from: isMapHandle(e.sourceHandle ?? '') ? undefined : handleSide(e.sourceHandle), to: handleSide(e.targetHandle), bend: e.data?.bend && typeof e.data.bend === 'object' ? (e.data.bend as Bend) : undefined })),
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

function Editor({ title, initial, onSave, knowledge = [], onTest, ttsService }: Props) {
  const first = useMemo(() => fromWorkflow(initial), [initial])
  const extra = useMemo(() => { const { nodes: _n, ui: _u, ...rest } = initial; return rest }, [initial])
  const [nodes, setNodes, onNodesChange] = useNodesState<CardNode>(first.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(first.edges)
  const [selected, setSelected] = useState<string | null>(null)
  // Script (the words) by default; the canvas for an empty workflow, where there are no words yet.
  const [mode, setModeState] = useState<'script' | 'canvas' | 'json'>(() => (first.nodes.length ? 'script' : 'canvas'))
  // Script or Flow, as last left in this browser. Read after mount: the server has no storage.
  const setMode = (m: 'script' | 'canvas' | 'json') => {
    setModeState(m)
    if (m !== 'json') try { localStorage.setItem(MODE_KEY, m) } catch { /* private window: this visit only */ }
  }
  useEffect(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem(MODE_KEY) } catch { /* private window */ }
    if (first.nodes.length && (saved === 'script' || saved === 'canvas')) setModeState(saved)
  }, [first])
  const [xfer, setXfer] = useState<'export' | 'import' | 'template' | null>(null)
  // The canvas first fits the opening steps at a readable size, not every step tiny.
  const opening = useMemo(() => [...first.nodes].sort((a, b) => a.position.x - b.position.x).slice(0, 6).map((n) => ({ id: n.id })), [first])
  const [grid, setGrid] = useState(false)
  // Right-angle lines unless this workflow was saved with curves.
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>(() => toGraph(initial).edgeStyle ?? 'step')
  const canvasRef = useRef<HTMLDivElement>(null)
  const [showIssues, setShowIssues] = useState(false)
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'err'; text?: string }>({ kind: 'idle' })
  // The baseline must include the workflow's top-level keys (variables, start_node…),
  // or a freshly opened workflow that has them reads as unsaved.
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(toWorkflow({ ...toGraphOf(first.nodes, first.edges), extra }, { withUi: false })))
  const rf = useReactFlow()
  const theme = useContext(ThemeCtx)

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

  const graph = useMemo(() => ({ ...toGraphOf(nodes, edges), extra, edgeStyle }), [nodes, edges, extra, edgeStyle])
  const edgeLook = useMemo(() => ({ style: edgeStyle, onBendStart: () => commit() }), [edgeStyle, commit])
  const issues = useMemo(() => validate(graph), [graph])
  const byNode = useMemo(() => issuesByNode(issues), [issues])
  const errors = issues.filter((i) => i.level === 'error').length
  const workflow = useMemo(() => toWorkflow(graph), [graph])
  // Line style and moved lines count as changes too; node positions do not.
  const lineKey = JSON.stringify([edgeStyle, (workflow.ui as Workflow['ui'])?.bends ?? {}, (workflow.ui as Workflow['ui'])?.sides ?? {}])
  const [savedLines, setSavedLines] = useState(lineKey)
  const dirty = JSON.stringify(toWorkflow(graph, { withUi: false })) !== savedJson || lineKey !== savedLines

  // Where each connector leads, so a card can say "goes to …".
  const routes = useMemo(() => {
    const m = new Map<string, Record<string, string[]>>()
    for (const e of edges) {
      const r = m.get(e.source) ?? {}
      ;(r[handleRoute(e.sourceHandle)] ??= []).push(prettyName(e.target))
      m.set(e.source, r)
    }
    return m
  }, [edges])

  // The same, by step id, for the settings panel (Branch shows and opens where each path goes).
  const idRoutes = useMemo(() => {
    const m = new Map<string, Record<string, string[]>>()
    for (const e of edges) {
      const r = m.get(e.source) ?? {}
      ;(r[handleRoute(e.sourceHandle)] ??= []).push(e.target)
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
  // Conversation memories in use, for "Shares memory with".
  const memories = useMemo(() => [...new Set(nodes.map((n) => n.data.parameters.history_key).filter((k): k is string => typeof k === 'string' && !!k))], [nodes])
  /** Whether another AI step starts from the same step as this one. */
  const racing = (id: string) => {
    const from = new Set(edges.filter((e) => e.target === id).map((e) => e.source))
    const ai = (t?: string) => !!t && (t === 'llm' || t.startsWith('llm'))
    return edges.some((e) => e.target !== id && from.has(e.source) && ai(nodes.find((n) => n.id === e.target)?.data.type))
  }

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
    const handle = c.sourceHandle ?? NEXT_HANDLE
    setEdges((es) => reconnectEdge(old, { ...c, sourceHandle: handle }, es, { shouldReplaceId: false })
      .map((e) => (e.id === old.id ? { ...e, id: `${c.source}|${handleRoute(handle)}|${c.target}` } : e)))
  }, [commit, setEdges])
  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    if (!reconnected.current) {
      commit()
      setEdges((es) => es.filter((e) => e.id !== edge.id))
    }
    reconnected.current = true
  }, [commit, setEdges])

  // Every side of a one-way-out step can start a line; a Branch's entry points can't.
  const isOut = (h?: string | null) => !!h && (h.startsWith(NEXT_HANDLE) || isMapHandle(h))
  const onConnect = useCallback((raw: Connection) => {
    // Loose mode lets a drag start from either dot; turn it round so it always
    // leaves from an output dot.
    const c: Connection = !isOut(raw.sourceHandle) && isOut(raw.targetHandle)
      ? { source: raw.target, sourceHandle: raw.targetHandle, target: raw.source, targetHandle: raw.sourceHandle }
      : raw
    if (c.source === c.target || !isOut(c.sourceHandle ?? NEXT_HANDLE)) return
    const route = handleRoute(c.sourceHandle)
    if (edges.some((e) => e.source === c.source && e.target === c.target && handleRoute(e.sourceHandle) === route)) return
    commit()
    const handle = c.sourceHandle ?? NEXT_HANDLE
    const into = nodes.find((n) => n.id === c.target)?.data.type
    setEdges((es) => addEdge({ ...c, ...EDGE, sourceHandle: handle, targetHandle: c.targetHandle ?? entryOf(into, 'left'), id: `${c.source}|${route}|${c.target}` }, es))
  }, [commit, setEdges, edges, nodes])

  /** Releasing a line anywhere on a card connects to that card, at the middle of the side nearest the pointer. */
  const onConnectEnd = useCallback((ev: MouseEvent | TouchEvent, state: { isValid: boolean | null; fromNode: { id: string } | null; fromHandle: { id?: string | null; type: string } | null }) => {
    if (state.isValid || !state.fromNode || !state.fromHandle) return
    const pt = 'changedTouches' in ev ? ev.changedTouches[0] : ev
    const el = document.elementFromPoint(pt.clientX, pt.clientY)?.closest('.react-flow__node') as HTMLElement | null
    const other = el?.dataset.id
    if (!el || !other || other === state.fromNode.id) return
    const r = el.getBoundingClientRect()
    const gaps: [Side, number][] = [['top', pt.clientY - r.top], ['bottom', r.bottom - pt.clientY], ['left', pt.clientX - r.left], ['right', r.right - pt.clientX]]
    const side = gaps.sort((a, b) => a[1] - b[1])[0][0]
    const otherType = nodes.find((n) => n.id === other)?.data.type
    const fromOut = isOut(state.fromHandle.id)
    onConnect(fromOut
      ? { source: state.fromNode.id, sourceHandle: state.fromHandle.id ?? NEXT_HANDLE, target: other, targetHandle: entryOf(otherType, side) }
      : { source: other, sourceHandle: otherType === 'conditional' ? NEXT_HANDLE : sideHandle(side), target: state.fromNode.id, targetHandle: state.fromHandle.id ?? null })
  }, [onConnect, nodes])

  const uniqueName = (base: string) => freeId(base, new Set(nodes.map((n) => n.id)))

  /** Add a conversation move: at `at`, or after a step's output. */
  const placeMove = (move: Move, at: { x: number; y: number }, after: { id: string; handle: string } | null) => {
    commit()
    const g = buildMove(move, at, after, nodes, edges)
    setNodes(g.nodes)
    setEdges(g.edges)
    setSelected(g.first)
  }
  /** Where something added after `from` goes: to its right, below anything already there. */
  const rightOf = (from: string) => {
    const src = nodes.find((n) => n.id === from)
    const siblings = edges.filter((e) => e.source === from).length
    return src ? { x: src.position.x + MOVE_DX, y: src.position.y + siblings * MOVE_DY } : rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  }
  /** "Start with a greeting": a greeting, then the AI conversation after its Listen. */
  const startWithGreeting = () => {
    commit()
    const at = { x: 0, y: 0 }
    const g = buildMove(moveById('greeting')!, at, null, [], [])
    const listen = g.nodes.find((n) => n.data.type === 'input')!.id
    // Below the step that shows the caller's words, which sits in the same column.
    const c = buildMove(moveById('converse')!, { x: MOVE_DX * 2, y: MOVE_DY }, { id: listen, handle: NEXT_HANDLE }, g.nodes, g.edges)
    setNodes(c.nodes)
    setEdges(c.edges)
    setSelected(null)
    setTimeout(() => rf.fitView({ duration: 300, padding: 0.2, maxZoom: 1 }), 0)
  }

  const addNode = (type: string, position?: { x: number; y: number }) => {
    const spec = specFor(type)
    const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    // An AI that thinks silently comes with the Say that speaks its reply.
    if (type === 'llm') return placeMove(SILENT_AI, position ?? { x: center.x - 120, y: center.y - 48 }, null)
    const id = uniqueName(spec.base ?? spec.label)
    commit()
    setNodes((ns) => [...ns, {
      id, type: 'vx', position: position ?? { x: center.x - 120, y: center.y - 48 },
      data: { type: spec.type, parameters: structuredClone(stripUndefined(spec.defaults)), extra: {}, missing: [], hadParams: true, issues: [], start: false },
    }])
    setSelected(id)
  }

  /** The + on a card: a new step to the right of its parent, already connected. */
  const addAfter = (from: string, handle: string, type: string) => {
    const src = nodes.find((n) => n.id === from)
    if (!src) return
    const spec = specFor(type)
    if (type === 'llm') return placeMove(SILENT_AI, rightOf(from), { id: from, handle })
    const id = uniqueName(spec.base ?? spec.label)
    commit()
    setNodes((ns) => [...ns, {
      id, type: 'vx', position: rightOf(from),
      data: { type: spec.type, parameters: structuredClone(stripUndefined(spec.defaults)), extra: {}, missing: [], hadParams: true, issues: [], start: false },
    }])
    setEdges((es) => [...es, { ...EDGE, id: `${from}|${handleRoute(handle)}|${id}`, source: from, sourceHandle: handle, target: id, targetHandle: entryOf(spec.type, 'left') }])
    setSelected(id)
  }
  const dupRef = useRef<(id: string) => void>(() => {})
  const insert = (from: string, handle: string, item: AddItem) => {
    if (item.kind === 'step') return addAfter(from, handle, item.type)
    if (item.kind === 'move') { const m = moveById(item.id); if (m) placeMove(m, rightOf(from), { id: from, handle }); return }
    // A line back to the Listen before: the conversation goes round again.
    const back = listenIn(nodes, edges, from)
    if (!back || edges.some((e) => e.source === from && e.target === back && handleRoute(e.sourceHandle) === handleRoute(handle))) return
    commit()
    setEdges((es) => [...es, { ...EDGE, id: `${from}|${handleRoute(handle)}|${back}`, source: from, sourceHandle: handle, target: back, targetHandle: entryOf('input', 'left') }])
  }
  const insertRef = useRef(insert)
  insertRef.current = insert
  const listenRef = useRef((from: string) => listenIn(nodes, edges, from))
  listenRef.current = (from: string) => listenIn(nodes, edges, from)
  const cardActions = useMemo(() => ({
    insert: (from: string, handle: string, item: AddItem) => insertRef.current(from, handle, item),
    listenBefore: (from: string) => listenRef.current(from),
  }), [])

  const onDrop = (e: React.DragEvent) => {
    const at = rf.screenToFlowPosition({ x: e.clientX - 120, y: e.clientY - 30 })
    const move = moveById(e.dataTransfer.getData('application/x-vx-move'))
    if (move) { e.preventDefault(); placeMove(move, at, null); return }
    const type = e.dataTransfer.getData('application/x-vx-node')
    if (!type) return
    e.preventDefault()
    addNode(type, at)
  }
  /** A move picked in the list: after the open step when it has one way out, else on its own. */
  const addMove = (id: string) => {
    const move = moveById(id)
    if (!move) return
    const open = nodes.find((n) => n.id === selected)
    if (open && specFor(open.data.type).out === 'single') placeMove(move, rightOf(open.id), { id: open.id, handle: NEXT_HANDLE })
    else placeMove(move, rf.screenToFlowPosition({ x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 48 }), null)
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
      return { ...e, source, target, id: `${source}|${handleRoute(e.sourceHandle)}|${target}` }
    }))
    setSelected(to)
    return true
  }

  const makeStart = (id: string) => {
    commit()
    setNodes((ns) => [...ns.filter((n) => n.id === id), ...ns.filter((n) => n.id !== id)])
  }

  const remove = (id: string) => {
    toast.success(`Deleted “${prettyName(id)}”`, 'Undo (Ctrl+Z) brings it back.')
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

  dupRef.current = duplicate
  // Ctrl/Cmd+D duplicates the selected step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'd' || !selected) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]')) return
      e.preventDefault()
      dupRef.current(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const relayout = () => {
    commit()
    const g = layout(toGraphOf(nodes, edges), true)
    setNodes((ns) => ns.map((n) => ({ ...n, position: g.nodes.find((x) => x.id === n.id)!.position! })))
    // Tidying moves the steps, so hand-moved lines go back to the middle.
    setEdges((es) => es.map((e) => (e.data?.bend === undefined ? e : { ...e, data: {} })))
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

  /**
   * The magnet: a step being dragged snaps so its middle lines up with a step it is
   * connected to, across or down, when within SNAP px. Lines between them then run straight.
   * The grid, when on, does its own snapping instead.
   */
  const magnet = (changes: NodeChange<CardNode>[]) => grid ? changes : changes.map((c) => {
    // Every drag report, the last one too: on release React Flow sends its own unsnapped
    // position once more (dragging: false), which would undo the snap.
    if (c.type !== 'position' || c.dragging === undefined || !c.position) return c
    const me = nodes.find((n) => n.id === c.id)
    if (!me) return c
    const size = (n: CardNode) => ({ w: n.measured?.width ?? NODE_W, h: n.measured?.height ?? NODE_H })
    const { w, h } = size(me)
    const linked = new Set(edges.flatMap((e) => (e.source === c.id ? [e.target] : e.target === c.id ? [e.source] : [])))
    let dx = Infinity, dy = Infinity, across = '', down = ''
    for (const n of nodes) {
      if (!linked.has(n.id) || n.id === c.id) continue
      const s = size(n)
      const ny = n.position.y + s.h / 2 - (c.position.y + h / 2)
      const nx = n.position.x + s.w / 2 - (c.position.x + w / 2)
      if (Math.abs(ny) < Math.abs(dy)) { dy = ny; across = n.id }
      if (Math.abs(nx) < Math.abs(dx)) { dx = nx; down = n.id }
    }
    const snapY = Math.abs(dy) <= SNAP, snapX = Math.abs(dx) <= SNAP
    // On release, a hand-moved bend between steps now in line would keep its jog: drop it.
    const level = new Set([snapY ? across : '', snapX ? down : ''].filter(Boolean))
    if (!c.dragging && level.size) {
      setEdges((es) => es.map((e) => ((e.source === c.id && level.has(e.target)) || (e.target === c.id && level.has(e.source))) && e.data?.bend !== undefined ? { ...e, data: {} } : e))
    }
    return { ...c, position: { x: c.position.x + (snapX ? dx : 0), y: c.position.y + (snapY ? dy : 0) } }
  })

  /** Resolves true when the workflow is saved. */
  async function save(): Promise<boolean> {
    if (errors) { setShowIssues(true); setStatus({ kind: 'err' }); toast.error(`Fix ${errors} error${errors > 1 ? 's' : ''} first.`, 'The highlighted steps need attention before saving.'); return false }
    setStatus({ kind: 'saving' })
    const res = await onSave(workflow)
    if (res.ok) {
      setSavedJson(JSON.stringify(toWorkflow(graph, { withUi: false })))
      setSavedLines(lineKey)
      setStatus({ kind: 'ok' })
      toast.success('Workflow saved', res.reason ?? undefined)
    } else { setStatus({ kind: 'err' }); toast.error('Couldn’t save the workflow', res.reason ?? undefined) }
    return res.ok
  }

  const test = async () => {
    if (!onTest) return
    if (!dirty || (await save())) onTest()
  }

  const sel = nodes.find((n) => n.id === selected) ?? null
  /** Open a step on the canvas, from Script or a check. */
  const showStep = (id: string) => {
    setMode('canvas')
    setSelected(id)
    setTimeout(() => rf.fitView({ nodes: [{ id }], duration: 300, maxZoom: 1.2 }), 0)
  }

  return (
    <div className="wf">
      <header className="wf-bar">
        <div className="wf-title">
          <strong>{title}</strong>
          <span className={`wf-state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
        {/* Script: the words; Flow: the boxes and lines. */}
        <div className="db-pills wf-modes" role="tablist" aria-label="View">
          <button role="tab" aria-selected={mode === 'script'} className={mode === 'script' ? 'is-on' : ''} onClick={() => setMode('script')}>Script</button>
          <button role="tab" aria-selected={mode !== 'script'} className={mode !== 'script' ? 'is-on' : ''} onClick={() => setMode('canvas')}>Flow</button>
        </div>
        <div className="wf-tools">
          <div className="wf-iconset">
            <button className="db-iconbtn" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl+Z)" aria-label="Undo"><Icon name="back" size={20} className="wf-undo" /></button>
            <button className="db-iconbtn" onClick={redo} disabled={!future.current.length} title="Redo (Ctrl+Y)" aria-label="Redo"><Icon name="back" size={20} className="wf-redo" /></button>
          </div>
          <button className={`wf-health${errors ? ' is-err' : issues.length ? ' is-warn' : ''}`} onClick={() => setShowIssues(!showIssues)} aria-expanded={showIssues}>
            <Icon name={errors ? 'close' : 'check'} size={16} />
            {errors ? `${errors} to fix` : issues.length ? `${issues.length} tip${issues.length > 1 ? 's' : ''}` : 'All good'}
          </button>
          <MoreMenu items={[
            { icon: 'list', label: 'Start from a template…', on: () => setXfer('template') },
            { icon: 'sliders', label: 'Tidy up the boxes', on: () => { setMode('canvas'); setTimeout(relayout, 0) } },
            { icon: 'flows', label: edgeStyle === 'step' ? 'Use curved lines' : 'Use right-angle lines', on: () => setEdgeStyle(edgeStyle === 'step' ? 'curve' : 'step') },
            { icon: 'grid', label: grid ? 'Hide the grid' : 'Show the grid', on: () => setGrid(!grid) },
            { icon: 'code', label: mode === 'json' ? 'Back to the boxes' : 'View as code', on: () => setMode(mode === 'json' ? 'canvas' : 'json') },
            { icon: 'plus', label: 'Import a workflow…', on: () => setXfer('import') },
            { icon: 'copy', label: 'Export this workflow…', on: () => setXfer('export') },
          ]} />
          {onTest && (
            <button className="db-btn db-btn-icon" onClick={test} disabled={status.kind === 'saving'}>
              <Icon name="play" size={18} />{dirty ? 'Save and test' : 'Test'}
            </button>
          )}
          <button className="db-btn db-primary" onClick={save} disabled={status.kind === 'saving' || (!dirty && status.kind !== 'err')}>
            {status.kind === 'saving' ? <Loading inline label="Saving…" /> : 'Save'}
          </button>
        </div>
      </header>

      <EdgeLook.Provider value={edgeLook}>
      <FieldOptions.Provider value={{ knowledge, variables, routes: selected ? idRoutes.get(selected) : undefined, stepId: selected ?? undefined, memories,
        goTo: (t) => { setSelected(t); rf.fitView({ nodes: [{ id: t }], duration: 300, maxZoom: 1.2 }) } }}>
      <CardActions.Provider value={cardActions}>
      <div className="wf-body">
        {mode !== 'script' && <Palette onAdd={(t) => addNode(t)} onMove={addMove} />}

        <div className="wf-canvas" ref={canvasRef} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          {mode === 'script' ? (
            <ScriptView nodes={nodes} edges={edges} issues={byNode} onParams={updateParams} onShow={showStep} />
          ) : mode === 'canvas' ? (
            <ReactFlow
              nodes={shown}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={(c) => { if (c.some((x) => x.type === 'remove')) commit(); onNodesChange(magnet(c)) }}
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
              colorMode={theme}
              fitView
              fitViewOptions={{ padding: 0.15, nodes: opening, maxZoom: 1 }}
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
          ) : null}
          {mode === 'canvas' && !nodes.length && (
            <div className="wf-empty">
              <b>Start your agent</b>
              <span>A greeting, then an AI that answers and listens again. Change the words after.</span>
              <button type="button" className="db-btn db-primary db-btn-icon db-btn-lg" onClick={startWithGreeting}><Icon name="voice" size={20} />Start with a greeting</button>
              <button type="button" className="db-btn" onClick={() => setXfer('template')}>Start from a template</button>
            </div>
          )}
          {mode === 'json' ? (
            <JsonMode workflow={workflow} onApply={load} />
          ) : null}

          {showIssues && issues.length > 0 && (
            <div className="wf-issues">
              {issues.map((i, k) => (
                <button key={k} className={`wf-issue is-${i.level}`} onClick={() => i.node && showStep(i.node)}>
                  <b>{i.node ? prettyName(i.node) : 'Workflow'}</b> {i.message}
                </button>
              ))}
            </div>
          )}
        </div>

        {sel && mode === 'canvas' && (
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
            racing={racing(sel.id)}
            ttsService={ttsService}
          />
        )}
      </div>
      </CardActions.Provider>
      </FieldOptions.Provider>
      </EdgeLook.Provider>
      {xfer === 'export' && <ExportDialog workflow={workflow} title={title} onClose={() => setXfer(null)} />}
      {xfer === 'import' && <ImportDialog onImport={load} onClose={() => setXfer(null)} />}
      {xfer === 'template' && <TemplateDialog hasSteps={nodes.length > 0} onPick={(wf) => { setXfer(null); load(wf) }} onClose={() => setXfer(null)} />}
    </div>
  )
}

const stripUndefined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))


function Palette({ onAdd, onMove }: { onAdd: (type: string) => void; onMove: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(true)
  // Conversation moves open; single steps one level deeper.
  const [shut, setShut] = useState<Set<string>>(() => new Set(['singles']))
  const match = (text: string) => !q || text.toLowerCase().includes(q.toLowerCase())
  const singles = NODE_SPECS.filter((s) => !s.hidden && match(`${s.label} ${s.blurb}`))
  const moves = MOVES.filter((m) => match(`${m.label} ${m.blurb}`))
  const drag = (s: (typeof NODE_SPECS)[number]) => (e: React.DragEvent) => { e.dataTransfer.setData('application/x-vx-node', s.type); e.dataTransfer.effectAllowed = 'move' }
  const dragMove = (m: Move) => (e: React.DragEvent) => { e.dataTransfer.setData('application/x-vx-move', m.id); e.dataTransfer.effectAllowed = 'move' }
  const toggle = (g: string) => setShut((x) => { const n = new Set(x); n.has(g) ? n.delete(g) : n.add(g); return n })

  // Folded: a thin rail of the moves, still draggable and clickable.
  if (!open) return (
    <aside className="wf-palette is-rail">
      <button className="db-iconbtn" onClick={() => setOpen(true)} title="Show steps" aria-label="Show steps"><ChevronsRightIcon size={20} /></button>
      {MOVES.map((m) => (
        <button key={m.id} className="wf-rail-item" draggable style={{ '--c': m.color } as React.CSSProperties} title={`${m.label}: ${m.blurb}`} aria-label={m.label}
          onDragStart={dragMove(m)} onClick={() => onMove(m.id)}>
          <span className="wf-tile"><Icon name={m.icon} size={18} /></span>
        </button>
      ))}
    </aside>
  )

  const group = (id: string, title: string, count: number, body: React.ReactNode) => {
    const closed = shut.has(id) && !q
    return (
      <div key={id} className={`wf-pgroup${closed ? ' is-shut' : ''}`}>
        <button className="wf-plabel" onClick={() => toggle(id)} aria-expanded={!closed}>
          <span>{title}</span>
          <small>{count}</small>
          <ChevronDownIcon size={18} className="wf-plabel-chev" />
        </button>
        {!closed && body}
      </div>
    )
  }

  return (
    <aside className="wf-palette">
      <div className="wf-palette-head">
        <div>
          <b>Add to the conversation</b>
        </div>
        <button className="db-iconbtn" onClick={() => setOpen(false)} title="Hide steps" aria-label="Hide steps"><ChevronsLeftIcon size={20} /></button>
      </div>
      <label className="db-tsearch wf-psearch">
        <Icon name="search" size={18} />
        <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {moves.length > 0 && group('moves', 'Conversation moves', moves.length, moves.map((m) => (
        <button key={m.id} className="wf-pitem" draggable style={{ '--c': m.color } as React.CSSProperties} onDragStart={dragMove(m)} onClick={() => onMove(m.id)}>
          <span className="wf-tile"><Icon name={m.icon} size={18} /></span>
          <span className="wf-ptext">
            <span className="wf-pname">{m.label}</span>
            <span className="wf-pblurb">{m.blurb}</span>
          </span>
        </button>
      )))}
      {singles.length > 0 && group('singles', 'Single steps', singles.length, GROUPS.map((g) => singles.filter((s) => s.group === g)).flat().map((s) => (
        <button key={s.type} className="wf-pitem" draggable={!s.unsupported} disabled={!!s.unsupported} style={{ '--c': s.color } as React.CSSProperties}
          onDragStart={drag(s)} onClick={() => onAdd(s.type)}>
          <span className="wf-tile"><Icon name={s.icon} size={18} /></span>
          <span className="wf-ptext">
            <span className="wf-pname">{s.label}{s.unsupported && <em>Soon</em>}</span>
            <span className="wf-pblurb">{s.blurb}</span>
          </span>
        </button>
      )))}
    </aside>
  )
}

/** Templates replace the canvas; with steps on it, the dialog says so first. Undo still brings them back. */
function TemplateDialog({ hasSteps, onPick, onClose }: { hasSteps: boolean; onPick: (wf: Workflow) => void; onClose: () => void }) {
  return (
    <Dialog title="Start from a template" onClose={onClose} wide>
      {hasSteps && <Notice>This replaces the steps you have now. Undo (Ctrl+Z) brings them back.</Notice>}
      <div className="wf-tpls">
        {OFFERED_TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="wf-tpl" onClick={() => onPick(structuredClone(t.workflow))}>
            <b>{t.name}</b><span>{t.blurb}</span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}

/** The editor's less-used tools, one level deeper. */
function MoreMenu({ items }: { items: { icon: IconName; label: string; on: () => void }[] }) {
  const [open, setOpen] = useState(false)
  // Open the menu inside the dashboard root so it keeps the dashboard's colours.
  const [root, setRoot] = useState<HTMLElement | null>(null)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span ref={(el) => setRoot((r) => r ?? (el?.closest<HTMLElement>('.db') ?? null))}>
        <PopoverTrigger asChild>
          <button type="button" className="db-iconbtn" aria-label="More tools" title="More tools"><EllipsisIcon size={22} /></button>
        </PopoverTrigger>
      </span>
      <PopoverContent align="end" sideOffset={6} className="db-menu" container={root}>
        {items.map((it) => (
          <button key={it.label} type="button" className="db-menu-item" onClick={() => { setOpen(false); it.on() }}>
            <Icon name={it.icon} size={18} />{it.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

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
