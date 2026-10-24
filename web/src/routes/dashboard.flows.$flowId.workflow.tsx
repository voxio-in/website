import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'

import WorkflowEditor from '#/components/workflow/WorkflowEditor'
import { useFlow } from '#/components/dashboard/ui'

import '#/styles/workflow.css'

export const Route = createFileRoute('/dashboard/flows/$flowId/workflow')({
  component: WorkflowPage,
})

function WorkflowPage() {
  const { flow, save } = useFlow()
  const navigate = useNavigate()
  // The editor owns its state after mount; only a different flow resets it.
  const initial = useMemo(() => flow.workflow, [flow.key])
  return (
    <WorkflowEditor
      key={flow.key}
      title={flow.flow_name}
      ttsService={typeof flow.tts === 'object' ? flow.tts?.service : undefined}
      initial={initial}
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
