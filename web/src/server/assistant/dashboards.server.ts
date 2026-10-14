// Ask Voxio's VAD tools (docs §9–10): read dashboards, check what data a
// workflow produces, and propose a dashboard (new or edited) as a change card.
// A proposal is a full VAD spec, validated by normalize() before the card is shown.

import type { AuthUser } from '#/server/session.server'
import { db, withDb } from '#/server/db'
import { BUILTIN_FIELDS, normalize, sizeOf, type Spec } from '#/lib/vad/spec'
import type { Workflow } from '#/lib/workflow/convert'
import { prettyName, specFor } from '#/lib/workflow/registry'
import { addChange, registerDashboardTools } from './changes.server'
import { findFlow, type ToolDef } from './tools.server'
import { cap, shortKey } from './redact'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** What a flow's workflow records per call: built-in fields, and agent fields with the step that makes them. */
async function workflowData(me: AuthUser, flowRef: unknown) {
  const f = await findFlow(me, flowRef)
  const row = await withDb(() => db.flow.findUniqueOrThrow({ where: { id: f.id }, select: { agent: { select: { workflow: true } } } }))
  const wf = row.agent.workflow as unknown as Workflow
  const agent: { field: string; type: string; description?: string; step: string }[] = []
  for (const [id, n] of Object.entries(wf.nodes ?? {})) {
    const decides = (n.parameters?.llm_return_type ?? {}) as Record<string, { type?: string; description?: string }>
    for (const [k, v] of Object.entries(decides)) if (k !== 'speak') agent.push({ field: `agent.${k}`, type: v?.type ?? 'str', description: v?.description, step: `${prettyName(id)} (${specFor(n.type).label})` })
  }
  return {
    flow: { name: f.flowName, key: shortKey(f.apiKey) },
    built_in: Object.entries(BUILTIN_FIELDS).map(([k, v]) => ({ field: k, kind: v.kind, label: v.label })),
    agent_fields: agent,
    note: agent.length
      ? 'agent.* fields come from what the AI steps decide. Their numbers appear once the agent’s state is saved per call; until then those widgets show “waiting for agent data”. Only calls after a field was added have it.'
      : 'This workflow records no agent fields yet. To measure something specific (an outcome, a reason…), propose adding it to an AI step’s “What it decides” with propose_step_settings first.',
  }
}

export const DASHBOARD_TOOLS: ToolDef[] = [
  {
    name: 'list_dashboards',
    description: 'The user’s VADs (dashboards): id, title, flows, widget count.',
    input: { type: 'object', properties: {} },
    label: () => 'Listed dashboards',
    run: async (me) => {
      const rows = await withDb(() => db.dashboard.findMany({ where: { userId: me.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, spec: true, updatedAt: true } }))
      return rows.map((d) => ({ id: d.id, ref: `vx:dash/${d.id}`, title: d.title, flows: (d.spec as Spec).flows.map(shortKey), widgets: (d.spec as Spec).widgets.length, updated: d.updatedAt.toISOString() }))
    },
  },
  {
    name: 'get_dashboard',
    description: 'Read one VAD’s full spec (widgets, queries, layout) by id. Read it before proposing an edit.',
    input: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    label: (i) => `Read dashboard ${str(i.id).slice(0, 8)}`,
    run: async (me, i) => {
      const d = await withDb(() => db.dashboard.findFirst({ where: { id: str(i.id).replace(/^vx:dash\//, ''), userId: me.id } }))
      if (!d) throw new Error('No such dashboard. Use list_dashboards.')
      return { id: d.id, ref: `vx:dash/${d.id}`, spec: d.spec }
    },
  },
  {
    name: 'check_workflow_data',
    description: 'Before building a dashboard: what data a flow records per call. Built-in fields (startTime, duration, channel, status, turns, caller, flow, test) always; agent.<name> fields from what its AI steps decide. Say which fields a goal needs that are missing, and propose the workflow change for them.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' } } },
    label: (i) => `Checked what data ${i.flow} records`,
    run: (me, i) => workflowData(me, i.flow),
  },
  {
    name: 'propose_dashboard',
    description: `Propose a new VAD, or a new version of an existing one (pass "id"), as a FULL spec. The user sees a card and Applies it. Spec:
{ "version": 1, "title", "description"?, "flows": [flow key], "defaults": { "range": "today|7d|30d|90d|month", "compare": true, "test": false },
  "filters": [{ "field": "channel" }],
  "widgets": [
    { "id", "type": "kpi", "title", "query": { "metric": "count|share|avg|sum|min|max|distinct", "of"?: field, "where"?: { field: value | [values] | {gte,lte,exists} } }, "format"?: "number|percent|duration", "goal"?, "goodWhen"?: "up|down", "spark"?: true },
    { "id", "type": "chart", "chart": "line|area|bar", "stacked"?, "horizontal"?, "title", "query": { "metric", "of"?, "where"?, "by": "startTime:hour|day|week|month" or a category field, "split"?: field, "top"? }, "format"? },
    { "id", "type": "table", "title", "query": { "rows": "sessions", "where"?, "sort": "-startTime", "limit": 50 }, "columns": [fields] },
    { "id", "type": "text", "title"?, "body": markdown }
  ],
  "layout": [{ "i": widget id, "x", "y", "w", "h" }] }   // 12 columns; omit layout to auto-place
Fields: built-in (startTime, duration, channel, status, turns, caller, flow, test) or agent.<name> from check_workflow_data. Sizes (w×h): kpi 2×2–6×4 (3×2 usual, 4 in a row), chart 4×4–12×10 (6×5 usual), table 4×4–12×16, text 2×1–12×8.`,
    input: { type: 'object', required: ['spec'], properties: { id: { type: 'string', description: 'Existing dashboard id to replace; omit for a new one' }, spec: { type: 'object' } } },
    label: (i) => (i.id ? 'Proposed dashboard changes' : 'Proposed a new dashboard'),
    run: async (me, i) => {
      const input = (i.spec ?? {}) as Partial<Spec>
      // Flows may be named by short key, ref or name: store the real keys.
      const flows: string[] = []
      for (const f of input.flows ?? []) flows.push((await findFlow(me, f)).apiKey)
      const r = normalize({ ...input, version: 1, flows })
      if (!r.ok) throw new Error(`The dashboard isn’t valid: ${r.errors.join(' ')}`)
      const spec = r.spec
      const id = str(i.id).replace(/^vx:dash\//, '')
      const before = id ? await withDb(() => db.dashboard.findFirst({ where: { id, userId: me.id }, select: { spec: true } })) : null
      if (id && !before) throw new Error('No such dashboard to change. Omit id to make a new one.')
      const old = (before?.spec ?? null) as Spec | null
      const lines = old
        ? [
          ...spec.widgets.filter((w) => !old.widgets.some((o) => o.id === w.id)).map((w) => ({ what: 'Add widget', to: `${'title' in w && w.title ? w.title : w.id} (${w.type}${w.type === 'chart' ? ` · ${w.chart}` : ''})` })),
          ...old.widgets.filter((o) => !spec.widgets.some((w) => w.id === o.id)).map((o) => ({ what: 'Remove widget', from: 'title' in o && o.title ? o.title : o.id })),
          ...spec.widgets.filter((w) => { const o = old.widgets.find((x) => x.id === w.id); return o && JSON.stringify(o) !== JSON.stringify(w) }).map((w) => ({ what: 'Change widget', to: 'title' in w && w.title ? w.title : w.id })),
          ...(old.title !== spec.title ? [{ what: 'Title', from: old.title, to: spec.title }] : []),
          ...(JSON.stringify(old.layout) !== JSON.stringify(spec.layout) && spec.widgets.length === old.widgets.length ? [{ what: 'Layout', to: 'Rearranged' }] : []),
        ]
        : spec.widgets.map((w) => ({ what: w.type === 'kpi' ? 'Number' : w.type === 'chart' ? `Chart · ${w.chart}` : w.type === 'table' ? 'Table' : 'Note', to: `${'title' in w && w.title ? w.title : w.id} · ${sizeOf(w).def.join('×')}` }))
      if (!lines.length) throw new Error('Nothing would change.')
      const flowName = (await findFlow(me, spec.flows[0])).flowName
      return cap(addChange({
        userId: me.id, flowKey: spec.flows[0], flowName, title: old ? `Change the “${spec.title}” dashboard` : `New dashboard: ${spec.title}`,
        where: ['Dashboards', spec.title], page: '', lines, patch: {}, before: {}, dashboard: { id: id || undefined, spec, before: old },
      }))
    },
  },
]

registerDashboardTools(DASHBOARD_TOOLS)
