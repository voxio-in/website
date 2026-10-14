// Creating flows on the Voxio backend, through the SDK (voxioagent/server).
//
// A flow made in the dashboard (new or duplicated) is created there first,
// signed with the creator's own account key, and then saved in our tables
// under the key the backend returns. So the voice servers know it from the
// start and the Test tab can run it.

import { Voxio, VoxioServerError, type FlowSettings } from 'voxioagent/server'

import type { FlowDoc } from '#/lib/dashboard/types'
import { withStart } from '#/lib/workflow/convert'
import { tidyTts } from '#/lib/dashboard/providers'
import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'

/** Marks a flow (in its runtime JSON) as one the backend knows: the Test tab may run it. */
export const ON_BACKEND = 'on-backend'

// The SDK's GPU environment: flows are stored on gpu.data.voxio.in, where the GPU voice server reads them.
const client = (accountKey: string) => new Voxio({ secretKey: accountKey, environment: 'gpu' })

/** The signed-in user's own account key, from the dashboard's user row. */
export async function accountKey(me: AuthUser): Promise<string> {
  const user = await withDb(() => db.user.findUnique({ where: { id: me.id }, select: { apiKey: true } }))
  if (!user?.apiKey) throw new Error('Your account has no API key.')
  return user.apiKey
}

/** The SDK, acting as the signed-in user. */
export const accountClient = async (me: AuthUser) => client(await accountKey(me))

/** The settings of a dashboard flow, in the SDK's shape. */
export function settingsOf(f: FlowDoc): FlowSettings & { name: string } {
  const out: FlowSettings & { name: string } = { name: f.flow_name, workflow: withStart(f.workflow) as FlowSettings['workflow'] }
  if (f['webhook-url']) out.webhookUrl = String(f['webhook-url'])
  if (f.stt) out.stt = f.stt as FlowSettings['stt']
  if (f.tts) out.tts = tidyTts(f.tts) as FlowSettings['tts']
  if (f.faces?.expressions?.length) out.faces = f.faces.expressions
  if (f.faces?.transitions?.length) out.transitions = f.faces.transitions
  if (f['process-type']) out.processType = String(f['process-type'])
  if (f.xml) out.xml = String(f.xml)
  if (f.vision_id) out.vision = f.vision_id as Record<string, unknown>
  if (f.running_vision_id) out.runningVision = f.running_vision_id as Record<string, unknown>
  return out
}

/** Creates the flow on the backend with the user's account key and returns its key. */
export async function createOnBackend(me: AuthUser, settings: FlowSettings & { name: string }): Promise<string> {
  const { flowKey } = await (await accountClient(me)).flows.create(settings)
  if (!flowKey) throw new Error('The voice service didn’t return a key for the new flow.')
  return flowKey
}

/** A plain sentence for anything the SDK throws while creating a flow. */
export function createErrorText(e: unknown): string {
  if (e instanceof VoxioServerError) {
    switch (e.code) {
      case 'unauthorized':
      case 'forbidden': return 'The voice service didn’t accept your account key, so the flow wasn’t created.'
      case 'invalid-request': return `The voice service refused the flow: ${e.message}`
      case 'rate-limited': return 'Too many tries in a row. Wait a minute and try again.'
      default: return 'Couldn’t reach the voice service, so the flow wasn’t created. Try again.'
    }
  }
  return (e as Error)?.message ?? String(e)
}

/**
 * The voice server's own record of a session (recording, and the transcript
 * with both sides), read with the user's account key. Null when it isn't
 * there (yet): recordings are uploaded a little after the call ends.
 */
export async function sessionRecordOf(me: AuthUser, flowKey: string, sessionId: string): Promise<{ recordingUrl?: string; cameraUrl?: string; transcript: { role: string; content: string }[] } | null> {
  const user = await withDb(() => db.user.findUnique({ where: { id: me.id }, select: { apiKey: true } }))
  if (!user?.apiKey) return null
  try {
    const r = await client(user.apiKey).sessions.get(sessionId, { flowKey })
    const transcript = (r.transcription ?? [])
      .map((t) => ({ role: /assist|agent|bot|ai/i.test(String(t.role)) ? 'assistant' : 'user', content: String(t.content ?? t.text ?? '').trim() }))
      .filter((t) => t.content)
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
    const extra = (r.extra ?? {}) as Record<string, unknown>
    return { recordingUrl: str(r.recordingUrl), cameraUrl: str(extra.cameraRecordingUrl), transcript }
  } catch { return null }
}
