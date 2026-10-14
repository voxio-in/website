// Builds the OSCE patient scenarios for SFBC.
//   node scripts/osce/build.mjs
// Writes:
//   scripts/osce/out/scenarios.json   one list: every scenario with its variations, voice and workflow
//   scripts/osce/out/<id>.json        one file per scenario; paste or upload it in the workflow Import dialog
// Each case in cases/ is written by hand; base.mjs only wires it into the Yamamoto workflow's nodes.

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { buildWorkflow } from './base.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
mkdirSync(out, { recursive: true })

const files = readdirSync(join(here, 'cases')).filter((f) => /^\d\d-.*\.mjs$/.test(f)).sort()
const cases = []
for (const f of files) cases.push((await import(pathToFileURL(join(here, 'cases', f)).href)).default)

const tts = (c) => ({ service: 'elevenlabs', model: 'eleven_v3', voice_id: c.voice.id, voice_name: c.voice.name, note: c.voice.why })

const scenarios = [
  {
    id: 'kansai-yamamoto-shoulder-angina',
    title: '模擬患者(日本語)山本健二・左肩の痛み(大阪弁) / Simulated Patient (Japanese) Kenji Yamamoto · Left Shoulder Pain (Osaka Dialect)',
    dialect: '関西(大阪弁)',
    persona: '我慢する働き盛り(男性・タクシー運転手)',
    variations: { gender: '男性', age: 52, ageBand: '中年', difficulty: '標準', companion: 'なし', attitude: 'ぶっきらぼう・我慢', hiddenRedFlag: '労作性狭心症', setting: 'リハビリ初回評価', region: '大阪市生野区' },
    frames: ['main', 'chest_pain', 'shoulder_pain'],
    tts: { service: 'elevenlabs', model: 'eleven_v3', voice_id: 'FpHz1VVyureGoaE1I4qt', voice_name: 'シン(関西・穏やかな声)', note: 'ライブラリで関西のアクセントとされている男性の声。既存のフローの声が別なら、そちらを優先。' },
    workflow: null,
    existing: true,
  },
]

for (const c of cases) {
  const workflow = buildWorkflow(c)
  const entry = {
    id: c.id, title: c.title, dialect: c.dialect, persona: c.persona, variations: c.variations,
    frames: c.frames.map((f) => f.id), tts: tts(c), workflow,
  }
  scenarios.push(entry)
  writeFileSync(join(out, `${c.id}.json`), JSON.stringify({ title: c.title, tts: entry.tts, frames: entry.frames, workflow }, null, 2))
}

writeFileSync(join(out, 'scenarios.json'), JSON.stringify(scenarios, null, 2))
console.log(`${scenarios.length} scenarios (${cases.length} built) → ${out}`)
for (const s of scenarios) console.log(`  ${s.existing ? '(existing) ' : ''}${s.title}  [${s.tts.voice_name}]`)
