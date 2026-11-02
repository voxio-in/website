// A shared dashboard, outside the Voxio dashboard, in the owner's brand (logo, name, colour, theme).
// Public: the dashboard. Sign-in on: the sign-in page (and Create account, if the owner turned
// sign up on), then the dashboard. Read-only: settings and users are the owner's, inside Voxio.

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type CSSProperties } from 'react'

import { Dashboard } from '#/components/vad/Dashboard'
import type { Brand } from '#/components/vad/SharePanel'
import type { Spec } from '#/lib/vad/spec'

import '#/styles/bklit.css'
import '#/styles/dashboard.css'
import '#/styles/dashboard-ui.css'
import '#/styles/dashboard-theme.css'
import '#/styles/dashboard-controls.css'
import '#/styles/dashboard-pages.css'
import '#/styles/dashboard-m3.css'
import '#/styles/vad.css'

export const Route = createFileRoute('/v/$slug')({
  head: () => ({ meta: [{ title: 'Dashboard' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: SharedPage,
})

type Shared = { title: string; brand: Brand; access: 'login' | 'public'; slug: string; signup: boolean; viewer: string | null; spec: Spec | null }

/** The brand colour on the variables the dashboard and charts use. */
function brandStyle(b: Brand): CSSProperties {
  if (!b.accent) return {}
  return { '--db-accent': b.accent, '--db-accent-text': b.accent, '--chart-line-primary': b.accent, '--chart-crosshair': b.accent } as CSSProperties
}

const post = (body: unknown) => fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => null)

function SharedPage() {
  const { slug } = Route.useParams()
  const [data, setData] = useState<Shared | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = () => fetch(`/api/vad?view=${encodeURIComponent(slug)}`).then((r) => r.json())
    .then((r) => { if (r.ok) { setData(r.data); setErr(null) } else setErr(r.reason) }).catch(() => setErr('Couldn’t load the dashboard.'))
  useEffect(() => { void load() }, [slug])
  useEffect(() => { if (data) document.title = data.brand.name ? `${data.title} · ${data.brand.name}` : data.title }, [data])

  const b = data?.brand ?? {}
  const signOut = async () => { await post({ viewLogout: true }); void load() }

  return (
    <div className="db vad-public" data-theme={b.mode ?? 'light'} style={brandStyle(b)}>
      <header className="vad-public-head">
        {b.logo && <img src={b.logo} alt="" className="vad-public-logo" />}
        <div className="vad-public-titles">
          {b.name && <span className="vad-public-org">{b.name}</span>}
          <h1 className="vad-public-title">{data?.title ?? 'Dashboard'}</h1>
        </div>
        {data?.viewer ? (
          <span className="vad-public-user">{data.viewer} <button type="button" className="vad-btn" onClick={() => void signOut()}>Sign out</button></span>
        ) : null}
      </header>

      <main className="vad-public-main">
        {err && <p className="vad-err">{err}</p>}
        {!data && !err && <p className="vad-public-loading">Loading…</p>}
        {data && !data.spec && <SignIn slug={slug} signup={data.signup} onDone={() => void load()} />}
        {data?.spec && <Dashboard id={slug} view={slug} spec={data.spec} />}
      </main>
    </div>
  )
}

function SignIn({ slug, signup, onDone }: { slug: string; signup: boolean; onDone: () => void }) {
  const [create, setCreate] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    const r = await post({ viewLogin: { slug, username, password, create } })
    setBusy(false)
    if (r?.ok) onDone()
    else setErr(r?.reason ?? 'Couldn’t sign in.')
  }
  return (
    <form className="vad-signin" onSubmit={(e) => void submit(e)}>
      <h2 className="vad-signin-title">{create ? 'Create account' : 'Sign in'}</h2>
      <label className="vad-field"><span>User id</span><input className="vad-in" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
      <label className="vad-field"><span>Password{create ? ' (8+ characters)' : ''}</span><input className="vad-in" type="password" autoComplete={create ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={create ? 8 : undefined} /></label>
      {err && <p className="vad-err">{err}</p>}
      <button type="submit" className="vad-btn is-primary" disabled={busy}>{busy ? 'One moment…' : create ? 'Create account' : 'Sign in'}</button>
      {signup && <button type="button" className="vad-signin-switch" onClick={() => { setCreate(!create); setErr(null) }}>{create ? 'I have an account: sign in' : 'New here? Create an account'}</button>}
    </form>
  )
}
