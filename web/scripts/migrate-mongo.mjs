// Copies the backend's MongoDB (voxioagents_db) into Neon, into the tables in
// prisma/schema.prisma that mirror it.
//
//   node --env-file=.env scripts/migrate-mongo.mjs            dry run: prints the plan, writes nothing
//   node --env-file=.env scripts/migrate-mongo.mjs --apply    writes to Neon
//
// Mongo is only ever read. Every Neon row takes its Mongo _id (24 hex) as its
// id, and rows are inserted with skipDuplicates, so a re-run adds what is new
// and never overwrites what is already there.
//
// MONGO_URL comes from the environment, else from the backend's
// database/.env next to this repo.
//
// Decisions (2026-09-27, with the owner):
//   · A Mongo user whose email already has a Neon account is merged into it:
//     the Neon login, password and API key stay; the Mongo data joins it.
//   · Users sharing one API key: the one with the most flows keeps it, the
//     others get new keys (in Neon only — Mongo still has the old one).
//   · Users with no email, or an email another user has: <username>@import.voxio.local.
//   · Flows, agents, voice configs and faces with no owner go to the Mongo
//     admin with the most flows. A session belonging to no flow is skipped.
//   · Plain-text passwords are scrypt-hashed. bcrypt hashes are kept as they
//     are; login checks them and upgrades them to scrypt (session.server.ts).

import { randomBytes, scrypt as scryptCb } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'

import { PrismaClient } from '@prisma/client'
import { MongoClient } from 'mongodb'

const APPLY = process.argv.includes('--apply')
const DB_NAME = 'voxioagents_db'
const PLACEHOLDER_DOMAIN = 'import.voxio.local'

// ------------------------------------------------------------------ helpers

function mongoUrl() {
  if (process.env.MONGO_URL) return process.env.MONGO_URL
  const file = new URL('../../../vx-backend-monorepo/database/.env', import.meta.url)
  if (!existsSync(file)) throw new Error('Set MONGO_URL, or keep vx-backend-monorepo next to website/')
  const line = readFileSync(file, 'utf8').match(/^MONGO_URL=(.*)$/m)
  if (!line) throw new Error('MONGO_URL not found in the backend .env')
  return line[1].trim().replace(/^["']|["']$/g, '')
}

// Same format as src/server/session.server.ts hashPassword.
const scrypt = promisify(scryptCb)
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
async function hashPassword(pw) {
  const salt = randomBytes(16)
  const hash = await scrypt(pw, salt, 64, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`
}
const isBcrypt = (p) => /^\$2[aby]\$\d\d\$/.test(p ?? '')

// Same shape as store.server.ts newKey.
const newKey = (prefix) => `${prefix}_${randomBytes(18).toString('base64url')}`

const hex = (v) => (v == null ? null : String(v))
const date = (v, fallback = new Date()) => {
  if (v instanceof Date) return v
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d : fallback
}
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const int = (v) => Math.round(num(v))
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
/** Drop Mongo bookkeeping and turn ObjectIds/Dates into JSON-safe values. */
const clean = (v) => JSON.parse(JSON.stringify(v ?? null))
const omit = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)))
const chunks = (list, n = 200) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))

// ------------------------------------------------------------------ read

const mongo = new MongoClient(mongoUrl(), { readPreference: 'secondaryPreferred' })
const db = new PrismaClient()

await mongo.connect()
const m = mongo.db(DB_NAME)
const read = (name) => m.collection(name).find({}).toArray()
const [users, flows, agents, stts, ttss, sessions, faces, numbers] = await Promise.all(
  ['users', 'flows', 'agents', 'stt', 'tts', 'sessions', 'faces', 'numbers'].map(read),
)
console.log(`Mongo ${DB_NAME}: ${users.length} users, ${flows.length} flows, ${agents.length} agents, ${stts.length} stt, ${ttss.length} tts, ${sessions.length} sessions, ${faces.length} faces, ${numbers.length} numbers`)

const neonUsers = await db.user.findMany({ select: { id: true, email: true, apiKey: true } })
const neonByEmail = new Map(neonUsers.map((u) => [u.email.toLowerCase(), u]))
const takenKeys = new Set(neonUsers.map((u) => u.apiKey))

// ------------------------------------------------------------------ users

const flowCount = (u) => (u.flows ?? []).length
// Biggest first, so on any clash the user with the most flows keeps the email or key.
const ordered = [...users].sort((a, b) => flowCount(b) - flowCount(a))

const takenEmails = new Set(neonUsers.map((u) => u.email.toLowerCase()))
const takenUsernames = new Set((await db.user.findMany({ select: { username: true } })).map((u) => u.username).filter(Boolean))
const keyOwner = new Map() // mongo api_key → neon user id that keeps it

const plan = { users: [], merged: [], placeholder: 0, rekeyed: 0 }
const userId = new Map() // mongo user _id → neon user id

for (const u of ordered) {
  const id = hex(u._id)
  const email = (u.email ?? '').trim().toLowerCase()
  const existing = email && neonByEmail.get(email)
  if (existing) {
    // Merge into the Neon account; it keeps its own login and key.
    userId.set(id, existing.id)
    if (u.api_key && !keyOwner.has(u.api_key)) keyOwner.set(u.api_key, existing.id)
    plan.merged.push(email)
    continue
  }

  let finalEmail = email
  if (!email || takenEmails.has(email)) {
    const base = String(u.username || id).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || id
    finalEmail = `${base}@${PLACEHOLDER_DOMAIN}`
    for (let i = 2; takenEmails.has(finalEmail); i++) finalEmail = `${base}-${i}@${PLACEHOLDER_DOMAIN}`
    plan.placeholder++
  }
  takenEmails.add(finalEmail)

  let apiKey = u.api_key
  if (!apiKey || takenKeys.has(apiKey)) {
    apiKey = newKey('user')
    plan.rekeyed++
  } else keyOwner.set(apiKey, id)
  takenKeys.add(apiKey)

  let username = u.username ? String(u.username) : null
  if (username && takenUsernames.has(username)) username = null
  if (username) takenUsernames.add(username)

  const pw = String(u.password ?? '')
  plan.users.push({
    id,
    username,
    password: isBcrypt(pw) ? pw : await hashPassword(pw || randomBytes(24).toString('hex')),
    role: ['admin', 'reseller', 'user'].includes(u.role) ? u.role : 'user',
    email: finalEmail,
    name: String(u.name || u.username || finalEmail.split('@')[0]).slice(0, 80),
    apiKey,
    createdAt: date(u.createdAt),
  })
  userId.set(id, id)
}

// The account that gets everything nobody owns: the admin with the most flows.
const admin = ordered.find((u) => u.role === 'admin') ?? ordered[0]
const fallbackOwner = userId.get(hex(admin._id))

// ------------------------------------------------------------------ ownership

const flowOwner = new Map() // mongo flow id → neon user id
for (const u of users) for (const f of u.flows ?? []) flowOwner.set(hex(f), userId.get(hex(u._id)))
const ownerOfFlow = (f) => flowOwner.get(hex(f._id)) ?? fallbackOwner

const agentOwner = new Map()
const sttOwner = new Map()
const ttsOwner = new Map()
for (const f of flows) {
  const o = ownerOfFlow(f)
  if (f.agent_id && !agentOwner.has(hex(f.agent_id))) agentOwner.set(hex(f.agent_id), o)
  if (f.stt_id && !sttOwner.has(hex(f.stt_id))) sttOwner.set(hex(f.stt_id), o)
  if (f.tts_id && !ttsOwner.has(hex(f.tts_id))) ttsOwner.set(hex(f.tts_id), o)
}

// ------------------------------------------------------------------ rows

const agentIds = new Set(agents.map((a) => hex(a._id)))
const agentRows = agents.map((a) => ({
  id: hex(a._id),
  userId: agentOwner.get(hex(a._id)) ?? fallbackOwner,
  workflow: clean(a.workflow ?? { nodes: {} }),
  webhookUrl: String(a['webhook-url'] ?? ''),
}))

const provider = (doc, owner) => {
  const config = clean(omit(doc, ['_id', 'service', 'createdAt', 'updatedAt', '__v']))
  return { id: hex(doc._id), userId: owner ?? fallbackOwner, service: String(doc.service ?? 'unknown'), config, createdAt: date(doc.createdAt) }
}
const sttIds = new Set(stts.map((s) => hex(s._id)))
const ttsIds = new Set(ttss.map((s) => hex(s._id)))
const sttRows = stts.map((s) => provider(s, sttOwner.get(hex(s._id))))
const ttsRows = ttss.map((s) => provider(s, ttsOwner.get(hex(s._id))))

// Keys the Flow table has columns for; everything else is a runtime knob.
const FLOW_FIELDS = ['_id', '__v', 'name', 'api_key', 'stt_id', 'tts_id', 'agent_id', 'createdAt', 'updatedAt', 'sessions', 'numbers',
  'flow_name', 'faces', 'transitions', 'kbs', 'process_type', 'process-type', 'xml', 'vision_id', 'running_vision_id']

const faceOwner = new Map()
const missingAgents = []
const flowRows = flows.map((f) => {
  const id = hex(f._id)
  const owner = ownerOfFlow(f)
  let agentId = hex(f.agent_id)
  if (!agentId || !agentIds.has(agentId)) {
    // Neon needs an agent per flow: give it an empty workflow.
    agentId = `${id}_agent`
    missingAgents.push({ id: agentId, userId: owner, workflow: { nodes: {} }, webhookUrl: '' })
  }
  const faces = Array.isArray(f.faces)
    ? { version: null, expressions: f.faces, transitions: f.transitions ?? [] }
    : { version: null, expressions: [], transitions: [], ...obj(f.faces) }
  for (const e of [...(faces.expressions ?? []), ...(faces.transitions ?? [])]) if (e?.uuid && !faceOwner.has(e.uuid)) faceOwner.set(e.uuid, { owner, label: e.label ?? '' })
  return {
    id,
    userId: owner,
    agentId,
    flowName: String(f.flow_name ?? f.name ?? 'Untitled flow'),
    apiKey: String(f.api_key),
    processType: String(f['process-type'] ?? f.process_type ?? 'speech-native'),
    xml: String(f.xml ?? ''),
    kbs: (f.kbs ?? []).map(String),
    faces: clean(faces),
    sttId: f.stt_id && sttIds.has(hex(f.stt_id)) ? hex(f.stt_id) : null,
    ttsId: f.tts_id && ttsIds.has(hex(f.tts_id)) ? hex(f.tts_id) : null,
    visionId: f.vision_id ? clean(f.vision_id) : undefined,
    runningVisionId: f.running_vision_id ? clean(f.running_vision_id) : undefined,
    runtime: clean(omit(f, FLOW_FIELDS)),
    webhookEvents: [],
    createdAt: date(f.createdAt),
  }
})

const sessionFlow = new Map() // mongo session _id or sessionId → neon flow id
for (const f of flows) for (const s of f.sessions ?? []) sessionFlow.set(hex(s), hex(f._id))
const SESSION_FIELDS = ['_id', 'sessionId', 'recordingUrl', 'startTime', 'endTime', 'type', 'totalConnectedTime', 'totalAiTime', 'totalHumanTime',
  'timeRatio', 'transcription', 'humanTokens', 'aiTokens', 'tokenRatio', 'totkenRatio', 'createdAt', 'updatedAt']
const orphanSessions = []
const sessionRows = []
for (const s of sessions) {
  const flowId = sessionFlow.get(hex(s._id)) ?? sessionFlow.get(s.sessionId)
  if (!flowId) { orphanSessions.push(s.sessionId); continue }
  const start = date(s.startTime, date(s.createdAt))
  sessionRows.push({
    id: hex(s._id),
    sessionId: String(s.sessionId),
    flowId,
    recordingUrl: s.recordingUrl ?? null,
    startTime: start,
    endTime: date(s.endTime, start),
    type: String(s.type ?? 'phone'),
    totalConnectedTime: num(s.totalConnectedTime),
    totalAiTime: num(s.totalAiTime),
    totalHumanTime: num(s.totalHumanTime),
    timeRatio: num(s.timeRatio),
    transcription: clean(s.transcription ?? []),
    humanTokens: int(s.humanTokens),
    aiTokens: int(s.aiTokens),
    tokenRatio: num(s.tokenRatio ?? s.totkenRatio),
    extra: clean(omit(s, SESSION_FIELDS)),
    createdAt: date(s.createdAt, start),
  })
}

const faceRows = faces.map((x) => {
  const ref = faceOwner.get(x.uuid)
  return {
    uuid: String(x.uuid),
    userId: ref?.owner ?? fallbackOwner,
    kind: String(x.kind ?? 'expression'),
    detector: String(x.detector ?? 's3fd'),
    clip: clean(x.clip ?? {}),
    media: clean(x.media ?? {}),
    coords: clean(x.coords ?? []),
    version: String(x.version ?? ''),
    label: String(ref?.label ?? ''),
    createdAt: date(x.created_at),
  }
})

// A number belongs to the Neon user who now holds its user key.
const flowKeys = new Set(flowRows.map((f) => f.apiKey))
const neonKeyOf = new Map([...plan.users.map((u) => [u.id, u.apiKey]), ...neonUsers.map((u) => [u.id, u.apiKey])])
const numberRows = numbers.flatMap((n) => {
  const owner = keyOwner.get(n.user_api_key) ?? flowRows.find((f) => f.apiKey === n.flow_api_key)?.userId
  if (!owner) return []
  return [{
    id: hex(n._id),
    phoneNumber: String(n.phone_number),
    userApiKey: neonKeyOf.get(owner),
    flowApiKey: flowKeys.has(n.flow_api_key) ? n.flow_api_key : null,
    provider: 'plivo',
    createdAt: date(n.createdAt),
  }]
})

// ------------------------------------------------------------------ report

console.log(`
Plan
  users      ${plan.users.length} new, ${plan.merged.length} merged into existing Neon accounts (${plan.merged.map((e) => e.replace(/^(.).*(@.*)$/, '$1***$2')).join(', ') || 'none'})
             ${plan.placeholder} with placeholder emails (@${PLACEHOLDER_DOMAIN}), ${plan.rekeyed} given a new API key
  agents     ${agentRows.length} (+${missingAgents.length} empty ones for flows whose agent is missing)
  stt / tts  ${sttRows.length} / ${ttsRows.length}
  flows      ${flowRows.length} (${flows.filter((f) => !flowOwner.has(hex(f._id))).length} unowned → admin)
  sessions   ${sessionRows.length} (${orphanSessions.length} skipped: no flow)
  faces      ${faceRows.length} (${faces.filter((x) => !faceOwner.has(x.uuid)).length} unowned → admin)
  numbers    ${numberRows.length}
  session types: ${[...new Set(sessionRows.map((s) => s.type))].join(', ')}
`)

if (!APPLY) {
  console.log('Dry run: nothing written. Re-run with --apply to write to Neon.')
  await Promise.all([mongo.close(), db.$disconnect()])
  process.exit(0)
}

// ------------------------------------------------------------------ write

async function insert(label, model, rows) {
  let added = 0
  for (const part of chunks(rows)) added += (await model.createMany({ data: part, skipDuplicates: true })).count
  console.log(`  ${label.padEnd(9)} ${added} added, ${rows.length - added} already there`)
}

console.log('Writing to Neon…')
// Parents before children, so every foreign key has its row.
await insert('users', db.user, plan.users)
await insert('agents', db.agent, [...agentRows, ...missingAgents])
await insert('stt', db.stt, sttRows)
await insert('tts', db.tts, ttsRows)
await insert('flows', db.flow, flowRows)
await insert('sessions', db.callSession, sessionRows)
await insert('faces', db.face, faceRows)
await insert('numbers', db.phoneNumber, numberRows)
console.log('Done.')

await Promise.all([mongo.close(), db.$disconnect()])
