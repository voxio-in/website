import { Link, createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { UsageChart } from '#/components/dashboard/Charts'
import Icon from '#/components/dashboard/Icon'
import { Pager, TableCard, TableFilter, usePaged } from '#/components/dashboard/TableCard'
import { Kpi, Notice, byRange, inRange, rowLink, type Range } from '#/components/dashboard/ui'
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

const CHANNEL_ICON = { phone: 'phone', avatar: 'avatar', chat: 'list', browser: 'voice' } as const
const CHANNEL_LABEL = { phone: 'Phone call', avatar: 'Video call', chat: 'Chat', browser: 'Web call' } as const

const CHANNELS = [
  { value: 'all', label: 'All channels' },
  { value: 'phone', label: 'Phone calls' },
  { value: 'browser', label: 'Web calls' },
  { value: 'avatar', label: 'Video calls' },
  { value: 'chat', label: 'Chats' },
]
const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'other', label: 'Not completed' },
]

/** What a search looks in: flow name, call type, numbers, status and the transcript. */
function haystack(s: { flow: { name: string }; type: string; from?: string; to?: string; status?: string; transcription: unknown }) {
  const t = typeof s.transcription === 'string' ? s.transcription
    : Array.isArray(s.transcription) ? s.transcription.map((x) => (x as { content?: string })?.content ?? '').join(' ') : ''
  return `${s.flow.name} ${s.type} ${CHANNEL_LABEL[channelOf(s.type)]} ${s.from ?? ''} ${s.to ?? ''} ${s.status ?? ''} ${t}`.toLowerCase()
}

function Overview() {
  // The signed-in person, from the /dashboard route; greet them by first name.
  const me = getRouteApi('/dashboard').useLoaderData()
  const first = me.name?.trim().split(/\s+/)[0] ?? ''
  const res = Route.useLoaderData()
  const navigate = useNavigate()
  const flows = res.ok ? res.data : []
  const [range, setRange] = useState<Range>({ preset: 30 })

  const all = useMemo(() => flows.flatMap((f) => f.sessions.map((s) => ({ ...s, flow: f }))), [flows])
  const inPeriod = useMemo(() => all.filter((s) => inRange(range, s.startTime)), [all, range])
  const buckets = useMemo(() => byRange(all, range), [all, range])
  const minutes = inPeriod.reduce((a, s) => a + billedMinutes(s.totalConnectedTime), 0)
  const completed = inPeriod.filter((s) => !s.status || s.status === 'completed').length

  // Sessions in the chosen period, newest first, narrowed by search and filters.
  const [q, setQ] = useState('')
  const [channel, setChannel] = useState('all')
  const [status, setStatus] = useState('all')
  const sessions = useMemo(() => {
    // "/filter priya" (or just "priya") matches the flow name, the call type or the transcript.
    const needle = q.trim().replace(/^\/filter\s*/i, '').toLowerCase()
    return [...inPeriod]
      .filter((s) => channel === 'all' || channelOf(s.type) === channel)
      .filter((s) => status === 'all' || (status === 'completed') === (!s.status || s.status === 'completed'))
      .filter((s) => !needle || haystack(s).includes(needle))
      .sort((a, b) => b.startTime.localeCompare(a.startTime))
  }, [inPeriod, q, channel, status])
  const paged = usePaged(sessions, 8)

  return (
    <div className="db-page db-home">
      <header className="db-hero">
        <div>
          <h1 className="db-h1">{greeting()}{first ? `, ${first}` : ''}</h1>
        </div>
      </header>

      {!res.ok && <Notice kind="err">{res.reason}</Notice>}

      <div className="db-kpis">
        <Kpi icon="flows" label="Total flows" value={flows.filter((f) => !f.deleted).length.toLocaleString()} />
        <Kpi icon="chart" label="Total minutes used" value={Math.round(minutes).toLocaleString()} />
        <Kpi icon="check" label="Sessions completed" value={completed.toLocaleString()} />
      </div>

      <UsageChart data={buckets} range={range} onRange={setRange} earliest={all.reduce<string | undefined>((m, s) => (!m || s.startTime < m ? s.startTime : m), undefined)} />

      <TableCard
        title="Recent sessions"
        search={{ value: q, onChange: setQ, placeholder: 'Search, or /filter <keyword>', count: `${sessions.length.toLocaleString()} of ${all.length.toLocaleString()}` }}
        filters={<>
          <TableFilter label="Filter by channel" value={channel} options={CHANNELS} onChange={setChannel} />
          <TableFilter label="Filter by status" value={status} options={STATUSES} onChange={setStatus} />
        </>}
        actions={
          <span className="db-btngroup is-icons" role="group" aria-label="Flows">
            <Link to="/dashboard/flows" className="db-gbtn" aria-label="All flows"><Icon name="flows" size={18} /><span className="db-gbtn-label">All flows</span></Link>
          </span>
        }
        footer={<Pager {...paged} />}
      >
        {!all.length ? (
          <p className="db-tcard-empty">Nothing yet. Place a call from one of your flows.</p>
        ) : !sessions.length ? (
          <p className="db-tcard-empty">No sessions match. Try another period, search or filter.</p>
        ) : (
          <table className="db-flows db-recenttable">
            <thead>
              <tr><th>Flow</th><th>Type</th><th>When</th><th className="db-num">Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              {paged.shown.map((s) => (
                <tr key={s.sessionId} {...(s.flow.deleted ? {} : rowLink(() => navigate({ to: '/dashboard/flows/$flowId', params: { flowId: s.flow.key } })))}>
                  <td>
                    <span className="db-namecell">
                      <span className="db-recent-icon"><Icon name={CHANNEL_ICON[channelOf(s.type)]} size={18} /></span>
                      {s.flow.deleted ? (
                        <span className="db-flowlink is-deleted">{s.flow.name}<span className="db-deleted-tag">Flow deleted</span></span>
                      ) : (
                        <Link to="/dashboard/flows/$flowId" params={{ flowId: s.flow.key }} className="db-flowlink">{s.flow.name}</Link>
                      )}
                    </span>
                  </td>
                  <td className="db-muted">{CHANNEL_LABEL[channelOf(s.type)]}</td>
                  <td className="db-muted">{fmtDate(s.startTime)}</td>
                  <td className="db-num">{fmtMin(billedMinutes(s.totalConnectedTime))}</td>
                  <td><span className="db-state" data-live={!s.status || s.status === 'completed'}>{s.status ?? 'completed'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
    </div>
  )
}
