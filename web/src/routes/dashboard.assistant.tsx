// Ask Voxio, full view: the same conversation as the panel, given the whole page.

import { createFileRoute, redirect } from '@tanstack/react-router'
import { ASSISTANT_ON } from '#/lib/features'

import { Assistant } from '#/components/assistant/Assistant'

export const Route = createFileRoute('/dashboard/assistant')({
  // ?chat=<id> opens a saved chat (from the sidebar).
  validateSearch: (s: Record<string, unknown>): { chat?: string } => (typeof s.chat === 'string' ? { chat: s.chat } : {}),
  beforeLoad: () => { if (!ASSISTANT_ON) throw redirect({ to: '/dashboard' }) },
  component: AssistantPage,
})

function AssistantPage() {
  const { chat } = Route.useSearch()
  return (
    <div className="as-page">
      <Assistant variant="page" open onClose={() => {}} ctx={{ page: '/dashboard/assistant' }} chat={chat} />
    </div>
  )
}
