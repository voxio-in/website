// Knowledge bases through the SDK (voxioagent 3 `knowledgeBases`). Every write goes to the
// backend, which also writes knowledge_bases and knowledge_documents into the same Neon
// database, so nothing is mirrored here: after a write the cached account is dropped and the
// pages read the rows back through Prisma.

import { VoxioServerError } from 'voxioagent/server'

import { db, withDb } from '#/server/db'
import type { AuthUser } from '#/server/session.server'
import { forget } from './store.server'

export const DEFAULT_EMBEDDING = 'all-minilm-l6-v2'

/**
 * Whether this user may act on the base. A row owned by someone else is a no;
 * no row at all is left to the backend, which checks the account key.
 */
export async function ownsKb(me: AuthUser, id: string): Promise<boolean> {
  const row = await withDb(() => db.knowledgeBase.findUnique({ where: { id }, select: { userId: true } }))
  return !row || row.userId === me.id
}

/** Whether this user may act on the document (the same rule, through its base). */
export async function ownsDoc(me: AuthUser, id: string): Promise<boolean> {
  const row = await withDb(() => db.knowledgeDocument.findUnique({ where: { id }, select: { kb: { select: { userId: true } } } }))
  return !row || row.kb.userId === me.id
}

/** The backend has written the change to Neon; drop the cached account so pages read it. */
export function mirrorKb(me: AuthUser): void {
  forget(me.id)
}

/** Drops the row and the base's id from this user's flows (the backend does both too; this keeps the page right meanwhile). */
export async function forgetKb(me: AuthUser, id: string): Promise<void> {
  await withDb(async () => {
    const flows = await db.flow.findMany({ where: { userId: me.id, kbs: { has: id } }, select: { id: true, kbs: true } })
    await db.$transaction([
      ...flows.map((f) => db.flow.update({ where: { id: f.id }, data: { kbs: f.kbs.filter((k) => k !== id) } })),
      db.knowledgeBase.deleteMany({ where: { id, userId: me.id } }),
    ])
  })
  forget(me.id)
}

export const notFound = (e: unknown) => e instanceof VoxioServerError && e.code === 'not-found'
