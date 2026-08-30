// The enquiry form on /contact.
//
// This used to compose a mailto: draft and hand it to the visitor's mail app,
// which meant every enquiry depended on them having a mail client configured
// and on the address in that link being live. It was not. Nothing was stored
// and nothing was sent, so the form looked like it worked and lost everything
// put into it.
//
// It writes to the database now. The ContactSubmission table has been in the
// schema the whole time with nothing writing to it — this is what it is for.

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { db, withDb } from '#/server/db'

export type ContactInput = {
  name: string
  org: string
  email: string
  surface: string
  message: string
}

export type ContactResult = { ok: true } | { ok: false; reason: string }

/** Enough to keep a bored visitor from filling the table, not a real defence. */
const MAX_PER_IP_PER_DAY = Number(process.env.CONTACT_LIMIT_PER_IP_DAY) || 8

/* Long enough for a real enquiry and short enough that the column cannot be
   used as storage. The textarea is the only field anyone writes prose into. */
const LIMITS = { name: 120, org: 160, email: 200, surface: 80, message: 4000 }

function clientIp(): string | null {
  const h = getRequest().headers
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip')
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/* Deliberately permissive. The browser has already applied type="email", and a
   stricter pattern here would reject real addresses to prevent a typo the
   sender is the one who suffers from. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const submitContact = createServerFn({ method: 'POST' })
  .inputValidator((data: ContactInput) => data)
  .handler(async ({ data }): Promise<ContactResult> => {
    const name = clean(data.name, LIMITS.name)
    const email = clean(data.email, LIMITS.email)

    if (!name || !email) {
      return { ok: false, reason: 'Please give a name and an email address.' }
    }
    if (!looksLikeEmail(email)) {
      return { ok: false, reason: 'That email address does not look right.' }
    }

    const ip = clientIp()
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    if (ip) {
      const used = await withDb(() =>
        db.contactSubmission.count({
          where: { ip, createdAt: { gte: dayAgo } },
        }),
      )
      if (used >= MAX_PER_IP_PER_DAY) {
        return {
          ok: false,
          reason: 'We already have a few from you today — we will be in touch.',
        }
      }
    }

    await withDb(() =>
      db.contactSubmission.create({
        data: {
          name,
          email,
          org: clean(data.org, LIMITS.org) || null,
          surface: clean(data.surface, LIMITS.surface) || null,
          message: clean(data.message, LIMITS.message) || null,
          ip,
          userAgent: getRequest().headers.get('user-agent'),
        },
      }),
    )

    return { ok: true }
  })
