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

export type ModelList = { models: Option[]; fetchedAt: string | null; error?: string; format?: number }

/** Bump when the saved shape changes; an older file is fetched again. */
const FORMAT = 2

type Raw = { id: string; name?: string; description?: string }

let cache: ModelList | null = null

/** The description, cut to a few lines at a sentence end so the note beside the list stays short. */
function shortDescription(d?: string) {
  if (!d) return undefined
  const text = d.replace(/\s+/g, ' ').trim()
  if (text.length <= 300) return text
  const cut = text.slice(0, 300)
  const end = cut.lastIndexOf('. ')
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`
}

/** Name and description only: no prices or context sizes. */
const toOption = (m: Raw): Option => ({ value: m.id, label: m.name ?? m.id, info: shortDescription(m.description) })

async function fetchLive(): Promise<ModelList> {
  const res = await fetch(MODELS_URL, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`OpenRouter answered HTTP ${res.status}`)
  const { data } = (await res.json()) as { data: Raw[] }
  const models = data.filter((m) => m.id).map(toOption).sort((a, b) => a.label.localeCompare(b.label))
  return { models, fetchedAt: new Date().toISOString(), format: FORMAT }
}

async function readSaved(): Promise<ModelList | null> {
  try {
    const saved = JSON.parse(await readFile(SAVED, 'utf8')) as ModelList
    return saved.format === FORMAT ? saved : null
  } catch { return null }
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
