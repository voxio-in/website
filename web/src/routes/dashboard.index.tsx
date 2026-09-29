import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { UsageChart } from '#/components/dashboard/Charts'
import Icon from '#/components/dashboard/Icon'
import { Kpi, Notice, byDay, rowLink } from '#/components/dashboard/ui'
import { billedMinutes, channelOf, fmtDate, fmtMin, unwire } from '#/lib/dashboard/client'
import { getOverview, type OverviewFlow } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<OverviewFlow[]>(await getOverview()),
  component: Overview,
})

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Overview() {
  const res = Route.useLoaderData()
  const navigate = useNavigate()
  const flows = res.ok ? res.data : []
  const [days, setDays] = useState(30)
  const since = Date.now() - days * 864e5

  const all = useMemo(() => flows.flatMap((f) => f.sessions.map((s) => ({ ...s, flow: f }))), [flows])
  const inRange = useMemo(() => all.filter((s) => Date.parse(s.startTime) >= since), [all, since])
  const buckets = useMemo(() => byDay(all, 90), [all])
  const minutes = inRange.reduce((a, s) => a + billedMinutes(s.totalConnectedTime), 0)
  const completed = inRange.filter((s) => !s.status || s.status === 'completed').length
  const recent = useMemo(() => [...all].sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 6), [all])

  return (
    <div className="db-page db-home">
      <header className="db-hero">
        <div>
          <h1 className="db-h1">{greeting()}</h1>
          <p className="db-sub">Here’s how your voice agents did in the last {days} days.</p>
        </div>
      </header>

      {!res.ok && <Notice kind="err">{res.reason}</Notice>}

      <div className="db-kpis">
        <Kpi icon="flows" label="Total flows" value={flows.length.toLocaleString()} />
        <Kpi icon="chart" label="Total minutes used" value={Math.round(minutes).toLocaleString()} />
        <Kpi icon="check" label="Sessions completed" value={completed.toLocaleString()} />
      </div>

      <UsageChart data={buckets} days={days} onDays={setDays} />

      <section className="db-softcard">
        <div className="db-softcard-head">
          <h2 className="db-h2">Recent sessions</h2>
          <Link to="/dashboard/flows" className="db-textlink">All flows →</Link>
        </div>
        {!recent.length && <p className="db-muted">Nothing yet — place a call from one of your flows.</p>}
        {recent.length > 0 && (
          <div className="db-tablewrap">
            <table className="db-flows db-recenttable">
              <thead>
                <tr><th>Flow</th><th>Type</th><th>When</th><th className="db-num">Duration</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.sessionId} {...rowLink(() => navigate({ to: '/dashboard/flows/$flowId', params: { flowId: s.flow.key } }))}>
                    <td>
                      <span className="db-namecell">
                        <span className="db-recent-icon"><Icon name={({ phone: 'phone', avatar: 'avatar', chat: 'list', browser: 'voice' } as const)[channelOf(s.type)]} size={18} /></span>
                        <Link to="/dashboard/flows/$flowId" params={{ flowId: s.flow.key }} className="db-flowlink">{s.flow.name}</Link>
                      </span>
                    </td>
                    <td className="db-muted">{({ phone: 'Phone call', avatar: 'Video call', chat: 'Chat', browser: 'Web call' } as const)[channelOf(s.type)]}</td>
                    <td className="db-muted">{fmtDate(s.startTime)}</td>
                    <td className="db-num">{fmtMin(billedMinutes(s.totalConnectedTime))}</td>
                    <td><span className="db-state" data-live={!s.status || s.status === 'completed'}>{s.status ?? 'completed'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
