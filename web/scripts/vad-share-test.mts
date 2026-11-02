// End-to-end check of VAD sharing against Neon, without a server: calls the real /api/vad
// handlers (the viewer side) and the share functions the owner side uses. Makes a throwaway
// dashboard on the given flow and deletes it (and its users) at the end.
// Usage: npx tsx scripts/vad-share-test.mts <flow api key>

import { PrismaClient } from '@prisma/client'
import { starter } from '#/lib/vad/spec'
import { addViewer, applyShare } from '#/server/vad/share.server'
import { Route } from '#/routes/api.vad'

const key = process.argv[2]
if (!key) throw new Error('Pass a flow api key.')
const db = new PrismaClient()
const flow = await db.flow.findUnique({ where: { apiKey: key }, select: { apiKey: true, flowName: true, userId: true } })
if (!flow) throw new Error('No flow with that key.')

const h = (Route.options as any).server.handlers
const base = 'http://test.local/api/vad'
const get = async (q: string, cookie = '') => (await h.GET({ request: new Request(`${base}?${q}`, { headers: { cookie } }) })) as Response
const post = async (body: unknown, cookie = '') => (await h.POST({ request: new Request(base, { method: 'POST', headers: { 'content-type': 'application/json', cookie, 'x-forwarded-for': '10.0.0.1' }, body: JSON.stringify(body) }) })) as Response
const body = async (r: Response) => r.json() as Promise<any>
const cookieOf = (r: Response) => (r.headers.get('set-cookie') ?? '').split(';')[0]

let pass = 0, fail = 0
const check = (name: string, ok: boolean, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`) }

const spec = starter('Sharing test', flow.apiKey)
const tableId = spec.widgets.find((w) => w.type === 'table')?.id ?? 'none'
const d = await db.dashboard.create({ data: { userId: flow.userId, title: spec.title, spec } })
try {
  // Private: nobody outside gets in.
  const priv = await applyShare({ id: d.id, slug: null, access: 'private', brand: {} }, {})
  const slug = priv.slug!
  check('private: page is not shared', (await get(`view=${slug}`)).status === 404)

  // Public, with a brand.
  const pub = await applyShare({ id: d.id, slug, access: 'private', brand: {} }, { access: 'public', brand: { name: 'Test School', accent: '#1A73E8', mode: 'dark' } })
  check('public: settings saved', pub.access === 'public' && pub.brand.accent === '#1a73e8' && pub.brand.name === 'Test School')
  const pv = await body(await get(`view=${slug}`))
  check('public: page opens with no sign-in', pv.ok && !!pv.data.spec)
  check('public: flow keys not sent', pv.ok && pv.data.spec.flows.length === 0)
  const calls = await body(await post({ widget: { view: slug, id: 'calls', range: '90d' } }))
  check('public: widget numbers', calls.ok && calls.data.kind === 'kpi', calls.ok ? `calls = ${calls.data.value}` : calls.reason)
  const table = await body(await post({ widget: { view: slug, id: tableId, range: '90d' } }))
  const masked = table.ok && table.data.rows.every((r: any) => !r.caller || /[•*x]/i.test(String(r.caller)))
  check('public: caller numbers hidden', masked, table.ok ? `${table.data.rows.length} rows, first caller ${table.data.rows[0]?.caller ?? '-'}` : table.reason)
  check('public: rows don\'t open calls', table.ok && !table.data.sessionIds)
  check('public: sign-in refused', (await post({ viewLogin: { slug, username: 'x', password: 'y' } })).status === 404)

  // Sign-in.
  await applyShare({ id: d.id, slug, access: 'public', brand: pub.brand }, { access: 'login' })
  const locked = await body(await get(`view=${slug}`))
  check('sign-in: page shows sign-in, no dashboard', locked.ok && locked.data.spec === null && locked.data.brand.name === 'Test School')
  check('sign-in: widget refused without sign-in', (await post({ widget: { view: slug, id: 'calls' } })).status === 401)
  await addViewer(d.id, 'Admissions', 'school-pass-1')
  check('sign-in: wrong password refused', (await post({ viewLogin: { slug, username: 'admissions', password: 'wrong-pass' } })).status === 401)
  const ok = await post({ viewLogin: { slug, username: 'admissions', password: 'school-pass-1' } })
  const c = cookieOf(ok)
  check('sign-in: right password works, cookie set', ok.status === 200 && c.startsWith('vx_vad='))
  const inside = await body(await get(`view=${slug}`, c))
  check('sign-in: dashboard after sign-in', inside.ok && !!inside.data.spec && inside.data.viewer === 'admissions')
  const t2 = await body(await post({ widget: { view: slug, id: tableId, range: '90d' } }, c))
  check('sign-in: caller numbers shown', t2.ok, t2.ok ? `first caller ${t2.data.rows[0]?.caller ?? '- (no calls)'}` : t2.reason)

  // A cookie for this dashboard doesn't open another one.
  const other = await db.dashboard.create({ data: { userId: flow.userId, title: 'Other', spec, access: 'login', slug: `${slug}x` } })
  check('sign-in: cookie only works on its own dashboard', (await body(await get(`view=${slug}x`, c))).data.spec === null)
  await db.dashboard.delete({ where: { id: other.id } })

  // VAD users can't change anything.
  // No viewer endpoint changes settings: the request falls to the owner check, which needs a
  // Voxio login (on the real server: 401; here, outside it, reading the cookie throws).
  let refused = false
  try { refused = !(await body(await post({ viewShare: { slug, access: 'public' } }, c))).ok } catch { refused = true }
  const after = await db.dashboard.findUnique({ where: { id: d.id }, select: { access: true } })
  check('viewer: can\'t change settings', refused && after?.access === 'login')

  // Sign up.
  const off = await body(await post({ viewLogin: { slug, username: 'stranger', password: 'stranger-pass', create: true } }))
  check('sign up off: Create account refused', !off.ok)
  await applyShare({ id: d.id, slug, access: 'login', brand: pub.brand }, { signup: true })
  const taken = await body(await post({ viewLogin: { slug, username: 'admissions', password: 'takeover-pass', create: true } }))
  check('sign up: existing user id can\'t be taken over', !taken.ok)
  const still = await post({ viewLogin: { slug, username: 'admissions', password: 'school-pass-1' } })
  check('sign up: original password still works', still.status === 200)
  const made = await post({ viewLogin: { slug, username: 'parent1', password: 'parent-pass', create: true } })
  check('sign up: new account made and signed in', made.status === 200 && cookieOf(made).startsWith('vx_vad='))
  const users = await db.dashboardViewer.findMany({ where: { dashboardId: d.id }, select: { username: true } })
  check('sign up: shows in Users', users.some((u) => u.username === 'parent1'), users.map((u) => u.username).join(', '))

  // Sign out.
  const out = await post({ viewLogout: true }, c)
  check('sign out: session ends', (await body(await get(`view=${slug}`, c))).data.spec === null && out.status === 200)

  // Logo in R2 (needs the R2 settings in .env).
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  try {
    const withLogo = await applyShare({ id: d.id, slug, access: 'login', brand: {} }, { brand: { name: 'Test School', logo: png } })
    const saved = await db.dashboard.findUnique({ where: { id: d.id }, select: { brand: true } })
    const keyOk = String((saved?.brand as any)?.logo ?? '').startsWith(`logos/${d.id}/`)
    const res = withLogo.brand.logo ? await fetch(withLogo.brand.logo) : null
    check('logo: stored in R2, only its key saved', keyOk, String((saved?.brand as any)?.logo))
    check('logo: link loads', !!res?.ok, res ? `${res.status} ${res.headers.get('content-type')}` : 'no link')
  } catch (e) {
    check('logo: stored in R2', false, (e as Error).message)
  }
  try { await applyShare({ id: d.id, slug, access: 'login', brand: {} }, { brand: { logo: 'data:image/svg+xml;base64,PHN2Zz4=' } }); check('logo: SVG refused', false) } catch { check('logo: SVG refused', true) }
} finally {
  await db.dashboard.delete({ where: { id: d.id } })
  console.log(`\n${pass} passed, ${fail} failed. Test dashboard deleted (logo object left in R2 under logos/${d.id}/).`)
  await db.$disconnect()
}
