// OpenRouter's live model list, for the workflow model picker. The list is
// public (no key) and changes daily, so it's fetched on the server and kept for
// an hour; a failed fetch returns the last good list, or nothing, and the
// picker falls back to the curated models in lib/workflow/registry.

import { createServerFn } from '@tanstack/react-start'

import type { Option } from '#/lib/dashboard/providers'

const MODELS_URL = 'https://openrouter.ai/api/v1/models'
const KEEP_MS = 60 * 60 * 1000

type Raw = { id: string; name?: string; description?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }

let cache: { at: number; models: Option[] } | null = null

/** USD per token → "$0.30/M", "Free", or nothing when unknown (OpenRouter uses -1 for routers). */
function perMillion(v?: string) {
  const n = Number(v)
  if (!v || !Number.isFinite(n) || n < 0) return undefined
  return n === 0 ? 'Free' : `$${+(n * 1e6).toFixed(2)}/M`
}

const firstSentence = (s?: string) => s?.split(/(?<=\.)\s/)[0]?.slice(0, 220)

function toOption(m: Raw): Option {
  const inPrice = perMillion(m.pricing?.prompt)
  const outPrice = perMillion(m.pricing?.completion)
  const context = m.context_length ? `${Math.round(m.context_length / 1000)}K context` : ''
  const price = inPrice && outPrice ? (inPrice === 'Free' && outPrice === 'Free' ? 'Free' : `${inPrice} in · ${outPrice} out`) : ''
  return {
    value: m.id,
    label: m.name ?? m.id,
    hint: inPrice,
    info: [firstSentence(m.description), [price, context].filter(Boolean).join(' · ')].filter(Boolean).join(' '),
  }
}

export const getOpenRouterModels = createServerFn({ method: 'GET' }).handler(async (): Promise<Option[]> => {
  if (cache && Date.now() - cache.at < KEEP_MS) return cache.models
  try {
    const res = await fetch(MODELS_URL, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`OpenRouter models: HTTP ${res.status}`)
    const { data } = (await res.json()) as { data: Raw[] }
    const models = data.filter((m) => m.id).map(toOption).sort((a, b) => a.label.localeCompare(b.label))
    cache = { at: Date.now(), models }
    return models
  } catch (e) {
    console.error(e)
    return cache?.models ?? []
  }
})
