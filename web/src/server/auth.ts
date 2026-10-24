// Dashboard auth as server functions: sign up, log in, log out, "who am I".
// Pages import these; everything that touches cookies, hashing or the session
// table lives in session.server.ts and is only used inside the handlers, so it
// never reaches the browser bundle.

import { createServerFn } from '@tanstack/react-start'

import { db, withDb } from '#/server/db'
import { currentUser, decoyHash, endSession, forgetSessions, hashPassword, isBcrypt, startSession, verifyPassword, type AuthUser } from '#/server/session.server'
import { newKey, primeRole } from '#/server/dashboard/store.server'

export type { AuthUser }
export type AuthResult = { ok: true; user: AuthUser } | { ok: false; reason: string; field?: 'name' | 'email' | 'password' }

const normEmail = (e: string) => e.trim().toLowerCase()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function checkPassword(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (pw.length > 200) return 'That password is too long.'
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use at least one letter and one number.'
  return null
}

const SIGNUP_OFF: boolean = false

export const signUp = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; email: string; password: string }) => d)
  .handler(async ({ data }): Promise<AuthResult> => {
    // Sign-up is off for now; set SIGNUP_OFF to false to bring it back.
    if (SIGNUP_OFF) return { ok: false, reason: 'Sign-up is closed. Ask your admin for an account.' }
    const name =String(data.name ?? '').trim().slice(0, 80)
    const email = normEmail(String(data.email ?? ''))
    const password = String(data.password ?? '')
    if (!name) return { ok: false, reason: 'Tell us your name.', field: 'name' }
    if (!EMAIL.test(email)) return { ok: false, reason: 'That email doesn’t look right.', field: 'email' }
    const weak = checkPassword(password)
    if (weak) return { ok: false, reason: weak, field: 'password' }

    const exists = await withDb(() => db.user.findUnique({ where: { email }, select: { id: true } }))
    if (exists) return { ok: false, reason: 'An account with this email already exists. Try logging in.', field: 'email' }

    const hashed = await hashPassword(password)
    const user = await withDb(() => db.user.create({ data: { name, email, password: hashed, apiKey: newKey('user') } }))
    const me = { id: user.id, email: user.email, name: user.name }
    await startSession(user.id, me)
    primeRole(user.id, user.role)
    return { ok: true, user: me }
  })

/**
 * Exact username first. Ignoring case only when that finds exactly one account:
 * the old backend has "admin" and "Admin" as two different users.
 */
async function findByUsername(username: string) {
  const exact = await withDb(() => db.user.findUnique({ where: { username } }))
  if (exact) return exact
  const loose = await withDb(() => db.user.findMany({ where: { username: { equals: username, mode: 'insensitive' } }, take: 2 }))
  return loose.length === 1 ? loose[0] : null
}

export const logIn = createServerFn({ method: 'POST' })
  .inputValidator((d: { login: string; password: string }) => d)
  .handler(async ({ data }): Promise<AuthResult> => {
    // An email, or a username: accounts from the old backend logged in by username.
    const login = String(data.login ?? '').trim()
    const password = String(data.password ?? '')
    const user = login.includes('@')
      ? await withDb(() => db.user.findUnique({ where: { email: normEmail(login) } }))
      : login ? await findByUsername(login) : null
    // Always run a hash check so response time doesn't reveal whether the account exists.
    const ok = await verifyPassword(password, user?.password ?? (await decoyHash()))
    if (!user || !ok) return { ok: false, reason: 'That login and password don’t match.' }
    // Upgrade an imported bcrypt hash to scrypt now that we have the password. In the
    // background: the person is signed in either way, and the next login retries if it fails.
    if (isBcrypt(user.password)) {
      void hashPassword(password)
        .then((upgraded) => withDb(() => db.user.update({ where: { id: user.id }, data: { password: upgraded } })))
        .catch((e) => console.warn(`password upgrade for ${user.id} failed: ${(e as Error).message}`))
    }
    const me = { id: user.id, email: user.email, name: user.name }
    // The first dashboard page needs who this is and whether they're an admin; both are known now.
    await startSession(user.id, me)
    primeRole(user.id, user.role)
    return { ok: true, user: me }
  })

export const logOut = createServerFn({ method: 'POST' }).handler(async () => {
  await endSession()
  return { ok: true }
})

export const getMe = createServerFn({ method: 'GET' }).handler(async (): Promise<AuthUser | null> => currentUser())

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }): Promise<AuthResult> => {
    const me = await currentUser()
    if (!me) return { ok: false, reason: 'Please log in again.' }
    const name = String(data.name ?? '').trim().slice(0, 80)
    if (!name) return { ok: false, reason: 'Name can’t be empty.', field: 'name' }
    const user = await withDb(() => db.user.update({ where: { id: me.id }, data: { name } }))
    forgetSessions()
    return { ok: true, user: { id: user.id, email: user.email, name: user.name } }
  })
