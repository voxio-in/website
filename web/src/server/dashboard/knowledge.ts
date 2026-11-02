// Knowledge base server functions for the Knowledge page. Uploads (add and replace a
// document) go through /api/knowledge (multipart); everything else is here. See
// knowledge.server.ts for how the backend and Neon stay in step.

import { createServerFn } from '@tanstack/react-start'

import { currentUser } from '#/server/session.server'
import type { KbSettings, Result } from '#/lib/dashboard/types'
import { accountClient } from './flows.server'
import { DEFAULT_EMBEDDING, forgetKb, mirrorKb, notFound, ownsDoc, ownsKb } from './knowledge.server'

const wire = <T,>(r: Result<T>) => JSON.stringify(r)
const fail = (reason: string) => wire({ ok: false, reason })
const errMsg = (e: unknown) => (e as Error)?.message ?? String(e)

type KbOp =
  | { op: 'create'; name: string; model?: string; settings?: KbSettings }
  | { op: 'rename'; id: string; name: string }
  | { op: 'settings'; id: string; settings: KbSettings }
  | { op: 'delete'; id: string }
  | { op: 'retryDocument'; doc: string }
  | { op: 'deleteDocument'; doc: string }

export const knowledgeOp = createServerFn({ method: 'POST' })
  .inputValidator((d: { op: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    const a = JSON.parse(data.op) as KbOp
    if ('id' in a && !(await ownsKb(me, a.id))) return fail('Knowledge base not found.')
    if ('doc' in a && !(await ownsDoc(me, a.doc))) return fail('Document not found.')
    try {
      const kbs = (await accountClient(me)).knowledgeBases
      switch (a.op) {
        case 'create': {
          const kb = await kbs.create(a.name.trim() || 'Untitled', {
            embeddings: { model: a.model || DEFAULT_EMBEDDING },
            ...(a.settings && Object.keys(a.settings).length ? { settings: a.settings } : {}),
          })
          mirrorKb(me)
          return wire({ ok: true, data: { id: kb.id } })
        }
        case 'rename': await kbs.update(a.id, { name: a.name.trim() || 'Untitled' }); break
        case 'settings': await kbs.update(a.id, { settings: a.settings }); break
        case 'delete':
          try { await kbs.delete(a.id) } catch (e) { if (!notFound(e)) throw e }
          await forgetKb(me, a.id)
          return wire({ ok: true, data: null })
        case 'retryDocument': await kbs.retryDocument(a.doc); break
        case 'deleteDocument':
          try { await kbs.deleteDocument(a.doc) } catch (e) { if (!notFound(e)) throw e }
          break
      }
      mirrorKb(me)
    } catch (e) {
      if (notFound(e) && 'id' in a) { await forgetKb(me, a.id); return fail('That knowledge base no longer exists.') }
      return fail(errMsg(e))
    }
    return wire({ ok: true, data: null })
  })

/** A fresh signed link to a document's original, valid for an hour. Never stored. */
export const documentLink = createServerFn({ method: 'POST' })
  .inputValidator((d: { doc: string }) => d)
  .handler(async ({ data }): Promise<string> => {
    const me = await currentUser()
    if (!me) return fail('Please log in again.')
    if (!(await ownsDoc(me, data.doc))) return fail('Document not found.')
    try {
      const doc = await (await accountClient(me)).knowledgeBases.getDocument(data.doc)
      return doc.url ? wire({ ok: true, data: doc.url }) : fail('No link for this document.')
    } catch (e) { return fail(errMsg(e)) }
  })
