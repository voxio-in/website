// The building blocks of a docs page. Pages in src/lib/docs/pages.tsx are
// written with these and nothing else, so every page reads the same, and
// src/lib/docs/markdown.ts can turn any page into Markdown (for the .md pages
// and llms-full.txt) by walking the same tree.
//
// House style, from the research (Google developer style guide; ElevenLabs,
// Deepgram, Sarvam, Vapi, Stripe):
//   - Task headings start with a verb ("Start a session"); concept headings are
//     noun phrases ("Concepts"). Sentence case. No "-ing" openers.
//   - Every code block has a sentence before it saying what it does, ending in
//     a colon. Placeholders are explained after it with <Replace>.
//   - Show what the reader should see after running something.
//   - UI names in bold; code words in <C>.
//   - Pages where you build something open with <BeforeYouBegin> and every page
//     ends with <NextSteps>.

import { useEffect, useState, type ReactNode } from 'react'

import CodeBlock from '#/components/CodeBlock'

/** A section heading. Its id is the anchor the "On this page" outline links to. */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="docs-h2">
      <a href={`#${id}`} className="docs-anchor" aria-hidden="true">#</a>
      {children}
    </h2>
  )
}

export function H3({ id, children }: { id: string; children: ReactNode }) {
  return <h3 id={id} className="docs-h3">{children}</h3>
}

/** Inline code. */
export function C({ children }: { children: ReactNode }) {
  return <code className="docs-ic">{children}</code>
}

/** A link to another docs page by slug. A plain anchor: DocArticle routes /docs links client-side. */
export function DocLink({ to, hash, children }: { to: string; hash?: string; children: ReactNode }) {
  const href = `${to === 'introduction' ? '/docs' : `/docs/${to}`}${hash ? `#${hash}` : ''}`
  return <a href={href}>{children}</a>
}

/** One code block, highlighted like VS Code. `title` names the file or context; otherwise the language shows. */
export function Code({ lang, title, children }: { lang: string; title?: string; children: string }) {
  return <CodeBlock code={children} lang={lang} title={title} />
}

export type Tab = { label: string; lang: string; code: string; title?: string }

const TAB_EVENT = 'vx-docs-tab'
const tabKey = (group: string) => `vx.docs.tab.${group}`

/**
 * The same thing in several languages or setups. Tabs with the same `group`
 * stay in step across the page and across pages: pick React once and every
 * snippet shows React.
 */
export function Tabs({ group, items }: { group: string; items: Tab[] }) {
  const [label, setLabel] = useState(items[0]!.label)

  useEffect(() => {
    const read = () => {
      try {
        const saved = localStorage.getItem(tabKey(group))
        if (saved && items.some((t) => t.label === saved)) setLabel(saved)
      } catch {
        // Storage blocked: stay on the first tab.
      }
    }
    read()
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ group: string; label: string }>).detail
      if (d.group === group && items.some((t) => t.label === d.label)) setLabel(d.label)
    }
    window.addEventListener(TAB_EVENT, on)
    return () => window.removeEventListener(TAB_EVENT, on)
  }, [group, items])

  const pick = (next: string) => {
    setLabel(next)
    try {
      localStorage.setItem(tabKey(group), next)
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
    window.dispatchEvent(new CustomEvent(TAB_EVENT, { detail: { group, label: next } }))
  }

  const index = Math.max(0, items.findIndex((t) => t.label === label))
  return (
    <CodeBlock
      tabs={items.map((t) => ({ label: t.title ? `${t.label} · ${t.title}` : t.label, code: t.code, language: t.lang }))}
      active={index}
      onTabChange={(i) => pick(items[i]!.label)}
    />
  )
}

/**
 * Explains the placeholders in the code just above. One placeholder reads as a
 * sentence ("Replace X with …"); several become a "Replace the following:" list.
 */
export function Replace({ items }: { items: [string, ReactNode][] }) {
  if (items.length === 1) {
    const [name, what] = items[0]!
    return <p>Replace <C>{name}</C> with {what}.</p>
  }
  return (
    <>
      <p>Replace the following:</p>
      <ul>
        {items.map(([name, what]) => <li key={name}><C>{name}</C>: {what}</li>)}
      </ul>
    </>
  )
}

export function Note({ kind = 'note', title, children }: { kind?: 'note' | 'warn' | 'tip'; title?: string; children: ReactNode }) {
  return (
    <aside className={`docs-note docs-note--${kind}`}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </aside>
  )
}

export function Table({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="docs-table">
      <table>
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export type Param = { name: string; type: string; required?: boolean; children: ReactNode }

/** Options or arguments, one per row: name and type, then what it does. */
export function Params({ items }: { items: Param[] }) {
  return (
    <dl className="docs-params">
      {items.map((p) => (
        <div key={p.name} className="docs-param">
          <dt>
            <code>{p.name}</code>
            {p.type && <span className="docs-param-type">{p.type}</span>}
            {p.required && <span className="docs-param-req">required</span>}
          </dt>
          <dd>{p.children}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Numbered steps, one action each, starting with a verb. */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="docs-steps">{children}</ol>
}

/** "Before you begin": what the reader needs first. */
export function BeforeYouBegin({ items }: { items: ReactNode[] }) {
  return (
    <>
      <H2 id="before-you-begin">Before you begin</H2>
      <p>You need:</p>
      <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </>
  )
}

/** The page's last section: where to go next, each with what you get there. */
export function NextSteps({ items }: { items: { to: string; hash?: string; label: string; what: string }[] }) {
  return (
    <>
      <H2 id="next-steps">Next steps</H2>
      <ul className="docs-next">
        {items.map((it) => (
          <li key={it.to + (it.hash ?? '')}><DocLink to={it.to} hash={it.hash}>{it.label}</DocLink>: {it.what}</li>
        ))}
      </ul>
    </>
  )
}
