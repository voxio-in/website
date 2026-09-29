// Testing a flow from the dashboard, server side. The only place @voxio/server
// is imported, and the only code that holds VOXIO_SECRET_KEY.
//
// Browser and chat tests authenticate with the flow's own API key and need
// nothing from here. Phone tests place calls through the SDK, and only when
// VOXIO_API_URL + VOXIO_SECRET_KEY are set (the backend's /v1/calls).

import { Voxio, VoxioServerError, type Call, type SessionRecord } from '@voxio/server'

const API_URL = process.env.VOXIO_API_URL
const SECRET = process.env.VOXIO_SECRET_KEY

/** True when the backend's token and calls API is configured. */
export const sdkServerReady = () => !!(API_URL && SECRET)

let client: Voxio | null = null
function voxio(): Voxio {
  if (!sdkServerReady()) throw new Error('VOXIO_API_URL and VOXIO_SECRET_KEY are not set')
  return (client ??= new Voxio({ secretKey: SECRET!, baseUrl: API_URL }))
}

export function placeTestCall(p: { flow: string; from: string; to: string; customs?: Record<string, unknown>; idempotencyKey: string }): Promise<Call> {
  return voxio().calls.place(p)
}

export const getTestCall = (id: string): Promise<Call> => voxio().calls.get(id)
export const cancelTestCall = (id: string): Promise<Call> => voxio().calls.cancel(id)
export const getSessionRecord = (id: string): Promise<SessionRecord> => voxio().sessions.get(id)

/** A plain sentence for anything the SDK throws. */
export function sdkErrorText(e: unknown): string {
  if (e instanceof VoxioServerError) {
    switch (e.code) {
      case 'invalid-number': return 'That phone number doesn’t look right. Use the country code, e.g. +91…'
      case 'unauthorized':
      case 'forbidden': return 'The voice service didn’t accept our key. Ask the Voxio team to check it.'
      case 'not-found': return 'The voice service doesn’t know this flow or call.'
      case 'rate-limited': return 'Too many tries in a row. Wait a minute and try again.'
      case 'invalid-request': return `The voice service refused the request: ${e.message}`
      default: return 'Couldn’t reach the voice service. Try again.'
    }
  }
  return (e as Error)?.message ?? String(e)
}
