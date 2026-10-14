// Turns a docs page into Markdown, and reads its outline, by walking the
// element tree its body returns. No DOM and no rendering: the docs parts are
// recognised by identity, plain elements by tag. Used for /docs/<page>.md,
// /docs/llms-full.txt and the "On this page" outline.

import { Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'

import { BeforeYouBegin, C, Code, DocLink, H2, H3, NextSteps, Note, Params, Replace, Steps, Table, Tabs, type Param, type Tab } from '#/components/docs/parts'

import { pageBySlug, PAGES, SDK_VERSION, type DocPage } from './pages'

export const SITE = 'https://voxio.in'
export const pageUrl = (slug: string) => `${SITE}${slug === 'introduction' ? '/docs' : `/docs/${slug}`}`
export const mdUrl = (slug: string) => `${SITE}/docs/${slug}.md`

type El = ReactElement<Record<string, unknown> & { children?: ReactNode }>

/** Components whose output is plain elements: expand them and walk the result. */
const EXPAND = new Set<unknown>([Replace, BeforeYouBegin, NextSteps])

const tidy = (s: string) => s.replace(/^\n/, '').replace(/\s+$/, '')

function fence(lang: string, code: string, title?: string) {
  return `${title ? `${title}:\n\n` : ''}\`\`\`${lang}\n${tidy(code)}\n\`\`\``
}

/** Inline text: everything inside a paragraph, list item or cell. */
function inline(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(inline).join('')
  if (!isValidElement(node)) return ''
  const el = node as El
  const kids = el.props.children
  if (el.type === Fragment) return inline(kids)
  if (el.type === C) return `\`${inline(kids)}\``
  if (el.type === DocLink) {
    const to = String(el.props.to)
    const hash = el.props.hash ? `#${el.props.hash}` : ''
    return `[${inline(kids)}](${mdUrl(to)}${hash})`
  }
  switch (el.type) {
    case 'strong': case 'b': return `**${inline(kids)}**`
    case 'em': case 'i': return `*${inline(kids)}*`
    case 'code': return `\`${inline(kids)}\``
    case 'br': return '\n'
    case 'a': {
      const href = String(el.props.href ?? '')
      return `[${inline(kids)}](${href.startsWith('/') ? SITE + href : href})`
    }
    default: return inline(kids)
  }
}

const cell = (n: ReactNode) => inline(n).replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** Block content: headings, paragraphs, lists, code, tables. */
function blocks(node: ReactNode): string[] {
  if (node == null || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim() ? [String(node).trim()] : []
  if (Array.isArray(node)) return node.flatMap(blocks)
  if (!isValidElement(node)) return []
  const el = node as El
  const p = el.props
  const kids = p.children

  if (el.type === Fragment) return blocks(kids)
  if (EXPAND.has(el.type)) return blocks((el.type as (props: unknown) => ReactNode)(p))
  if (el.type === H2) return [`## ${inline(kids)}`]
  if (el.type === H3) return [`### ${inline(kids)}`]
  if (el.type === Code) return [fence(String(p.lang), String(kids), p.title as string | undefined)]
  if (el.type === Tabs) return (p.items as Tab[]).map((t) => fence(t.lang, t.code, t.title ? `${t.label} (${t.title})` : t.label))
  if (el.type === Note) {
    const head = p.kind === 'warn' ? 'Warning' : p.kind === 'tip' ? 'Tip' : 'Note'
    return [`> **${head}${p.title ? `: ${String(p.title)}` : ''}**\n>\n> ${inline(kids)}`]
  }
  if (el.type === Table) {
    const head = p.head as ReactNode[]
    const rows = p.rows as ReactNode[][]
    return [[
      `| ${head.map(cell).join(' | ')} |`,
      `| ${head.map(() => '---').join(' | ')} |`,
      ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
    ].join('\n')]
  }
  if (el.type === Params) {
    return [(p.items as Param[]).map((it) =>
      `- \`${it.name}\`${it.type ? ` (${it.type}${it.required ? ', required' : ''})` : it.required ? ' (required)' : ''}: ${inline(it.children)}`,
    ).join('\n')]
  }
  if (el.type === Steps) return [listItems(kids).map((t, i) => `${i + 1}. ${t}`).join('\n')]

  switch (el.type) {
    case 'p': return [inline(kids)]
    case 'ul': return [listItems(kids).map((t) => `- ${t}`).join('\n')]
    case 'ol': return [listItems(kids).map((t, i) => `${i + 1}. ${t}`).join('\n')]
    default: return blocks(kids)
  }
}

function listItems(node: ReactNode): string[] {
  const out: string[] = []
  const visit = (n: ReactNode) => {
    if (Array.isArray(n)) return n.forEach(visit)
    if (!isValidElement(n)) return
    const el = n as El
    if (el.type === Fragment) return visit(el.props.children)
    if (el.type === 'li') out.push(inline(el.props.children))
  }
  visit(node)
  return out
}

/** The page's sections, for the "On this page" outline: every H2, in order. */
export function outline(page: DocPage): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = []
  const visit = (n: ReactNode) => {
    if (Array.isArray(n)) return n.forEach(visit)
    if (!isValidElement(n)) return
    const el = n as El
    if (el.type === H2) return void out.push({ id: String(el.props.id), label: inline(el.props.children) })
    if (EXPAND.has(el.type)) return visit((el.type as (props: unknown) => ReactNode)(el.props))
    if (el.type === Fragment || typeof el.type === 'string') visit(el.props.children)
  }
  visit(page.body())
  return out
}

/** One page as Markdown, with a header pointing agents at the index. */
export function pageMarkdown(page: DocPage): string {
  return [
    `# ${page.title}`,
    `> ${page.summary}`,
    `Source: ${pageUrl(page.slug)} · voxioagent ${SDK_VERSION} · Index: ${SITE}/docs/llms.txt`,
    ...blocks(page.body()),
  ].join('\n\n') + '\n'
}

/** /docs/llms.txt: the index, in the llmstxt.org format. */
export function llmsTxt(): string {
  const groups = new Map<string, DocPage[]>()
  for (const p of PAGES) groups.set(p.group, [...(groups.get(p.group) ?? []), p])
  return [
    '# Voxio',
    `> Voxio runs voice agents. The voxioagent package (${SDK_VERSION}) puts a flow (one agent) on a web page as a voice button, talking avatar or chat window, runs headless voice sessions over WebRTC, and manages flows, sessions and usage from a server.`,
    'Browser code uses the flow key (`flowKey`). Server code uses the account key (`secretKey`) and must never run in a browser. Every page below is plain Markdown; the whole set is in one file at ' + `${SITE}/docs/llms-full.txt.`,
    ...[...groups].map(([g, ps]) => `## ${g}\n\n${ps.map((p) => `- [${p.title}](${mdUrl(p.slug)}): ${p.summary}`).join('\n')}`),
  ].join('\n\n') + '\n'
}

/** /docs/llms-full.txt: every page, in order, in one file. */
export function llmsFullTxt(): string {
  return PAGES.map(pageMarkdown).join('\n---\n\n')
}

export { pageBySlug }
