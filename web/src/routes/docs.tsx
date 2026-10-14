// /docs — the developer documentation. Under the site's navbar, its own shell:
// a sub-bar, sidebar, page and outline, because people read it, search it and
// keep it open beside their editor. Content lives in src/lib/docs/pages.tsx.

import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import {
  AiChat02Icon, Alert02Icon, Analytics01Icon, BookOpen01Icon, Call02Icon, Clock01Icon, CodeIcon, CursorMagicSelection02Icon,
  Globe02Icon, Key01Icon, Mic01Icon, PaintBoardIcon, ReactIcon, Rocket01Icon, ServerStack01Icon, UserCircleIcon,
  WebhookIcon, WorkflowSquare01Icon,
} from '@hugeicons/core-free-icons'

import { BranchedMenu, type BranchedItem } from '#/components/ui/BranchedMenu'
import { outline } from '#/lib/docs/markdown'
import { GROUPS, SDK_VERSION, type DocPage } from '#/lib/docs/pages'

/** The icon beside each page in the sidebar. */
const PAGE_ICON: Record<string, typeof Rocket01Icon> = {
  introduction: BookOpen01Icon, quickstart: Rocket01Icon, authentication: Key01Icon, environments: Globe02Icon,
  'script-tag': CodeIcon, 'voice-button': Mic01Icon, avatar: UserCircleIcon, chat: AiChat02Icon, react: ReactIcon,
  customising: PaintBoardIcon, sessions: Clock01Icon, 'web-actions': CursorMagicSelection02Icon, errors: Alert02Icon,
  server: ServerStack01Icon, flows: WorkflowSquare01Icon, 'sessions-usage': Analytics01Icon, webhooks: WebhookIcon,
  'phone-calls': Call02Icon,
}

/** What the sidebar search matches: title, summary and section headings. */
const searchText = new Map<DocPage, string>()
const haystack = (p: DocPage) => {
  if (!searchText.has(p)) searchText.set(p, `${p.title} ${p.summary} ${outline(p).map((t) => t.label).join(' ')}`.toLowerCase())
  return searchText.get(p)!
}

import '#/styles/docs.css'

export const Route = createFileRoute('/docs')({
  component: DocsShell,
})

const item = (p: DocPage): BranchedItem => ({ value: p.slug, label: p.title, icon: PAGE_ICON[p.slug] })

/** A group's pages as a tree: pages with a parent hang under it. */
function treeOf(pages: DocPage[]): BranchedItem[] {
  const kids = (slug?: string): BranchedItem[] => pages.filter((p) => p.parent === slug).map((p) => ({ ...item(p), children: kids(p.slug) }))
  return kids(undefined)
}

function DocsShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const slug = pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '') || 'introduction'
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  // A new page closes the mobile menu and starts at the top.
  useEffect(() => {
    setMenu(false)
    window.scrollTo(0, 0)
  }, [slug])

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return GROUPS
    return GROUPS.map((g) => ({
      ...g,
      pages: g.pages.filter((p) => haystack(p).includes(needle)),
    })).filter((g) => g.pages.length)
  }, [q])

  return (
    <div className="docs">
      <header className="docs-top">
        <button className="docs-menu" type="button" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <span /><span /><span />
        </button>
        <Link to="/docs" className="docs-brand">Docs</Link>
        <span className="docs-version">voxioagent {SDK_VERSION}</span>
        <nav className="docs-top-links">
          <a href="https://www.npmjs.com/package/voxioagent" target="_blank" rel="noreferrer">npm</a>
          <Link to="/dashboard/developers">Dashboard</Link>
        </nav>
      </header>

      <div className="docs-body">
        <aside className={`docs-side${menu ? ' is-open' : ''}`}>
          <input
            className="docs-search"
            type="search"
            placeholder="Search the docs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search the docs"
          />
          <nav aria-label="Documentation">
            {groups.length ? (
              <BranchedMenu
                key={q ? 'search' : 'all'}
                items={groups.map((g) => ({ label: g.title, children: q ? g.pages.map(item) : treeOf(g.pages) }))}
                expandAll={!!q}
                defaultOpen={q ? groups.map((_, i) => i) : [Math.max(0, groups.findIndex((g) => g.pages.some((p) => p.slug === slug)))]}
                open={q ? groups.map((_, i) => i) : undefined}
                active={slug}
                onSelect={(value) => value === 'introduction' ? navigate({ to: '/docs' }) : navigate({ to: '/docs/$slug', params: { slug: value } })}
                color="rgba(255, 255, 255, 0.9)"
                accentColor="#7fe3d6"
                lineColor="rgba(255, 255, 255, 0.16)"
                width={240}
                rowHeight={36}
                indent={40}
                trunk={14}
                radius={10}
                lineWidth={1.5}
                fontSize={14}
                drawDuration={400}
                foldDuration={300}
              />
            ) : <p className="docs-empty">Nothing matches “{q}”.</p>}
          </nav>
        </aside>
        {menu && <button className="docs-scrim" type="button" aria-label="Close menu" onClick={() => setMenu(false)} />}

        <Outlet />
      </div>
    </div>
  )
}
