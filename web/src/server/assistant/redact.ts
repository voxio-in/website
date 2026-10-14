// What the Assistant must never see: credentials inside configs, the account
// key, webhook secrets. Applied to every tool result before it leaves the
// server. Flow keys are shortened to tell flows apart without revealing them.

// Exact credential names only: a bare `key` is how settings and flows are named, so it stays.
const SECRET = /^(api[-_]?key|secret[-_]?key|token|secret|password|passwd|authorization|bearer|access[-_]?token|refresh[-_]?token|private[-_]?key|client[-_]?secret|webhook[-_]?secret|credentials?)$/i

export const MASK = '•••'

/** A flow key as the Assistant sees it: enough to tell flows apart, not to use one. */
export const shortKey = (key: string) => (key.length > 12 ? `${key.slice(0, 11)}…` : key)

/** Deep copy with every secret-looking field masked. */
export function redact<T>(value: T, depth = 0): T {
  if (depth > 12 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)) as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET.test(k) && v !== null && v !== '' && typeof v !== 'object' ? MASK : redact(v, depth + 1)
  }
  return out as T
}

/** Roughly how many tokens a JSON value costs (4 characters a token). */
export const tokensOf = (v: unknown) => Math.ceil(JSON.stringify(v ?? null).length / 4)

/**
 * Keeps a tool result under the cap: long strings are cut and arrays shortened,
 * with `truncated` set so the model knows to ask for less or page.
 */
export function cap<T>(value: T, maxTokens = 3000): T | { truncated: true; note: string; partial: unknown } {
  if (tokensOf(value) <= maxTokens) return value
  const shrink = (v: unknown, budget: number): unknown => {
    if (typeof v === 'string') return v.length > budget * 4 ? `${v.slice(0, budget * 4)}… [cut]` : v
    if (Array.isArray(v)) {
      const out: unknown[] = []
      let used = 0
      for (const x of v) {
        const t = tokensOf(x)
        if (used + t > budget) { out.push(`… ${v.length - out.length} more not shown`); break }
        out.push(x); used += t
      }
      return out
    }
    if (v && typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>)
      const each = Math.max(200, Math.floor(budget / Math.max(1, entries.length)))
      return Object.fromEntries(entries.map(([k, x]) => [k, shrink(x, each)]))
    }
    return v
  }
  return { truncated: true, note: 'Result was too long and was shortened. Ask for a narrower range or a specific part.', partial: shrink(value, maxTokens) }
}
