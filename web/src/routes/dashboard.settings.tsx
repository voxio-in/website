import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { Label } from '#/components/dashboard/controls'
import { Loading, Notice } from '#/components/dashboard/ui'
import { getMe, updateProfile } from '#/server/auth'

export const Route = createFileRoute('/dashboard/settings')({
  loader: () => getMe(),
  component: Settings,
})

function Settings() {
  const me = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState(me?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const save = async () => {
    setBusy(true)
    const r = await updateProfile({ data: { name } })
    setBusy(false)
    setMsg(r.ok ? { kind: 'ok', text: 'Saved.' } : { kind: 'err', text: r.reason })
    if (r.ok) router.invalidate()
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Settings</h1>
          <p className="db-sub">Your account.</p>
        </div>
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2">Profile</h2></div>
        <div className="db-knobs">
          <div className="db-knob-row">
            <Label>Name</Label>
            <div className="db-knob-ctl"><input className="db-in" value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div className="db-knob-row">
            <Label info="The email you log in with.">Email</Label>
            <div className="db-knob-ctl"><input className="db-in" value={me?.email ?? ''} readOnly /></div>
          </div>
        </div>
        <div className="db-setcard-foot">
          <button className="db-btn db-primary" disabled={busy || !name.trim() || name.trim() === me?.name} onClick={save}>{busy ? <Loading inline label="Saving…" /> : 'Save'}</button>
        </div>
      </section>

    </div>
  )
}
