import { Link, createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AuthField, AuthLayout, safeNext } from '#/components/auth/AuthPage'
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
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const r = await logIn({ data: { login: email, password } })
      if (!r.ok) return setErr(r.reason)
      router.clearCache()
      await router.invalidate()
      navigate({ href: safeNext(next) })
    } catch {
      setErr('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" sub="Log in to manage your voice agents."
      foot={<>New to Voxio? <Link to="/signup" search={next ? { next } : {}}>Create an account</Link></>}>
      <form className="au-form" onSubmit={submit} noValidate>
        {err && <div className="au-alert" role="alert">{err}</div>}
        <AuthField label="Email or username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="au-submit" disabled={busy || !email || !password}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthLayout>
  )
}
