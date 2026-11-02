// One Assistant reply: ask the model, run the tools it calls (as the user),
// feed the results back, and repeat until it answers or hits the step limit.
// Each thing that happens is emitted as an event for the panel to show live.

import type { AuthUser } from '#/server/session.server'
import { complete, modelById, type Msg } from './models.server'
import { READ_TOOLS, findFlow, flowBrief, runTool, type ToolDef } from './tools.server'
import { WRITE_TOOLS, inBatch, runWrite } from './changes.server'
import { DASHBOARD_TOOLS } from './dashboards.server'
import { TEST_TOOLS } from './tests.server'
import { INSIGHT_TOOLS } from './insights.server'
import { SIMULATE_TOOLS } from './simulate.server'
import { GAP_TOOLS } from './knowledge-gaps.server'
import { LEAD_TOOLS } from './leads.server'

const TOOLS = [...READ_TOOLS, ...WRITE_TOOLS, ...DASHBOARD_TOOLS, ...TEST_TOOLS, ...INSIGHT_TOOLS, ...SIMULATE_TOOLS, ...GAP_TOOLS, ...LEAD_TOOLS]

// ------------------------------------------------------------------ which tools to send
// Every tool definition is resent on every step, so only the groups a message
// needs go out. A cheap keyword check picks them; load_tools lets the model add
// a group it finds missing (the next step then has it).

const byName = (...names: string[]) => names.map((n) => TOOLS.find((t) => t.name === n)!).filter(Boolean)
const GROUPS = {
  core: [...byName('account_overview', 'list_flows', 'get_flow', 'get_workflow', 'get_step', 'search_sessions', 'get_session', 'session_stats', 'explain', 'edit_workflow', 'edit_settings', 'voice_options', 'create_flow', 'clone_flow', 'test_flow'), ...DASHBOARD_TOOLS],
  edit: [...WRITE_TOOLS, ...byName('validate_workflow')],
  dashboards: [],
  // Reading calls and improving a flow from them.
  improve: [...INSIGHT_TOOLS, ...SIMULATE_TOOLS, ...GAP_TOOLS, ...LEAD_TOOLS, ...byName('record_fields')],
  library: byName('list_voices', 'list_faces', 'list_numbers', 'list_knowledge', 'list_deliveries', 'validate_workflow', 'voice_compare'),
} as const
type Group = keyof typeof GROUPS

const WANTS: [Exclude<Group, 'core'>, RegExp][] = [
  // Any request to change something, or a reply to a proposal.
  ['edit', /\b(add|remove|delete|drop|change|set|update|make|rename|connect|wire|rewire|fix|turn (on|off)|enable|disable|switch|use|replace|edit|create|improve|apply|propose|insert|move|increase|decrease|lower|raise|shorten|rewrite)\b|追加|削除|変更|修正|作成/i],
  ['dashboards', /\b(dashboards?|vad|widgets?|kpis?|charts?|metrics?|graphs?)\b|ダッシュボード/i],
  ['improve', /\b(calls?|callers?|transcripts?|sessions?|why|improve|better|analy[sz]\w*|insights?|patterns?|record|track|rehears\w*|simulat\w*|drop\w*|fail\w*|working|wrong|complain\w*|ask(ed|ing)? about|compare|before|after|fields?|data|leads?|export|csv|follow[- ]?ups?|call ?backs?|call (them )?back)\b|通話|分析|改善/i],
  ['library', /\b(voices?|hear|samples?|speak|listen|stt|tts|faces?|avatars?|looks?|numbers?|phone|knowledge|webhooks?|deliver(y|ies)|errors?|issues?|problems?|check|valid)/i],
]

const LOAD_TOOLS: ToolDef = {
  name: 'load_tools',
  description: 'Add a group of tools you need but don\'t have: "edit" (propose changes to flows), "improve" (read real calls: flow_profile, find_in_calls, analyze_calls, compare_periods; simulate; record_fields), "library" (voices and voice_compare, faces, numbers, knowledge, webhook deliveries, workflow checks). They are available from your next step.',
  input: { type: 'object', required: ['groups'], properties: { groups: { type: 'array', items: { type: 'string', enum: ['edit', 'improve', 'library'] } } } },
  label: (i) => `Loaded ${(i.groups as string[] | undefined)?.join(', ') ?? 'tools'}`,
  run: async () => ({ ok: true }),
}

function startingGroups(text: string, history: Msg[], mentions: Mention[]): Set<Group> {
  const g = new Set<Group>(['core'])
  for (const [name, re] of WANTS) if (re.test(text)) g.add(name)
  if ((g.has('dashboards') || /\b(show|chart|graph)\b/i.test(text)) && !/\b(step|workflow|prompt|voice|knob|setting)s?\b/i.test(text)) g.delete('edit')
  // Follow-ups ("yes", "do it") after a proposal or a dashboard keep those tools.
  const prev = [...history].reverse().find((m) => m.role === 'assistant')
  const said = prev?.role === 'assistant' ? prev.text : ''
  if (/Proposed change|propos|card/i.test(said)) g.add('edit')
  if (/dashboard|vx:dash\//i.test(said)) g.add('dashboards')
  if (/vx:session\/|calls?\b|rehears|simulat/i.test(said)) g.add('improve')
  if (mentions.some((m) => ['voice', 'face', 'number', 'knowledge'].includes(m.kind))) g.add('library')
  return g
}

const toolsFor = (groups: Set<Group>): ToolDef[] => {
  const seen = new Set<string>()
  // A fixed order, so the tool list (and the provider's prompt cache) stays the same between steps.
  const order: Group[] = ['core', 'edit', 'dashboards', 'improve', 'library']
  return [...order.filter((g) => groups.has(g)).flatMap((g) => GROUPS[g]), LOAD_TOOLS].filter((t) => !seen.has(t.name) && seen.add(t.name))
}

/** Step labels show flow names: keys are internal and never reach the screen. */
async function named(me: AuthUser, label: string) {
  const keys = [...new Set(label.match(/vk_[A-Za-z0-9_-]+…?/g) ?? [])]
  for (const k of keys) {
    const name = await findFlow(me, k).then((f) => f.flowName).catch(() => 'a flow')
    label = label.split(k).join(name)
  }
  return label
}

/** Any read-only tool (account reads and dashboard reads), redacted and capped. */
async function runRead(me: AuthUser, name: string, input: Record<string, unknown>) {
  if (READ_TOOLS.some((t) => t.name === name)) return runTool(me, name, input)
  const tool = [...DASHBOARD_TOOLS, ...TEST_TOOLS, ...INSIGHT_TOOLS, ...SIMULATE_TOOLS, ...GAP_TOOLS, ...LEAD_TOOLS].find((t) => t.name === name)
  if (!tool) return { ok: false, label: name, result: { error: `Unknown tool ${name}.` } }
  try { return { ok: true, label: tool.label(input), result: cap(redact(await tool.run(me, input))) } }
  catch (e) { return { ok: false, label: tool.label(input), result: { error: (e as Error).message } } }
}
/** Tools whose results may carry a change card. */
const PROPOSERS = new Set([...WRITE_TOOLS, ...DASHBOARD_TOOLS.filter((t) => t.name !== 'list_dashboards'), ...GAP_TOOLS.filter((t) => t.name === 'add_facts' || t.name === 'attach_kb')].map((t) => t.name))
import { cap, redact, shortKey } from './redact'

export type Mention = { kind: 'flow' | 'step' | 'session' | 'face' | 'voice' | 'number' | 'knowledge' | 'file'; id: string; label: string; flow?: string }
export type Context = { page?: string; flow?: { key: string; name: string }; step?: string; session?: string; timezone?: string }

export type AssistantEvent =
  | { type: 'tool'; id: string; name: string; label: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; ok: boolean; label: string; result: unknown }
  | { type: 'test'; test: { flow: string; name: string; how: 'chat' | 'voice' } }
  | { type: 'voices'; voices: { label: string; url: string; changes: unknown[] }[] }
  | { type: 'followups'; followups: { title: string; total: number; calls: { call: string; when: string; caller: string; seconds: number; recorded: Record<string, unknown>; last_caller_line: string }[] } }
  | { type: 'download'; download: { name: string; mime: string; text: string; rows: number; columns: string[] } }
  | { type: 'doc'; doc: { title: string; items: { question: string; hint: string }[] } }
  | { type: 'change'; card: { id: string; flow: string; title: string; lines: { what: string; from?: unknown; to?: unknown }[]; status: string } }
  | { type: 'text'; text: string }
  | { type: 'done'; model: string; steps: number; usage: { input: number; output: number; cached: number }; summary: string }
  | { type: 'error'; message: string }

const MAX_STEPS = 12

const DASH_PROPOSERS = new Set(['create_dashboard', 'edit_dashboard'])
// Cards whose closing line the server writes: the card already lists every change.
const CARD_ONLY = new Set([...DASH_PROPOSERS, 'edit_workflow', 'edit_settings', 'create_flow', 'record_fields', 'clone_flow', 'add_facts', 'attach_kb'])
const NEW_DONE = {
  en: 'The new flow is in the card above. Press **Apply** to create it; then I can set up a test for it.',
  ja: '新しいフローを上のカードに用意しました。**適用**を押すと作成されます。その後テストを用意できます。',
}
const DASH_DONE = {
  en: 'The dashboard is in the card above. Press **Apply** to save it; it then appears under Dashboards.',
  ja: 'ダッシュボードを上のカードに用意しました。**適用**を押すと保存され、ダッシュボードに表示されます。',
}
const WF_DONE = {
  en: 'The changes are in the card above. Press **Apply** to save them to the workflow.',
  ja: '変更内容を上のカードに用意しました。**適用**を押すとワークフローに保存されます。',
}
const SETTINGS_DONE = {
  en: 'The changes are in the card above. Press **Apply** to save them.',
  ja: '変更内容を上のカードに用意しました。**適用**を押すと保存されます。',
}
const TEST_READY = {
  en: 'The test is in the card above. Start it there; the conversation is kept in Sessions.',
  ja: 'テストを上のカードに用意しました。そこから開始できます。会話はセッションに保存されます。',
}

function systemPrompt(me: AuthUser, ctx: Context, mentions: Mention[]) {
  const now = new Date()
  const lines = [
    `You are the Voxio Assistant, inside the Voxio dashboard. Voxio builds voice agents ("flows"): each flow has a workflow of steps (Say, Listen, AI answers, AI thinks, Branch, Look up knowledge…), a listening setup (speech-to-text), a speaking voice (text-to-speech), behaviour settings ("knobs" such as turn-taking and inactivity), optional avatar faces ("looks"), phone numbers, a webhook, and sessions (calls, web, video and chat conversations with transcripts).`,
    `You are talking to ${me.name}. You can READ everything on their account, and you can PROPOSE changes to flows with tools: edit_workflow for the workflow; edit_settings for the flow's name, webhook, behaviour settings and its speaking and listening setups (voice_options shows what those can be set to); propose_looks for avatar looks. A proposal is shown to the user as a card with Apply and Discard; nothing is saved until they press Apply. So after proposing, say it as a proposal ("I've prepared a change that…", "Apply the card to…"), briefly what it does and why (the card appears above your words, so refer to "the card above"), and never say it is done, removed, fixed or saved: it isn't until they press Apply. The propose tools read the current values, check the change and show a before → after diff themselves, so don't read just to confirm: go straight to the proposal when you know what to change, and read only what you need to decide it (e.g. get_step before rewriting a prompt). Within one reply, every proposal to the same flow joins ONE card and builds on the ones before it, so do the whole job in this reply (add, rewire, remove, configure, in a sensible order) instead of asking the user to apply part of it and come back. Never propose the same thing twice; if a proposal comes back with an error, fix it and propose again. Sessions, recordings and the account key can never be changed; say so if asked.

VAD means **Voxio Agents Dashboard**: a page of numbers, charts and a table about one flow's calls. (The behaviour setting "vad-threshold" is voice activity detection, a different thing.) When the user asks for a dashboard or a VAD, call create_dashboard once, with the widgets that fit the request, and never draw the charts in the chat. Example: "show me calls per day and the latest calls for NorthWell" → create_dashboard {"flow": "NorthWell", "title": "NorthWell calls", "widgets": ["calls_per_day", "recent_calls"]}. When a flow is open, "this flow" is that one. To change a dashboard: list_dashboards (if you don't have its id), then edit_dashboard. Dashboards show call data (counts, length, channel, status, turns, callers) and the flow's recorded fields: what its AI decides on each call, saved per call (e.g. "calls by inquiry type" → create_dashboard with fields [{"field": "inquiry_type"}]). recorded_fields lists them; if a flow records nothing, offer record_fields. Values exist only for calls made after the field was added. Link dashboards as [title](vx:dash/<id>).

To change a workflow (any step setting, add, remove, move, connect, rename, which step starts), call edit_workflow ONCE with every change, in order; steps you add can be used by later changes in the same call. Use the step ids listed for the open flow; if no flow is open, get_workflow first. If it returns an error, fix that change and send the whole list again.

To make a new flow (agent) from a description, call create_flow once with a name, full instructions and a greeting (and voice/language settings from voice_options if the user asked for them).

To change settings, call edit_settings ONCE with every change. To pick a voice or language, call voice_options for the provider first and use its exact values.

To understand a flow's calls (what callers want, why calls fail, what to record, how to improve it), go cheapest first and stop when you can answer: flow_profile (numbers and patterns, free) → find_in_calls with several spellings (Hindi, Hinglish, English) → get_session on 1–3 calls with a turns range → analyze_calls only for open questions the first three can't answer. Never read many whole calls. Evidence: every pattern you state about calls (why they end, what callers say, what the agent does) must come with a call link or a quoted line from a tool result; if you have none, get one first with find_in_calls or get_session, or don't state it. Say the period and how many calls an answer is based on (e.g. "61 of 373 calls, all time"). When you suggest a value the workflow should record, name it, say which step decides it, and offer to add it with record_fields (with a short fixed list of values for categories).

Improving a flow, using the tools above:
- Unanswered questions: kb_gaps finds them. Then ask the user for the answers and put them in with add_facts (a few facts), or put a fill-in document in the chat with draft_kb_doc (many), then attach_kb once it's uploaded. Never invent answers.
- Agent behaves badly (dodges a question, too long, wrong language): get_step for its instructions, then edit_workflow set system_prompt with the WHOLE revised prompt; quote the call lines that show the problem. Offer simulate with a caller who hits that problem, before and after.
- Callers ask what the agent can't answer (fees, dates, documents): find_in_calls or analyze_calls with question "what did the caller ask that the agent couldn't answer?", list those questions with counts, and suggest adding a knowledge document (list_knowledge shows what exists).
- One flow serving unrelated purposes: suggest record_fields with an inquiry_type, then a Branch on it (edit_workflow), or separate flows (clone_flow, then change each).
- Calls to call back: follow_ups (by a recorded value, or unfinished calls). A spreadsheet of calls with their recorded values: lead_export.
- Did an applied change help: compare_periods around the date it went in.
- Same agent in another language or for another client: clone_flow with name and settings.

To let the user hear voices before choosing, call voice_compare.

To test or try a flow, call test_flow: it puts a test in the chat that the user starts themselves, by chat (default) or by voice.`,
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
    `Style: short and plain. Use the dashboard's own words (Say step, What it decides, Speaking voice). Never show raw JSON unless asked, and never name your tools to the user (say "I can add these facts to the agent", not "add_facts"). Answer in the language of the user's own sentences (names of flows or steps in another language don't count).`,
    `Today is ${now.toISOString().slice(0, 10)}${ctx.timezone ? `, user's time zone ${ctx.timezone}` : ''}.`,
    "Write call lengths as minutes and seconds, the way the dashboard shows them: 1m 16s, 45s, 15m 14s total. Never a bare count of seconds over 59.",
  ]
  const where: string[] = []
  if (ctx.page) where.push(`page: ${ctx.page}`)
  const dash = /^\/dashboard\/dashboards\/([^/?#]+)/.exec(ctx.page ?? '')?.[1]
  if (dash) where.push(`open dashboard: id ${dash} ("this dashboard" means it; edit it with edit_dashboard)`)
  if (ctx.flow) where.push(`open flow: "${ctx.flow.name}" (key ${shortKey(ctx.flow.key)})`)
  if (ctx.step) where.push(`selected workflow step: ${ctx.step}`)
  if (ctx.session) where.push(`open session: ${ctx.session}`)
  if (where.length) lines.push(`The user is looking at — ${where.join('; ')}. "This flow", "this step" and so on mean these.`)
  mentions = mentions.filter((m) => m.kind !== 'file')
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
  const failures = new Map<string, number>()
  let stuck = ''

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

      let dashCards = 0
      let testCards = 0
      let wfCards = 0
      let setCards = 0
      let newCards = 0
      for (const c of turn.calls) {
        if (c.name === 'load_tools') {
          for (const g of (c.input.groups as string[] | undefined) ?? []) if (g in GROUPS) groups.add(g as Group)
          msgs.push({ role: 'tool', id: c.id, name: c.name, content: JSON.stringify({ ok: true, now_available: [...groups] }) })
          continue
        }
        // A flow tool called without a flow means the open one.
        if (opts.ctx.flow && c.input.flow === undefined && (TOOLS.find((t) => t.name === c.name)?.input.properties as Record<string, unknown> | undefined)?.flow) c.input.flow = opts.ctx.flow.key
        // Tools outside this reply's set still run if called (e.g. named in an earlier turn).
        const tool = TOOLS.find((t) => t.name === c.name)
        const writes = PROPOSERS.has(c.name)
        yield { type: 'tool', id: c.id, name: c.name, label: await named(me, tool?.label(c.input) ?? c.name), input: c.input }
        // Same read twice in one reply: answer from memory. Proposals always run.
        const key = `${c.name}:${JSON.stringify(c.input)}`
        const r = writes ? await inReply(() => runWrite(me, c.name, c.input)) : cache.get(key) ?? (await runRead(me, c.name, c.input))
        if (!writes) cache.set(key, r)
        yield { type: 'tool_result', id: c.id, ok: r.ok, label: await named(me, r.label), result: r.result }
        if (!r.ok) {
          const why = `${c.name}:${JSON.stringify(r.result)}`
          failures.set(why, (failures.get(why) ?? 0) + 1)
          if (failures.get(why)! >= 3) stuck = String((r.result as { error?: unknown })?.error ?? '')
        }
        const card = (r.result as { proposed?: unknown })?.proposed
        if (writes && r.ok && card) yield { type: 'change', card: card as Extract<AssistantEvent, { type: 'change' }>['card'] }
        if (r.ok && card && CARD_ONLY.has(c.name)) { dashCards++; if (['edit_workflow', 'record_fields', 'add_facts', 'attach_kb'].includes(c.name)) wfCards++; if (c.name === 'edit_settings') setCards++; if (c.name === 'create_flow' || c.name === 'clone_flow') newCards++ }
        // A test card: the panel runs it. The model gets no flow key, only that it's ready.
        const test = r.ok ? (r.result as { test?: Extract<AssistantEvent, { type: 'test' }>['test'] })?.test : undefined
        if (test) { yield { type: 'test', test }; testCards++ }
        const voices = r.ok && c.name === 'voice_compare' ? (r.result as { voices?: Extract<AssistantEvent, { type: 'voices' }>['voices'] })?.voices : undefined
        if (voices) yield { type: 'voices', voices }
        const draft = r.ok && c.name === 'draft_kb_doc' ? (r.result as { doc?: Extract<AssistantEvent, { type: 'doc' }>['doc'] })?.doc : undefined
        if (draft) yield { type: 'doc', doc: draft }
        const fu = r.ok && c.name === 'follow_ups' ? (r.result as { followups?: Extract<AssistantEvent, { type: 'followups' }>['followups'] })?.followups : undefined
        if (fu) yield { type: 'followups', followups: fu }
        const dl = r.ok && c.name === 'lead_export' ? (r.result as { download?: Extract<AssistantEvent, { type: 'download' }>['download'] })?.download : undefined
        if (dl) yield { type: 'download', download: dl }
        resultStep.set(msgs.length, steps)
        msgs.push({ role: 'tool', id: c.id, name: c.name, content: JSON.stringify(test ? { ready: true, note: 'The test card is in the chat; the user starts it. You don’t see the conversation.' } : fu ? { shown: 'The list with caller numbers and links is in the chat.', total: fu.total, examples: fu.calls.slice(0, 5).map((x) => ({ call: x.call, when: x.when, recorded: x.recorded, last_caller_line: x.last_caller_line })) } : dl ? { shown: `The download button for ${dl.name} is in the chat.`, rows: dl.rows, columns: dl.columns } : draft ? { shown: 'The fill-in document is in the chat. The user writes the answers, saves it as a PDF and uploads it on the Knowledge page; then attach_kb connects it.' } : voices ? { shown: voices.map((v) => ({ label: v.label, changes: v.changes })), note: 'The players are in the chat. Ask which one they like; then edit_settings with its changes.' } : r.result) })
      }
      if (stuck) {
        yield { type: 'text', text: `\n\nI couldn't get this change right; the same problem came back three times: ${stuck}` }
        break
      }
      // Every call this step made a dashboard card: say so ourselves and stop.
      if ((dashCards || testCards) && dashCards + testCards === turn.calls.length) {
        const said = [...(newCards ? [NEW_DONE] : []), ...(dashCards > wfCards + setCards + newCards ? [DASH_DONE] : []), ...(wfCards ? [WF_DONE] : []), ...(setCards && !wfCards ? [SETTINGS_DONE] : []), ...(testCards ? [TEST_READY] : [])].map((t) => (lang === 'Japanese' ? t.ja : t.en))
        yield { type: 'text', text: (turn.text ? '\n\n' : '') + said.join(' ') }
        break
      }
    }
    if (steps >= MAX_STEPS) yield { type: 'text', text: '\n\n_(Stopped after many steps. Ask me to continue if you need more.)_' }
    // What was paid for: cached input costs a fraction of new input, so show them apart.
    const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))
    const summary = `${steps} step${steps === 1 ? '' : 's'} · ${k(usage.input - usage.cached)} new${usage.cached ? ` + ${k(usage.cached)} cached` : ''} in · ${k(usage.output)} out`
    yield { type: 'done', model: model.label, steps, usage, summary }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    yield { type: 'error', message: (e as Error).message }
  }
}
