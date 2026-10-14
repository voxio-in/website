// One VAD: its title and the widget grid (view, or edit: drag, resize, add, remove).

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Dashboard } from '#/components/vad/Dashboard'
import { Notice } from '#/components/dashboard/ui'
import type { Spec } from '#/lib/vad/spec'
import '#/styles/vad.css'

import { DASHBOARDS_ON } from '#/lib/features'

export const Route = createFileRoute('/dashboard/dashboards/$dashId')({
  beforeLoad: () => { if (!DASHBOARDS_ON) throw redirect({ to: '/dashboard' }) },
  component: DashboardPage,
})

function DashboardPage() {
  const { dashId } = Route.useParams()
  const navigate = useNavigate()
  const [spec, setSpec] = useState<Spec | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setSpec(null)
    fetch(`/api/vad?id=${encodeURIComponent(dashId)}`).then((r) => r.json()).then((r) => (r.ok ? setSpec(r.data.spec) : setErr(r.reason))).catch(() => setErr('Couldn’t load the dashboard.'))
  }, [dashId])

  const remove = async () => {
    await fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ remove: dashId }) })
    void navigate({ to: '/dashboard/dashboards' })
  }

  return (
    <div className="db-page vad-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">{spec?.title ?? 'Dashboard'}</h1>
          {spec?.description && <p className="db-sub">{spec.description}</p>}
        </div>
        {spec && <button type="button" className="db-btn db-danger db-btn-sm" onClick={() => void remove()}>Delete</button>}
      </header>
      {err && <Notice kind="err">{err}</Notice>}
      {spec && <Dashboard id={dashId} spec={spec} onSaved={setSpec} />}
    </div>
  )
}
