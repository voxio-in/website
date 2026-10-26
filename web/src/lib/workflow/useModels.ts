// The AI models the workflow editor offers: the curated MODELS from the
// registry, with every other OpenRouter model (from the saved list in
// server/dashboard/openrouter) after OpenRouter's curated picks. Loaded once
// per page and shared by every picker; refresh() fetches the list live, saves
// it on the server and updates every open picker.

import { useEffect, useState } from 'react'

import { getOpenRouterModels, type ModelList } from '#/server/dashboard/openrouter'
import type { Option } from '#/lib/dashboard/providers'
import { MODELS } from './registry'

type State = { list: ModelList | null; refreshing: boolean }

let state: State = { list: null, refreshing: false }
let loading: Promise<void> | null = null
const listeners = new Set<(s: State) => void>()

function put(next: Partial<State>) {
  state = { ...state, ...next }
  for (const l of listeners) l(state)
}

async function load(refresh: boolean) {
  if (refresh) put({ refreshing: true })
  try {
    put({ list: await getOpenRouterModels({ data: { refresh } }) })
  } catch (e) {
    put({ list: { models: state.list?.models ?? [], fetchedAt: state.list?.fetchedAt ?? null, error: (e as Error).message } })
  } finally {
    if (refresh) put({ refreshing: false })
  }
}

function withLive(models: Option[]): Record<string, Option[]> {
  const curated = MODELS.openrouter ?? []
  const rest = models.filter((m) => !curated.some((c) => c.value === m.value))
  return { ...MODELS, openrouter: [...curated, ...rest] }
}

export function useModels() {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.add(setS)
    if (!state.list) loading ??= load(false)
    return () => { listeners.delete(setS) }
  }, [])
  return {
    models: s.list?.models.length ? withLive(s.list.models) : MODELS,
    /** How many OpenRouter models the saved list has, and when it was fetched. */
    count: s.list?.models.length ?? 0,
    fetchedAt: s.list?.fetchedAt ?? null,
    error: s.list?.error,
    refreshing: s.refreshing,
    refresh: () => { if (!state.refreshing) void load(true) },
  }
}
