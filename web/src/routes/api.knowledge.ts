// /api/knowledge: PDF uploads through the SDK. POST adds a document (`kb`, `file`);
// PUT replaces one and keeps its id (`doc`, `file`). Both take optional `settings`
// (chunk_size, overlap) and `metadata` as JSON. They return at once with the document
// processing; the backend writes its progress to Neon, and the page polls that.

import { createFileRoute } from '@tanstack/react-router'
import { VoxioServerError } from 'voxioagent/server'

import { forgetKb, mirrorKb, notFound, ownsDoc, ownsKb } from '#/server/dashboard/knowledge.server'
import { accountClient } from '#/server/dashboard/flows.server'
import { currentUser, type AuthUser } from '#/server/session.server'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const errText = (e: unknown) => (e as Error)?.message ?? String(e)

const MAX_BYTES = 50 * 1024 * 1024

/** A JSON object form field, or undefined when empty or not an object. */
const parse = (v: FormDataEntryValue | null) => {
  if (typeof v !== 'string' || !v.trim()) return undefined
  try {
    const o = JSON.parse(v)
    return o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length ? o : undefined
  } catch { return undefined }
}

async function upload(request: Request, run: (me: AuthUser, form: FormData, file: File) => Promise<Response>) {
  const me = await currentUser()
  if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return json({ ok: false, reason: 'Choose a PDF first.' }, 400)
  if (!file.name.toLowerCase().endsWith('.pdf')) return json({ ok: false, reason: 'Only PDF documents can be added.' }, 400)
  if (file.size > MAX_BYTES) return json({ ok: false, reason: 'Documents can be up to 50 MB.' }, 400)
  try {
    return await run(me, form, file)
  } catch (e) {
    // The same file twice, or a replace while it is still processing: the backend's message as is.
    if (e instanceof VoxioServerError && e.code === 'conflict') return json({ ok: false, reason: e.message }, 409)
    return json({ ok: false, reason: errText(e) }, 502)
  }
}

const options = (form: FormData, file: File) => ({ fileName: file.name, settings: parse(form.get('settings')), metadata: parse(form.get('metadata')) })

export const Route = createFileRoute('/api/knowledge')({
  server: {
    handlers: {
      POST: ({ request }) => upload(request, async (me, form, file) => {
        const kb = String(form.get('kb') ?? '')
        if (!kb || !(await ownsKb(me, kb))) return json({ ok: false, reason: 'Knowledge base not found.' }, 404)
        try {
          const doc = await (await accountClient(me)).knowledgeBases.addDocument(kb, await file.arrayBuffer(), options(form, file))
          mirrorKb(me)
          return json({ ok: true, data: { id: doc.id, status: doc.status } })
        } catch (e) {
          if (notFound(e)) { await forgetKb(me, kb); return json({ ok: false, reason: 'That knowledge base no longer exists.' }, 404) }
          throw e
        }
      }),
      PUT: ({ request }) => upload(request, async (me, form, file) => {
        const doc = String(form.get('doc') ?? '')
        if (!doc || !(await ownsDoc(me, doc))) return json({ ok: false, reason: 'Document not found.' }, 404)
        const r = await (await accountClient(me)).knowledgeBases.replaceDocument(doc, await file.arrayBuffer(), options(form, file))
        mirrorKb(me)
        return json({ ok: true, data: r })
      }),
    },
  },
})
