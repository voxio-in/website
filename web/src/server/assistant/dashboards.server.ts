// Ask Voxio's VAD tools (docs §9–10). The model never writes a spec: it picks
// widgets from a fixed menu of built-in call data (spec.ts MENU) by id, and the
// server builds, lays out and checks the dashboard. Every id is an enum in the
// tool schema, so an invalid request can't be made, and nothing needs retrying.
// The result is a change card; nothing is saved until the user presses Apply.

import type { AuthUser } from '#/server/session.server'
import { db, withDb } from '#/server/db'
import { FIELD_SHOWS, FIELD_SHOW_TEXT, MENU, MENU_DEFAULT, MENU_IDS, fieldWidget, fromMenu, funnelWidget, normalize, sizeOf, type FieldShow, type Spec, type Widget } from '#/lib/vad/spec'
import type { EngineNode, Workflow } from '#/lib/workflow/convert'
import { addChange, registerDashboardTools } from './changes.server'
import { findFlow, type ToolDef } from './tools.server'
import { cap, shortKey } from './redact'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const strs = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])
const titleOf = (w: Spec['widgets'][number]) => ('title' in w && w.title ? w.title : w.id)

const SYSTEM = new Set(['speak', 'hangup', 'response', 'llm_response', 'user_input', 'conversation_history', 'node_type'])

/** What a flow records per call: the fields its AI steps decide (besides speak/hangup), with kind and allowed values. */
export async function recordedFields(me: AuthUser, flow: unknown) {
  const f = await findFlow(me, flow)
  const row = await withDb(() => db.flow.findUniqueOrThrow({ where: { id: f.id }, select: { agent: { select: { workflow: true } } } }))
  const out = new Map<string, { name: string; kind: 'category' | 'text' | 'yes_no' | 'number'; values: string[] }>()
  for (const n of Object.values(((row.agent.workflow as unknown as Workflow).nodes ?? {}) as Record<string, EngineNode>)) {
    for (const [name, spec] of Object.entries((n.parameters?.llm_return_type ?? {}) as Record<string, { type?: string; description?: string }>)) {
      if (SYSTEM.has(name)) continue
      const values = (spec?.description?.match(/Exactly one of: ([^.]+)\./)?.[1] ?? '').split(',').map((x) => x.trim()).filter(Boolean)
      const t = String(spec?.type ?? 'str')
      out.set(name, { name, kind: t === 'bool' ? 'yes_no' : /int|float|num/.test(t) ? 'number' : values.length ? 'category' : 'text', values })
    }
  }
  return { flow: f, fields: [...out.values()] }
}

type FieldAsk = { field: string; show?: FieldShow; with?: string }
const DEFAULT_SHOW = { category: 'breakdown', yes_no: 'share', number: 'average', text: 'table' } as const

/** Widgets for the requested fields, checked against what the flow records. */
async function fieldWidgets(me: AuthUser, flow: unknown, asks: FieldAsk[], funnel: string[] = []): Promise<Widget[]> {
  if (!asks.length && !funnel.length) return []
  const { flow: f, fields } = await recordedFields(me, flow)
  if (!fields.length) throw new Error(`“${f.flowName}” records no fields yet, so there's nothing to chart beyond call data. Offer record_fields first.`)
  const known = new Map(fields.map((x) => [x.name, x]))
  const out: Widget[] = asks.map((a) => {
    const fd = known.get(str(a.field).replace(/^agent\./, ''))
    if (!fd) throw new Error(`“${a.field}” isn't recorded by this flow. It records: ${fields.map((x) => `${x.name} (${x.kind})`).join(', ')}.`)
    const show = (a.show ?? DEFAULT_SHOW[fd.kind]) as FieldShow
    if (!FIELD_SHOWS.includes(show)) throw new Error(`show is one of: ${FIELD_SHOWS.join(', ')}.`)
    if (show === 'share' && fd.kind !== 'yes_no') throw new Error(`${fd.name} isn't a yes/no field; use breakdown or known.`)
    if (show === 'average' && fd.kind !== 'number') throw new Error(`${fd.name} isn't a number; use breakdown or known.`)
    if (show === 'cross' && !known.has(str(a.with))) throw new Error(`cross needs "with": another recorded field (${fields.map((x) => x.name).filter((x) => x !== fd.name).join(', ')}).`)
    return fieldWidget(fd.name, show, { with: a.with, columns: show === 'table' ? fields.map((x) => x.name).filter((x) => x !== fd.name).slice(0, 4) : undefined })
  })
  if (funnel.length) {
    const steps = funnel.map((x) => str(x).replace(/^agent\./, ''))
    const bad = steps.filter((x) => !known.has(x))
    if (bad.length) throw new Error(`Funnel steps must be recorded fields; not recorded: ${bad.join(', ')}. It records: ${fields.map((x) => x.name).join(', ')}.`)
    if (steps.length < 2) throw new Error('A funnel needs at least 2 fields, in order.')
    out.push(funnelWidget(steps))
  }
  return out
}

const fieldsArg = {
  type: 'array', description: `Widgets on the flow's recorded fields (what its AI decides per call). Each: field (name), show: ${FIELD_SHOW_TEXT}. Leave show out for the usual one for that field.`,
  items: { type: 'object', required: ['field'], properties: { field: { type: 'string' }, show: { type: 'string', enum: [...FIELD_SHOWS] }, with: { type: 'string' } } },
}

const funnelArg = { type: 'array', items: { type: 'string' }, description: 'Recorded fields in order for a funnel (e.g. ["course", "preferred_date", "booked"]): how many calls got each step, and all before it.' }

const MENU_TEXT = MENU_IDS.map((id) => `${id}: ${MENU[id].label}`).join('; ')
const widgetIds = { type: 'array', items: { type: 'string', enum: MENU_IDS } }

/** Shows a dashboard (new, or a new version of `id`) as a change card. */
async function proposeSpec(me: AuthUser, spec: Spec, id?: string) {
  const before = id ? await withDb(() => db.dashboard.findFirst({ where: { id, userId: me.id }, select: { spec: true } })) : null
  if (id && !before) throw new Error('No such dashboard. Call list_dashboards for its id.')
  const old = (before?.spec ?? null) as Spec | null
  const lines = old
    ? [
      ...spec.widgets.filter((w) => !old.widgets.some((o) => o.id === w.id)).map((w) => ({ what: 'Add widget', to: titleOf(w) })),
      ...old.widgets.filter((o) => !spec.widgets.some((w) => w.id === o.id)).map((o) => ({ what: 'Remove widget', from: titleOf(o) })),
      ...(old.title !== spec.title ? [{ what: 'Title', from: old.title, to: spec.title }] : []),
    ]
    : spec.widgets.map((w) => ({ what: w.type === 'kpi' ? 'Number' : w.type === 'chart' ? 'Chart' : w.type === 'table' ? 'Table' : 'Note', to: `${titleOf(w)} · ${sizeOf(w).def.join('×')}` }))
  if (!lines.length) throw new Error('Nothing would change.')
  const flowName = (await findFlow(me, spec.flows[0])).flowName
  const r = addChange({
    userId: me.id, flowKey: spec.flows[0], flowName, title: old ? `Change the VAD “${spec.title}”` : `New VAD: ${spec.title}`,
    where: ["VAD", spec.title], page: '', lines, patch: {}, before: {}, dashboard: { id, spec, before: old },
  })
  // Said here, as fact, so the model doesn't claim it is saved or link a dashboard that doesn't exist yet.
  return cap({
    ...r,
    note: old
      ? `Not saved yet: the user sees a card and presses Apply to change the dashboard. Link it as [${spec.title}](vx:dash/${id}).`
      : 'Not saved yet: the user sees a card and presses Apply to create the dashboard. It has no id until then, so don’t link it and don’t say it was created.',
  })
}

export const DASHBOARD_TOOLS: ToolDef[] = [
  {
    name: 'recorded_fields',
    description: 'What a flow records on each call (the fields its AI decides, e.g. inquiry_type), with kind (category, yes_no, number, text), allowed values, and how many calls have them so far. Use before dashboard field widgets, or to answer what was decided on calls.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' } } },
    label: (i) => `Read recorded fields of ${str(i.flow)}`,
    run: async (me, i) => {
      const { flow, fields } = await recordedFields(me, i.flow)
      const [{ n }] = await withDb(() => db.$queryRaw<{ n: number }[]>`select count(*)::int as n from sessions where flow_id = ${flow.id} and extra ? 'variables'`)
      return { flow: flow.flowName, fields, calls_with_values: n, ...(fields.length ? {} : { note: 'Records nothing yet: record_fields adds fields.' }) }
    },
  },
  {
    name: 'list_dashboards',
    description: 'The user’s dashboards: id, title, flows, widget ids. Use it to find the id before edit_dashboard.',
    input: { type: 'object', properties: {} },
    label: () => 'Listed dashboards',
    run: async (me) => {
      const rows = await withDb(() => db.dashboard.findMany({ where: { userId: me.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, spec: true } }))
      return rows.map((d) => ({ id: d.id, ref: `vx:dash/${d.id}`, title: d.title, flows: (d.spec as Spec).flows.map(shortKey), widgets: (d.spec as Spec).widgets.map((w) => w.id) }))
    },
  },
  {
    name: 'create_dashboard',
    description: `Make a dashboard of one flow's call data. Pick the widgets that fit the request; if it names none, leave "widgets" out for the usual set (${MENU_DEFAULT.join(', ')}). Widgets: ${MENU_TEXT}. For what the agent decided on calls (e.g. inquiry type, outcome), use "fields" with the flow's recorded fields (recorded_fields lists them).`,
    input: {
      type: 'object', required: ['flow', 'title'],
      properties: {
        flow: { type: 'string', description: 'Flow name or key, as the user said it; no need to look it up first' },
        title: { type: 'string', description: 'Short title, in the user’s language' },
        widgets: widgetIds,
        fields: fieldsArg,
        funnel: funnelArg,
      },
    },
    label: (i) => `Proposed a dashboard for ${str(i.flow)}`,
    run: async (me, i) => proposeSpec(me, fromMenu(str(i.title) || 'Calls', (await findFlow(me, i.flow)).apiKey, strs(i.widgets), await fieldWidgets(me, i.flow, (Array.isArray(i.fields) ? i.fields : []) as FieldAsk[], strs(i.funnel)))),
  },
  {
    name: 'edit_dashboard',
    description: 'Add or remove widgets on an existing dashboard, or rename it. Widgets are the same as create_dashboard’s.',
    input: {
      type: 'object', required: ['id'],
      properties: {
        id: { type: 'string', description: 'Dashboard id from list_dashboards' },
        add: widgetIds,
        add_fields: fieldsArg,
        add_funnel: funnelArg,
        remove: { type: 'array', items: { type: 'string' }, description: 'Widget ids to take off' },
        title: { type: 'string' },
      },
    },
    label: () => 'Proposed dashboard changes',
    run: async (me, i) => {
      const id = str(i.id).replace(/^vx:dash\//, '')
      const row = await withDb(() => db.dashboard.findFirst({ where: { id, userId: me.id }, select: { spec: true } }))
      if (!row) throw new Error('No such dashboard. Call list_dashboards for its id.')
      const old = row.spec as Spec
      const remove = new Set(strs(i.remove))
      const added = strs(i.add).filter((a) => Object.hasOwn(MENU, a) && !old.widgets.some((w) => w.id === a))
      const extra = (await fieldWidgets(me, old.flows[0], (Array.isArray(i.add_fields) ? i.add_fields : []) as FieldAsk[], strs(i.add_funnel))).filter((w) => !old.widgets.some((o) => o.id === w.id))
      const widgets = [...old.widgets.filter((w) => !remove.has(w.id)), ...added.map((a) => MENU[a as keyof typeof MENU].build()), ...extra]
      // Kept widgets stay where the user put them; new ones go to the bottom.
      const r = normalize({ ...old, title: str(i.title).trim() || old.title, widgets, layout: old.layout.filter((l) => !remove.has(l.i)) })
      if (!r.ok) throw new Error(r.errors.join(' '))
      return proposeSpec(me, r.spec, id)
    },
  },
]

registerDashboardTools(DASHBOARD_TOOLS)
