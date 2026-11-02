// simulate: scripted callers talk to a flow's own instructions and greeting, and a judge
// checks each conversation against what the persona wanted. A quick rehearsal before
// a real test: it uses the Assistant's cheap model as the agent, not the flow's own
// engine, model and voice, so it checks the instructions, not timing or speech.

import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'
import { startNodeOf, type EngineNode, type Workflow } from '#/lib/workflow/convert'
import { complete, modelById, type Msg } from './models.server'
import { findFlow, type ToolDef } from './tools.server'

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const MAX_TURNS = 6

type Persona = { who: string; wants: string; language?: string }

async function say(system: string, msgs: Msg[]) {
  const t = await complete(modelById('or-gemini-lite'), system, msgs, [])
  return t.text.trim()
}

function partsOf(wf: Workflow) {
  const nodes = (wf.nodes ?? {}) as Record<string, EngineNode>
  const first = nodes[startNodeOf(wf) ?? '']
  const greeting = first?.type === 'out' ? str((first.parameters?.out_dict as { speak?: unknown } | undefined)?.speak) : ''
  const ai = Object.values(nodes).find((n) => str(n.parameters?.system_prompt))
  return { greeting, prompt: str(ai?.parameters?.system_prompt) }
}

async function rehearse(p: Persona, greeting: string, prompt: string) {
  const lines: { who: 'agent' | 'caller'; text: string }[] = []
  if (greeting) lines.push({ who: 'agent', text: greeting })
  const callerSys = `You are role-playing a phone caller. Who you are: ${p.who}. What you want: ${p.wants}. ${p.language ? `Speak ${p.language}.` : ''} Reply with ONLY your next spoken line, short and natural, like a real caller (sometimes unclear). When you have what you wanted or want to leave, end with [bye].`
  const agentSys = `${prompt}\n\nThis is a voice call. Reply with ONLY what you say next. If the conversation is over, end with [hangup].`
  for (let t = 0; t < MAX_TURNS; t++) {
    const asCaller: Msg[] = lines.length ? lines.map((l) => (l.who === 'agent' ? { role: 'user' as const, content: l.text } : { role: 'assistant' as const, text: l.text, calls: [] })) : [{ role: 'user', content: '(the call connects; speak first)' }]
    const c = await say(callerSys, asCaller)
    lines.push({ who: 'caller', text: c.replace('[bye]', '').trim() })
    if (c.includes('[bye]')) break
    const a = await say(agentSys, lines.map((l) => (l.who === 'caller' ? { role: 'user' as const, content: l.text } : { role: 'assistant' as const, text: l.text, calls: [] })))
    lines.push({ who: 'agent', text: a.replace('[hangup]', '').trim() })
    if (a.includes('[hangup]')) break
  }
  const transcript = lines.map((l, n) => `${n + 1}. ${l.who}: ${l.text}`).join('\n')
  const judged = await say(
    'You review a voice agent\'s call. Return JSON only: {"got_what_they_wanted": true|false, "problems": ["short, specific, with the line number"], "best_fix": "one sentence for the agent\'s instructions, or none"}',
    [{ role: 'user', content: `Caller: ${p.who}; wanted: ${p.wants}.\n\n${transcript}` }],
  )
  let verdict: unknown = judged
  try { verdict = JSON.parse(judged.slice(judged.indexOf('{'), judged.lastIndexOf('}') + 1)) } catch { /* keep the text */ }
  return { caller: p.who, wanted: p.wants, turns: lines.length, transcript: lines.map((l, n) => `${n + 1}. ${l.who}: ${l.text.slice(0, 200)}`), verdict }
}

export const SIMULATE_TOOLS: ToolDef[] = [
  {
    name: 'simulate',
    description: 'Rehearse a flow with up to 3 pretend callers (each: who, wants, language) and get, per caller, the conversation and a verdict: did they get what they wanted, the problems (with line numbers), the best fix to the instructions. Uses the flow\'s greeting and AI instructions with a stand-in model (not its real engine or voice), so it checks what the agent says, not timing. Use it before and after changing instructions; for a real run, test_flow.',
    input: {
      type: 'object', required: ['flow', 'callers'],
      properties: {
        flow: { type: 'string' },
        callers: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'object', required: ['who', 'wants'], properties: { who: { type: 'string' }, wants: { type: 'string' }, language: { type: 'string' } } } },
      },
    },
    label: (i) => `Rehearsed ${str(i.flow)} with ${Array.isArray(i.callers) ? i.callers.length : 0} pretend caller(s)`,
    run: async (me: AuthUser, i) => {
      const f = await findFlow(me, i.flow)
      const row = await withDb(() => db.flow.findUniqueOrThrow({ where: { id: f.id }, select: { agent: { select: { workflow: true } } } }))
      const { greeting, prompt } = partsOf(row.agent.workflow as unknown as Workflow)
      if (!prompt) throw new Error(`“${f.flowName}” has no AI step with instructions to rehearse.`)
      const callers = ((Array.isArray(i.callers) ? i.callers : []) as Persona[]).slice(0, 3)
      const runs = await Promise.all(callers.map((p) => rehearse(p, greeting, prompt).catch((e) => ({ caller: p.who, error: (e as Error).message }))))
      return { flow: f.flowName, runs, note: 'Stand-in model, not the flow\'s engine: it checks the instructions only.' }
    },
  },
]
