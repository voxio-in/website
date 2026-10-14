// Engine workflow JSON <-> canvas graph. Pure: no React, no React Flow import,
// so it can be round-trip tested in plain node.
//
// The engine reads only `workflow.nodes` (agent/.../workflow.py):
//   { nodes: { <name>: { type, parameters, next: name | name[] } } }
// The start node is named by `start_node` (the engine requires it); the canvas
// keeps it as the first node. A conditional's `parameters.mappings`
// ({value: route | route[]}) overrides `next` when a value matches, so each
// mapping becomes its own output handle. Layout lives in `workflow.ui`, which
// the engine ignores.

export type EngineNode = {
  type: string
  parameters?: Record<string, unknown>
  next?: string | string[]
  [extra: string]: unknown
}

export type Workflow = {
  nodes: Record<string, EngineNode>
  ui?: {
    positions?: Record<string, { x: number; y: number }>
    /** How connection lines are drawn on the canvas. */
    edgeStyle?: EdgeStyle
    /** Hand-moved right-angle lines: segment positions, px from the line's start. */
    bends?: Record<string, Bend>
  }
  [extra: string]: unknown
}

export type NodeData = {
  type: string
  parameters: Record<string, unknown>
  /** Keys on the engine node other than type / parameters / next, kept verbatim. */
  extra: Record<string, unknown>
  /** `next` targets that name no node; kept so saving never loses them. */
  missing: string[]
  /** Whether the source had a `parameters` key at all. */
  hadParams: boolean
}

export type GraphNode = { id: string; position: { x: number; y: number } | null; data: NodeData }
export type EdgeStyle = 'step' | 'curve'
/** A right-angle line: start → (x1,·) → (x1,y) → (x2,y) → (x2,·) → end, relative to its start. */
export type Bend = { x1: number; y: number; x2: number }
export type GraphEdge = { id: string; source: string; target: string; sourceHandle: string; bend?: Bend }
export type Graph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Top-level workflow keys other than nodes / ui. */
  extra: Record<string, unknown>
  edgeStyle?: EdgeStyle
}

export const NEXT_HANDLE = 'next'
export const mapHandle = (value: string) => `m:${value}`
export const isMapHandle = (h: string) => h.startsWith('m:')
export const mapValue = (h: string) => h.slice(2)

const asList = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

const edgeId = (source: string, handle: string, target: string) => `${source}|${handle}|${target}`

export function toGraph(wf: Workflow): Graph {
  const { nodes = {}, ui, ...extra } = wf
  const names = new Set(Object.keys(nodes))
  const positions = ui?.positions ?? {}
  const gNodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const start = startNodeOf(wf)
  if (start) extra.start_node = start
  const entries = Object.entries(nodes).sort(([a], [b]) => (a === start ? -1 : b === start ? 1 : 0))
  for (const [name, node] of entries) {
    const { type, parameters, next, ...rest } = node
    const missing: string[] = []

    for (const target of asList(next)) {
      if (names.has(target)) edges.push({ id: edgeId(name, NEXT_HANDLE, target), source: name, target, sourceHandle: NEXT_HANDLE })
      else missing.push(target)
    }

    const mappings = (parameters?.mappings ?? null) as Record<string, unknown> | null
    if (type === 'conditional' && mappings && typeof mappings === 'object') {
      for (const [value, route] of Object.entries(mappings)) {
        for (const target of asList(route)) {
          if (names.has(target)) {
            const h = mapHandle(value)
            edges.push({ id: edgeId(name, h, target), source: name, target, sourceHandle: h })
          }
        }
      }
    }

    gNodes.push({
      id: name,
      position: positions[name] ?? null,
      data: {
        type,
        parameters: { ...(parameters ?? {}) },
        extra: rest,
        missing,
        hadParams: parameters !== undefined,
      },
    })
  }

  const bends = ui?.bends ?? {}
  for (const e of edges) { const b = bends[e.id]; if (b && typeof b === 'object') e.bend = b }
  return { nodes: gNodes, edges, extra, edgeStyle: ui?.edgeStyle }
}

export function toWorkflow(graph: Graph, opts: { start?: string; withUi?: boolean } = {}): Workflow {
  const { withUi = true } = opts
  const ordered = [...graph.nodes]
  if (opts.start) {
    const i = ordered.findIndex((n) => n.id === opts.start)
    if (i > 0) ordered.unshift(...ordered.splice(i, 1))
  }

  const nodes: Record<string, EngineNode> = {}
  const positions: Record<string, { x: number; y: number }> = {}

  for (const n of ordered) {
    const out = graph.edges.filter((e) => e.source === n.id)
    const nextTargets = [...out.filter((e) => e.sourceHandle === NEXT_HANDLE).map((e) => e.target), ...n.data.missing]

    let parameters = n.data.parameters
    const mappings = parameters.mappings as Record<string, unknown> | undefined
    if (n.data.type === 'conditional' && mappings && typeof mappings === 'object') {
      const rebuilt: Record<string, unknown> = {}
      for (const [value, original] of Object.entries(mappings)) {
        const targets = out.filter((e) => e.sourceHandle === mapHandle(value)).map((e) => e.target)
        // A route to a node that doesn't exist has no edge; keep what was written.
        const kept = asList(original).filter((t) => !graph.nodes.some((g) => g.id === t))
        const all = [...targets, ...kept]
        rebuilt[value] = all.length === 1 ? all[0] : Array.isArray(original) || all.length > 1 ? all : ''
      }
      parameters = { ...parameters, mappings: rebuilt }
    }

    const node: EngineNode = { type: n.data.type }
    if (n.data.hadParams || Object.keys(parameters).length) node.parameters = parameters
    if (nextTargets.length === 1) node.next = nextTargets[0]
    else if (nextTargets.length > 1) node.next = nextTargets
    Object.assign(node, n.data.extra)

    nodes[n.id] = node
    if (n.position) positions[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
  }

  const wf: Workflow = { ...graph.extra, nodes }
  if (ordered[0]) wf.start_node = ordered[0].id
  wf.variables ??= {}
  if (withUi) {
    const bends = Object.fromEntries(graph.edges.filter((e) => e.bend).map((e) => [e.id, { x1: Math.round(e.bend!.x1), y: Math.round(e.bend!.y), x2: Math.round(e.bend!.x2) }]))
    const ui: NonNullable<Workflow['ui']> = {}
    if (Object.keys(positions).length) ui.positions = positions
    if (graph.edgeStyle) ui.edgeStyle = graph.edgeStyle
    if (Object.keys(bends).length) ui.bends = bends
    if (Object.keys(ui).length) wf.ui = ui
  }
  return wf
}

/** The engine's start node: the first node on the canvas. */
export const startOf = (graph: Graph): string | undefined => graph.nodes[0]?.id

/**
 * The start step. `start_node` when it names a real step; otherwise the step no
 * other step leads to. Never key order: Postgres jsonb sorts object keys, so a
 * stored workflow's first key is just whichever name sorts first.
 */
export function startNodeOf(wf: Workflow): string | undefined {
  const nodes = wf.nodes ?? {}
  const names = Object.keys(nodes)
  if (typeof wf.start_node === 'string' && names.includes(wf.start_node)) return wf.start_node
  const pointedAt = new Set<string>()
  for (const node of Object.values(nodes)) {
    for (const t of asList(node.next)) pointedAt.add(t)
    const mappings = (node.parameters as { mappings?: Record<string, unknown> } | undefined)?.mappings
    if (mappings && typeof mappings === 'object') for (const r of Object.values(mappings)) for (const t of asList(r)) pointedAt.add(t)
  }
  return names.find((n) => !pointedAt.has(n)) ?? names[0]
}

/** A workflow the engine accepts: `start_node` set and a `variables` map (required; empty is fine). */
export function withStart(wf: Workflow): Workflow {
  const out: Workflow = { ...wf, variables: wf.variables && typeof wf.variables === 'object' ? wf.variables : {} }
  const start = startNodeOf(wf)
  if (start) out.start_node = start
  return out
}

/** Pull the workflow out of whatever JSON shape was pasted or fetched. */
export function extractWorkflow(doc: unknown): Workflow | null {
  if (!doc || typeof doc !== 'object') return null
  const d = doc as Record<string, any>
  if (d.nodes && typeof d.nodes === 'object') return d as Workflow
  return (
    extractWorkflow(d.workflow) ??
    extractWorkflow(d.agent_id) ??
    extractWorkflow(d.agent) ??
    null
  )
}
