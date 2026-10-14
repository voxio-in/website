// A code block in Voxio's own look, after Cult UI's Code Block: tabs with a
// sliding underline, code that slides and unblurs in the direction you switch,
// and an animated copy button. Syntax colours come from the brand palette as
// CSS variables (codeblock.css), so the dashboard's light theme gets its own
// set. Shared by /docs and the dashboard.

import { Check, Copy } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Highlight, Prism, type PrismTheme } from 'prism-react-renderer'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { cn } from '#/lib/utils'

import '#/styles/codeblock.css'

/* prism-react-renderer has no shell grammar; this covers the commands the docs show. */
if (!Prism.languages.bash) {
  Prism.languages.bash = {
    comment: { pattern: /(^|\s)#.*/, lookbehind: true },
    string: { pattern: /"(?:\\.|[^"\\])*"|'[^']*'/, greedy: true },
    variable: /\$\{?[A-Za-z_][\w]*\}?|\$env:[A-Za-z_]\w*/,
    function: { pattern: /(^|[\s;|&]|^\s*)(?:curl|npm|pnpm|yarn|bun|npx|node|export|cd|git)(?=\s)/m, lookbehind: true },
    parameter: { pattern: /(^|\s)--?[\w-]+/, lookbehind: true, alias: 'keyword' },
    operator: /\\$|[|&;]/m,
  }
  Prism.languages.shell = Prism.languages.bash
  Prism.languages.powershell = Prism.languages.bash
}

/* Token colours point at CSS variables, so one theme serves light and dark. */
const v = (name: string) => ({ color: `var(--cb-${name})` })
const THEME: PrismTheme = {
  plain: { color: 'var(--cb-text)', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { ...v('comment'), fontStyle: 'italic' } },
    { types: ['keyword', 'boolean', 'null', 'undefined', 'important', 'atrule', 'parameter'], style: v('keyword') },
    { types: ['string', 'char', 'attr-value', 'template-string', 'regex', 'url'], style: v('string') },
    { types: ['function', 'method', 'class-name', 'maybe-class-name'], style: v('function') },
    { types: ['tag', 'selector', 'property', 'property-access', 'attr-name', 'variable', 'builtin'], style: v('name') },
    { types: ['number', 'constant', 'symbol', 'unit'], style: v('number') },
    { types: ['punctuation', 'operator', 'interpolation-punctuation'], style: v('punct') },
  ],
}

const LANG: Record<string, string> = {
  js: 'jsx', javascript: 'jsx', jsx: 'jsx', ts: 'tsx', typescript: 'tsx', tsx: 'tsx', html: 'markup', css: 'css',
  json: 'json', bash: 'bash', sh: 'bash', shell: 'bash', powershell: 'powershell', python: 'python', text: 'plain',
}

export const tidyCode = (s: string) => s.replace(/^\n/, '').replace(/\s+$/, '')

export type CodeTab = { label: string; code: string; language?: string }

/** Copy icon that turns into a check, as in Cult UI's Copy Button. */
export function CopyButton({ value, className, label = false }: { value: string; className?: string; label?: boolean }) {
  const [copied, setCopied] = useState(false)
  const reduce = useReducedMotion()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Older browsers or blocked clipboard: fall back to a hidden textarea.
      const ta = document.createElement('textarea')
      ta.value = value
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { document.body.removeChild(ta); return }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const anim = reduce
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
        transition: { type: 'spring' as const, duration: 0.3, bounce: 0 },
      }
  return (
    <motion.button
      type="button"
      onClick={copy}
      whileTap={reduce ? undefined : { scale: 0.95 }}
      className={cn('cb-copy', copied && 'is-done', className)}
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      <span className="cb-copy-icon" aria-hidden="true">
        <AnimatePresence initial={false} mode="sync">
          {copied
            ? <motion.span key="check" className="cb-copy-glyph" {...anim}><Check size={14} strokeWidth={2} /></motion.span>
            : <motion.span key="copy" className="cb-copy-glyph" {...anim}><Copy size={14} strokeWidth={2} /></motion.span>}
        </AnimatePresence>
      </span>
      {label && <span>{copied ? 'Copied' : 'Copy'}</span>}
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </motion.button>
  )
}

/**
 * One snippet (`code`) or several (`tabs`). With `active` and `onTabChange` the
 * tab is controlled, so blocks on a page can stay in step.
 * A single snippet with a `title` shows that title as its only tab.
 */
export default function CodeBlock({ code, lang = 'bash', title, tabs, active, onTabChange, className }: {
  code?: string
  lang?: string
  title?: string
  tabs?: CodeTab[]
  active?: number
  onTabChange?: (index: number) => void
  className?: string
}) {
  const items = useMemo<CodeTab[]>(
    () => (tabs?.length ? tabs : code != null ? [{ label: title ?? lang, code, language: lang }] : []),
    [tabs, code, title, lang],
  )
  const [own, setOwn] = useState(0)
  const index = Math.min(active ?? own, Math.max(items.length - 1, 0))
  const [direction, setDirection] = useState(0)
  const reduce = useReducedMotion()

  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null)

  const measure = useCallback(() => {
    const list = listRef.current
    const el = tabRefs.current[index]
    if (!list || !el) return
    const a = list.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    setBar({ left: b.left - a.left, width: b.width })
  }, [index])

  useLayoutEffect(() => {
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    if (listRef.current) ro.observe(listRef.current)
    return () => ro.disconnect()
  }, [measure])

  if (!items.length) return null

  const pick = (i: number) => {
    setDirection(i > index ? 1 : -1)
    setOwn(i)
    onTabChange?.(i)
  }

  const current = items[index]!
  const text = tidyCode(current.code)
  const language = LANG[current.language ?? lang] ?? 'plain'
  const showTabs = items.length > 1 || !!title

  return (
    <figure className={cn('cb', className)}>
      {showTabs && (
        <div className="cb-bar">
          <div className="cb-tabs" role="tablist">
            <div className="cb-tablist" ref={listRef}>
              {items.map((t, i) => (
                <button
                  key={`${t.label}-${i}`}
                  ref={(el) => { tabRefs.current[i] = el }}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  className={cn('cb-tab', i === index && 'is-on')}
                  onClick={() => pick(i)}
                >
                  {t.label}
                </button>
              ))}
              {bar && (
                <motion.span
                  aria-hidden="true"
                  className="cb-bar-line"
                  initial={false}
                  animate={{ left: bar.left, width: bar.width }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      <div className="cb-body">
        <CopyButton value={text} label className="cb-copy-float" />
        <Highlight code={text} language={language} theme={THEME}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="cb-pre">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.code
                  key={index}
                  initial={reduce ? false : { opacity: 0, x: direction > 0 ? 20 : -20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -20 : 20, filter: 'blur(4px)' }}
                  transition={{ duration: reduce ? 0 : 0.15, ease: 'easeOut' }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })} className="cb-line">
                      <span className="cb-ln" aria-hidden="true">{i + 1}</span>
                      <span className="cb-src">
                        {line.map((token, k) => <span key={k} {...getTokenProps({ token })} />)}
                      </span>
                    </div>
                  ))}
                </motion.code>
              </AnimatePresence>
            </pre>
          )}
        </Highlight>
      </div>
    </figure>
  )
}
