import type { Result } from './types'

/** Server functions return JSON strings; this reads one back. */
export function unwire<T>(s: string): Result<T> {
  try {
    return JSON.parse(s) as Result<T>
  } catch {
    return { ok: false, reason: 'Bad response from server.' }
  }
}

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export const fmtDur = (s: number) => {
  s = Math.round(s || 0)
  const m = Math.floor(s / 60)
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

export const maskKey = (k: string) => (k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k)

/** Billed minutes for one session: whole minutes, rounded up (1 s → 1, 59 s → 1, 61 s → 2). */
export const billedMinutes = (seconds: number) => (seconds > 0 ? Math.ceil(seconds / 60) : 0)

/**
 * The channel a session came in on. The voice backend stores browser calls as
 * `voice` (and some older rows as `web`); the dashboard calls them `browser`.
 */
export type Channel = 'phone' | 'browser' | 'avatar' | 'chat'
export function channelOf(type: string | undefined): Channel {
  if (type === 'phone' || type === 'avatar' || type === 'chat') return type
  return 'browser'
}

export const fmtMin = (m: number) => `${m.toLocaleString()} min`

// A flow name shows on one row: past NAME_MAX characters it is cut at the last whole word.
// CSS still ellipsizes, for narrow screens.
/**
 * Whether conversations on this flow show the agent's extra data (frame, score,
 * feedback… anything a step sends besides its words) as "Agent · data" bubbles.
 * Saved on the flow (runtime `show-data`); on unless turned off.
 */
export const SHOW_DATA = 'show-data'
export const showsData = (flow: Record<string, unknown>) => flow[SHOW_DATA] !== false

export const NAME_MAX = 48
export function clipName(name: string) {
  if (name.length <= NAME_MAX) return name
  const cut = name.slice(0, NAME_MAX + 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > NAME_MAX * 0.6 ? cut.slice(0, space) : cut.slice(0, NAME_MAX)).replace(/[\s,.;:·-]+$/, '')}…`
}
