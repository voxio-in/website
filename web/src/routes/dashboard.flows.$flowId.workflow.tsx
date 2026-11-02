import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'

import WorkflowEditor from '#/components/workflow/WorkflowEditor'
import { useFlow } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import type { Account } from '#/lib/dashboard/types'
import type { Workflow } from '#/lib/workflow/convert'
import { getAccount } from '#/server/dashboard/api'

import '#/styles/workflow.css'

export const Route = createFileRoute('/dashboard/flows/$flowId/workflow')({
  staleTime: 30_000,
  // The account's knowledge bases, for the Look up knowledge step's picker.
  loader: async () => unwire<Account>(await getAccount()),
  component: WorkflowPage,
})

/** Knowledge base ids the workflow's Look up knowledge steps search. */
const kbsIn = (wf: Workflow) => [...new Set(Object.values(wf.nodes ?? {})
  .filter((n) => n?.type === 'rag')
  .map((n) => String((n.parameters as { kb?: unknown } | undefined)?.kb ?? '').trim())
  .filter(Boolean))]

function WorkflowPage() {
  const { flow, save } = useFlow()
  const navigate = useNavigate()
  const acct = Route.useLoaderData()
  const bases = acct.ok ? acct.data.knowledge : []
  const knowledge = useMemo(() => bases.map((k) => {
    const passages = k.documents.filter((d) => d.status === 'ready').reduce((n, d) => n + d.chunks, 0)
    return {
      value: k.id, label: k.name, passages,
      hint: passages ? `${passages} passages` : 'no files yet',
      info: k.documents.length ? k.documents.map((d) => d.filename).join(', ') : 'Add a PDF to it on the Knowledge page.',
    }
  }), [bases])
  // The editor owns its state after mount; only a different flow resets it.
  const initial = useMemo(() => flow.workflow, [flow.key])
  return (
    <WorkflowEditor
      key={flow.key}
      title={flow.flow_name}
      ttsService={typeof flow.tts === 'object' ? flow.tts?.service : undefined}
      initial={initial}
      knowledge={knowledge}
      onTest={() => navigate({ to: '/dashboard/flows/$flowId/test', params: { flowId: flow.key } })}
      onSave={async (workflow) => {
        try {
          // A rag step's knowledge base must be connected to the flow, or the call fails to start
          // (the agent checks GET /kb/access). Connect the ones it uses along with the save.
          const have = flow.kbs ?? []
          const missing = kbsIn(workflow).filter((id) => !have.includes(id))
          const note = await save(missing.length ? { workflow, kbs: [...have, ...missing] } : { workflow })
          const names = missing.map((id) => bases.find((k) => k.id === id)?.name ?? id)
          const connected = names.length ? `Connected ${names.map((n) => `“${n}”`).join(', ')} to this flow.` : ''
          return { ok: true, reason: [note, connected].filter(Boolean).join(' ') || undefined }
        } catch (e) {
          return { ok: false, reason: (e as Error).message }
        }
      }}
    />
  )
}
