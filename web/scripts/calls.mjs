// npm run calls [n] — the recent demo calls and what was said on them.
//
// Reads the CallRequest rows the /calling page writes. There is no admin UI yet
// and this is the honest stand-in: it needs the database URL, so it only runs
// where someone already has the credentials.
//
// The system prompt is skipped in the transcript — it is thousands of words of
// instructions, identical on every call, and it buries the two or three lines a
// person actually said.

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const take = Number(process.argv[2]) || 10

const rows = await db.callRequest.findMany({ orderBy: { createdAt: 'desc' }, take })

if (!rows.length) console.log('No calls yet.')

for (const r of rows) {
  const when = new Date(r.createdAt).toLocaleString()
  const masked = '…' + r.phone.slice(-4)
  console.log('─'.repeat(72))
  console.log(
    `${when}   ${r.status.toUpperCase()}   ${r.desk}   ${masked}` +
      (r.org ? `   “${r.org}”` : ''),
  )
  if (r.error) console.log(`  error: ${r.error}`)
  if (r.endedAt) console.log(`  ended: ${new Date(r.endedAt).toLocaleTimeString()}`)

  if (r.status === 'failed' || r.status === 'blocked') continue

  const turns = Array.isArray(r.transcript) ? r.transcript : null
  if (!turns) {
    console.log('  (no transcript — the call never connected, or the webhook never arrived)')
    continue
  }
  const spoken = turns.filter((t) => t?.role !== 'system')
  if (!spoken.length) {
    console.log('  (connected, but nobody had said anything yet when this was posted)')
    continue
  }
  for (const t of spoken) {
    const who = t.role === 'assistant' ? 'agent' : String(t.role || '?')
    // the gateway prefixes these; they are noise in a transcript
    const text = String(t.content || '')
      .replace(/^user_input\s*:\s*/, '')
      .replace(/<\|speak\|>/g, '')
      // the control markers the runtime appends, which are not speech
      .replace(/<\|hangup\|>(true|false)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    console.log(`  ${who.padEnd(6)} ${text}`)
  }
}

await db.$disconnect()
