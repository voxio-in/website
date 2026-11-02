// Plays the scripted parent turns in scenarios.json against a workflow over the
// chat API and saves transcripts plus timings and token counts.
//
//   SUBODH_FLOW_KEY=vk_... node run.mjs --workflow ../subodh-public-school.json --out runs/base [scenario-id ...]
//
// The workflow is sent inline with each session, so variants run side by side
// without touching the live flow. Each turn records:
//   firstWord  ms until the first word of the main reply streams (what a caller waits for)
//   total      ms until the turn is done
//   tokens     prompt and completion tokens of each LLM call in the turn
import fs from 'node:fs'
import path from 'node:path'

const KEY = (process.env.SUBODH_FLOW_KEY ?? '').trim()
const HOST = 'https://gpu.agent.voxio.in'
const args = process.argv.slice(2)
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined }
const OUT = opt('--out') ?? 'runs/latest'
const WORKFLOW = opt('--workflow')
const CONCURRENCY = Number(opt('--concurrency') ?? 6)
const only = args
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))
const scenarios = JSON.parse(fs.readFileSync(path.join(here, 'scenarios.json'), 'utf8')).filter((s) => !only.length || only.includes(s.id))
const workflow = WORKFLOW ? JSON.parse(fs.readFileSync(WORKFLOW, 'utf8')) : undefined
if (!KEY) throw new Error('Set SUBODH_FLOW_KEY.')
fs.mkdirSync(OUT, { recursive: true })

/** The text after <|key|> in a streamed LLM output, up to the next <|…|> marker. */
const field = (s, key) => (s.match(new RegExp(`<\\|${key}\\|>([\\s\\S]*?)(?=<\\||$)`)) || [])[1]?.trim()

async function call(urlPath, body) {
  const t0 = Date.now()
  const res = await fetch(HOST + urlPath, { method: 'POST', headers: { 'Content-Type': 'application/json', flow_api_key: KEY }, body: JSON.stringify(body) })
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  const byNode = {}
  const outs = []
  const tokens = []
  let firstWord = null
  let hangup = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      let j; try { j = JSON.parse(line) } catch { continue }
      if (j.detail) throw new Error(typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail))
      if (j.streaming && j.chunk) {
        byNode[j.node] = (byNode[j.node] ?? '') + j.chunk
        // The caller hears the main reply once its speak field has text.
        if (firstWord === null && j.node !== 'prev_llm' && /<\|speak\|>\s*\S/.test(byNode[j.node])) firstWord = Date.now() - t0
      }
      if (j.prompt_tokens !== undefined) tokens.push({ prompt: j.prompt_tokens, completion: j.completion_tokens })
      if (j.out) { outs.push(j.out); if (j.out.hangup === true) hangup = true }
    }
  }
  const nodes = Object.keys(byNode)
  const main = nodes.filter((n) => n !== 'prev_llm').map((n) => byNode[n]).join('')
  const speak = field(main, 'speak') ?? outs.map((o) => o.speak).filter(Boolean).join(' ')
  if (/<\|hangup\|>\s*true/.test(main)) hangup = true
  return { ack: field(byNode.prev_llm ?? '', 'speak') ?? '', reply: (speak ?? '').trim(), raw: main, hangup, firstWord, total: Date.now() - t0, tokens }
}

async function run(s) {
  const sid = `t-${s.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const first = await call('/agents/start_session', { session_id: sid, ...(workflow ? { workflow } : {}) })
  const turns = []
  for (const said of s.turns) {
    let r
    try { r = await call('/agents/process_input', { session_id: sid, user_input: { user_input: said } }) }
    catch (e) { r = { error: String(e.message ?? e) } }
    turns.push({ parent: said, ...r })
    if (r.hangup || r.error) break
  }
  const result = { id: s.id, title: s.title, greeting: first.reply, turns }
  const md = [`# ${s.id}: ${s.title}`, '', `PRIYA: ${first.reply}`]
  for (const t of turns) md.push('', `PARENT: ${t.parent}`, t.error ? `ERROR: ${t.error}` : `PRIYA: [${t.ack}] ${t.reply}${t.hangup ? '   <<HANGUP>>' : ''}   (first word ${t.firstWord ?? '-'}ms, total ${t.total}ms)`)
  fs.writeFileSync(path.join(OUT, `${s.id}.md`), md.join('\n') + '\n')
  return result
}

// A small pool, so a run doesn't open dozens of sessions at once.
const results = []
let next = 0
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, scenarios.length) }, async () => {
  while (next < scenarios.length) {
    const s = scenarios[next++]
    // A turn the server drops ("could not answer") is load, not the model: replay the scenario, up to twice.
    let r
    for (let attempt = 0; attempt < 3; attempt++) {
      try { r = await run(s) } catch (e) { r = { id: s.id, title: s.title, error: String(e.message ?? e), turns: [] } }
      if (!r.error && !r.turns.some((t) => t.error)) break
      await new Promise((ok) => setTimeout(ok, attempt === 0 ? 5_000 : 20_000))
    }
    results.push(r)
  }
}))
results.sort((a, b) => a.id.localeCompare(b.id))
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
console.log(`${results.length} scenarios → ${OUT}/results.json`)
