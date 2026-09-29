import { Link, createFileRoute } from '@tanstack/react-router'

import Icon from '#/components/dashboard/Icon'
import { SaveBar, Toggle, useDraft, useFlow } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import type { Account } from '#/lib/dashboard/types'
import { getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/$flowId/knowledge')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: KnowledgeTab,
})

function KnowledgeTab() {
  const acct = Route.useLoaderData()
  const kbs = acct.ok ? acct.data.knowledge : []
  const { flow } = useFlow()
  const { draft, set, dirty, commit, reset, status } = useDraft(['kbs'])
  const on = new Set(draft.kbs)
  const ragNodes = Object.entries(flow.workflow.nodes).filter(([, n]) => n.type === 'rag' || n.type === 'rag_shopify')
  const unknown = draft.kbs.filter((id) => !kbs.some((k) => k.id === id))

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Knowledge</h1>
          <p className="db-sub">Choose what this flow can look things up in. Add content on the <Link to="/dashboard/knowledge" className="db-textlink">Knowledge</Link> page.</p>
        </div>
      </header>

      <section className="db-setcard">
        {!kbs.length && !unknown.length && <p className="db-muted">No knowledge bases yet.</p>}
        <div className="db-knobs">
          {kbs.map((k) => (
            <div key={k.id} className="db-knob-row">
              <span className="db-kbrow">
                <span className="db-source-icon"><Icon name="book" size={17} /></span>
                <span className="db-source-text"><b>{k.name}</b><span>{k.sources.length ? `${k.sources.length} source${k.sources.length > 1 ? 's' : ''}` : 'Empty'}</span></span>
              </span>
              <div className="db-knob-ctl"><Toggle on={on.has(k.id)} onChange={(v) => set('kbs', v ? [...draft.kbs, k.id] : draft.kbs.filter((x) => x !== k.id))} /></div>
            </div>
          ))}
          {unknown.map((id) => (
            <div key={id} className="db-knob-row">
              <span className="db-kbrow">
                <span className="db-source-icon"><Icon name="book" size={17} /></span>
                <span className="db-source-text"><b>{id}</b><span>Set up by the Voxio team</span></span>
              </span>
              <div className="db-knob-ctl"><Toggle on onChange={() => set('kbs', draft.kbs.filter((x) => x !== id))} /></div>
            </div>
          ))}
        </div>
        <p className="db-fhelp db-kbnote">
          <Icon name="flows" size={15} />
          {ragNodes.length
            ? `Your workflow looks things up in ${ragNodes.length} step${ragNodes.length > 1 ? 's' : ''}.`
            : <>Your workflow doesn’t look anything up yet — add a Knowledge lookup step in the <Link to="/dashboard/flows/$flowId/workflow" params={{ flowId: flow.key }} className="db-textlink">Workflow</Link>.</>}
        </p>
      </section>
      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}
