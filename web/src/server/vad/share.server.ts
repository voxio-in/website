// Shared dashboards at /v/<slug>. The owner picks who can open it:
//   private — only the owner, inside the dashboard
//   login   — viewer accounts the owner made (user id + password), caller numbers shown
//   public  — anyone with the link, caller numbers masked
// Viewers never get the spec's flow keys, never send a query (only pick a saved
// widget), and their session is scoped to the one dashboard it was made for.

import { createHash, randomBytes } from 'node:crypto'

import { db, withDb } from '#/server/db'
import { playableUrl, putObject } from '#/server/r2.server'
import { decoyHash, hashPassword, verifyPassword } from '#/server/session.server'
import type { Spec } from '#/lib/vad/spec'

export type Access = 'private' | 'login' | 'public'
export type Brand = { name?: string; logo?: string; accent?: string; mode?: 'dark' | 'light' }

const COOKIE = 'vx_vad'
const DAYS = 30
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
export const newSlug = () => randomBytes(9).toString('base64url')

const LOGO_MAX = 300_000 // characters of data URL (~220 KB image)

/**
 * Checks and cleans a brand. The logo is stored in R2 (logos/<dashboard>/<hash>.<ext>)
 * and only its key is saved: a new upload comes as a data URL, a kept one as the
 * key it already has (`current`), and no logo removes it. Throws a readable error.
 */
export async function cleanBrand(input: unknown, dashboardId: string, current?: string): Promise<Brand> {
  const b = (input ?? {}) as Record<string, unknown>
  const out: Brand = {}
  if (typeof b.name === 'string' && b.name.trim()) out.name = b.name.trim().slice(0, 80)
  if (typeof b.logo === 'string' && b.logo) {
    const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.logo)
    if (m) {
      if (b.logo.length > LOGO_MAX) throw new Error('The logo is too large: use an image under 200 KB.')
      const bytes = Buffer.from(m[2], 'base64')
      const key = `logos/${dashboardId}/${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`
      await putObject(key, bytes, `image/${m[1]}`)
      out.logo = key
    } else if (current && b.logo === 'keep') out.logo = current
    else throw new Error('The logo must be a PNG, JPEG or WebP image.')
  }
  if (typeof b.accent === 'string' && b.accent) {
    if (!/^#[0-9a-fA-F]{6}$/.test(b.accent)) throw new Error('The colour must look like #1a73e8.')
    out.accent = b.accent.toLowerCase()
  }
  if (b.mode === 'dark' || b.mode === 'light') out.mode = b.mode
  return out
}

export const cleanAccess = (a: unknown): Access => (a === 'login' || a === 'public' ? a : 'private')

/** The brand as a page gets it: the logo as a link the browser can load. */
export const brandOut = (brand: unknown): Brand => {
  const b = (brand ?? {}) as Brand
  return b.logo ? { ...b, logo: playableUrl(b.logo) } : b
}

/** Saves access, sign-up and/or brand (the owner only); makes the page's link on first use. */
export async function applyShare(d: { id: string; slug: string | null; access: string; brand: unknown }, patch: { access?: unknown; brand?: unknown; signup?: unknown }) {
  const access = patch.access === undefined ? d.access : cleanAccess(patch.access)
  const brand = patch.brand === undefined ? undefined : await cleanBrand(patch.brand, d.id, (d.brand as Brand | null)?.logo)
  const u = await withDb(() => db.dashboard.update({ where: { id: d.id }, data: { access, slug: d.slug ?? newSlug(), ...(brand ? { brand } : {}), ...(typeof patch.signup === 'boolean' ? { signup: patch.signup } : {}) }, select: { access: true, slug: true, brand: true, signup: true } }))
  return { ...u, brand: brandOut(u.brand) }
}

export const listViewers = (dashboardId: string) =>
  withDb(() => db.dashboardViewer.findMany({ where: { dashboardId }, orderBy: { createdAt: 'asc' }, select: { id: true, username: true, lastLoginAt: true } }))

/** User ids: 3–40 letters, digits, dot, dash, underscore. Passwords: at least 8 characters. */
export function checkViewer(username: unknown, password: unknown): { username: string; password: string } {
  const u = String(username ?? '').trim().toLowerCase()
  const p = String(password ?? '')
  if (!/^[a-z0-9._-]{3,40}$/.test(u)) throw new Error('User id: 3–40 letters, numbers, dots, dashes or underscores.')
  if (p.length < 8 || p.length > 200) throw new Error('Password: at least 8 characters.')
  return { username: u, password: p }
}

/** Someone with the link makes their own user. Never replaces an existing one. */
export async function signUp(dashboardId: string, username: unknown, password: unknown) {
  const v = checkViewer(username, password)
  const taken = await withDb(() => db.dashboardViewer.findUnique({ where: { dashboardId_username: { dashboardId, username: v.username } }, select: { id: true } }))
  if (taken) throw new Error('That user id is taken. Pick another, or sign in.')
  const passwordHash = await hashPassword(v.password)
  await withDb(() => db.dashboardViewer.create({ data: { dashboardId, username: v.username, passwordHash } }))
}

export async function addViewer(dashboardId: string, username: unknown, password: unknown) {
  const v = checkViewer(username, password)
  const passwordHash = await hashPassword(v.password)
  // Same user id again: a new password (and every signed-in browser of it signs out).
  const row = await withDb(() => db.dashboardViewer.upsert({
    where: { dashboardId_username: { dashboardId, username: v.username } },
    create: { dashboardId, username: v.username, passwordHash },
    update: { passwordHash, sessions: { deleteMany: {} } },
  }))
  return { id: row.id, username: row.username }
}

// ------------------------------------------------------------ viewer sessions

const cookieOf = (req: Request) =>
  (req.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)

const cookieHeader = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`

/** Signs a viewer in to one dashboard. Returns a Set-Cookie header, or null for a wrong id or password. */
export async function viewerLogin(dashboardId: string, username: unknown, password: unknown): Promise<string | null> {
  const u = String(username ?? '').trim().toLowerCase()
  const row = await withDb(() => db.dashboardViewer.findUnique({ where: { dashboardId_username: { dashboardId, username: u } } }))
  // Unknown ids take as long as known ones.
  const ok = await verifyPassword(String(password ?? ''), row?.passwordHash ?? (await decoyHash()))
  if (!row || !ok) return null
  const token = randomBytes(32).toString('base64url')
  // Each query is a round trip to the database (about half a second from India): run these together.
  await Promise.all([
    withDb(() => db.dashboardViewerSession.create({ data: { tokenHash: sha(token), viewerId: row.id, expiresAt: new Date(Date.now() + DAYS * 864e5) } })),
    withDb(() => db.dashboardViewer.update({ where: { id: row.id }, data: { lastLoginAt: new Date() } })),
  ])
  return cookieHeader(token, DAYS * 86400)
}

export async function viewerLogout(req: Request): Promise<string> {
  const t = cookieOf(req)
  if (t) await withDb(() => db.dashboardViewerSession.deleteMany({ where: { tokenHash: sha(t) } }))
  return cookieHeader('', 0)
}

/** The signed-in viewer of this dashboard, or null. */
export async function viewerOf(req: Request, dashboardId: string): Promise<{ id: string; username: string } | null> {
  const t = cookieOf(req)
  if (!t) return null
  const s = await withDb(() => db.dashboardViewerSession.findUnique({ where: { tokenHash: sha(t) }, include: { viewer: { select: { id: true, username: true, dashboardId: true } } } }))
  if (!s || s.expiresAt < new Date() || s.viewer.dashboardId !== dashboardId) return null
  return { id: s.viewer.id, username: s.viewer.username }
}

// ------------------------------------------------------------ what a viewer may see

/** The dashboard behind a slug, and whether this request may read it (and with caller numbers). */
export async function openShared(req: Request, slug: string) {
  const d = await withDb(() => db.dashboard.findUnique({ where: { slug } }))
  if (!d || d.access === 'private') return null
  const viewer = d.access === 'login' ? await viewerOf(req, d.id) : null
  return { d, access: d.access as Access, allowed: d.access === 'public' || !!viewer, viewer, maskCaller: d.access === 'public' }
}

/** The spec a viewer gets: no flow keys. */
export const viewerSpec = (spec: Spec): Spec => ({ ...spec, flows: [] })
