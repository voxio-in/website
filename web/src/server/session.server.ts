// Server-only half of dashboard auth: password hashing, sessions and "who is
// this request". Never import this from a route or component — pages call the
// server functions in auth.ts, which use this inside their handlers.
//
// Passwords: scrypt with a random per-user salt, compared in constant time.
// Sessions: a random 32-byte token in an httpOnly cookie; only its SHA-256 is
// stored (AuthSession.tokenHash), so a database read can't be replayed as a login.

import { deleteCookie, getCookie, getRequestHeader, getRequestIP, setCookie } from '@tanstack/react-start/server'
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

import bcrypt from 'bcryptjs'

import { db, withDb } from '#/server/db'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>

const COOKIE = 'vx_session'
const SESSION_DAYS = 30
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

export type AuthUser = { id: string; email: string; name: string }

// ------------------------------------------------------------ passwords

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Accounts copied from the old backend (scripts/migrate-mongo.mjs) may hold bcrypt.
  if (isBcrypt(stored)) return bcrypt.compare(password, stored)
  const [algo, n, r, p, saltB64, hashB64] = stored.split('$')
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const got = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem })
  return got.length === expected.length && timingSafeEqual(got, expected)
}

export const isBcrypt = (stored: string) => /^\$2[aby]\$\d\d\$/.test(stored)

// A real-looking hash to compare against when the email doesn't exist, so a
// login for an unknown email takes as long as one for a known email.
let decoy: Promise<string> | null = null
export const decoyHash = () => (decoy ??= hashPassword(randomBytes(12).toString('hex')))

// ------------------------------------------------------------ sessions

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const safe = <T,>(f: () => T): T | undefined => { try { return f() } catch { return undefined } }

export async function startSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5)
  await withDb(() => db.authSession.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      ip: safe(() => getRequestIP({ xForwardedFor: true })) ?? null,
      userAgent: safe(() => getRequestHeader('user-agent'))?.slice(0, 300) ?? null,
    },
  }))
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function endSession() {
  const token = getCookie(COOKIE)
  if (token) seen.delete(sha256(token))
  if (token) await withDb(() => db.authSession.deleteMany({ where: { tokenHash: sha256(token) } }))
  deleteCookie(COOKIE, { path: '/' })
}

/** The signed-in user for this request, or null. */
// Every server call checks the cookie; remembering the answer for a minute
// saves a database round trip on each one. Logging out clears the entry.
const seen = new Map<string, { at: number; user: AuthUser | null }>()

export async function currentUser(): Promise<AuthUser | null> {
  const token = getCookie(COOKIE)
  if (!token) return null
  const hash = sha256(token)
  const hit = seen.get(hash)
  if (hit && Date.now() - hit.at < 60_000) return hit.user
  const session = await withDb(() => db.authSession.findUnique({ where: { tokenHash: hash }, include: { user: true } }))
  const user = !session || session.expiresAt.getTime() < Date.now() ? null : { id: session.user.id, email: session.user.email, name: session.user.name }
  seen.set(hash, { at: Date.now(), user })
  return user
}

/** Drop remembered sign-ins, e.g. after a user's name changes. */
export function forgetSessions() {
  seen.clear()
}
