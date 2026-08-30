// POST /api/room-webhook — the same contract as the phone one, for the browser
// demos on /avatar.

import { createFileRoute } from '@tanstack/react-router'

import { db } from '#/server/db'
import {
  isFinished,
  nextTranscript,
  sceneBeats,
  sessionIdOf,
  type Payload,
  type SceneBeat,
  type Turn,
} from '#/server/voice/webhookPayload'

export const Route = createFileRoute('/api/room-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text()
        const body = (() => {
          try {
            return JSON.parse(raw) as Payload
          } catch {
            return null
          }
        })()

        console.log(`[room-webhook] ${body?.status ?? '?'} ${raw.length}b`)

        const id = sessionIdOf(body)
        if (!body || !id) {
          return Response.json({ ok: false, reason: 'no session id' })
        }

        const row = await db.roomSession.findUnique({ where: { id } })
        if (!row) return Response.json({ ok: false, reason: 'unknown session' })

        const existing = Array.isArray(row.transcript) ? (row.transcript as Turn[]) : []
        const transcript = nextTranscript(body, existing)

        /* The scene is append-only and numbered from wherever it left off, so
           a room that polls "after n" never re-reads what it has already drawn
           and never misses a beat that landed between two polls. */
        const scene = Array.isArray(row.scene) ? (row.scene as SceneBeat[]) : []
        const beats = sceneBeats(body, scene.length ? scene[scene.length - 1]!.n : 0)

        await db.roomSession.update({
          where: { id },
          data: {
            endedAt: isFinished(body) ? (row.endedAt ?? new Date()) : row.endedAt,
            ...(transcript ? { transcript } : {}),
            ...(beats.length ? { scene: [...scene, ...beats] } : {}),
          },
        })

        return Response.json({ ok: true })
      },
    },
  },
})
