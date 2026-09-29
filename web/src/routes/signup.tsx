import { Link, createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AuthField, AuthLayout, safeNext } from '#/components/auth/AuthPage'
import { getMe, signUp } from '#/server/auth'

export const Route = createFileRoute('/signup')({
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s.next === 'string' ? { next: s.next } : {}),
  beforeLoad: async ({ search }) => {
    if (await getMe()) throw redirect({ href: safeNext(search.next) })
  },
  head: () => ({ meta: [{ title: 'Create your account — Voxio' }, { name: 'robots', content: 'noindex' }] }),
  component: Signup,
})

const RULES = [
  { test: (p: string) => p.length >= 8, text: 'At least 8 characters' },
  { test: (p: string) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), text: 'A letter and a number' },
]

function Signup() {
  const { next } = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const pwOk = RULES.every((r) => r.test(password))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const r = await signUp({ data: { name, email, password } })
      if (!r.ok) return setErr({ text: r.reason, field: r.field })
      // Drop anything cached for whoever was signed in before.
      router.clearCache()
      await router.invalidate()
      navigate({ href: safeNext(next) })
    } catch {
      setErr({ text: 'Something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const fieldErr = (f: string) => (err?.field === f ? err.text : undefined)

  return (
    <AuthLayout title="Create your account" sub="Set up your first voice agent in minutes."
      foot={<>Already have an account? <Link to="/login" search={next ? { next } : {}}>Log in</Link></>}>
      <form className="au-form" onSubmit={submit} noValidate>
        {err && !err.field && <div className="au-alert" role="alert">{err.text}</div>}
        <AuthField label="Your name" autoComplete="name" autoFocus required value={name} onChange={(e) => setName(e.target.value)} error={fieldErr('name')} />
        <AuthField label="Work email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr('email')} />
        <AuthField label="Password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErr('password')} />
        <ul className="au-rules">
          {RULES.map((r) => <li key={r.text} className={r.test(password) ? 'is-ok' : ''}>{r.text}</li>)}
        </ul>
        <button className="au-submit" disabled={busy || !name.trim() || !email || !pwOk}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  )
}
