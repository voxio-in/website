// One Assistant reply: ask the model, run the tools it calls (as the user),
// feed the results back, and repeat until it answers or hits the step limit.
// Each thing that happens is emitted as an event for the panel to show live.

import type { AuthUser } from '#/server/session.server'
import { complete, modelById, type Msg } from './models.server'
import { READ_TOOLS, flowBrief, runTool, type ToolDef } from './tools.server'
import { WRITE_TOOLS, inBatch, runWrite } from './changes.server'
import { DASHBOARD_TOOLS } from './dashboards.server'

const TOOLS = [...READ_TOOLS, ...WRITE_TOOLS, ...DASHBOARD_TOOLS]

// ------------------------------------------------------------------ which tools to send
// Every tool definition is resent on every step, so only the groups a message
// needs go out. A cheap keyword check picks them; load_tools lets the model add
// a group it finds missing (the next step then has it).

const byName = (...names: string[]) => names.map((n) => TOOLS.find((t) => t.name === n)!).filter(Boolean)
const GROUPS = {
  core: byName('account_overview', 'list_flows', 'get_flow', 'get_workflow', 'get_step', 'search_sessions', 'get_session', 'session_stats', 'explain'),
  edit: [...WRITE_TOOLS, ...byName('validate_workflow')],
  dashboards: DASHBOARD_TOOLS,
  library: byName('list_voices', 'list_faces', 'list_numbers', 'list_knowledge', 'list_deliveries', 'validate_workflow'),
} as const
type Group = keyof typeof GROUPS

const WANTS: [Exclude<Group, 'core'>, RegExp][] = [
  // Any request to change something, or a reply to a proposal.
  ['edit', /\b(add|remove|delete|drop|change|set|update|make|rename|connect|wire|rewire|fix|turn (on|off)|enable|disable|switch|use|replace|edit|create|improve|apply|propose|insert|move|increase|decrease|lower|raise|shorten|rewrite)\b|追加|削除|変更|修正|作成/i],
  ['dashboards', /\b(dashboards?|vad|widgets?|kpis?|charts?|metrics?|graphs?)\b|ダッシュボード/i],
  ['library', /\b(voices?|speak|listen|stt|tts|faces?|avatars?|looks?|numbers?|phone|knowledge|webhooks?|deliver(y|ies)|errors?|issues?|problems?|check|valid)/i],
]

const LOAD_TOOLS: ToolDef = {
  name: 'load_tools',
  description: 'Add a group of tools you need but don\'t have: "edit" (propose changes to flows), "dashboards" (VAD dashboards), "library" (voices, faces, numbers, knowledge, webhook deliveries, workflow checks). They are available from your next step.',
  input: { type: 'object', required: ['groups'], properties: { groups: { type: 'array', items: { type: 'string', enum: ['edit', 'dashboards', 'library'] } } } },
  label: (i) => `Loaded ${(i.groups as string[] | undefined)?.join(', ') ?? 'tools'}`,
  run: async () => ({ ok: true }),
}

function startingGroups(text: string, history: Msg[], mentions: Mention[]): Set<Group> {
  const g = new Set<Group>(['core'])
  for (const [name, re] of WANTS) if (re.test(text)) g.add(name)
  // Follow-ups ("yes", "do it") after a proposal or a dashboard keep those tools.
  const prev = [...history].reverse().find((m) => m.role === 'assistant')
  const said = prev?.role === 'assistant' ? prev.text : ''
  if (/Proposed change|propos|card/i.test(said)) g.add('edit')
  if (/dashboard|vx:dash\//i.test(said)) g.add('dashboards')
  if (mentions.some((m) => ['voice', 'face', 'number', 'knowledge'].includes(m.kind))) g.add('library')
  return g
}

const toolsFor = (groups: Set<Group>): ToolDef[] => {
  const seen = new Set<string>()
  // A fixed order, so the tool list (and the provider's prompt cache) stays the same between steps.
  const order: Group[] = ['core', 'edit', 'dashboards', 'library']
  return [...order.filter((g) => groups.has(g)).flatMap((g) => GROUPS[g]), LOAD_TOOLS].filter((t) => !seen.has(t.name) && seen.add(t.name))
}

/** Any read-only tool (account reads and dashboard reads), redacted and capped. */
async function runRead(me: AuthUser, name: string, input: Record<string, unknown>) {
  if (READ_TOOLS.some((t) => t.name === name)) return runTool(me, name, input)
  const tool = DASHBOARD_TOOLS.find((t) => t.name === name)
  if (!tool) return { ok: false, label: name, result: { error: `Unknown tool ${name}.` } }
  try { return { ok: true, label: tool.label(input), result: cap(redact(await tool.run(me, input))) } }
  catch (e) { return { ok: false, label: tool.label(input), result: { error: (e as Error).message } } }
}
/** Tools whose results may carry a change card. */
const PROPOSERS = new Set([...WRITE_TOOLS, ...DASHBOARD_TOOLS.filter((t) => t.name === 'propose_dashboard')].map((t) => t.name))
import { cap, redact, shortKey } from './redact'

export type Mention = { kind: 'flow' | 'step' | 'session' | 'face' | 'voice' | 'number' | 'knowledge'; id: string; label: string; flow?: string }
export type Context = { page?: string; flow?: { key: string; name: string }; step?: string; session?: string; timezone?: string }

export type AssistantEvent =
  | { type: 'tool'; id: string; name: string; label: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; ok: boolean; label: string; result: unknown }
  | { type: 'change'; card: { id: string; flow: string; title: string; lines: { what: string; from?: unknown; to?: unknown }[]; status: string } }
  | { type: 'text'; text: string }
  | { type: 'done'; model: string; steps: number; usage: { input: number; output: number; cached: number }; summary: string }
  | { type: 'error'; message: string }

const MAX_STEPS = 12

function systemPrompt(me: AuthUser, ctx: Context, mentions: Mention[]) {
  const now = new Date()
  const lines = [
    `You are the Voxio Assistant, inside the Voxio dashboard. Voxio builds voice agents ("flows"): each flow has a workflow of steps (Say, Listen, AI answers, AI thinks, Branch, Look up knowledge…), a listening setup (speech-to-text), a speaking voice (text-to-speech), behaviour settings ("knobs" such as turn-taking and inactivity), optional avatar faces ("looks"), phone numbers, a webhook, and sessions (calls, web, video and chat conversations with transcripts).`,
    `You are talking to ${me.name}. You can READ everything on their account, and you can PROPOSE changes to flows with the propose_* tools: flow settings and behaviour knobs, speaking and listening setups, workflow steps (settings, add, remove, rewire) and avatar looks. A proposal is shown to the user as a card with Apply and Discard; nothing is saved until they press Apply. So after proposing, say it as a proposal ("I've prepared a change that…", "Apply the card to…"), briefly what it does and why (the card appears above your words, so refer to "the card above"), and never say it is done, removed, fixed or saved: it isn't until they press Apply. The propose tools read the current values, check the change and show a before → after diff themselves, so don't read just to confirm: go straight to the proposal when you know what to change, and read only what you need to decide it (e.g. get_step before rewriting a prompt). Within one reply, every proposal to the same flow joins ONE card and builds on the ones before it, so do the whole job in this reply (add, rewire, remove, configure, in a sensible order) instead of asking the user to apply part of it and come back. Never propose the same thing twice; if a proposal comes back with an error, fix it and propose again. Sessions, recordings and the account key can never be changed; say so if asked.

VAD means **Voxio Agents Dashboard**: a dashboard of widgets (numbers, charts, tables) about one or more flows, saved in the Dashboards section. (The behaviour setting "vad-threshold" is voice activity detection, a different thing; only mean that when the user is clearly talking about that setting.) When the user asks for a dashboard or a VAD, BUILD ONE with the tools, never draw charts in the chat instead: 1) check_workflow_data for the flow; 2) if the goal needs data the workflow doesn't record, propose that workflow change first (propose_step_settings on the AI step's "What it decides"); 3) propose_dashboard with a full spec (KPIs on top, then charts, then a table); 4) say what the card contains. To change an existing dashboard: list_dashboards / get_dashboard, then propose_dashboard with its id and the full new spec. Link dashboards as [title](vx:dash/<id>).`,
    `How to work: read only what the question needs, and as few times as you can: every read is resent on later steps. When a flow is open its steps are listed below, so don't list flows or read its outline again. Several independent reads can go in one step. If a tool you need isn't in your list, call load_tools. Use session_stats for any counting; never count rows yourself. Use explain to get the meaning and allowed values of settings and step types. Quote turn numbers when you refer to a transcript. If a tool returns an error, adjust and try again.`,
    `How to answer — be an analyst, not a narrator:
- First line: the direct answer to what was asked, with the key number or verdict.
- Then only what matters: what it means, what stands out (problems, risks, anything odd or worth fixing), and what to do next. 2–5 short bullets is usually enough.
- Never walk through a workflow or a transcript step by step unless the user asks for that. Explain a flow by its purpose and the parts that matter for the question, not node by node.
- Prefer a small table when comparing several things side by side.`,
    `Links: whenever you mention a flow, a session or a workflow step, write it as a link using the "ref" value the tools return, e.g. [Clinic agent](vx:flow/vk_ab12cd34), [Oct 9, 14:02 call](vx:session/<id>), [Feedback step](vx:step/vk_ab12cd34/feedback). These become buttons that open the page. Never invent a ref; only use refs you got from a tool.`,
    `Charts: only when a picture says more than a sentence — a trend over time with several points, or a comparison of 4+ items. Not for one or two numbers, not for yes/no answers, and at most one chart per answer unless asked. When you do, write a fenced block with the language "chart" and JSON:
\`\`\`chart
{"type":"bar","title":"Sessions per day","unit":"sessions","data":[{"label":"Oct 8","sessions":1},{"label":"Oct 9","sessions":22}],"series":[{"key":"sessions","label":"Sessions"}]}
\`\`\`
type is "bar" (categories), "stacked" (bars split by several series) or "area" (only when every label is an ISO date like 2026-10-09). Use numbers from tools only.`,
    `Style: short and plain. Use the dashboard's own words (Say step, What it decides, Speaking voice). Never show raw JSON unless asked. Answer in the language of the user's own sentences (names of flows or steps in another language don't count).`,
    `Today is ${now.toISOString().slice(0, 10)}${ctx.timezone ? `, user's time zone ${ctx.timezone}` : ''}.`,
  ]
  const where: string[] = []
  if (ctx.page) where.push(`page: ${ctx.page}`)
  if (ctx.flow) where.push(`open flow: "${ctx.flow.name}" (key ${shortKey(ctx.flow.key)})`)
  if (ctx.step) where.push(`selected workflow step: ${ctx.step}`)
  if (ctx.session) where.push(`open session: ${ctx.session}`)
  if (where.length) lines.push(`The user is looking at — ${where.join('; ')}. "This flow", "this step" and so on mean these.`)
  if (mentions.length) lines.push(`The user @-mentioned: ${mentions.map((m) => `${m.kind} "${m.label}" (${m.kind === 'step' ? `step ${m.id} in flow ${m.flow}` : `id ${m.id}`})`).join('; ')}. Read them only if the question needs their details.`)
  return lines.join('\n\n')
}

/**
 * The language of the user's own words, ignoring names in other scripts: mostly
 * Latin words means English (the models over-follow Japanese flow names otherwise).
 */
function languageOf(text: string): string | null {
  const latin = (text.match(/[A-Za-z]{2,}/g) ?? []).length
  const cjk = (text.replace(/[「『(（][^」』)）]*[」』)）]/g, '').match(/[぀-ヿ一-鿿]/g) ?? []).length
  if (latin >= 3 && latin * 2 >= cjk) return 'English'
  if (cjk > 0 && latin < 3) return 'Japanese'
  return null
}

/**
 * Every step resends the whole conversation, so a big read (a workflow, a session)
 * would be paid for again on each later step. Results more than two steps old are
 * cut to a short note; the model can read them again if it still needs them.
 */
const KEEP_STEPS = 2
const SHRINK_OVER = 1200
function shrinkOld(msgs: Msg[], resultStep: Map<number, number>, step: number): Msg[] {
  return msgs.map((m, i) => {
    const at = resultStep.get(i)
    if (m.role !== 'tool' || at === undefined || step - at <= KEEP_STEPS || m.content.length <= SHRINK_OVER) return m
    return { ...m, content: JSON.stringify({ note: `Earlier result of ${m.name} (${m.content.length.toLocaleString()} characters), left out to save space. Call ${m.name} again if you need its details.`, start: m.content.slice(0, 300) }) }
  })
}

export async function* reply(me: AuthUser, opts: { model: string; history: Msg[]; ctx: Context; mentions: Mention[]; signal?: AbortSignal }): AsyncGenerator<AssistantEvent> {
  const model = modelById(opts.model)
  if (!model) { yield { type: 'error', message: 'No AI model is set up. Add OPENROUTER_API_KEY, GROQ_API_KEY or ANTHROPIC_API_KEY to the server’s .env.' }; return }
  const last = [...opts.history].reverse().find((m) => m.role === 'user')
  const lang = last?.role === 'user' ? languageOf(last.content) : null
  const system = systemPrompt(me, opts.ctx, opts.mentions) + (lang ? `

The user's latest message is in ${lang}. Reply in ${lang}, even when the flow names or data are in another language.` : '')
  const msgs: Msg[] = [...opts.history]
  // Proposals in this reply stack per flow (see changes.server inBatch).
  const batchMap = new Map<string, string>()
  const inReply = <T,>(fn: () => T) => inBatch(fn, batchMap)
  const groups = startingGroups(last?.role === 'user' ? last.content : '', opts.history.slice(0, -1), opts.mentions)
  // The open flow, in a few lines: saves listing flows and reading its outline.
  const brief = opts.ctx.flow ? await flowBrief(me, opts.ctx.flow.key).catch(() => '') : ''
  const fullSystem = brief ? `${system}

${brief}` : system
  const cache = new Map<string, { ok: boolean; label: string; result: unknown }>()
  const usage = { input: 0, output: 0, cached: 0 }
  // Which step each tool result came from: older ones are shrunk before the next call.
  const resultStep = new Map<number, number>()
  let steps = 0

  try {
    while (steps < MAX_STEPS) {
      steps++
      const turn = await complete(model, fullSystem, shrinkOld(msgs, resultStep, steps), toolsFor(groups), opts.signal)
      usage.input += turn.usage?.input ?? 0
      usage.output += turn.usage?.output ?? 0
      usage.cached += turn.usage?.cached ?? 0
      if (turn.text) yield { type: 'text', text: turn.text }
      msgs.push({ role: 'assistant', text: turn.text, calls: turn.calls })
      if (!turn.calls.length) break

      for (const c of turn.calls) {
        if (c.name === 'load_tools') {
          for (const g of (c.input.groups as string[] | undefined) ?? []) if (g in GROUPS) groups.add(g as Group)
          msgs.push({ role: 'tool', id: c.id, name: c.name, content: JSON.stringify({ ok: true, now_available: [...groups] }) })
          continue
        }
        // Tools outside this reply's set still run if called (e.g. named in an earlier turn).
        const tool = TOOLS.find((t) => t.name === c.name)
        const writes = PROPOSERS.has(c.name)
        yield { type: 'tool', id: c.id, name: c.name, label: tool?.label(c.input) ?? c.name, input: c.input }
        // Same read twice in one reply: answer from memory. Proposals always run.
        const key = `${c.name}:${JSON.stringify(c.input)}`
        const r = writes ? await inReply(() => runWrite(me, c.name, c.input)) : cache.get(key) ?? (await runRead(me, c.name, c.input))
        if (!writes) cache.set(key, r)
        yield { type: 'tool_result', id: c.id, ok: r.ok, label: r.label, result: r.result }
        const card = (r.result as { proposed?: unknown })?.proposed
        if (writes && r.ok && card) yield { type: 'change', card: card as Extract<AssistantEvent, { type: 'change' }>['card'] }
        resultStep.set(msgs.length, steps)
        msgs.push({ role: 'tool', id: c.id, name: c.name, content: JSON.stringify(r.result) })
      }
    }
    if (steps >= MAX_STEPS) yield { type: 'text', text: '\n\n_(Stopped after many steps. Ask me to continue if you need more.)_' }
    // What was paid for: cached input costs a fraction of new input, so show them apart.
    const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))
    const summary = `${model.label} · ${steps} step${steps === 1 ? '' : 's'} · ${k(usage.input - usage.cached)} new${usage.cached ? ` + ${k(usage.cached)} cached` : ''} in · ${k(usage.output)} out`
    yield { type: 'done', model: model.label, steps, usage, summary }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    yield { type: 'error', message: (e as Error).message }
  }
}
