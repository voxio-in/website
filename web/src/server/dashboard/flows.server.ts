// The account's own key, the SDK for face processing, and a session's stored
// record.
//
// Flows and sessions are read and written straight to Neon through Prisma
// (store.server.ts); the voice servers read the same tables. The SDK is kept
// only for faces: an upload has to go through the backend's face_detection
// service, which crops the clip and picks the lip-sync detector.

import { Voxio } from 'voxioagent/server'

import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'
import { flowAccess } from './store.server'

/** The signed-in user's own account key, from the dashboard's user row. */
export async function accountKey(me: AuthUser): Promise<string> {
  const user = await withDb(() => db.user.findUnique({ where: { id: me.id }, select: { apiKey: true } }))
  if (!user?.apiKey) throw new Error('Your account has no API key.')
  return user.apiKey
}

/** The SDK, acting as the signed-in user. For face uploads only; see the top of this file. */
export const accountClient = async (me: AuthUser) => new Voxio({ secretKey: await accountKey(me), environment: 'gpu' })

/**
 * A session's recording and transcript, as the voice server archived it into
 * the sessions table. Null when this user may not see the flow, or the row
 * isn't there (yet): recordings are uploaded a little after the call ends.
 */
export async function sessionRecordOf(me: AuthUser, flowKey: string, sessionId: string): Promise<{ recordingUrl?: string; cameraUrl?: string; transcript: { role: string; content: string }[] } | null> {
  const access = await flowAccess(me, flowKey)
  if (!access) return null
  const r = await withDb(() => db.callSession.findFirst({
    where: { sessionId, flowId: access.flowId },
    select: { recordingUrl: true, transcription: true, extra: true },
  }))
  if (!r) return null
  const turns = Array.isArray(r.transcription) ? (r.transcription as Record<string, unknown>[]) : []
  const transcript = turns
    .filter((t) => t && typeof t === 'object' && !(t as { data?: boolean }).data)
    .map((t) => ({ role: /assist|agent|bot|ai/i.test(String(t.role)) ? 'assistant' : 'user', content: String(t.content ?? t.text ?? '').trim() }))
    .filter((t) => t.content)
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
  const extra = (r.extra ?? {}) as Record<string, unknown>
  return { recordingUrl: str(r.recordingUrl), cameraUrl: str(extra.cameraRecordingUrl), transcript }
}
