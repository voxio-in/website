// Print the exact `customs` object a demo sends to the voice server.
//
// The graphs are TypeScript that imports .md prompts with `?raw`, so they only
// load through Vite — this runs the real builder rather than a copy of it, and
// that is the point: what it prints is byte for byte what the site posts.
//
// Two kinds of agent, and which builder runs is decided by the id:
//
//   node --env-file=.env scripts/dump-customs.mjs jl                > jl.json
//   node --env-file=.env scripts/dump-customs.mjs jl singaporean
//   node --env-file=.env scripts/dump-customs.mjs nsdc              > nsdc.json
//   node --env-file=.env scripts/dump-customs.mjs university "NIMS University"
//
// A /calling desk takes an organisation name as its second argument — the org
// the visitor typed — and falls back to that desk's defaultBrand, exactly as
// the server function does. A /avatar demo takes an accent instead.
//
// PUBLIC_URL matters for both: it is what webhook-url is built from, so a run
// without .env prints an empty one.

import { createServer } from 'vite'

const [id = 'jl', second] = process.argv.slice(2)

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { DESKS, deskById } = await vite.ssrLoadModule('/src/lib/desks.ts')
  const isDesk = DESKS.some((d) => d.id === id)

  const base = process.env.PUBLIC_URL || ''
  const webhookUrl = (path) =>
    base ? `${base.replace(/\/+$/, '')}${path}` : ''

  let customs
  if (isDesk) {
    // What calling.ts passes: the org the visitor typed, or the desk's default.
    // NIMC_WEBHOOK_URL is read from PUBLIC_URL inside the module itself.
    const { buildNimcCustoms } = await vite.ssrLoadModule(
      '/src/server/voice/admissionsCall.ts',
    )
    const desk = deskById(id)
    customs = buildNimcCustoms({ desk: desk.id, brand: second || desk.defaultBrand })
  } else {
    // The same two lines room.ts runs before it calls the builder.
    const { buildRoomCustoms } = await vite.ssrLoadModule(
      '/src/server/voice/roomCustoms.ts',
    )
    customs = buildRoomCustoms(id, webhookUrl('/api/room-webhook'), second || 'indian')
  }

  process.stdout.write(JSON.stringify(customs, null, 2) + '\n')
} finally {
  await vite.close()
}
