import { Link, createFileRoute } from '@tanstack/react-router'

import { Card, Empty, Mock, Page, SaveBar, useDraft, useFlow } from '#/components/dashboard/ui'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { Account } from '#/lib/dashboard/types'
import { getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/$flowId/integrations')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: IntegrationsTab,
})

function IntegrationsTab() {
  const acct = Route.useLoaderData()
  const all = acct.ok ? acct.data.integrations : []
  const { flow } = useFlow()
  const { draft, set, dirty, commit, reset, status } = useDraft(['integrations'])
  const on = new Set(draft.integrations ?? [])
  const shopifyNodes = Object.values(flow.workflow.nodes).filter((n) => /shopify/.test(n.type)).length

  return (
    <Page title="Integrations" sub="Connected services this flow may use.">
      <Card title="Available to this flow" mock="Which flow uses which store is kept in the mock store; the backend links stores per account.">
        {!all.length ? (
          <Empty>Nothing connected yet. Connect a store on the <Link to="/dashboard/integrations">Integrations</Link> page.</Empty>
        ) : (
          <div className="db-checks">
            {all.map((i) => (
              <label key={i.id} className={`db-check${on.has(i.id) ? ' is-on' : ''}`}>
                <input type="checkbox" checked={on.has(i.id)} onChange={(e) => set('integrations', e.target.checked ? [...on, i.id] : [...on].filter((x) => x !== i.id))} />
                <span><b>{i.name}</b><span className="db-muted">Shopify · connected {fmtDate(i.connected_at)}</span></span>
              </label>
            ))}
          </div>
        )}
        <p className="db-fhelp">{shopifyNodes ? `${shopifyNodes} Shopify node${shopifyNodes > 1 ? 's' : ''} in this workflow.` : 'Add a Shopify node in the workflow to answer from the catalog.'} <Mock /></p>
      </Card>
      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </Page>
  )
}
