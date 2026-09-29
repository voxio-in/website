// Round-trips every workflow JSON we have through the canvas converter and
// fails if anything the engine reads changes.
//   node --experimental-strip-types scripts/workflow-roundtrip.mjs [more.json ...]

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import { toGraph, toWorkflow, extractWorkflow } from '../src/lib/workflow/convert.ts'

const BACKEND = resolve(import.meta.dirname, '../../../vx-backend-monorepo')
const roots = [
  resolve(import.meta.dirname, '..'),
  join(BACKEND, 'database/scripts/flows'),
  BACKEND,
]

const files = process.argv.slice(2)
for (const dir of roots) {
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir)) if (f.endsWith('.json') && !f.startsWith('package')) files.push(join(dir, f))
}

// Workflows can sit anywhere in a customs payload; find every one.
function* findAll(doc, path = '$') {
  if (!doc || typeof doc !== 'object') return
  const wf = doc.nodes && typeof doc.nodes === 'object' && !Array.isArray(doc.nodes) ? doc : null
  if (wf) { yield [path, wf]; return }
  for (const [k, v] of Object.entries(doc)) yield* findAll(v, `${path}.${k}`)
}

let checked = 0
let failed = 0
for (const file of files) {
  let doc
  try { doc = JSON.parse(readFileSync(file, 'utf8')) } catch { continue }
  for (const [path, wf] of findAll(doc)) {
    const { ui, ...engine } = wf
    const back = toWorkflow(toGraph(wf), { withUi: false })
    const again = toWorkflow(toGraph(back), { withUi: false })
    checked++
    if (!isDeepStrictEqual(back, engine) || !isDeepStrictEqual(again, back)) {
      failed++
      console.log(`FAIL ${file} ${path}`)
      for (const name of new Set([...Object.keys(engine.nodes), ...Object.keys(back.nodes)])) {
        if (!isDeepStrictEqual(engine.nodes[name], back.nodes[name]))
          console.log(`  node ${name}\n    in : ${JSON.stringify(engine.nodes[name])?.slice(0, 300)}\n    out: ${JSON.stringify(back.nodes[name])?.slice(0, 300)}`)
      }
    } else {
      console.log(`ok   ${file} ${path} (${Object.keys(engine.nodes).length} nodes)`)
    }
  }
}

if (!extractWorkflow({ agent_id: { workflow: { nodes: {} } } })) { console.log('FAIL extractWorkflow'); failed++ }
console.log(`\n${checked} workflows, ${failed} failed`)
process.exit(failed || !checked ? 1 : 0)
