// Hold real conversations with the /webnav agents and grade every turn.
//
// The agent side is the real thing: each site's workflow, built by the site's
// own builder, posted to the agent server's start_session as a raw workflow
// (no flow api key), then driven through /process_input.
//
// The caller side is another model playing a person with a goal and some
// habits — mishearing, changing their mind, asking a question halfway — so the
// agent is tested on conversations its prompt examples did not script.
//
// Every turn is graded on what the runtime and the page need: one marker per
// action, a target on every action, nothing spoken in digits. The actions are
// also written out so scripts/webnav-replay can run them against the real page.
//
//   node --env-file=.env scripts/webnav-eval.mjs                       everything
//   node --env-file=.env scripts/webnav-eval.mjs rail                  one site
//   node --env-file=.env scripts/webnav-eval.mjs rail gemini           one site, one model
//
// AGENT_URL overrides the agent server (default https://chat.voxio.in/agents).
// The caller model runs on OpenRouter, with the key read from the backend's
// .env (VX_BACKEND_ENV overrides where that is).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createServer } from 'vite'

const AGENT_URL = process.env.AGENT_URL || 'https://chat.voxio.in/agents'
const MARKER = '<|web_action|>'
const MAX_TURNS = 7

const MODELS = {
  gemini: { service: 'openrouter', model: 'google/gemini-3.1-flash-lite-preview' },
  gptoss: { service: 'groq', model: 'openai/gpt-oss-120b' },
}

const CALLER_MODEL = 'google/gemini-2.5-flash'

function openrouterKey() {
  const path = process.env.VX_BACKEND_ENV || '../../vx-backend-monorepo/.env'
  const line = readFileSync(path, 'utf8').split(/\r?\n/).find((l) => /^\s*OPENROUTER_API_KEY\s*=/.test(l))
  const key = line?.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
  if (!key) throw new Error(`OPENROUTER_API_KEY not found in ${path}`)
  return key
}

/* Who rings. Each is a goal and a way of talking, not a script. */
const PERSONAS = {
  rail: [
    'You are Priya, 34, booking for yourself and your mother (61). You want Jaipur to New Delhi next Friday, you say "Delhi" not "New Delhi". You care about comfort, not price. Ask once what RAC means if it comes up. Give details only when asked.',
    'You are Rohit, a student. You want the cheapest possible ticket Jaipur to Delhi on the 28th. You say "Jaipur" so it sounds like "Jai poor". Halfway through you change your mind and ask for something faster. You are 22, male.',
    'You are Mr Sharma, 67, not comfortable with websites. You want to go from Jaipur to Delhi tomorrow morning, early. You ramble a little and ask "is it confirmed?" at some point.',
  ],
  shop: [
    'You are Anita, buying running shoes for your husband, size 9, budget about four thousand. He runs on roads in the park. You ask whether the first result is any good.',
    'You are Karan. You want a gift for your two-year-old nephew, nothing plastic, under a thousand. You are in a hurry.',
    'You are Meera. You want noise cancelling headphones "under five", then decide you will spend more if they are really good.',
  ],
  clinic: [
    'You are Vikram, calling for your father Ramesh Kumar, 62, who has had chest pain on and off for a week. You want the earliest appointment. His mobile is 9811223445. When a code is mentioned, the code is 482913. He lives in West Delhi.',
    'You are Sunita. Your mother, 70, has knee pain and trouble walking. You want an appointment this week, mornings only. Your number is 9876501234; the code is 551902 when asked.',
    'You are Arjun, 30. You are having crushing chest pain right now and are panicking a bit.',
  ],
  university: [
    'You are Mr Iyer, a parent. Your son is in B.Tech Computer Science, sixth semester. You want to know the fees and the last date. You ask if the hostel is included.',
    'You are Neha, a B.Tech student. Your semester five marks look wrong and you are worried. You do not know what the process is called.',
    'You are Farhan, a student. You need a bonafide certificate for a bank loan. Your enrollment number is MIT21CS045.',
  ],
}

const ACTIONS = new Set(['click', 'fill_field', 'focus', 'scroll_to'])
const BANNED = [/\bselector\b/i, /\bdropdown\b/i, /\bbutton\b/i, /\bI am filling\b/i, /\bI will click\b/i, /\bclicking\b/i, /\bdemo\b/i]

function grade(out) {
  const speak = typeof out?.speak === 'string' ? out.speak : ''
  const actions = Array.isArray(out?.actions) ? out.actions : []
  const markers = speak.split(MARKER).length - 1
  const issues = []

  if (!speak) issues.push('no speak')
  if (markers !== actions.length) issues.push(`markers ${markers} ≠ actions ${actions.length}`)
  if (speak.trimStart().startsWith(MARKER)) issues.push('opens on a marker')
  if (/<\|web_action\|>[\s,.—-]*<\|web_action\|>/.test(speak)) issues.push('two markers together')
  for (const a of actions) {
    if (!a || typeof a !== 'object') { issues.push('action not an object'); continue }
    if (!ACTIONS.has(a.action)) issues.push(`bad action "${a.action}"`)
    if (!a.target && !a.selector) issues.push(`no target: ${JSON.stringify(a)}`)
    if (a.selector && !a.target) issues.push(`used selector ${a.selector}`)
    if (a.action === 'fill_field' && (a.value === undefined || a.value === '')) issues.push(`fill without value: ${a.target}`)
  }
  const spoken = speak.split(MARKER).join(' ')
  if (/\d/.test(spoken)) issues.push(`digits spoken: "${(spoken.match(/[^.]*\d[^.]*/) || [''])[0].trim().slice(0, 70)}"`)
  for (const b of BANNED) if (b.test(spoken)) issues.push(`says "${spoken.match(b)[0]}"`)
  return { speak, actions, issues, words: spoken.split(/\s+/).filter(Boolean).length }
}

async function stream(path, body) {
  const t = performance.now()
  const res = await fetch(`${AGENT_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const lines = text.split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l) } catch { return { raw: l } }
  })
  return { status: res.status, lines, ms: Math.round(performance.now() - t) }
}

function replyOf(lines) {
  let reply = null
  for (const l of lines) {
    if (l?.streaming) continue
    const o = l?.out?.out_dict ?? l?.out
    if (o && typeof o === 'object' && ('speak' in o || 'actions' in o)) reply = o
  }
  return reply
}

/** The caller's next line, or null when they are done. */
async function callerSays(key, persona, history) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CALLER_MODEL,
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: `${persona}

You are on a phone call with a helpdesk agent who is operating a website on your screen for you. Reply with ONLY what you say next, as speech — one or two short sentences, the way people actually talk on the phone. No stage directions. Do not volunteer everything at once; answer what you are asked, and bring up your own concerns naturally. When your goal is done, or the agent has handed you something only you can do (a password, a captcha, payment), or the call has clearly ended, reply with exactly: [END]`,
        },
        ...history,
      ],
    }),
  })
  const j = await res.json()
  const text = j?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error(`caller model: ${JSON.stringify(j).slice(0, 200)}`)
  return text.includes('[END]') ? null : text
}

async function converse(key, site, persona, workflow, modelKey) {
  const session_id = `wn-eval-${site}-${modelKey}-${randomUUID().slice(0, 8)}`
  const log = { site, model: modelKey, persona, turns: [], errors: [] }

  const start = await stream('/start_session', { session_id, workflow })
  const err = start.lines.find((l) => l.error || l.detail)
  if (start.status !== 200 || err) {
    log.errors.push(`start ${start.status}: ${JSON.stringify(err ?? start.lines).slice(0, 300)}`)
    return log
  }
  log.greeting = replyOf(start.lines)?.speak ?? ''

  // History from the caller's side: the agent is "user", the caller "assistant".
  const history = [{ role: 'user', content: log.greeting }]
  for (let n = 0; n < MAX_TURNS; n++) {
    const said = await callerSays(key, persona, history)
    if (!said) break
    history.push({ role: 'assistant', content: said })

    const r = await stream('/process_input', { session_id, user_input: { user_input: said } })
    const e = r.lines.find((l) => l.error || l.detail)
    if (r.status !== 200 || e) {
      log.errors.push(`turn "${said}" ${r.status}: ${JSON.stringify(e ?? r.lines).slice(0, 300)}`)
      break
    }
    const g = grade(replyOf(r.lines))
    // The backend keeps the last turn's speak and actions when a reply fails
    // to parse, and the response node sends them again — actions included.
    const prev = log.turns[log.turns.length - 1]
    if (prev && g.speak && g.speak === prev.speak) g.issues.push('REPEATED the previous reply — stale state, the page would redo its actions')
    log.turns.push({ caller: said, ms: r.ms, ...g })
    history.push({ role: 'user', content: g.speak.split(MARKER).join(' ') || '(silence)' })
  }
  return log
}

const [onlySite, onlyModel] = process.argv.slice(2)
const key = openrouterKey()

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { buildWebActionCustoms } = await vite.ssrLoadModule('/src/server/voice/webActionCustoms.ts')

const jobs = []
for (const site of Object.keys(PERSONAS)) {
  if (onlySite && site !== onlySite) continue
  for (const [modelKey, m] of Object.entries(MODELS)) {
    if (onlyModel && modelKey !== onlyModel) continue
    for (const persona of PERSONAS[site]) {
      const workflow = structuredClone(buildWebActionCustoms(site, 'indian').agent_id.workflow)
      Object.assign(workflow.nodes.llm.parameters, m)
      jobs.push(() => {
        process.stderr.write(`→ ${site} · ${modelKey} · ${persona.slice(0, 40)}…\n`)
        return converse(key, site, persona, workflow, modelKey)
      })
    }
  }
}
await vite.close()

// A few at a time — the agent server is shared.
const results = []
for (let i = 0; i < jobs.length; i += 3) {
  results.push(...(await Promise.all(jobs.slice(i, i + 3).map((j) => j().catch((e) => ({ errors: [String(e)], turns: [] }))))))
}

/* ---------- report ---------- */

mkdirSync('eval', { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
writeFileSync(`eval/webnav-${stamp}.json`, JSON.stringify(results, null, 2))

const rows = []
let md = ''
for (const r of results) {
  const clean = r.turns.filter((t) => !t.issues.length).length
  const avg = r.turns.length ? Math.round(r.turns.reduce((n, t) => n + t.ms, 0) / r.turns.length) : 0
  rows.push(`| ${r.site} | ${r.model} | ${(r.persona || '').slice(0, 28)}… | ${clean}/${r.turns.length} | ${r.errors.length ? 'ERROR' : ''} | ${avg} ms |`)
  md += `## ${r.site} · ${r.model}\n\n> ${r.persona}\n\n`
  if (r.errors.length) md += r.errors.map((e) => `**ERROR** ${e}`).join('\n\n') + '\n\n'
  if (r.greeting) md += `_greeting:_ ${r.greeting}\n\n`
  for (const t of r.turns) {
    md += `**Caller:** ${t.caller}\n\n**Agent** (${t.ms} ms, ${t.words} words): ${t.speak.split(MARKER).join(' ⟨●⟩ ')}\n\n`
    md += '```\n' + (t.actions.map((a) => JSON.stringify(a)).join('\n') || '(no actions)') + '\n```\n'
    md += t.issues.length ? t.issues.map((i) => `- ❌ ${i}`).join('\n') + '\n\n' : '- ✅ mechanically clean\n\n'
  }
}
const table = `| site | model | caller | clean turns | error | avg latency |\n|---|---|---|---|---|---|\n${rows.join('\n')}`
writeFileSync(`eval/webnav-${stamp}.md`, `# webnav eval ${stamp}\n\nAgent server: ${AGENT_URL} · caller: ${CALLER_MODEL}\n\n${table}\n\n${md}`)
console.log(table)
console.log(`\neval/webnav-${stamp}.md`)
