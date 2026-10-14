// One docs page: title, lede, a line for AI tools (Copy page, Markdown,
// llms.txt), the body, previous/next, and an "On this page" outline that
// follows the reader's scroll. The outline is read from the page's H2s.

import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'

import { outline } from '#/lib/docs/markdown'
import { PAGES, type DocPage } from '#/lib/docs/pages'

function PageLink({ page, dir }: { page: DocPage; dir: 'prev' | 'next' }) {
  const inner = (
    <>
      <span>{dir === 'prev' ? '← Previous' : 'Next →'}</span>
      <strong>{page.title}</strong>
    </>
  )
  return page.slug === 'introduction'
    ? <Link to="/docs" className={`docs-pn docs-pn--${dir}`}>{inner}</Link>
    : <Link to="/docs/$slug" params={{ slug: page.slug }} className={`docs-pn docs-pn--${dir}`}>{inner}</Link>
}

/** Copies the page's Markdown, for pasting into an AI tool. */
function CopyPage({ slug }: { slug: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    try {
      const res = await fetch(`/docs/${slug}.md`)
      if (!res.ok) throw new Error(String(res.status))
      await navigator.clipboard.writeText(await res.text())
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 1600)
  }
  return (
    <button type="button" className="docs-ai-btn" onClick={copy}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn’t copy' : 'Copy page'}
    </button>
  )
}

export default function DocArticle({ page }: { page: DocPage }) {
  const router = useRouter()
  const i = PAGES.indexOf(page)
  const prev = PAGES[i - 1]
  const next = PAGES[i + 1]
  const toc = useMemo(() => outline(page), [page])
  const [active, setActive] = useState<string | null>(toc[0]?.id ?? null)

  useEffect(() => {
    const els = toc.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (seen[0]) setActive(seen[0].target.id)
      },
      { rootMargin: '-120px 0px -65% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [toc])

  // Links in the body are plain anchors; keep /docs pages in the app instead of reloading.
  const onClick = (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href')
    if (!a || !href || a.target || !href.startsWith('/docs') || href.endsWith('.md') || href.endsWith('.txt')) return
    e.preventDefault()
    const [path, hash] = href.split('#')
    void router.navigate({ to: path!, hash })
  }

  return (
    <>
      <article className="docs-main" onClick={onClick}>
        <p className="docs-eyebrow">{page.group}</p>
        <h1 className="docs-h1">{page.title}</h1>
        <p className="docs-lede">{page.summary}</p>
        <div className="docs-ai">
          <CopyPage slug={page.slug} />
          <a href={`/docs/${page.slug}.md`} target="_blank" rel="noreferrer">View as Markdown</a>
          <a href="/docs/llms.txt" target="_blank" rel="noreferrer">llms.txt</a>
        </div>
        <div className="docs-prose">{page.body()}</div>
        <nav className="docs-pager" aria-label="Previous and next page">
          {prev ? <PageLink page={prev} dir="prev" /> : <span />}
          {next ? <PageLink page={next} dir="next" /> : <span />}
        </nav>
      </article>

      {toc.length > 1 && (
        <aside className="docs-toc" aria-label="On this page">
          <p>On this page</p>
          <ul>
            {toc.map((t) => (
              <li key={t.id}><a href={`#${t.id}`} className={active === t.id ? 'is-on' : ''}>{t.label}</a></li>
            ))}
          </ul>
        </aside>
      )}
    </>
  )
}
