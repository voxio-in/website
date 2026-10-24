// POST /api/faces — upload a face clip or photo through the SDK's faces.upload
// and hand back its UUID; the flow keeps it once its looks are saved.
// DELETE /api/faces?uuid=… — delete the face through the SDK.

import { createFileRoute } from '@tanstack/react-router'
import { VoxioServerError } from 'voxioagent/server'

import { accountClient } from '#/server/dashboard/flows.server'
import { db, withDb } from '#/server/db'
import { putObject, r2Ready } from '#/server/r2.server'
import { currentUser } from '#/server/session.server'
import { faceIdsOf } from '#/lib/dashboard/faces'

// The neutral crop for each detector: the raw box for s3fd, bbox_shift 0 for dwpose.
const BOX_INDEX = { s3fd: 0, dwpose: 4 } as const

const json = (body: unknown, status = 200) => Response.json(body, { status })
const errText = (e: unknown) => (e as Error)?.message ?? String(e)

/**
 * Keep a copy of what was uploaded in R2 (no egress fees) so the dashboard can
 * show the face itself. Best effort: a failed copy never fails the upload.
 */
async function savePreview(userId: string, uuid: string, file: File) {
  if (!r2Ready()) return
  try {
    const ext = (file.name.split('.').pop() || (file.type.startsWith('image/') ? 'jpg' : 'mp4')).toLowerCase().replace(/[^a-z0-9]/g, '')
    const key = `previews/faces/${uuid}.${ext}`
    await putObject(key, await file.arrayBuffer(), file.type || 'application/octet-stream')
    await withDb(async () => {
      const row = await db.face.findFirst({ where: { uuid, userId }, select: { media: true } })
      if (!row) return
      const media = { ...(row.media as Record<string, unknown>), preview: key, preview_type: file.type.startsWith('image/') ? 'image' : 'video' }
      await db.face.update({ where: { uuid }, data: { media } })
    })
  } catch (e) {
    console.error('[faces] preview copy failed', uuid, e)
  }
}

export const Route = createFileRoute('/api/faces')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const me = await currentUser()
        if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)

        const form = await request.formData()
        const file = form.get('file')
        const detector = form.get('detector') === 'dwpose' ? 'dwpose' : 's3fd'
        const label = String(form.get('label') ?? '').trim()
        if (!(file instanceof File)) return json({ ok: false, reason: 'Choose a video or photo first.' }, 400)

        try {
          const face = await (await accountClient(me)).faces.upload(file, { detector, boxIndex: BOX_INDEX[detector], fileName: file.name })
          // The SDK's upload takes no label, so the backend writes the face row without one; name it here.
          if (label) await withDb(() => db.face.updateMany({ where: { uuid: face.uuid, userId: me.id }, data: { label } }))
          await savePreview(me.id, face.uuid, file)
          return json({ ok: true, data: { uuid: face.uuid } })
        } catch (e) {
          return json({ ok: false, reason: errText(e) }, 502)
        }
      },

      DELETE: async ({ request }) => {
        const me = await currentUser()
        if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)
        const url = new URL(request.url)
        const uuid = url.searchParams.get('uuid') ?? ''
        if (uuid) {
          // Only the owner deletes a face, and not from under a flow unless they confirmed (?force=1).
          const own = await withDb(() => db.face.findFirst({ where: { uuid, userId: me.id }, select: { uuid: true } }))
          if (!own) return json({ ok: false, reason: 'Only the person who added this face can delete it.' }, 403)
          if (url.searchParams.get('force') !== '1') {
            const flows = await withDb(() => db.flow.findMany({ where: { userId: me.id }, select: { flowName: true, faces: true, runtime: true } }))
            const users = flows.filter((f) => !(f.runtime as { deleted_at?: string } | null)?.deleted_at && faceIdsOf(f.faces).includes(uuid)).map((f) => f.flowName)
            if (users.length) return json({ ok: false, reason: `Used by ${users.join(', ')}. Confirm to delete it anyway.`, inUse: users }, 409)
          }
          try {
            await (await accountClient(me)).faces.delete(uuid)
          } catch (e) {
            // Already gone there is fine; anything else is worth reporting.
            if (!(e instanceof VoxioServerError && e.code === 'not-found')) return json({ ok: false, reason: errText(e) }, 502)
          }
        }
        return json({ ok: true, data: null })
      },
    },
  },
})
