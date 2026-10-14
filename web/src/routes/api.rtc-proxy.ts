// /api/rtc-proxy — the 3D avatar's two setup requests, signed on the server.
//
// The avatar demos need the account (admin) key, which must never reach the
// browser. The SDK in VoiceRoom sends its ICE-server and offer requests here
// (through its `env.fetch` hook) with a placeholder key; this drops that and
// adds the flow key plus the account key as user_api_key. Audio and video
// still flow browser <-> voice server.
//
// Only for a room session this server started: an avatar demo, under ten
// minutes old, not yet ended. Anything else is refused, so this is not an
// open relay for the admin key.

import { createFileRoute } from '@tanstack/react-router'

import { demoById } from '#/lib/demos'
import { db, withDb } from '#/server/db'
import { AVATAR_VOICEBOT } from '#/server/voice/servers'

const ADMIN_KEY = process.env.VOXIO_USER_API_KEY || ''
const FLOW_KEY = process.env.VX_FLOW_API_KEY || ''
/* The flow key says which flow; the account key goes alongside it as
   user_api_key (it is not a flow key — sent as one it gets a 401). */
const AUTH = { flow_api_key: FLOW_KEY, api_key: FLOW_KEY, user_api_key: ADMIN_KEY }
const SESSION_TTL_MS = 10 * 60 * 1000

async function allowed(sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false
  const row = await withDb(() =>
    db.roomSession.findUnique({ where: { id: sessionId }, select: { demo: true, createdAt: true, endedAt: true } }),
  )
  if (!row || row.endedAt) return false
  if (Date.now() - row.createdAt.getTime() > SESSION_TTL_MS) return false
  try {
    return demoById(row.demo as Parameters<typeof demoById>[0]).video === true
  } catch {
    return false
  }
}

const refuse = (status: number, message: string) => Response.json({ detail: message }, { status })

async function forward(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`https://${AVATAR_VOICEBOT}${path}`, { ...init, signal: AbortSignal.timeout(15_000) })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' },
  })
}

export const Route = createFileRoute('/api/rtc-proxy')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('op') !== 'ice') return refuse(404, 'Unknown request.')
        if (!ADMIN_KEY || !FLOW_KEY) return refuse(503, 'The avatar is not connected.')
        if (!(await allowed(url.searchParams.get('session')))) return refuse(401, 'No live avatar session.')
        return forward('/rtc/ice-servers', { headers: AUTH })
      },
      POST: async ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('op') !== 'offer') return refuse(404, 'Unknown request.')
        if (!ADMIN_KEY || !FLOW_KEY) return refuse(503, 'The avatar is not connected.')
        const sessionId = url.searchParams.get('session')
        if (!(await allowed(sessionId))) return refuse(401, 'No live avatar session.')

        let body: Record<string, unknown>
        try {
          body = (await request.json()) as Record<string, unknown>
        } catch {
          return refuse(400, 'Bad offer.')
        }
        // The offer is for the session the gate just checked, whatever the browser says.
        body.session_id = sessionId

        return forward('/rtc/offer/audio', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...AUTH },
          body: JSON.stringify(body),
        })
      },
    },
  },
})
