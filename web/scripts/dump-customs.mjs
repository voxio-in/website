// Print the exact `customs` object a demo sends to the voice server.
//
// The graphs are TypeScript that imports .md prompts with `?raw`, so they only
// load through Vite — this runs the real builder rather than a copy of it, and
// that is the point: what it prints is byte for byte what /avatar posts.
//
//   node --env-file=.env scripts/dump-customs.mjs jl                > jl.json
//   node --env-file=.env scripts/dump-customs.mjs jl singaporean
//
// PUBLIC_URL matters: it is what webhook-url is built from, so a run without
// .env prints an empty one.

import { createServer } from 'vite'

const [demo = 'jl', accent = 'indian'] = process.argv.slice(2)

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { buildRoomCustoms } = await vite.ssrLoadModule(
    '/src/server/voice/roomCustoms.ts',
  )

  // The same two lines room.ts runs before it calls the builder.
  const base = process.env.PUBLIC_URL || ''
  const webhookUrl = base ? `${base.replace(/\/+$/, '')}/api/room-webhook` : ''

  process.stdout.write(
    JSON.stringify(buildRoomCustoms(demo, webhookUrl, accent), null, 2) + '\n',
  )
} finally {
  await vite.close()
}
