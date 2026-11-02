// One VAD, for its owner. Its sections (Dashboard, Users, Settings) and Ask Voxio are in the
// side menu (dashboard.tsx, like a flow's); the open one is ?tab.

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Dashboard } from '#/components/vad/Dashboard'
import { AccessSection, LookSection, UsersSection, type ShareState } from '#/components/vad/SharePanel'
import { Notice } from '#/components/dashboard/ui'
import type { Spec } from '#/lib/vad/spec'
import '#/styles/vad.css'

import { DASHBOARDS_ON } from '#/lib/features'

type Tab = 'dashboard' | 'users' | 'settings'

export const Route = createFileRoute('/dashboard/dashboards/$dashId')({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (s.tab === 'users' || s.tab === 'settings' || s.tab === 'dashboard' ? { tab: s.tab } : {}),
  beforeLoad: () => { if (!DASHBOARDS_ON) throw redirect({ to: '/dashboard' }) },
  component: DashboardPage,
})

const SUB: Record<Tab, string> = {
  dashboard: 'Ask Voxio adds widgets for you, or press Edit to add, drag and resize them.',
  users: 'Who can sign in to this VAD’s page.',
  settings: 'Sharing, and how its page looks.',
}

function DashboardPage() {
  const { dashId } = Route.useParams()
  const tab: Tab = Route.useSearch().tab ?? 'dashboard'
  const navigate = useNavigate()
  const [spec, setSpec] = useState<Spec | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [share, setShare] = useState<ShareState | null>(null)

  const load = () => fetch(`/api/vad?id=${encodeURIComponent(dashId)}`).then((r) => r.json())
    .then((r) => {
      if (!r.ok) return setErr(r.reason)
      setSpec(r.data.spec)
      setShare({ access: r.data.access ?? 'private', slug: r.data.slug ?? null, signup: r.data.signup ?? false, brand: r.data.brand ?? {}, viewers: r.data.viewers ?? [] })
    })
    .catch(() => setErr('Couldn’t load the VAD.'))
  useEffect(() => { setSpec(null); void load() }, [dashId])
  // A change applied from Ask Voxio (a new widget, a rename) shows straight away.
  useEffect(() => {
    const on = () => void load()
    window.addEventListener('vx-applied', on)
    return () => window.removeEventListener('vx-applied', on)
  }, [dashId])

  const remove = async () => {
    await fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ remove: dashId }) })
    void navigate({ to: '/dashboard/dashboards' })
  }

  const status = !share ? '' : share.access === 'private' ? 'Not shared' : share.access === 'public' ? 'Shared · public' : 'Shared · sign-in'

  return (
    <div className="db-page vad-page">
      <div className="db-head">
        <div>
          <h1 className="db-h1">{tab === 'dashboard' ? spec?.title ?? 'VAD' : tab === 'users' ? 'Users' : 'Settings'}</h1>
          <p className="db-sub">{SUB[tab]}</p>
        </div>
        {status && <span className="db-chip vad-status">{status}</span>}
      </div>
      {err && <Notice kind="err">{err}</Notice>}
      {spec && tab === 'dashboard' && <Dashboard id={dashId} spec={spec} onSaved={setSpec} />}
      {share && tab === 'users' && (
        <>
          {share.access === 'private' && <Notice>This VAD isn’t shared yet, so users can’t sign in. Turn on Share this VAD in Settings.</Notice>}
          <UsersSection target={{ owner: dashId }} state={share} onChange={setShare} />
        </>
      )}
      {share && tab === 'settings' && (
        <>
          <AccessSection target={{ owner: dashId }} state={share} onChange={setShare} />
          <LookSection target={{ owner: dashId }} state={share} onChange={setShare} />
          <section className="db-setcard">
            <div className="db-setcard-head">
              <div>
                <h2 className="db-h2">Delete this VAD</h2>
                <p className="db-setcard-sub">Its widgets, users and link go too. Calls aren’t touched.</p>
              </div>
              <button type="button" className="db-btn db-danger" onClick={() => void remove()}>Delete</button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
