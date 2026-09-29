import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { Card, Empty, Mock, Notice, Page } from '#/components/dashboard/ui'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { Account } from '#/lib/dashboard/types'
import { accountOp, getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/integrations')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: Integrations,
})

const SOON = [
  ['WooCommerce', 'Catalog and orders'],
  ['HubSpot', 'Log calls against contacts'],
  ['Google Calendar', 'Book appointments'],
  ['Zapier', 'Anything else, from webhook events'],
]

function Integrations() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const list = res.ok ? res.data.integrations : []
  const [shop, setShop] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const run = async (op: object) => {
    const r = unwire(await accountOp({ data: { op: JSON.stringify(op) } }))
    if (!r.ok) return setErr(r.reason)
    setErr(null)
    setShop('')
    router.invalidate()
  }

  return (
    <Page title="Integrations" sub="Connect a service once, then enable it per flow.">
      {err && <Notice kind="err">{err}</Notice>}
      <Card title={<>Shopify <Mock why="The real flow is OAuth through the agent service (/auth → /auth/callback), which needs a return URL to this dashboard; here the store is recorded in the mock store." /></>}
        help="Answer questions from your catalog and show product cards.">
        <div className="db-inline">
          <input className="db-in" placeholder="your-store.myshopify.com" value={shop} onChange={(e) => setShop(e.target.value)} />
          <button className="db-btn db-primary" disabled={!/\.myshopify\.com$/.test(shop.trim().replace(/\/$/, ''))} onClick={() => run({ op: 'integration.connect', shop: shop.trim() })}>Connect</button>
        </div>
        {!list.length ? <Empty>No stores connected.</Empty> : (
          <div className="db-list">
            {list.map((i) => (
              <div key={i.id} className="db-row db-row-num">
                <b>{i.name}</b>
                <span className={`db-status ${i.status === 'connected' ? 'is-ok' : 'is-err'}`}>{i.status}</span>
                <span className="db-muted">since {fmtDate(i.connected_at)}</span>
                <button className="db-btn db-danger" onClick={() => run({ op: 'integration.disconnect', id: i.id })}>Disconnect</button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Coming later">
        <div className="db-tiles">
          {SOON.map(([n, d]) => <div key={n} className="db-tile is-soon"><b>{n}</b><span className="db-muted">{d}</span></div>)}
        </div>
      </Card>
    </Page>
  )
}
