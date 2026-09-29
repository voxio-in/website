// Shared layout and fields for /login and /signup.

import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import Icon, { type IconName } from '#/components/dashboard/Icon'

import '#/styles/auth.css'

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'phone', text: 'Answer calls in natural voices, day and night' },
  { icon: 'flows', text: 'Design the conversation without writing code' },
  { icon: 'chart', text: 'See every call, minute and transcript' },
]

export function AuthLayout({ title, sub, children, foot }: { title: string; sub: string; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div className="au">
      <aside className="au-brand">
        <Link to="/" className="au-logo"><span className="au-va">VA</span>Voxio</Link>
        <div className="au-pitch">
          <h2>Voice agents that sound human.</h2>
          <ul>
            {POINTS.map((p) => (
              <li key={p.text}><span><Icon name={p.icon} size={17} /></span>{p.text}</li>
            ))}
          </ul>
        </div>
        <p className="au-small">© Voxio</p>
      </aside>
      <main className="au-main">
        <div className="au-card">
          <Link to="/" className="au-logo au-logo-sm"><span className="au-va">VA</span>Voxio</Link>
          <h1>{title}</h1>
          <p className="au-sub">{sub}</p>
          {children}
          <p className="au-foot">{foot}</p>
        </div>
      </main>
    </div>
  )
}

export function AuthField({ label, error, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const [shown, setShown] = useState(false)
  const isPw = input.type === 'password'
  return (
    <label className={`au-field${error ? ' has-err' : ''}`}>
      <span>{label}</span>
      <span className="au-inputwrap">
        <input {...input} type={isPw && shown ? 'text' : input.type} aria-invalid={!!error} />
        {isPw && (
          <button type="button" className="au-eye" onClick={() => setShown(!shown)} aria-label={shown ? 'Hide password' : 'Show password'}>
            <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
      </span>
      {error && <em>{error}</em>}
    </label>
  )
}

/** Where to go after signing in: only same-site paths, never another origin. */
export function safeNext(next: unknown): string {
  const n = typeof next === 'string' ? next : ''
  return n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard'
}
