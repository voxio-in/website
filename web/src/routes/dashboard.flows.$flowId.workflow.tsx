import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'

import WorkflowEditor from '#/components/workflow/WorkflowEditor'
import { useFlow } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import type { Account } from '#/lib/dashboard/types'
import { getAccount } from '#/server/dashboard/api'

import '#/styles/workflow.css'

export const Route = createFileRoute('/dashboard/flows/$flowId/workflow')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: WorkflowPage,
})

function WorkflowPage() {
  const { flow, save } = useFlow()
  const acct = Route.useLoaderData()
  const navigate = useNavigate()
  // The editor owns its state after mount; only a different flow resets it.
  const initial = useMemo(() => flow.workflow, [flow.key])
  const knowledge = useMemo(
    () => (acct.ok ? acct.data.knowledge.map((k) => ({ value: k.id, label: k.name, hint: `${k.sources.length} source${k.sources.length === 1 ? '' : 's'}` })) : []),
    [acct],
  )
  return (
    <WorkflowEditor
      key={flow.key}
      title={flow.flow_name}
      initial={initial}
      knowledge={knowledge}
      onTest={() => navigate({ to: '/dashboard/flows/$flowId/test', params: { flowId: flow.key } })}
      onSave={async (workflow) => {
        try {
          const note = await save({ workflow })
          return { ok: true, reason: note }
        } catch (e) {
          return { ok: false, reason: (e as Error).message }
        }
      }}
    />
  )
}
