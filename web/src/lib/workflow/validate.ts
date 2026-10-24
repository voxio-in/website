// Static checks on a workflow graph. Errors block saving; warnings don't.

import { type Graph, isMapHandle, mapValue } from './convert'
import { friendlyVar, specFor } from './registry'

export type Issue = { level: 'error' | 'warning'; node?: string; message: string }

const LLM_TYPES = new Set(['llm', 'llm-streaming', 'llm_shopify', 'shopify_llm', 'rag_shopify'])

const keysOf = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string') : v && typeof v === 'object' ? Object.keys(v) : []

export function validate(graph: Graph): Issue[] {
  const issues: Issue[] = []
  const ids = graph.nodes.map((n) => n.id)
  const start = ids[0]

  if (!graph.nodes.length) return [{ level: 'error', message: 'There are no steps yet. Add a first step, or start from a template.' }]

  const out = new Map<string, string[]>()
  for (const e of graph.edges) out.set(e.source, [...(out.get(e.source) ?? []), e.target])

  // Reachability from the start node.
  const seen = new Set<string>()
  const stack = [start]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(out.get(id) ?? []))
  }

  // A cycle that never passes an input node spins forever inside one turn.
  const type = new Map(graph.nodes.map((n) => [n.id, n.data.type]))
  const state = new Map<string, 0 | 1 | 2>()
  const reported = new Set<string>()
  const visit = (id: string): void => {
    state.set(id, 1)
    for (const t of out.get(id) ?? []) {
      if (type.get(t) === 'input') continue
      if (state.get(t) === 1 && !reported.has(t)) {
        reported.add(t)
        issues.push({ level: 'error', node: t, message: 'These steps lead back to each other with no Listen step between them, so the agent would never stop to hear the caller. Add a Listen step in the loop.' })
      } else if (!state.get(t)) visit(t)
    }
    state.set(id, 2)
  }
  for (const id of ids) if (!state.get(id) && type.get(id) !== 'input') visit(id)

  // Variables available: anything any node declares it writes, the workflow's own
  // variables, and each AI step's shared memory. Coarse, but catches typos.
  const produced = new Set<string>(keysOf((graph.extra as { variables?: unknown }).variables))
  for (const n of graph.nodes) {
    const p = n.data.parameters
    if (n.data.type === 'input') keysOf(p.input_variables).forEach((k) => produced.add(k))
    keysOf(p.output_variables).forEach((k) => produced.add(k))
    keysOf(p.llm_return_type).forEach((k) => produced.add(k))
    if (typeof p.history_key === 'string' && p.history_key) produced.add(p.history_key)
  }
  // What some step reads or passes along: an AI step's answers that land here are used.
  const consumed = new Set<string>()
  for (const n of graph.nodes) {
    keysOf(n.data.parameters.input_variables).forEach((k) => consumed.add(k))
    keysOf(n.data.parameters.variables).forEach((k) => consumed.add(k))
  }

  for (const n of graph.nodes) {
    const spec = specFor(n.data.type)
    const p = n.data.parameters
    const at = (level: Issue['level'], message: string) => issues.push({ level, node: n.id, message })

    if (spec.unsupported) at('error', spec.unsupported)
    if (!seen.has(n.id)) at('warning', 'Nothing leads here, so it never runs. Connect a step to it, or delete it.')
    for (const m of n.data.missing) at('error', `Leads to “${m}”, a step that doesn’t exist. Connect it to another step.`)

    if (n.data.type === 'conditional') {
      const vars = keysOf(p.input_variables)
      if (vars.length !== 1) at('error', 'Choose one thing for this Branch to decide on.')
      const maps = keysOf(p.mappings)
      if (!maps.length) at('error', 'Add at least one path to this Branch.')
      const wired = new Set(graph.edges.filter((e) => e.source === n.id && isMapHandle(e.sourceHandle)).map((e) => mapValue(e.sourceHandle)))
      for (const m of maps) if (!wired.has(m)) at('warning', `The “${m === 'true' ? 'yes' : m === 'false' ? 'no' : m}” path leads nowhere yet. Connect it to the next step.`)
    }

    if (n.data.type !== 'input') {
      for (const v of keysOf(p.input_variables)) if (!produced.has(v)) at('warning', `Uses “${friendlyVar(v)}”, but no step before it provides that. Check the name, or add the step that does.`)
    }
    for (const v of keysOf(p.variables)) if (!produced.has(v)) at('warning', `Passes along “${friendlyVar(v)}”, but no step provides that.`)

    // Silent on purpose is fine when a later step uses its answers (e.g. a Say step shows them).
    if (LLM_TYPES.has(n.data.type) && !keysOf(p.llm_return_type).includes('speak') && !keysOf(p.llm_return_type).some((k) => consumed.has(k)))
      at('warning', 'This AI step says nothing out loud, and no later step uses what it decides, so the caller won’t notice it. Add a Spoken reply under What it decides, or a Say step after it.')
    if ((n.data.type === 'llm' || n.data.type === 'llm-streaming') && !String(p.system_prompt ?? '').trim())
      at('warning', 'This AI step has no instructions yet. Tell it who it is and what to do.')
    if (n.data.type === 'rag' && !String(p.collection_name ?? '').trim()) at('error', 'Choose which knowledge base to search.')
  }

  return issues
}

export function issuesByNode(issues: Issue[]): Map<string, Issue[]> {
  const m = new Map<string, Issue[]>()
  for (const i of issues) if (i.node) m.set(i.node, [...(m.get(i.node) ?? []), i])
  return m
}
