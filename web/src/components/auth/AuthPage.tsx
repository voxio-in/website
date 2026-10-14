// Shared layout and fields for /login and /signup.

import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { AsciiAssembly } from '#/components/AsciiAssembly'
import Icon from '#/components/dashboard/Icon'

import '#/styles/ascii-assembly.css'
import '#/styles/auth.css'

export function AuthLayout({ title, sub, children, foot }: { title: string; sub: string; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div className="au">
      <aside className="au-brand">
        <Link to="/" className="au-logo"><span className="au-va">VA</span>Voxio</Link>
        <AsciiAssembly className="au-art" caption="Voice agents that sound human." />
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
