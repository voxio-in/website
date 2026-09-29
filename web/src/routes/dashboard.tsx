// The customer dashboard shell: an icon rail, and — inside a flow only — a
// second panel with that flow's sections. No sign-in yet; the server acts as
// the single account in VOXIO_USER_API_KEY.

import { Link, Outlet, createFileRoute, redirect, useMatches, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import Icon, { type IconName } from '#/components/dashboard/Icon'
import { ThemeCtx } from '#/components/dashboard/ui'
import type { FlowDoc, Result } from '#/lib/dashboard/types'
import { getMe, logOut } from '#/server/auth'

import '#/styles/bklit.css'
import '#/styles/dashboard.css'
import '#/styles/dashboard-ui.css'
import '#/styles/dashboard-theme.css'
import '#/styles/dashboard-controls.css'
import '#/styles/dashboard-shell.css'
import '#/styles/dashboard-pages.css'
import '#/styles/dashboard-motion.css'

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard — Voxio' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  // Signed-out visitors go to the login page, and come back here after.
  beforeLoad: async ({ location }) => {
    const user = await getMe()
    if (!user) throw redirect({ to: '/login', search: { next: location.href } })
    return { user }
  },
  loader: ({ context }) => context.user,
  staleTime: 60_000,
  component: DashboardLayout,
})

const RAIL: { to: string; label: string; icon: IconName; exact?: boolean }[] = [
  { to: '/dashboard', label: 'Home', icon: 'home', exact: true },
  { to: '/dashboard/flows', label: 'Flows', icon: 'flows' },
  { to: '/dashboard/voices', label: 'Voices', icon: 'voice' },
  { to: '/dashboard/avatars', label: 'Avatars', icon: 'avatar' },
  { to: '/dashboard/knowledge', label: 'Knowledge', icon: 'book' },
  // Apps (integrations) is hidden for now; the page still exists.
  // { to: '/dashboard/integrations', label: 'Apps', icon: 'plug' },
  { to: '/dashboard/developers', label: 'Developers', icon: 'code' },
]

export const FLOW_SECTIONS: { title: string; items: { path: string; label: string; icon: IconName }[] }[] = [
  { title: '', items: [{ path: '', label: 'Overview', icon: 'home' }, { path: 'test', label: 'Test', icon: 'play' }] },
  {
    title: 'Build',
    items: [
      { path: 'workflow', label: 'Workflow', icon: 'flows' },
      { path: 'voice', label: 'Voice', icon: 'voice' },
      { path: 'behaviour', label: 'Behaviour', icon: 'sliders' },
      { path: 'avatar', label: 'Avatar', icon: 'avatar' },
      { path: 'vision', label: 'Vision', icon: 'eye' },
      { path: 'knowledge', label: 'Knowledge', icon: 'book' },
      // { path: 'integrations', label: 'Apps', icon: 'plug' },
    ],
  },
  {
    title: 'Connect',
    items: [
      { path: 'numbers', label: 'Numbers & calls', icon: 'phone' },
      { path: 'webhook', label: 'Webhook', icon: 'webhook' },
    ],
  },
]

const TITLES: Record<string, string> = {
  flows: 'Flows', voices: 'Voices', avatars: 'Avatars', knowledge: 'Knowledge',
  integrations: 'Apps', developers: 'Developers', settings: 'Settings',
}
const SECTION_LABEL = Object.fromEntries(FLOW_SECTIONS.flatMap((s) => s.items.map((i) => [i.path, i.label])))

type Crumb = { label: string; to?: string; params?: Record<string, string> }

function crumbsFor(pathname: string, flowName: string): Crumb[] {
  const parts = pathname.replace(/\/+$/, '').split('/').slice(2) // after /dashboard
  const out: Crumb[] = [{ label: 'Dashboard', to: '/dashboard' }]
  if (!parts.length) return [{ label: 'Dashboard' }, { label: 'Overview' }]
  out.push({ label: TITLES[parts[0]] ?? parts[0], to: `/dashboard/${parts[0]}` })
  if (parts[0] === 'flows' && parts[1]) {
    out.push({ label: flowName, to: '/dashboard/flows/$flowId', params: { flowId: decodeURIComponent(parts[1]) } })
    out.push({ label: SECTION_LABEL[parts[2] ?? ''] ?? 'Overview' })
  }
  delete out[out.length - 1].to
  return out
}

const THEME_KEY = 'vx-dash-theme'
const COLLAPSE_KEY = 'vx.dash.sidebar'

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const flowMatch = pathname.match(/^\/dashboard\/flows\/([^/]+)(?:\/([^/]+))?/)
  const flowKey = flowMatch ? decodeURIComponent(flowMatch[1]) : null
  const inWorkflow = flowMatch?.[2] === 'workflow'
  const flowName = useFlowName()

  // The main sidebar: the user's choice, remembered. Inside a flow it folds to
  // icons on its own so the flow's menu has the room.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1') } catch {} }, [])
  const toggleMain = () => setCollapsed((c) => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1') } catch {} return !c })

  // The flow menu folds away on the workflow canvas by default.
  const [panelOpen, setPanelOpen] = useState(!inWorkflow)
  useEffect(() => setPanelOpen(!inWorkflow), [inWorkflow])
  // Light or dark, remembered per browser.
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => { try { if (localStorage.getItem(THEME_KEY) === 'light') setTheme('light') } catch {} }, [])
  const toggleTheme = () => setTheme((t) => {
    const next = t === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(THEME_KEY, next) } catch {}
    return next
  })
  const [mobile, setMobile] = useState(false)
  useEffect(() => setMobile(false), [pathname])

  // Folding the flow menu shrinks it to icons (labels on hover) instead of hiding it.
  const showPanel = !!flowKey
  const panelMini = !!flowKey && !panelOpen
  const mainCollapsed = collapsed || !!flowKey
  const crumbs = crumbsFor(pathname, flowName)
  const up = [...crumbs].reverse().find((c) => c.to)

  return (
    <div className={`db${mainCollapsed ? ' is-collapsed' : ''}${showPanel ? ' has-panel' : ''}${panelMini ? ' panel-mini' : ''}${mobile ? ' nav-open' : ''}`} data-theme={theme}>
      <nav className="db-side2" aria-label="Dashboard">
        <Link to="/dashboard" className="db-side2-brand" data-tip="Voxio">
          <span className="db-va" aria-hidden>VA</span>
          <span className="db-side2-text">Voxio</span>
        </Link>
        <div className="db-side2-items">
          {RAIL.map((n) => (
            <Link key={n.to} to={n.to} className="db-side2-item" data-tip={n.label} activeOptions={{ exact: !!n.exact }} activeProps={{ className: 'is-active' }}>
              <Icon name={n.icon} size={20} />
              <span className="db-side2-text">{n.label}</span>
            </Link>
          ))}
        </div>
        <div className="db-side2-foot">
          <button type="button" className="db-side2-item db-theme-item" onClick={toggleTheme}
            data-tip={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} /><span className="db-side2-text">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <Link to="/dashboard/settings" className="db-side2-item" data-tip="Settings" activeProps={{ className: 'is-active' }}>
            <Icon name="settings" size={20} /><span className="db-side2-text">Settings</span>
          </Link>
          <UserRow />
          <LogOutItem />
        </div>
      </nav>

      {showPanel && flowKey && (
        <aside className="db-panel">
          <FlowPanel flowKey={flowKey} />
        </aside>
      )}

      <div className="db-col">
        <header className="db-topbar">
          <button className="db-iconbtn db-collapse" onClick={() => (flowKey ? setPanelOpen(!panelOpen) : toggleMain())}
            aria-label={flowKey ? (panelOpen ? 'Hide flow menu' : 'Show flow menu') : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={flowKey ? (panelOpen ? 'Hide flow menu' : 'Show flow menu') : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Icon name="panel" size={18} />
          </button>
          <button className="db-iconbtn db-burger2" onClick={() => setMobile(!mobile)} aria-label="Menu"><Icon name="list" size={18} /></button>
          {up && crumbs.length > 2 && (
            <Link to={up.to!} params={up.params as never} className="db-iconbtn" title={`Back to ${up.label}`} aria-label={`Back to ${up.label}`}>
              <Icon name="back" size={18} />
            </Link>
          )}
          <span className="db-topbar-sep" />
          <nav className="db-crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="db-crumb">
                {i > 0 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>}
                {c.to ? <Link to={c.to} params={c.params as never}>{c.label}</Link> : <b aria-current="page">{c.label}</b>}
              </span>
            ))}
          </nav>
        </header>
        <main className="db-main">
          <ThemeCtx.Provider value={theme}>
            <Outlet />
          </ThemeCtx.Provider>
        </main>
      </div>
    </div>
  )
}

/** The signed-in person. */
function UserRow() {
  const user = Route.useLoaderData()
  return (
    <div className="db-side2-item db-user" data-tip={user.name}>
      <span className="db-user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
      <span className="db-side2-text db-user-text"><b>{user.name}</b><small>{user.email}</small></span>
    </div>
  )
}

/** Its own rail item, so it stays reachable (as an icon) when the rail is collapsed. */
function LogOutItem() {
  const navigate = useNavigate()
  const router = useRouter()
  return (
    <button type="button" className="db-side2-item db-logout-item" data-tip="Log out"
      onClick={async () => { await logOut(); router.clearCache(); navigate({ to: '/login' }) }}>
      <Icon name="logout" size={20} /><span className="db-side2-text">Log out</span>
    </button>
  )
}

/** The open flow's name, from its route's loader. */
function useFlowName() {
  const matches = useMatches()
  const loaded = matches.find((m) => m.routeId === '/dashboard/flows/$flowId')?.loaderData as Result<FlowDoc> | undefined
  return loaded?.ok ? loaded.data.flow_name : 'Flow'
}

function FlowPanel({ flowKey }: { flowKey: string }) {
  // The flow's own loader already has it; read the name from there.
  const name = useFlowName()
  return (
    <>
      <div className="db-panel-head">
        <span className="db-panel-avatar" data-tip={name}>{name.slice(0, 1).toUpperCase()}</span>
        <span className="db-panel-title">{name}</span>
      </div>
      {FLOW_SECTIONS.map((s) => (
        <div key={s.title || 'top'} className="db-panel-group">
          {s.title && <span className="db-panel-label">{s.title}</span>}
          {s.items.map((it) => (
            <Link key={it.path} to={`/dashboard/flows/$flowId/${it.path}` as '/dashboard/flows/$flowId'} params={{ flowId: flowKey }}
              className="db-panel-item" data-tip={it.label} activeOptions={{ exact: true }} activeProps={{ className: 'is-active' }}>
              <Icon name={it.icon} size={18} />
              <span className="db-panel-name">{it.label}</span>
            </Link>
          ))}
        </div>
      ))}
    </>
  )
}
