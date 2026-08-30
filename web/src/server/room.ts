// Starting a browser demo on /avatar.

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { demoById, type DemoId } from '#/lib/demos'
import { db, withDb } from '#/server/db'
import { buildRoomCustoms } from '#/server/voice/roomCustoms'
import { SERVERS } from '#/server/voice/servers'
import type { SceneBeat } from '#/server/voice/webhookPayload'

const FLOW_API_KEY = process.env.VX_FLOW_API_KEY || ''

const MAX_PER_IP_PER_DAY = Number(process.env.ROOM_LIMIT_PER_IP_DAY) || 6
export const ROOM_MAX_SECONDS = Number(process.env.ROOM_MAX_SECONDS) || 300

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export type RoomStart =
  | {
      ok: true
      sessionId: string
      server: string
      apiKey: string
      customs: Json
      participants: Json
      maxSeconds: number
    }
  | { ok: false; reason: string }

function clientIp(): string | null {
  const h = getRequest().headers
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip')
}

function participantsFor(video: boolean) {
  return {
    ai_participant: 'ai',
    participants: [
      { name: 'user', connections: [{ name: 'ai', video, audio: true }] },
      { name: 'ai', connections: [{ name: 'user', video, audio: true }] },
    ],
  }
}

export const startRoomSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { demo: string }) => data)
  .handler(async ({ data }): Promise<RoomStart> => {
    const id = data.demo || ''
    const isPageDriver = id.startsWith('wa-')
    const demo = isPageDriver ? null : demoById(id)
    const video = demo?.video ?? false
    const server = video ? SERVERS.voicebotGpu : SERVERS.voicebot

    if (!FLOW_API_KEY || !server) {
      return {
        ok: false,
        reason: video
          ? 'The avatar demos are not connected to this page yet. Write to hello@voxio.ai for a live one.'
          : 'The demo line is not connected right now. Write to hello@voxio.ai and we will set one up.',
      }
    }

    const ip = clientIp()
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const used = ip
      ? await withDb(() =>
          db.roomSession.count({ where: { ip, createdAt: { gte: dayAgo } } }),
        )
      : 0

    if (used >= MAX_PER_IP_PER_DAY) {
      return {
        ok: false,
        reason: 'You have had a few goes today. Try again tomorrow, or book a real one.',
      }
    }

    const row = await withDb(() =>
      db.roomSession.create({
        data: {
          demo: isPageDriver ? id : demo!.id,
          ip,
          userAgent: getRequest().headers.get('user-agent'),
        },
      }),
    )

    const base = process.env.PUBLIC_URL || ''
    const webhookUrl = base ? `${base.replace(/\/+$/, '')}/api/room-webhook` : ''

    return {
      ok: true,
      sessionId: row.id,
      server,
      apiKey: FLOW_API_KEY,
      customs: buildRoomCustoms((isPageDriver ? id : demo!.id) as DemoId, webhookUrl) as Json,
      participants: participantsFor(video) as Json,
      maxSeconds: ROOM_MAX_SECONDS,
    }
  })

/** Marks a session finished, so the row says how long it actually ran. */
export const endRoomSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; seconds: number }) => data)
  .handler(async ({ data }) => {
    await withDb(() =>
      db.roomSession.updateMany({
        where: { id: data.sessionId, endedAt: null },
        data: {
          endedAt: new Date(),
          seconds: Math.max(0, Math.round(data.seconds)),
        },
      }),
    )
    return { ok: true }
  })

/* ---------- the scene, read back ----------

   The roleplays put things on the counter. The voice server posts each turn to
   /api/room-webhook, which appends the beats; this is how the live room reads
   them. Polling rather than pushing because the beats arrive over the gateway's
   webhook, not over the peer connection — the data channel this room opens
   carries nothing back from the graph.

   `after` is the last beat the room has drawn, so a poll returns the delta. */
export const roomScene = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; after: number }) => data)
  .handler(async ({ data }): Promise<{ beats: SceneBeat[] }> => {
    const row = await withDb(() =>
      db.roomSession.findUnique({
        where: { id: data.sessionId },
        select: { scene: true },
      }),
    )
    const scene = Array.isArray(row?.scene) ? (row.scene as SceneBeat[]) : []
    return { beats: scene.filter((b) => b.n > data.after) }
  })
