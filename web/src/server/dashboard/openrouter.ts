// OpenRouter's model list, for the workflow model picker. The list is public
// (no key). It's fetched once, saved to .data/openrouter-models.json, and
// served from there until someone presses Refresh in the picker, which fetches
// it live and saves it again. If a refresh fails, the saved list stays.

import { createServerFn } from '@tanstack/react-start'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { Option } from '#/lib/dashboard/providers'

const MODELS_URL = 'https://openrouter.ai/api/v1/models'
const SAVED = join(process.cwd(), '.data', 'openrouter-models.json')

export type ModelList = { models: Option[]; fetchedAt: string | null; error?: string }

type Raw = { id: string; name?: string; description?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }

let cache: ModelList | null = null

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

async function fetchLive(): Promise<ModelList> {
  const res = await fetch(MODELS_URL, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`OpenRouter answered HTTP ${res.status}`)
  const { data } = (await res.json()) as { data: Raw[] }
  const models = data.filter((m) => m.id).map(toOption).sort((a, b) => a.label.localeCompare(b.label))
  return { models, fetchedAt: new Date().toISOString() }
}

async function readSaved(): Promise<ModelList | null> {
  try { return JSON.parse(await readFile(SAVED, 'utf8')) as ModelList } catch { return null }
}

async function save(list: ModelList) {
  await mkdir(dirname(SAVED), { recursive: true })
  await writeFile(SAVED, JSON.stringify(list))
}

/** The saved list; `refresh: true` fetches it live first and saves the result. */
export const getOpenRouterModels = createServerFn({ method: 'POST' })
  .inputValidator((d: { refresh?: boolean } | undefined) => ({ refresh: !!d?.refresh }))
  .handler(async ({ data }): Promise<ModelList> => {
    if (!data.refresh) {
      cache ??= await readSaved()
      if (cache) return cache
    }
    try {
      cache = await fetchLive()
      await save(cache).catch((e) => console.error('Saving OpenRouter models:', e))
      return cache
    } catch (e) {
      console.error(e)
      const kept = cache ?? (await readSaved())
      return { models: kept?.models ?? [], fetchedAt: kept?.fetchedAt ?? null, error: (e as Error).message }
    }
  })
