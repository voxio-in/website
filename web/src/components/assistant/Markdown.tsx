// Just enough Markdown for the Assistant's answers: headings, paragraphs,
// bullet and numbered lists, tables, code blocks, **bold**, *italic*, `code`
// and links. Builds React elements (never innerHTML), so nothing it prints
// can run. Two extras:
//   - a ```chart block draws a bklit chart (see AnswerChart),
//   - a link to vx:flow/…, vx:session/… or vx:step/…/… becomes a chip that opens it.

import { createContext, Fragment, useContext, type ReactNode } from 'react'
import { ArrowUpRightIcon } from 'lucide-react'

import { AnswerChart } from './AnswerChart'

/** Opens a vx: reference from an answer. */
export const OpenRef = createContext<(ref: string) => void>(() => {})

const REF_KIND: Record<string, string> = { flow: 'Flow', session: 'Session', step: 'Step', dash: 'Dashboard' }

/** A clickable chip for something on the account. */
function RefChip({ href, label }: { href: string; label: ReactNode }) {
  const open = useContext(OpenRef)
  const kind = REF_KIND[href.slice(3).split('/')[0]] ?? 'Open'
  return (
    <button type="button" className="as-ref" onClick={() => open(href)} title={`Open ${kind.toLowerCase()}`}>
      <em>{kind}</em><span>{label}</span><ArrowUpRightIcon size={13} />
    </button>
  )
}

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = key
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k++}>{t.slice(1, -1)}</code>)
    else if (t.startsWith('[')) {
      const [, label = '', href = ''] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t) ?? []
      if (href.startsWith('vx:')) out.push(<RefChip key={k++} href={href} label={label} />)
      else {
        const safe = /^(https?:|\/)/.test(href) ? href : undefined
        out.push(safe ? <a key={k++} href={safe} target={safe.startsWith('/') ? undefined : '_blank'} rel="noreferrer">{label}</a> : label)
      }
    } else out.push(<em key={k++}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim().toLowerCase()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++
      blocks.push(lang === 'chart'
        ? <AnswerChart key={k++} src={body.join('\n')} />
        : <pre key={k++} className="as-code"><code>{body.join('\n')}</code></pre>)
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) { blocks.push(<p key={k++} className={`as-h as-h${h[1].length}`}>{inline(h[2])}</p>); i++; continue }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? '')) {
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      blocks.push(
        <div key={k++} className="as-tablewrap"><table className="as-table">
          <thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
        </table></div>,
      )
      continue
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={k++} className="as-list">{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</List>)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*([-*•]|\d+[.)])\s+|\s*\|)/.test(lines[i])) para.push(lines[i++])
    if (!para.length) para.push(lines[i++])
    blocks.push(<p key={k++}>{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p)}</Fragment>)}</p>)
  }
  return <div className="as-md">{blocks}</div>
}
