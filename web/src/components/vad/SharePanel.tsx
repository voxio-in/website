// A VAD's Users and Settings, for its owner inside Voxio, built from the dashboard's own parts
// (setting cards, toggles, connected groups, icon groups). VAD users never see these: they only
// sign in and read the dashboard at /v/<slug>.

import { useState } from 'react'

import Icon from '#/components/dashboard/Icon'
import { Label } from '#/components/dashboard/controls'
import { Toggle } from '#/components/dashboard/ui'

export type Brand = { name?: string; logo?: string; accent?: string; mode?: 'dark' | 'light' }
export type Viewer = { id: string; username: string; lastLoginAt: string | null }
export type Access = 'private' | 'login' | 'public'
export type ShareState = { access: Access; slug: string | null; signup: boolean; brand: Brand; viewers: Viewer[] }

type Result = { ok: boolean; reason?: string; data?: any }
const post = (body: unknown): Promise<Result> => fetch('/api/vad', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ ok: false, reason: 'Couldn’t reach the server.' }))

/** The owner's endpoints, by dashboard id. */
export type Target = { owner: string }
const call = (t: Target) => ({
  share: (p: object) => post({ share: { id: t.owner, ...p } }),
  add: (u: string, pw: string) => post({ addViewer: { id: t.owner, username: u, password: pw } }),
  remove: (v: string) => post({ removeViewer: { id: t.owner, viewer: v } }),
})

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never')

/** Share, Public and Sign up as toggles, then the link with Copy and Open. */
export function AccessSection({ target, state, onChange }: { target: Target; state: ShareState; onChange: (s: ShareState) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const shared = state.access !== 'private'
  const link = state.slug && typeof window !== 'undefined' ? `${window.location.origin}/v/${state.slug}` : null
  const set = async (patch: { access?: Access; signup?: boolean }) => {
    setBusy(true); setErr(null)
    const r = await call(target).share(patch)
    setBusy(false)
    if (!r.ok) return setErr(r.reason ?? 'Couldn’t save.')
    onChange({ ...state, ...r.data })
  }
  return (
    <section className="db-setcard">
      <div className="db-setcard-head">
        <div>
          <h2 className="db-h2">Access</h2>
          <p className="db-setcard-sub">Who can open this VAD outside Voxio.</p>
        </div>
      </div>
      <div className="db-knobs">
        <div className="db-knob-row">
          <Label info="Gives the VAD its own link outside Voxio. Off: only you, inside Voxio.">Share this VAD</Label>
          <div className="db-knob-ctl"><Toggle on={shared} disabled={busy} onChange={(v) => void set({ access: v ? 'login' : 'private' })} /></div>
        </div>
        <div className="db-knob-row">
          <Label info="On: anyone with the link sees it without signing in, and caller numbers are hidden. Off: only users you add (or who sign up) get in, and they see caller numbers.">Public</Label>
          <div className="db-knob-ctl"><Toggle on={state.access === 'public'} disabled={busy || !shared} onChange={(v) => void set({ access: v ? 'public' : 'login' })} /></div>
        </div>
        <div className="db-knob-row">
          <Label info="Adds “Create account” to the sign-in page, so people with the link can make their own user. They show under Users.">Sign up</Label>
          <div className="db-knob-ctl"><Toggle on={state.signup} disabled={busy || !shared || state.access === 'public'} onChange={(v) => void set({ signup: v })} /></div>
        </div>
      </div>
      {shared && link && (
        <div className="db-btngroup db-lookgroup vad-linkgroup" role="group" aria-label="Link">
          <span className="db-gfield is-wide">
            <span className="db-look-cap">Link</span>
            <input className="db-in" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          </span>
          <span className="db-btngroup is-icons">
            <button type="button" className="db-gbtn db-gbtn-tall" aria-label="Copy link"
              onClick={() => { void navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
              <Icon name={copied ? 'check' : 'copy'} size={18} /><span className="db-gbtn-label">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <a className="db-gbtn db-gbtn-tall" href={link} target="_blank" rel="noreferrer" aria-label="Open link">
              <Icon name="eye" size={18} /><span className="db-gbtn-label">Open</span>
            </a>
          </span>
        </div>
      )}
      {err && <p className="db-fhelp vad-err">{err}</p>}
    </section>
  )
}

/** Add a user (user id + password + Add, one group), and the users as rows. */
export function UsersSection({ target, state, onChange }: { target: Target; state: ShareState; onChange: (s: ShareState) => void }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [shown, setShown] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const add = async () => {
    setErr(null); setBusy(true)
    const r = await call(target).add(user, pass)
    setBusy(false)
    if (!r.ok) return setErr(r.reason ?? 'Couldn’t add.')
    onChange({ ...state, viewers: [...state.viewers.filter((v) => v.username !== r.data.username), { ...r.data, lastLoginAt: null }] })
    setUser(''); setPass('')
  }
  const remove = async (v: Viewer) => {
    setErr(null)
    const r = await call(target).remove(v.id)
    if (!r.ok) return setErr(r.reason ?? 'Couldn’t remove.')
    onChange({ ...state, viewers: state.viewers.filter((x) => x.id !== v.id) })
  }
  return (
    <section className="db-setcard">
      <div className="db-setcard-head">
        <div>
          <h2 className="db-h2">Users</h2>
          <p className="db-setcard-sub">People who can sign in to this VAD. They can’t sign in to Voxio.</p>
        </div>
      </div>
      <form className="db-btngroup db-lookgroup" onSubmit={(e) => { e.preventDefault(); void add() }}>
        <label className="db-gfield">
          <span className="db-look-cap">User id</span>
          <input className="db-in" placeholder="e.g. admissions" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" />
        </label>
        <label className="db-gfield">
          <span className="db-look-cap">Password</span>
          <input className="db-in" type={shown ? 'text' : 'password'} placeholder="8 or more characters" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
        </label>
        <button type="button" className="db-gbtn db-gbtn-tall" aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown(!shown)}>
          <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
        </button>
        <button type="submit" className="db-gbtn db-gbtn-tall is-lead" disabled={busy || !user || pass.length < 8}>
          <Icon name="plus" size={18} />Add user
        </button>
      </form>
      <p className="db-fhelp">Passwords are stored encrypted and can’t be shown again: give it to the person now. Adding an existing user id again sets a new password.</p>
      {state.viewers.length > 0 && (
        <div className="vad-users">
          {state.viewers.map((v) => (
            <div key={v.id} className="db-btngroup db-lookgroup" role="group" aria-label={v.username}>
              <span className="db-gfield">
                <span className="db-look-cap">User id</span>
                <span className="vad-user-id">{v.username}</span>
              </span>
              <span className="db-gfield">
                <span className="db-look-cap">Password</span>
                <span className="vad-user-id">••••••••</span>
              </span>
              <span className="db-gfield">
                <span className="db-look-cap">Last signed in</span>
                <span className="vad-user-id">{when(v.lastLoginAt)}</span>
              </span>
              <button type="button" className="db-gbtn db-gbtn-tall is-danger" aria-label={`Remove ${v.username}`} onClick={() => void remove(v)}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      {err && <p className="db-fhelp vad-err">{err}</p>}
    </section>
  )
}

/** Name + accent colour in one group; theme + logo in another. The logo is stored in R2. */
export function LookSection({ target, state, onChange }: { target: Target; state: ShareState; onChange: (s: ShareState) => void }) {
  const [brand, setBrand] = useState<Brand>(state.brand)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(brand) !== JSON.stringify(state.brand)
  const pickLogo = (f: File | undefined) => {
    if (!f) return
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return setErr('The logo must be a PNG, JPEG or WebP image.')
    if (f.size > 200_000) return setErr('The logo is too large: use an image under 200 KB.')
    setErr(null)
    const rd = new FileReader()
    rd.onload = () => setBrand((b) => ({ ...b, logo: String(rd.result) }))
    rd.readAsDataURL(f)
  }
  const save = async () => {
    setBusy(true); setErr(null); setSaved(false)
    // A logo already saved comes back as a link: tell the server to keep it.
    const logo = brand.logo ? (brand.logo.startsWith('data:') ? brand.logo : 'keep') : undefined
    const r = await call(target).share({ brand: { ...brand, logo } })
    setBusy(false)
    if (!r.ok) return setErr(r.reason ?? 'Couldn’t save.')
    onChange({ ...state, ...r.data }); setBrand(r.data.brand); setSaved(true)
  }
  const accent = brand.accent ?? '#0f9e83'
  return (
    <section className="db-setcard">
      <div className="db-setcard-head">
        <div>
          <h2 className="db-h2">Look</h2>
          <p className="db-setcard-sub">How the VAD’s page looks to the people you share it with.</p>
        </div>
        <button type="button" className="db-btn db-primary" disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Saving…' : saved && !dirty ? 'Saved' : 'Save'}</button>
      </div>
      <div className="db-btngroup db-lookgroup" role="group" aria-label="Name and colour">
        <label className="db-gfield is-wide">
          <span className="db-look-cap">Name shown on top</span>
          <input className="db-in" value={brand.name ?? ''} placeholder="e.g. Subodh Public School" onChange={(e) => setBrand({ ...brand, name: e.target.value })} />
        </label>
        <label className="db-gbtn db-gbtn-tall vad-colorbtn">
          <span className="db-gbtn-stack"><span className="db-look-cap">Accent colour</span><code>{accent}</code></span>
          <span className="vad-swatch" style={{ background: accent }} />
          <input type="color" value={accent} onChange={(e) => setBrand({ ...brand, accent: e.target.value })} aria-label="Accent colour" />
        </label>
      </div>
      <div className="db-btngroup db-lookgroup" role="group" aria-label="Theme and logo">
        <button type="button" className={`db-gbtn db-gbtn-tall${(brand.mode ?? 'light') === 'light' ? ' is-on' : ''}`} onClick={() => setBrand({ ...brand, mode: 'light' })}>
          <Icon name="sun" size={18} />Light
        </button>
        <button type="button" className={`db-gbtn db-gbtn-tall${brand.mode === 'dark' ? ' is-on' : ''}`} onClick={() => setBrand({ ...brand, mode: 'dark' })}>
          <Icon name="moon" size={18} />Dark
        </button>
        <label className="db-gbtn db-gbtn-tall vad-logobtn">
          {brand.logo ? <img src={brand.logo} alt="" /> : <Icon name="plus" size={18} />}
          <span className="db-gbtn-stack"><span className="db-look-cap">Logo</span><span>{brand.logo ? 'Change' : 'Upload'} · PNG, JPEG, WebP</span></span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickLogo(e.target.files?.[0])} />
        </label>
        {brand.logo && (
          <button type="button" className="db-gbtn db-gbtn-tall is-danger" aria-label="Remove logo" onClick={() => setBrand({ ...brand, logo: undefined })}>
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>
      {err && <p className="db-fhelp vad-err">{err}</p>}
    </section>
  )
}
