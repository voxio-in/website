// VAD endpoints (docs §10.10).
// GET  /api/vad               → the user's dashboards
// GET  /api/vad?id=…          → one dashboard (owner)
// POST /api/vad {create}      → a new dashboard on a flow, with a starter spec
// POST /api/vad {save}        → save a spec (validated by normalize)
// POST /api/vad {remove}      → delete one
// POST /api/vad {rotateKey}   → a new read key (shown once; only its hash is kept)
// POST /api/vad {widget}      → one widget's numbers. Allowed for the owner (login) or
//                               anyone holding that dashboard's key (x-vad-key header).
//                               Only a saved widget can be asked for: never a query.

import { createHash, randomBytes } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'

import { db, withDb } from '#/server/db'
import { currentUser } from '#/server/session.server'
import { normalize, starter, type Range, type Spec, type Where } from '#/lib/vad/spec'
import { runWidget } from '#/server/vad/query.server'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const hash = (k: string) => createHash('sha256').update(k).digest('hex')
const newKey = () => `vad_${randomBytes(24).toString('base64url')}`

// A small per-key rate limit for shared links: 120 widget reads a minute.
const hits = new Map<string, { n: number; at: number }>()
function limited(key: string) {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || now - h.at > 60_000) { hits.set(key, { n: 1, at: now }); return false }
  h.n++
  return h.n > 120
}

export const Route = createFileRoute('/api/vad')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const me = await currentUser()
        if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)
        const id = new URL(request.url).searchParams.get('id')
        if (id) {
          const d = await withDb(() => db.dashboard.findFirst({ where: { id, userId: me.id } }))
          return d ? json({ ok: true, data: { id: d.id, title: d.title, spec: d.spec, updatedAt: d.updatedAt, shared: !!d.keyHash } }) : json({ ok: false, reason: 'Dashboard not found.' }, 404)
        }
        const list = await withDb(() => db.dashboard.findMany({ where: { userId: me.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, spec: true, updatedAt: true } }))
        return json({ ok: true, data: list.map((d) => ({ id: d.id, title: d.title, flows: (d.spec as Spec).flows, widgets: (d.spec as Spec).widgets?.length ?? 0, updatedAt: d.updatedAt })) })
      },

      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          create?: { title: string; flow: string }; save?: { id: string; spec: unknown }; remove?: string; rotateKey?: string
          widget?: { dashboard: string; id: string; range?: Range; filters?: Where }
        }

        // Widget numbers: owner or key holder.
        if (body.widget) {
          const key = request.headers.get('x-vad-key')
          const me = key ? null : await currentUser()
          if (!key && !me) return json({ ok: false, reason: 'Please log in again.' }, 401)
          if (key && limited(key)) return json({ ok: false, reason: 'Too many requests. Try again in a minute.' }, 429)
          const d = await withDb(() => db.dashboard.findFirst({ where: key ? { id: body.widget!.dashboard, keyHash: hash(key) } : { id: body.widget!.dashboard, userId: me!.id } }))
          if (!d) return json({ ok: false, reason: 'Dashboard not found.' }, 404)
          const spec = d.spec as Spec
          const w = spec.widgets.find((x) => x.id === body.widget!.id)
          if (!w) return json({ ok: false, reason: 'Widget not found.' }, 404)
          // A key holder may only use the dashboard's own filter fields.
          const allowed = new Set(spec.filters.map((f) => f.field))
          const filters = Object.fromEntries(Object.entries(body.widget.filters ?? {}).filter(([f]) => !key || allowed.has(f)))
          try {
            return json({ ok: true, data: await runWidget(d.userId, spec, w, { range: body.widget.range, filters, maskCaller: !!key }) })
          } catch (e) {
            return json({ ok: false, reason: (e as Error).message }, 500)
          }
        }

        const me = await currentUser()
        if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)

        if (body.create) {
          const flow = await withDb(() => db.flow.findFirst({ where: { userId: me.id, apiKey: body.create!.flow }, select: { apiKey: true, flowName: true } }))
          if (!flow) return json({ ok: false, reason: 'Flow not found.' }, 404)
          const spec = starter(body.create.title?.trim() || `${flow.flowName} dashboard`, flow.apiKey)
          const d = await withDb(() => db.dashboard.create({ data: { userId: me.id, title: spec.title, spec } }))
          return json({ ok: true, data: { id: d.id } })
        }
        if (body.save) {
          const r = normalize(body.save.spec)
          if (!r.ok) return json({ ok: false, reason: r.errors.join(' ') }, 400)
          const owned = await withDb(() => db.flow.count({ where: { userId: me.id, OR: r.spec.flows.map((k) => ({ apiKey: { startsWith: k.replace(/…$/, '') } })) } }))
          if (owned < 1) return json({ ok: false, reason: 'Those flows aren’t on your account.' }, 400)
          const n = await withDb(() => db.dashboard.updateMany({ where: { id: body.save!.id, userId: me.id }, data: { title: r.spec.title, spec: r.spec } }))
          return n.count ? json({ ok: true, data: r.spec }) : json({ ok: false, reason: 'Dashboard not found.' }, 404)
        }
        if (body.remove) {
          await withDb(() => db.dashboard.deleteMany({ where: { id: body.remove!, userId: me.id } }))
          return json({ ok: true, data: null })
        }
        if (body.rotateKey) {
          const key = newKey()
          const n = await withDb(() => db.dashboard.updateMany({ where: { id: body.rotateKey!, userId: me.id }, data: { keyHash: hash(key) } }))
          return n.count ? json({ ok: true, data: { key } }) : json({ ok: false, reason: 'Dashboard not found.' }, 404)
        }
        return json({ ok: false, reason: 'Nothing asked.' }, 400)
      },
    },
  },
})
