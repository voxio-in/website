// What a test sends and receives, for the "Show code" panel. Every request the
// SDK makes goes through `loggingFetch`, and the components log the events they
// hear. Keys are masked and long blobs (WebRTC SDP) shortened, so the panel is
// safe to screenshot and readable.

import { useCallback, useRef, useState } from 'react'

import { maskKey } from '#/lib/dashboard/client'

export type WireDir = 'out' | 'in'
export type WireEntry = {
  id: number
  dir: WireDir
  label: string
  data: unknown
  at: number
  /** For a response: the id of the request it answers. */
  ref?: number
}
/** Logs an entry and returns its id, so a response can point at its request. */
export type WireLog = (dir: WireDir, label: string, data?: unknown, ref?: number) => number

const MAX = 400
const SECRET_KEYS = new Set(['api_key', 'apikey', 'flowkey', 'flow_api_key', 'user_api_key', 'authorization', 'token'])

/** Masks keys and shortens long strings, all the way down. */
export function redact(v: unknown, key = ''): unknown {
  if (typeof v === 'string') {
    if (SECRET_KEYS.has(key.toLowerCase())) return maskKey(v.replace(/^Bearer\s+/i, ''))
    if (key === 'sdp' || v.length > 600) return `${v.slice(0, 80)}… (${v.length.toLocaleString()} characters)`
    return v
  }
  if (Array.isArray(v)) return v.map((x) => redact(x))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x, k)]))
  return v
}

export function useWire() {
  const [entries, setEntries] = useState<WireEntry[]>([])
  const start = useRef(Date.now())
  const next = useRef(1)
  const log = useCallback<WireLog>((dir, label, data, ref) => {
    const e: WireEntry = { id: next.current++, dir, label, data: redact(data), at: Date.now() - start.current, ref }
    setEntries((list) => [...list, e].slice(-MAX))
    return e.id
  }, [])
  const clear = useCallback(() => { setEntries([]); start.current = Date.now() }, [])
  return { entries, log, clear }
}

const parse = (text: string): unknown => {
  try { return JSON.parse(text) } catch { return text }
}

function headersOf(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {}
  if (h instanceof Headers) return Object.fromEntries(h.entries())
  if (Array.isArray(h)) return Object.fromEntries(h)
  return { ...h }
}

const pathOf = (url: string) => {
  try { const u = new URL(url); return u.pathname } catch { return url }
}

/** A fetch that logs each request and its response (streamed bodies once they finish). */
export function loggingFetch(log: WireLog): typeof fetch {
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? parse(init.body) : init?.body ? '(binary)' : undefined
    const req = log('out', `${method} ${pathOf(url)}`, { url, headers: headersOf(init?.headers), ...(body !== undefined ? { body } : {}) })
    const t0 = performance.now()
    try {
      const res = await fetch(input, init)
      const ms = Math.round(performance.now() - t0)
      // Read a copy, so the SDK still gets the original stream. Logged once the
      // body is complete (a streamed chat reply included), paired with its request.
      res.clone().text()
        .then((text) => log('in', `${res.status} ${pathOf(url)}`, { status: res.status, firstByteMs: ms, body: parse(text) }, req))
        .catch(() => log('in', `${res.status} ${pathOf(url)}`, { status: res.status, firstByteMs: ms }, req))
      return res
    } catch (e) {
      log('in', `Failed ${pathOf(url)}`, { error: (e as Error)?.message ?? String(e) }, req)
      throw e
    }
  }
}
