// VAD endpoints (docs §10.10).
// GET  /api/vad               → the user's dashboards
// GET  /api/vad?id=…          → one dashboard (owner)
// POST /api/vad {create}      → a new dashboard on a flow, with a starter spec
// POST /api/vad {save}        → save a spec (validated by normalize)
// POST /api/vad {remove}      → delete one
// POST /api/vad {rotateKey}   → a new read key (shown once; only its hash is kept)
// POST /api/vad {widget}      → one widget's numbers. Allowed for the owner (login),
//                               anyone holding that dashboard's key (x-vad-key header),
//                               or a viewer of its shared page (widget.view = slug).
//                               Only a saved widget can be asked for: never a query.
// Sharing (src/server/vad/share.server.ts):
// GET  /api/vad?view=<slug>   → a shared dashboard: brand, and the spec if this browser may see it
// POST /api/vad {viewLogin}   → a viewer signs in (user id + password); {viewLogout} signs out
// POST /api/vad {share}       → owner: access (private | login | public) and brand
// VAD users (viewers) only read: settings and users are changed by the owner, inside Voxio.
// POST /api/vad {addViewer} / {removeViewer} → owner: viewer logins

import { createHash, randomBytes } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'

import { db, withDb } from '#/server/db'
import { currentUser } from '#/server/session.server'
import { normalize, starter, type Range, type Spec, type Where } from '#/lib/vad/spec'
import { runWidget } from '#/server/vad/query.server'
import { addViewer, applyShare, signUp, brandOut, listViewers, openShared, viewerLogin, viewerLogout, viewerSpec } from '#/server/vad/share.server'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const hash = (k: string) => createHash('sha256').update(k).digest('hex')
const newKey = () => `vad_${randomBytes(24).toString('base64url')}`

// A small per-key rate limit for shared links: 120 widget reads a minute.
const hits = new Map<string, { n: number; at: number }>()
function limited(key: string, max = 120) {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || now - h.at > 60_000) { hits.set(key, { n: 1, at: now }); return false }
  h.n++
  return h.n > max
}

export const Route = createFileRoute('/api/vad')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const slug = new URL(request.url).searchParams.get('view')
        if (slug) {
          const s = await openShared(request, slug)
          if (!s) return json({ ok: false, reason: 'This dashboard isn’t shared.' }, 404)
          return json({ ok: true, data: {
            title: s.d.title, brand: brandOut(s.d.brand), access: s.access, slug, signup: s.d.signup, viewer: s.viewer?.username ?? null,
            spec: s.allowed ? viewerSpec(s.d.spec as Spec) : null,
          } })
        }
        const me = await currentUser()
        if (!me) return json({ ok: false, reason: 'Please log in again.' }, 401)
        const id = new URL(request.url).searchParams.get('id')
        if (id) {
          const d = await withDb(() => db.dashboard.findFirst({ where: { id, userId: me.id } }))
          const viewers = d ? await listViewers(d.id) : []
          return d ? json({ ok: true, data: { id: d.id, title: d.title, spec: d.spec, updatedAt: d.updatedAt, shared: !!d.keyHash, access: d.access, slug: d.slug, signup: d.signup, brand: brandOut(d.brand), viewers } }) : json({ ok: false, reason: 'Dashboard not found.' }, 404)
        }
        const list = await withDb(() => db.dashboard.findMany({ where: { userId: me.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, spec: true, updatedAt: true } }))
        return json({ ok: true, data: list.map((d) => ({ id: d.id, title: d.title, flows: (d.spec as Spec).flows, widgets: (d.spec as Spec).widgets?.length ?? 0, updatedAt: d.updatedAt })) })
      },

      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          create?: { title: string; flow: string }; save?: { id: string; spec: unknown }; remove?: string; rotateKey?: string
          widget?: { dashboard?: string; view?: string; id: string; range?: Range; filters?: Where; tz?: string }
          viewLogin?: { slug: string; username: string; password: string; create?: boolean }; viewLogout?: boolean
          share?: { id: string; access?: string; brand?: unknown }
          addViewer?: { id: string; username: string; password: string }; removeViewer?: { id: string; viewer: string }
        }

        // A viewer of a shared page signs in or out.
        if (body.viewLogin) {
          const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'ip'
          if (limited(`login:${body.viewLogin.slug}:${ip}`, 10)) return json({ ok: false, reason: 'Too many tries. Wait a minute and try again.' }, 429)
          const d = await withDb(() => db.dashboard.findUnique({ where: { slug: String(body.viewLogin!.slug) }, select: { id: true, access: true, signup: true } }))
          if (!d || d.access !== 'login') return json({ ok: false, reason: 'This dashboard doesn’t use sign-in.' }, 404)
          if (body.viewLogin.create) {
            if (!d.signup) return json({ ok: false, reason: 'New accounts are turned off. Ask for a login.' }, 403)
            try { await signUp(d.id, body.viewLogin.username, body.viewLogin.password) } catch (e) { return json({ ok: false, reason: (e as Error).message }, 400) }
          }
          const cookie = await viewerLogin(d.id, body.viewLogin.username, body.viewLogin.password)
          if (!cookie) return json({ ok: false, reason: 'Wrong user id or password.' }, 401)
          return new Response(JSON.stringify({ ok: true, data: null }), { headers: { 'content-type': 'application/json', 'set-cookie': cookie } })
        }
        if (body.viewLogout) {
          return new Response(JSON.stringify({ ok: true, data: null }), { headers: { 'content-type': 'application/json', 'set-cookie': await viewerLogout(request) } })
        }

        // A shared page's widget: only if this browser may see that dashboard.
        if (body.widget?.view) {
          const s = await openShared(request, String(body.widget.view))
          if (!s || !s.allowed) return json({ ok: false, reason: s ? 'Please sign in again.' : 'This dashboard isn’t shared.' }, s ? 401 : 404)
          if (limited(`view:${body.widget.view}`, 600)) return json({ ok: false, reason: 'Too many requests. Try again in a minute.' }, 429)
          const spec = s.d.spec as Spec
          const w = spec.widgets.find((x) => x.id === body.widget!.id)
          if (!w) return json({ ok: false, reason: 'Widget not found.' }, 404)
          const allowed = new Set(spec.filters.map((f) => f.field))
          const filters = Object.fromEntries(Object.entries(body.widget.filters ?? {}).filter(([f]) => allowed.has(f) || f === 'channel'))
          try {
            const data = await runWidget(s.d.userId, spec, w, { range: body.widget.range, filters, maskCaller: s.maskCaller, tz: body.widget.tz })
            // Viewers can't open the owner's call pages.
            return json({ ok: true, data: data.kind === 'rows' ? { ...data, sessionIds: undefined } : data })
          } catch (e) {
            return json({ ok: false, reason: (e as Error).message }, 500)
          }
        }

        // Widget numbers: owner or key holder.
        if (body.widget) {
          const key = request.headers.get('x-vad-key')
          const me = key ? null : await currentUser()
          if (!key && !me) return json({ ok: false, reason: 'Please log in again.' }, 401)
          if (key && limited(key)) return json({ ok: false, reason: 'Too many requests. Try again in a minute.' }, 429)
          const d = await withDb(() => db.dashboard.findFirst({ where: key ? { id: String(body.widget!.dashboard), keyHash: hash(key) } : { id: String(body.widget!.dashboard), userId: me!.id } }))
          if (!d) return json({ ok: false, reason: 'Dashboard not found.' }, 404)
          const spec = d.spec as Spec
          const w = spec.widgets.find((x) => x.id === body.widget!.id)
          if (!w) return json({ ok: false, reason: 'Widget not found.' }, 404)
          // A key holder may only use the dashboard's own filter fields.
          const allowed = new Set(spec.filters.map((f) => f.field))
          const filters = Object.fromEntries(Object.entries(body.widget.filters ?? {}).filter(([f]) => !key || allowed.has(f)))
          try {
            return json({ ok: true, data: await runWidget(d.userId, spec, w, { range: body.widget.range, filters, maskCaller: !!key, tz: body.widget.tz }) })
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
        if (body.share) {
          const d = await withDb(() => db.dashboard.findFirst({ where: { id: body.share!.id, userId: me.id }, select: { id: true, slug: true, access: true, brand: true } }))
          if (!d) return json({ ok: false, reason: 'Dashboard not found.' }, 404)
          try { return json({ ok: true, data: await applyShare(d, body.share) }) } catch (e) { return json({ ok: false, reason: (e as Error).message }, 400) }
        }
        if (body.addViewer) {
          const d = await withDb(() => db.dashboard.findFirst({ where: { id: body.addViewer!.id, userId: me.id }, select: { id: true } }))
          if (!d) return json({ ok: false, reason: 'Dashboard not found.' }, 404)
          try { return json({ ok: true, data: await addViewer(d.id, body.addViewer.username, body.addViewer.password) }) } catch (e) { return json({ ok: false, reason: (e as Error).message }, 400) }
        }
        if (body.removeViewer) {
          await withDb(() => db.dashboardViewer.deleteMany({ where: { id: body.removeViewer!.viewer, dashboard: { id: body.removeViewer!.id, userId: me.id } } }))
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
