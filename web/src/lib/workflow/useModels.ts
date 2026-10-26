// The AI models the workflow editor offers: the curated MODELS from the
// registry, with every other OpenRouter model (live, from
// server/dashboard/openrouter) after OpenRouter's curated picks. Fetched once
// per page load and shared by every picker.

import { useEffect, useState } from 'react'

import { getOpenRouterModels } from '#/server/dashboard/openrouter'
import type { Option } from '#/lib/dashboard/providers'
import { MODELS } from './registry'

let live: Promise<Option[]> | null = null
let loaded: Option[] | null = null

function withLive(models: Option[]): Record<string, Option[]> {
  const curated = MODELS.openrouter ?? []
  const rest = models.filter((m) => !curated.some((c) => c.value === m.value))
  return { ...MODELS, openrouter: [...curated, ...rest] }
}

export function useModels(): Record<string, Option[]> {
  const [models, setModels] = useState(() => (loaded ? withLive(loaded) : MODELS))
  useEffect(() => {
    if (loaded) return
    live ??= getOpenRouterModels().catch(() => [])
    let on = true
    live.then((m) => {
      if (m.length) loaded = m
      else live = null // nothing came back: try again next time a picker opens
      if (on && m.length) setModels(withLive(m))
    })
    return () => { on = false }
  }, [])
  return models
}
