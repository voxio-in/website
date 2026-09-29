// One flow: loads it once and hands it to every tab through FlowContext.

import { Link, Outlet, createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { FlowContext, type FlowCtx } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import type { FlowDoc } from '#/lib/dashboard/types'
import { getFlow, patchFlow } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/$flowId')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async ({ params }) => unwire<FlowDoc>(await getFlow({ data: { key: params.flowId } })),
  component: FlowLayout,
})

function FlowLayout() {
  const { flowId } = Route.useParams()
  const loaded = Route.useLoaderData()
  const router = useRouter()
  const [flow, setFlow] = useState<FlowDoc | null>(loaded.ok ? loaded.data : null)
  useEffect(() => setFlow(loaded.ok ? loaded.data : null), [loaded])

  const reload = useCallback(async () => {
    const r = unwire<FlowDoc>(await getFlow({ data: { key: flowId } }))
    if (r.ok) setFlow(r.data)
  }, [flowId])

  const save = useCallback(async (patch: Partial<FlowDoc>) => {
    const r = unwire<FlowDoc>(await patchFlow({ data: { key: flowId, patch: JSON.stringify(patch) } }))
    if (!r.ok) throw new Error(r.reason)
    setFlow(r.data)
    // The sidebar's flow list (names, minutes) comes from the parent loader.
    router.invalidate()
    return r.note
  }, [flowId, router])

  const ctx = useMemo<FlowCtx | null>(() => (flow ? { flow, save, reload } : null), [flow, save, reload])

  if (!loaded.ok || !ctx) {
    return (
      <div className="db-page">
        <Link to="/dashboard/flows" className="db-back">← Flows</Link>
        <div className="db-empty is-err"><p>{loaded.ok ? 'Loading…' : loaded.reason}</p></div>
        <button className="db-btn" onClick={() => router.invalidate()}>Retry</button>
      </div>
    )
  }

  return (
    <FlowContext.Provider value={ctx}>
      <div className="db-flow">
        <Outlet />
      </div>
    </FlowContext.Provider>
  )
}
