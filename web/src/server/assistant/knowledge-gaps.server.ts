// Knowledge gaps: what callers asked that the agent couldn't answer, and the ways to fill them.
//   kb_gaps       — a cheap reader goes through sampled calls; the code groups the gaps by topic (counts + quotes)
//   add_facts     — a few facts go straight into the AI step's instructions (best under ~20 facts)
//   attach_kb     — connect a knowledge base: a "Look up knowledge" step before the AI step
//   draft_kb_doc  — a fill-in document card in the chat; the user saves it as a PDF and uploads it

import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'
import type { EngineNode, Workflow } from '#/lib/workflow/convert'
import { complete, modelById } from './models.server'
import { asTurn, findFlow, type ToolDef } from './tools.server'
import { editWorkflow, propose, registerWriteTools, type ChangeLine } from './changes.server'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)
const CACHE = new Map<string, { at: number; value: unknown }>()

type Gap = { topic: string; question: string; turn: number; how: string; call: string }

const READER = `You read voice-agent call transcripts (often Hindi, Hinglish or English). Find every question or request from the CALLER that the AGENT did not properly answer: it dodged, said it didn't know, gave a vague or generic reply, or gave wrong or made-up information.
Return JSON only: {"calls":[{"i":<number>,"gaps":[{"topic":"2-4 words in English, lowercase, general enough to group (e.g. 'bca fees', 'hostel availability', 'certificate status')","question":"the caller's words, short","turn":<line number>,"how":"dodged|didn't know|vague|wrong"}]}]}
Calls with no gaps get "gaps": []. Ignore greetings and small talk.`

function textOf(t: unknown) {
  const list = Array.isArray(t) ? t : []
  const lines: string[] = []
  list.forEach((x, n) => {
    const r = asTurn(x)
    if (r.data) return
    let s = typeof r.content === 'string' ? r.content : ''
    if (s.startsWith('{')) { try { const o = JSON.parse(s) as { user_input?: string }; if (o.user_input) s = o.user_input } catch { /* plain */ } }
    if (s.trim()) lines.push(`${/assist|ai|agent|bot/i.test(String(r.role)) ? 'A' : 'C'}${n + 1}: ${clip(s.trim(), 180)}`)
  })
  return lines
}

/** The workflow's AI steps (ones with instructions). */
const aiSteps = (wf: Workflow) => Object.entries((wf.nodes ?? {}) as Record<string, EngineNode>).filter(([, n]) => typeof n.parameters?.system_prompt === 'string').map(([id]) => id)
const pickAi = (wf: Workflow, want: unknown) => {
  const ai = aiSteps(wf)
  const at = str(want) || (ai.length === 1 ? ai[0] : '')
  if (!at || !ai.includes(at)) throw new Error(ai.length ? `Say which AI step: ${ai.join(', ')}.` : 'This flow has no AI step with instructions.')
  return at
}

const FACTS_START = '--- Facts you can use (answer from these; if something is not here, say you will find out) ---'
const FACTS_END = '--- End of facts ---'

export const GAP_TOOLS: ToolDef[] = [
  {
    name: 'kb_gaps',
    description: 'What callers asked that the agent couldn\'t answer (dodged, didn\'t know, vague, wrong), grouped by topic with how many calls and quoted questions with call links. A reader model goes through a sample of real calls (default 40, max 80); cached for a day. Also says which knowledge bases the flow uses. Then offer: add_facts (a few facts into the instructions), draft_kb_doc (a document to fill in and upload) or attach_kb.',
    input: { type: 'object', required: ['flow'], properties: { flow: { type: 'string' }, sample: { type: 'number' } } },
    label: (i) => `Looked for unanswered questions in ${str(i.flow)}`,
    run: async (me: AuthUser, i) => {
      const f = await findFlow(me, i.flow)
      const sample = Math.min(80, Math.max(10, typeof i.sample === 'number' ? i.sample : 40))
      const rows = (await withDb(() => db.callSession.findMany({ where: { flowId: f.id }, orderBy: { startTime: 'desc' }, take: 2000, select: { sessionId: true, transcription: true, extra: true } })))
        .filter((r) => (r.extra as { test?: boolean } | null)?.test !== true)
        .map((r) => ({ id: r.sessionId, lines: textOf(r.transcription) }))
        .filter((r) => r.lines.filter((l) => l.startsWith('C')).length >= 2)
      const key = `${f.id}|${sample}|${rows.length}`
      const hit = CACHE.get(key)
      if (hit && Date.now() - hit.at < 864e5) return { ...(hit.value as object), cached: true }
      const step = Math.max(1, rows.length / sample)
      const picked = Array.from({ length: Math.min(sample, rows.length) }, (_, k) => rows[Math.floor(k * step)])
      const batches: number[][] = []
      picked.forEach((_, k) => { if (k % 6 === 0) batches.push([]); batches[batches.length - 1].push(k) })
      const m = modelById('or-gemini-lite')
      const found: Gap[] = []
      await Promise.all(batches.map(async (b) => {
        const body = b.map((k) => `### Call ${k}\n${picked[k].lines.slice(0, 40).join('\n')}${picked[k].lines.length > 40 ? `\n… ${picked[k].lines.length - 40} more lines` : ''}`).join('\n\n')
        try {
          const t = await complete(m, READER, [{ role: 'user', content: body }], [])
          const j = JSON.parse(t.text.slice(t.text.indexOf('{'), t.text.lastIndexOf('}') + 1)) as { calls?: { i: number; gaps?: Omit<Gap, 'call'>[] }[] }
          for (const c of j.calls ?? []) if (picked[c.i]) for (const g of c.gaps ?? []) if (str(g.topic)) found.push({ ...g, topic: str(g.topic).toLowerCase().trim(), call: `vx:session/${picked[c.i].id}` })
        } catch { /* a bad batch is skipped */ }
      }))
      const by = new Map<string, Gap[]>()
      for (const g of found) by.set(g.topic, [...(by.get(g.topic) ?? []), g])
      const flow = await withDb(() => db.flow.findUniqueOrThrow({ where: { id: f.id }, select: { kbs: true } }))
      const kbs = flow.kbs.length ? await withDb(() => db.knowledgeBase.findMany({ where: { id: { in: flow.kbs }, userId: me.id }, select: { id: true, name: true } })) : []
      const value = {
        calls_read: picked.length,
        calls_with_gaps: new Set(found.map((g) => g.call)).size,
        gaps: [...by].sort((a, b) => new Set(b[1].map((g) => g.call)).size - new Set(a[1].map((g) => g.call)).size).slice(0, 12).map(([topic, gs]) => ({
          topic, calls: new Set(gs.map((g) => g.call)).size,
          how: [...new Set(gs.map((g) => g.how))].join(', '),
          examples: gs.slice(0, 2).map((g) => ({ question: clip(str(g.question), 140), call: g.call, turn: g.turn })),
        })),
        knowledge_bases_on_flow: kbs.map((k) => k.name),
        note: 'Counts are over the calls read. Topics are the reader\'s grouping; similar topics may be split.',
      }
      CACHE.set(key, { at: Date.now(), value })
      return value
    },
  },
  {
    name: 'add_facts',
    description: 'Put facts the agent needs (fees, dates, addresses, rules) into its AI step\'s instructions, in one "Facts you can use" section. New facts are added to the ones already there; remove lists facts to take out (their exact text or a distinctive part); replace: true swaps the whole list. Best for up to ~20 short facts; for more, use a knowledge base. Facts must come from the user, never invented: ask them for the answers first.',
    input: {
      type: 'object', required: ['flow', 'facts'],
      properties: { flow: { type: 'string' }, step: { type: 'string' }, facts: { type: 'array', maxItems: 40, items: { type: 'string' } }, remove: { type: 'array', items: { type: 'string' } }, replace: { type: 'boolean' } },
    },
    label: (i) => `Proposed ${Array.isArray(i.facts) ? i.facts.length : ''} facts for the agent`,
    run: (me, i) => propose(me, i.flow, 'Facts for the agent', (doc) => {
      const wf = doc.workflow as Workflow
      const at = pickAi(wf, i.step)
      const facts = (Array.isArray(i.facts) ? i.facts : []).map((x) => str(x).trim().replace(/^[-•]\s*/, '')).filter(Boolean)
      const remove = (Array.isArray(i.remove) ? i.remove : []).map((x) => str(x).trim().toLowerCase()).filter(Boolean)
      if (!facts.length && !remove.length) throw new Error('No facts given.')
      const prompt = str(((wf.nodes as Record<string, EngineNode>)[at].parameters ?? {}).system_prompt)
      const s = prompt.indexOf(FACTS_START), e = prompt.indexOf(FACTS_END)
      const base = s >= 0 && e > s ? (prompt.slice(0, s) + prompt.slice(e + FACTS_END.length)).trim() : prompt.trim()
      // The facts already there, one per "- " line.
      const had = s >= 0 && e > s ? prompt.slice(s + FACTS_START.length, e).split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : []
      const gone = i.replace === true ? had : had.filter((x) => remove.some((rm) => x.toLowerCase().includes(rm)))
      if (remove.length && !gone.length && i.replace !== true) throw new Error(`No fact matches ${remove.map((x) => `“${x}”`).join(', ')}. Facts now: ${had.join(' | ') || 'none'}`)
      const kept = had.filter((x) => !gone.includes(x))
      const added = facts.filter((x) => !kept.some((k) => k.toLowerCase() === x.toLowerCase()))
      const all = [...kept, ...added]
      const next = all.length ? `${base}\n\n${FACTS_START}\n${all.map((x) => `- ${x}`).join('\n')}\n${FACTS_END}` : base
      const { wf: out } = editWorkflow(wf, [{ do: 'set', step: at, key: 'system_prompt', value: next }])
      const lines: ChangeLine[] = [...gone.map((x) => ({ what: 'Fact', from: clip(x, 140), to: 'removed' })), ...added.map((x) => ({ what: 'Fact', to: clip(x, 140) }))]
      if (!lines.length) throw new Error('These facts are already there.')
      return { patch: { workflow: out }, lines, where: ['Workflow'], page: 'workflow' }
    }),
  },
  {
    name: 'attach_kb',
    description: 'Connect one of the account\'s knowledge bases to a flow: adds a "Look up knowledge" step before the AI step (it searches with what the caller said and hands the passages to the AI) and tells the AI to answer from them. list_knowledge shows the knowledge bases and whether their documents are ready.',
    input: { type: 'object', required: ['flow', 'knowledge'], properties: { flow: { type: 'string' }, knowledge: { type: 'string', description: 'Knowledge base name or id' }, step: { type: 'string' } } },
    label: (i) => `Proposed connecting knowledge “${str(i.knowledge)}”`,
    run: async (me, i) => {
      const want = str(i.knowledge).trim()
      const all = await withDb(() => db.knowledgeBase.findMany({ where: { userId: me.id }, select: { id: true, name: true, documents: { select: { status: true } } } }))
      const kb = all.find((k) => k.id === want) ?? all.find((k) => k.name.toLowerCase() === want.toLowerCase()) ?? (all.filter((k) => k.name.toLowerCase().includes(want.toLowerCase())).length === 1 ? all.find((k) => k.name.toLowerCase().includes(want.toLowerCase())) : undefined)
      if (!kb) throw new Error(`No single knowledge base matches “${want}”. Knowledge bases: ${all.map((k) => k.name).join(', ') || 'none yet'}.`)
      const ready = kb.documents.filter((d) => d.status === 'ready').length
      return propose(me, i.flow, `Connect knowledge “${kb.name}”`, (doc) => {
        const wf = doc.workflow as Workflow
        const nodes = (wf.nodes ?? {}) as Record<string, EngineNode>
        if (Object.values(nodes).some((n) => n.type === 'rag' && n.parameters?.kb === kb.id)) throw new Error(`“${kb.name}” is already looked up in this flow.`)
        const at = pickAi(wf, i.step)
        const into = Object.entries(nodes).find(([, n]) => (Array.isArray(n.next) ? n.next : [n.next]).includes(at))?.[0]
        if (!into) throw new Error(`Nothing leads into “${at}”, so there's no place for the lookup.`)
        const id = nodes.lookup ? `lookup_${Object.keys(nodes).length}` : 'lookup'
        const ai = nodes[at].parameters ?? {}
        const reads = { ...((ai.input_variables ?? {}) as Record<string, unknown>), context: { type: 'str', description: 'Passages found in the knowledge base for what the caller said.' } }
        const prompt = str(ai.system_prompt)
        const { wf: out, lines } = editWorkflow(wf, [
          { do: 'add', id, type: 'rag', set: { kb: kb.id, input_variables: { user_input: 'str' }, output_variables: ['context'], top_k: 5, entities: ['text'] } },
          { do: 'place', step: id, after: into, before: at },
          { do: 'set', step: at, key: 'input_variables', value: reads },
          ...(/knowledge|context/i.test(prompt) ? [] : [{ do: 'set' as const, step: at, key: 'system_prompt', value: `${prompt.trim()}\n\nWhen "context" has passages from the knowledge base, answer from them. If the answer isn't there, say you'll find out; never make it up.` }]),
        ])
        out.variables = { ...((out.variables ?? {}) as Record<string, unknown>), context: { type: 'str', default: '' } } as Workflow['variables']
        const kbs = [...new Set([...(doc.kbs ?? []), kb.id])]
        const all: ChangeLine[] = [{ what: 'Knowledge', to: kb.name }, ...lines]
        if (!ready) all.push({ what: 'Note', to: 'This knowledge base has no ready documents yet; add one on the Knowledge page.' })
        return { patch: { workflow: out, kbs }, lines: all, where: ['Workflow'], page: 'workflow' }
      })
    },
  },
  {
    name: 'draft_kb_doc',
    description: 'Put a fill-in document in the chat: a title and the questions callers ask (e.g. from kb_gaps), each with a short hint of what to write. The user types the answers there, saves it as a PDF and uploads it to a knowledge base (the card links there). Never fill in answers yourself.',
    input: {
      type: 'object', required: ['title', 'questions'],
      properties: { title: { type: 'string' }, questions: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'object', required: ['question'], properties: { question: { type: 'string' }, hint: { type: 'string' } } } } },
    },
    label: (i) => `Drafted a document “${str(i.title)}”`,
    run: async (_me, i) => {
      const items = ((Array.isArray(i.questions) ? i.questions : []) as { question: string; hint?: string }[]).map((q) => ({ question: str(q.question).trim(), hint: str(q.hint).trim() })).filter((q) => q.question)
      if (!items.length) throw new Error('No questions given.')
      return { doc: { title: str(i.title).trim() || 'Answers for the agent', items } }
    },
  },
]

registerWriteTools(GAP_TOOLS.filter((t) => t.name === 'add_facts' || t.name === 'attach_kb'))
