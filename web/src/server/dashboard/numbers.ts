// The Voxio team's Numbers screen: every number Voxio rents, who owns it and
// which flow answers it. Admins only. Ownership is written through Prisma in
// one transaction that also removes the number's attachment (its `numbers`
// row) whenever the owner changes, as the database service's
// assign_owned_number / release_owned_number do (docs/NUMBER_OWNERSHIP.md).
// The SDK has no ownership calls, so this is the one place that writes
// owned_numbers.

import { createServerFn } from '@tanstack/react-start'

import { db, withDb } from '#/server/db'
import { currentUser } from '#/server/session.server'
import type { Result } from '#/lib/dashboard/types'
import { forgetAllAccounts, isAdmin } from './store.server'

const wire = <T,>(r: Result<T>) => JSON.stringify(r)
const fail = (reason: string) => wire({ ok: false, reason })

export type AdminNumber = {
  phone_number: string
  provider: string
  owner: { id: string; email: string; name: string } | null
  /** The flow that answers it, if attached. */
  flow: { key: string; name: string; ownerEmail: string } | null
  added_at: string
}

/** A `numbers` row for a number Voxio doesn't list as rented: attached before ownership existed. */
export type LegacyAttachment = { phone_number: string; flow: { key: string; name: string } | null; userEmail: string }

export type NumberAdmin = {
  numbers: AdminNumber[]
  legacy: LegacyAttachment[]
  users: { id: string; email: string; name: string }[]
}

/** "+91 98765-43210" → "+919876543210"; null when it isn't a phone number. */
export function cleanNumber(raw: string): string | null {
  const n = raw.replace(/[^\d+]/g, '')
  const withPlus = n.startsWith('+') ? n : `+${n}`
  return /^\+\d{8,15}$/.test(withPlus) ? withPlus : null
}

/** The signed-in user, if an admin. */
async function admin() {
  const me = await currentUser()
  return me && (await isAdmin(me)) ? me : null
}

/** Whether the signed-in user is an admin, for showing admin-only screens. */
export const getAmAdmin = createServerFn({ method: 'GET' }).handler(async (): Promise<boolean> => !!(await admin()))

export const getNumberAdmin = createServerFn({ method: 'GET' }).handler(async (): Promise<string> => {
  if (!(await admin())) return fail('Only the Voxio team can see this page.')
  const [owned, attached, users] = await withDb(() => Promise.all([
    db.ownedNumber.findMany({ orderBy: { phoneNumber: 'asc' }, include: { assignedUser: { select: { id: true, email: true, name: true } } } }),
    db.phoneNumber.findMany({ select: { phoneNumber: true, flow: { select: { apiKey: true, flowName: true } }, user: { select: { email: true } } } }),
    db.user.findMany({ orderBy: { email: 'asc' }, select: { id: true, email: true, name: true } }),
  ]))
  const byNumber = new Map(attached.map((a) => [a.phoneNumber, a]))
  const rented = new Set(owned.map((o) => o.phoneNumber))
  return wire<NumberAdmin>({
    ok: true,
    data: {
      numbers: owned.map((o) => {
        const a = byNumber.get(o.phoneNumber)
        return {
          phone_number: o.phoneNumber,
          provider: o.provider,
          owner: o.assignedUser ? { id: o.assignedUser.id, email: o.assignedUser.email, name: o.assignedUser.name ?? '' } : null,
          flow: a?.flow ? { key: a.flow.apiKey, name: a.flow.flowName, ownerEmail: a.user.email } : null,
          added_at: o.createdAt.toISOString(),
        }
      }),
      legacy: attached.filter((a) => !rented.has(a.phoneNumber)).map((a) => ({
        phone_number: a.phoneNumber,
        flow: a.flow ? { key: a.flow.apiKey, name: a.flow.flowName } : null,
        userEmail: a.user.email,
      })),
      users: users.map((u) => ({ id: u.id, email: u.email, name: u.name ?? '' })),
    },
  })
})

/** Adds a number Voxio rents, optionally owned by a user straight away. */
export const addNumber = createServerFn({ method: 'POST' })
  .inputValidator((d: { phone: string; provider?: string; userId?: string | null }) => d)
  .handler(async ({ data }): Promise<string> => {
    if (!(await admin())) return fail('Only the Voxio team can add numbers.')
    const phone = cleanNumber(data.phone)
    if (!phone) return fail('Enter the number with its country code, e.g. +91 80 4567 8901.')
    const exists = await withDb(() => db.ownedNumber.findUnique({ where: { phoneNumber: phone } }))
    if (exists) return fail(`${phone} is already on the list.`)
    await withDb(() => db.ownedNumber.create({ data: { phoneNumber: phone, provider: data.provider?.trim() || 'plivo', assignedUserId: data.userId || null } }))
    forgetAllAccounts()
    return wire({ ok: true, data: phone })
  })

/**
 * Gives a number to a user, or takes it back (`userId: null`). When the owner
 * changes, the number is detached from whatever flow answered it, so the old
 * owner's flow stops answering at once.
 */
export const setNumberOwner = createServerFn({ method: 'POST' })
  .inputValidator((d: { phone: string; userId: string | null }) => d)
  .handler(async ({ data }): Promise<string> => {
    if (!(await admin())) return fail('Only the Voxio team can change who owns a number.')
    const row = await withDb(() => db.ownedNumber.findUnique({ where: { phoneNumber: data.phone } }))
    if (!row) return fail('That number isn’t on the list.')
    if ((row.assignedUserId ?? null) === (data.userId ?? null)) return wire({ ok: true, data: null })
    if (data.userId && !(await withDb(() => db.user.findUnique({ where: { id: data.userId! }, select: { id: true } })))) return fail('That user no longer exists.')
    const detached = await withDb(() => db.$transaction(async (tx) => {
      await tx.ownedNumber.update({ where: { phoneNumber: data.phone }, data: { assignedUserId: data.userId } })
      return (await tx.phoneNumber.deleteMany({ where: { phoneNumber: data.phone } })).count
    }))
    forgetAllAccounts()
    return wire({ ok: true, data: null, note: detached ? 'It was detached from its flow.' : undefined })
  })

/** Removes a number from the list entirely (Voxio no longer rents it), with its attachment. */
export const removeNumber = createServerFn({ method: 'POST' })
  .inputValidator((d: { phone: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    if (!(await admin())) return fail('Only the Voxio team can remove numbers.')
    await withDb(() => db.$transaction([
      db.phoneNumber.deleteMany({ where: { phoneNumber: data.phone } }),
      db.ownedNumber.deleteMany({ where: { phoneNumber: data.phone } }),
    ]))
    forgetAllAccounts()
    return wire({ ok: true, data: null })
  })

/** Detaches a legacy attachment (a number Voxio doesn't list), after review. */
export const removeLegacyAttachment = createServerFn({ method: 'POST' })
  .inputValidator((d: { phone: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    if (!(await admin())) return fail('Only the Voxio team can do this.')
    const rented = await withDb(() => db.ownedNumber.findUnique({ where: { phoneNumber: data.phone } }))
    if (rented) return fail('That number is on the list now; change its owner instead.')
    await withDb(() => db.phoneNumber.deleteMany({ where: { phoneNumber: data.phone } }))
    forgetAllAccounts()
    return wire({ ok: true, data: null })
  })
