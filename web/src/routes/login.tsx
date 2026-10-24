import { Link, createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AuthField, AuthGroup, AuthLayout, safeNext } from '#/components/auth/AuthPage'
import { getMe, logIn } from '#/server/auth'

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s.next === 'string' ? { next: s.next } : {}),
  beforeLoad: async ({ search }) => {
    if (await getMe()) throw redirect({ href: safeNext(search.next) })
  },
  head: () => ({ meta: [{ title: 'Log in — Voxio' }, { name: 'robots', content: 'noindex' }] }),
  component: Login,
})

function Login() {
  const { next } = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<{ text: string; field?: 'email' | 'password' } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return setErr({ text: 'Enter your email.', field: 'email' })
    if (!password) return setErr({ text: 'Enter your password.', field: 'password' })
    setBusy(true)
    setErr(null)
    try {
      const r = await logIn({ data: { login: email, password } })
      if (!r.ok) return setErr({ text: r.reason })
      // Drop anything cached for whoever was signed in before, then go. Not invalidate(): that
      // reloads this page first, a round trip just to be redirected away from it.
      router.clearCache()
      navigate({ href: safeNext(next) })
    } catch {
      setErr({ text: 'Something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" sub="Log in to manage your voice agents."
      foot={<>New to Voxio? <Link to="/signup" search={next ? { next } : {}}>Create an account</Link></>}
    >
      <form className="au-form" onSubmit={submit} noValidate>
        {/* Accounts from the old backend still log in by username; the server accepts either. */}
        <AuthGroup error={err?.field ? err.text : undefined}>
          <AuthField label="Email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required value={email} onChange={(e) => { setEmail(e.target.value); setErr(null) }} error={err?.field === 'email' ? err.text : undefined} />
          <AuthField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setErr(null) }} error={err?.field === 'password' ? err.text : undefined} />
        </AuthGroup>
        {/* No reset flow yet: send people to the contact form until one exists. */}
        <Link to="/contact" className="au-forgot">Forgot password?</Link>
        {err && !err.field && <div className="au-alert" role="alert">{err.text} <Link to="/contact">Reset it with us</Link></div>}
        <button className="au-submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthLayout>
  )
}
