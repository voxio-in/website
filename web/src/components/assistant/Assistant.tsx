// The Assistant panel: a chat that can read everything on the account.
// Opens from the top bar or Ctrl/⌘+K. Type @ to mention a flow, a step of the
// open flow, a session, a face, a saved voice, a number or a knowledge base;
// mentions show as chips and are sent with the message. Each tool the model
// runs shows as a quiet line you can open to see exactly what it read.
// Conversations are saved on the server (assistant_chats), every tool call
// included; you can keep many, and they are listed in the sidebar.

import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'
import { useRouter } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpIcon, AtSignIcon, ArrowUpRightIcon, ChevronRightIcon, Maximize2Icon, Minimize2Icon, MoveHorizontalIcon, PlusIcon, SparklesIcon, SquareIcon, XIcon } from 'lucide-react'

import { AsciiAssembly } from '#/components/AsciiAssembly'
import '#/styles/ascii-assembly.css'

import { Dropdown } from '#/components/dashboard/controls'
import { Markdown, OpenRef } from './Markdown'

type Mention = { kind: 'flow' | 'step' | 'session' | 'face' | 'voice' | 'number' | 'knowledge'; id: string; label: string; flow?: string }
type Ctx = { page?: string; flow?: { key: string; name: string }; step?: string; session?: string; timezone?: string }
type Card = { id: string; flow: string; title: string; where?: string[]; page?: string; lines: { what: string; from?: unknown; to?: unknown }[]; status: string }
type Part = { kind: 'text'; text: string } | { kind: 'tool'; id: string; label: string; input: unknown; result?: unknown; ok?: boolean } | { kind: 'change'; card: Card }
type Item =
  | { role: 'user'; text: string; mentions: Mention[] }
  | { role: 'assistant'; parts: Part[]; done?: boolean; error?: string; meta?: string }

/** The chat open in the panel and the full view (they share it). */
const CHAT = 'vx-assistant-chat'
/** Fired when the chat list changes (a chat started, renamed or deleted), for the sidebar. */
export const CHATS_EVENT = 'vx-assistant-chats'
const MODEL = 'vx-assistant-model'
const KIND_LABEL: Record<Mention['kind'], string> = { flow: 'Flow', step: 'Step', session: 'Session', face: 'Face', voice: 'Voice', number: 'Number', knowledge: 'Knowledge' }
const SUGGEST = ['How are my calls going this week?', 'Explain this flow’s workflow step by step', 'Find calls where the caller sounded unhappy', 'Which settings make replies faster?']

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* full or private */ } }

/** The Assistant's name, everywhere it shows. */
export const NAME = 'Ask Voxio'

/**
 * variant "panel": the sheet over any page (top bar, Ctrl/⌘+K), with a button to the full view.
 * variant "page": the full view at /dashboard/assistant. Both share one conversation.
 */
export function Assistant({ open, onClose, ctx, variant = 'panel', chat: chatProp }: { open: boolean; onClose: () => void; ctx: Ctx; variant?: 'panel' | 'page'; /** Full view: the chat in the URL. */ chat?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [models, setModels] = useState<{ id: string; label: string; note: string }[]>([])
  const [model, setModel] = useState('')
  const [text, setText] = useState('')
  const [chips, setChips] = useState<Mention[]>([])
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  // Telegram-style send: the message flies from the box to its bubble.
  const flight = useRef<{ text: string; x: number; y: number } | null>(null)
  // Chips in answers open the page they point at.
  const router = useRouter()
  const openRef = useCallback(async (ref: string) => {
    const r = await fetch(`/api/assistant?open=${encodeURIComponent(ref)}`).then((x) => x.json()).catch(() => null) as { ok: boolean; data?: { path: string } } | null
    if (r?.ok && r.data) void router.navigate({ href: r.data.path })
  }, [router])

  // Which chat is open: the full view's URL if it names one, else the one last open.
  const loadChat = useCallback(async (id: string | null) => {
    setChatId(id)
    setLoadErr(null)
    save(CHAT, id)
    if (!id) { setItems([]); return }
    const r = await fetch(`/api/assistant?chat=${encodeURIComponent(id)}`).then((x) => x.json()).catch(() => null) as { ok: boolean; reason?: string; data?: { items: Item[] } } | null
    if (r?.ok && r.data) setItems(r.data.items)
    else { setItems([]); setChatId(null); save(CHAT, null); if (r?.reason && r.reason !== 'Chat not found.') setLoadErr(r.reason) }
  }, [])
  useEffect(() => { setModel(load(MODEL, '')) }, [])
  useEffect(() => {
    if (abort.current) return
    void loadChat(chatProp ?? load<string | null>(CHAT, null))
  }, [chatProp, loadChat])
  // The panel and the full view share the open chat: after a reply in one, the other reloads it.
  useEffect(() => {
    const onSync = (e: Event) => {
      if ((e as CustomEvent).detail?.from === variant || abort.current) return
      void loadChat(load<string | null>(CHAT, null))
    }
    window.addEventListener('vx-assistant-sync', onSync)
    return () => window.removeEventListener('vx-assistant-sync', onSync)
  }, [variant, loadChat])
  const router0 = useRouter()
  const newChat = () => {
    void loadChat(null)
    setChips([])
    window.dispatchEvent(new CustomEvent('vx-assistant-sync', { detail: { from: variant } }))
    if (variant === 'page' && chatProp) void router0.navigate({ to: '/dashboard/assistant' })
  }
  useEffect(() => {
    if (!open || models.length) return
    fetch('/api/assistant?models=1').then((r) => r.json()).then((r) => { if (r.ok) setModels(r.data) }).catch(() => {})
  }, [open, models.length])
  useEffect(() => { if (open) setTimeout(() => box.current?.focus(), 80) }, [open])
  // Follow the newest message, but only while you're at the bottom (scrolling up to
  // read stays put). The panel scrolls its own list; the full view scrolls the
  // dashboard's main area directly (scrollIntoView could move other scroll areas).
  const scroller = () => (variant === 'page' ? (list.current?.closest('.db-main') as HTMLElement | null) : list.current)
  const atBottom = useRef(true)
  useEffect(() => {
    const el = scroller()
    if (!el) return
    const onScroll = () => { atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120 }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [variant, open])
  useEffect(() => {
    const el = scroller()
    if (el && atBottom.current) el.scrollTop = el.scrollHeight
  }, [items, variant])
  const chosen = models.find((m) => m.id === model) ?? models[0]

  // ------------------------------------------------------------ @ mentions
  const [mq, setMq] = useState<string | null>(null)
  const [found, setFound] = useState<Mention[]>([])
  const [hi, setHi] = useState(0)
  // Arrow keys move the highlight; keep it in view inside the list.
  const mlist = useRef<HTMLDivElement>(null)
  useEffect(() => { mlist.current?.querySelector<HTMLElement>('.is-hi')?.scrollIntoView({ block: 'nearest' }) }, [hi, found])
  useEffect(() => {
    if (mq === null) return
    const t = setTimeout(() => {
      fetch(`/api/assistant?mention=${encodeURIComponent(mq)}&flow=${encodeURIComponent(ctx.flow?.key ?? '')}`)
        .then((r) => r.json()).then((r) => { if (r.ok) { setFound(r.data); setHi(0) } }).catch(() => {})
    }, 120)
    return () => clearTimeout(t)
  }, [mq, ctx.flow?.key])
  const onType = (v: string, caret: number) => {
    setText(v)
    // A chip lives as long as its @name is in the text: delete the text, the chip goes too.
    setChips((cs) => cs.filter((c) => v.includes(`@${c.label}`)))
    // @ starts a mention after anything but a letter or digit (so it works right after
    // Japanese text or punctuation, not only after a space); e-mails don't trigger it.
    const m = /(^|[^A-Za-z0-9_.])@([^\s@]{0,40})$/.exec(v.slice(0, caret))
    setMq(m ? m[2] : null)
  }
  const pickMention = (m: Mention) => {
    const el = box.current
    const caret = el?.selectionStart ?? text.length
    const before = text.slice(0, caret).replace(/@([^\s@]{0,40})$/, `@${m.label} `)
    setText(before + text.slice(caret))
    if (!chips.some((c) => c.kind === m.kind && c.id === m.id)) setChips((c) => [...c, m])
    setMq(null)
    setTimeout(() => { el?.focus(); el?.setSelectionRange(before.length, before.length) }, 0)
  }

  // ------------------------------------------------------------ sending
  const send = useCallback(async (said?: string) => {
    const t = (said ?? text).trim()
    if (!t || busy) return
    const mine: Item = { role: 'user', text: t, mentions: chips }
    const at = box.current?.getBoundingClientRect()
    if (at) flight.current = { text: t, x: at.left + 14, y: at.top + at.height / 2 }
    const next = [...items, mine, { role: 'assistant', parts: [] } as Item]
    setItems(next)
    setText(''); setChips([]); setMq(null)
    setBusy(true)
    // Earlier turns go back as plain text: the model rereads with tools if it needs detail.
    const history = [...items, mine].flatMap((it): Record<string, unknown>[] => it.role === 'user'
      ? [{ role: 'user', content: it.text }]
      : [{
          role: 'assistant', calls: [],
          // Its words, plus what became of each change it proposed (the user may have applied it since).
          text: it.parts.map((p) => p.kind === 'text' ? p.text : p.kind === 'change' ? `[Proposed change “${p.card.title}” on ${p.card.flow}: ${p.card.status}]` : '').filter(Boolean).join('\n') || '(no answer)',
        }])
    const ctrl = new AbortController()
    abort.current = ctrl
    const patch = (fn: (a: Extract<Item, { role: 'assistant' }>) => Extract<Item, { role: 'assistant' }>) =>
      setItems((xs) => { const last = xs[xs.length - 1]; return last?.role === 'assistant' ? [...xs.slice(0, -1), fn(last)] : xs })
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat: chatId ?? undefined, model: chosen?.id, history, ctx: { ...ctx, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, mentions: mine.mentions }),
      })
      if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => null)) as { reason?: string } | null)?.reason ?? `Error ${res.status}`)
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let cut: number
        while ((cut = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, cut); buf = buf.slice(cut + 2)
          if (!chunk.startsWith('data: ')) continue
          const e = JSON.parse(chunk.slice(6))
          if (e.type === 'chat') { if (e.id) { setChatId(e.id); save(CHAT, e.id); window.dispatchEvent(new Event(CHATS_EVENT)) } else if (e.reason) setLoadErr('This chat isn’t being saved: ' + e.reason) }
          else if (e.type === 'text') patch((a) => ({ ...a, parts: [...a.parts, { kind: 'text', text: e.text }] }))
          else if (e.type === 'tool') patch((a) => ({ ...a, parts: [...a.parts, { kind: 'tool', id: e.id, label: e.label, input: e.input }] }))
          else if (e.type === 'tool_result') patch((a) => ({ ...a, parts: a.parts.map((p) => (p.kind === 'tool' && p.id === e.id ? { ...p, label: e.label, result: e.result, ok: e.ok } : p)) }))
          // A later proposal to the same flow updates its card in place.
          else if (e.type === 'change') patch((a) => (a.parts.some((p) => p.kind === 'change' && p.card.id === e.card.id)
            ? { ...a, parts: a.parts.map((p) => (p.kind === 'change' && p.card.id === e.card.id ? { ...p, card: e.card } : p)) }
            : { ...a, parts: [...a.parts, { kind: 'change', card: e.card }] }))
          else if (e.type === 'done') patch((a) => ({ ...a, done: true, meta: e.summary ?? `${e.model} · ${e.steps} step${e.steps === 1 ? '' : 's'} · ${(e.usage.input + e.usage.output).toLocaleString()} tokens${e.usage.cached ? ` (${e.usage.cached.toLocaleString()} cached)` : ''}` }))
          else if (e.type === 'error') patch((a) => ({ ...a, done: true, error: e.message }))
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') patch((a) => ({ ...a, done: true, error: (e as Error).message }))
      else patch((a) => ({ ...a, done: true, meta: 'Stopped' }))
    } finally {
      setBusy(false)
      abort.current = null
      // The other view (panel or full view) reloads this chat from the server.
      window.dispatchEvent(new CustomEvent('vx-assistant-sync', { detail: { from: variant } }))
    }
  }, [text, busy, items, chips, chosen?.id, ctx, chatId, variant])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mq !== null && found.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % found.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + found.length) % found.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(found[hi]); return }
      if (e.key === 'Escape') { e.preventDefault(); setMq(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
    if (e.key === 'Escape') onClose()
  }

  // Grow the box with the text, up to a third of the screen.
  useEffect(() => { const el = box.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, window.innerHeight / 3)}px` } }, [text])

  const where = useMemo(() => [ctx.flow?.name, ctx.session ? 'a session' : null].filter(Boolean).join(' · '), [ctx])

  const page = variant === 'page'
  // Full view only: use the whole width instead of a centred column (remembered).
  const [wide, setWide] = useState(false)
  useEffect(() => { setWide(load('vx-assistant-wide', false)) }, [])
  const toggleWide = () => setWide((w) => { save('vx-assistant-wide', !w); return !w })
  // The panel slides in over the page; the full view is the page itself.
  const Shell = page ? motion.section : motion.aside
  const shellProps = page
    ? { className: `as is-page${wide ? ' is-wide' : ''}`, 'aria-label': NAME, initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { className: 'as', role: 'dialog', 'aria-label': NAME, initial: { x: 40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 }, transition: { type: 'spring' as const, stiffness: 420, damping: 38 } }

  return (
    <AnimatePresence>
      {(open || page) && (
        <OpenRef.Provider value={openRef}>
        <Shell {...shellProps}>
          <header className="as-head">
            <span className="as-logo"><SparklesIcon size={16} /></span>
            <div className="as-title"><b>{NAME}</b>{where && <small>{where}</small>}</div>
            <button type="button" className="db-iconbtn" title="New conversation" aria-label="New conversation" disabled={busy} onClick={newChat}><PlusIcon size={18} /></button>
            {page && (
              <button type="button" className={`db-iconbtn${wide ? ' is-on' : ''}`} title={wide ? 'Narrow view' : 'Wide view'} aria-label={wide ? 'Narrow view' : 'Wide view'} aria-pressed={wide} onClick={toggleWide}>
                {wide ? <Minimize2Icon size={17} /> : <MoveHorizontalIcon size={17} />}
              </button>
            )}
            {!page && (
              <button type="button" className="db-iconbtn" title="Open full view" aria-label="Open full view"
                onClick={() => { onClose(); void router.navigate({ to: '/dashboard/assistant' }) }}><Maximize2Icon size={17} /></button>
            )}
            {!page && <button type="button" className="db-iconbtn" title="Close (Esc)" aria-label="Close" onClick={onClose}><XIcon size={18} /></button>}
          </header>

          <div className="as-list" ref={list}>
            {loadErr && <p className="as-err">{loadErr}</p>}
            {!items.length && (page ? (
              // The full view greets you like the sign-in page: the name, assembled in ASCII.
              <div className="as-hero">
                <AsciiAssembly lines={['ASK', 'VOXIO']} className="as-hero-art" caption="Ask anything about your agents, calls and settings." />
                <div className="as-suggest is-grid">{SUGGEST.map((s) => <button key={s} type="button" onClick={() => void send(s)}>{s}</button>)}</div>
              </div>
            ) : (
              <div className="as-empty">
                <span className="as-empty-logo"><SparklesIcon size={22} /></span>
                <b>Ask about your agents</b>
                <span>It reads your flows, workflows, settings and sessions to answer. Type <kbd>@</kbd> to point at something.</span>
                <div className="as-suggest">{SUGGEST.map((s) => <button key={s} type="button" onClick={() => void send(s)}>{s}</button>)}</div>
              </div>
            ))}
            {items.map((it, i) => it.role === 'user' ? (
              <div key={i} className="as-me">
                {it.mentions.length > 0 && <div className="as-chips">{it.mentions.map((m) => <span key={`${m.kind}${m.id}`} className="as-chip"><em>{KIND_LABEL[m.kind]}</em>{m.label}</span>)}</div>}
                <SentBubble text={it.text} flight={flight} />
              </div>
            ) : (
              <div key={i} className="as-ai">
                {it.parts.map((p, j) => p.kind === 'text'
                  ? <Markdown key={j} text={p.text} />
                  : p.kind === 'change' ? <ChangeCard key={j} card={p.card} chat={chatId} onCard={(card) => setItems((xs) => xs.map((x) => x.role === 'assistant' ? { ...x, parts: x.parts.map((q) => (q.kind === 'change' && q.card.id === card.id ? { ...q, card } : q)) } : x))} />
                  : <ToolLine key={j} part={p} />)}
                {!it.done && <span className="as-dots" aria-label="Working"><i /><i /><i /></span>}
                {it.error && <p className="as-err">{it.error}</p>}
                {it.meta && <span className="as-meta">{it.meta}</span>}
              </div>
            ))}
          </div>

          <div className="as-compose">
            {mq !== null && (
              <div className="as-mentions" role="listbox" aria-label="Mention" ref={mlist}>
                {!found.length && <p className="as-mention-none">{mq ? `Nothing called “${mq}”` : 'Looking…'}</p>}
                {found.map((m, j) => (
                  <button key={`${m.kind}${m.id}`} type="button" role="option" aria-selected={j === hi} className={`as-mention${j === hi ? ' is-hi' : ''}`}
                    onMouseEnter={() => setHi(j)} onMouseDown={(e) => { e.preventDefault(); pickMention(m) }}>
                    <em>{KIND_LABEL[m.kind]}</em><span>{m.label}</span>
                  </button>
                ))}
                {/* Sessions are too many to list: they show up for a precise query only. */}
                {!found.some((m) => m.kind === 'session') && <p className="as-mention-hint">To find a session, type part of its ID or the caller’s number.</p>}
              </div>
            )}
            {chips.length > 0 && (
              <div className="as-chips">
                {chips.map((m) => (
                  <span key={`${m.kind}${m.id}`} className="as-chip"><em>{KIND_LABEL[m.kind]}</em>{m.label}
                    <button type="button" aria-label={`Remove ${m.label}`} onClick={() => setChips((c) => c.filter((x) => x !== m))}><XIcon size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="as-box">
              <textarea ref={box} rows={1} value={text} placeholder="Ask anything, or type @ to mention a flow, session…"
                onChange={(e) => onType(e.target.value, e.target.selectionStart)} onKeyDown={onKey} />
              <div className="as-box-bar">
                <button type="button" className="db-iconbtn" title="Mention" aria-label="Mention" onClick={() => { const v = `${text}${text && !text.endsWith(' ') ? ' ' : ''}@`; setText(v); setMq(''); box.current?.focus() }}><AtSignIcon size={16} /></button>
                {models.length > 0 && (
                  <div className="as-model"><Dropdown value={chosen?.id ?? ''} aria-label="Model" options={models.map((m) => ({ value: m.id, label: m.label, hint: m.note }))} onChange={(v) => { setModel(v); save(MODEL, v) }} /></div>
                )}
                <span style={{ flex: 1 }} />
                {busy
                  ? <button type="button" className="as-send is-stop" onClick={() => abort.current?.abort()} aria-label="Stop"><SquareIcon size={14} /></button>
                  : <button type="button" className="as-send" disabled={!text.trim() || !models.length} onClick={() => void send()} aria-label="Send"><ArrowUpIcon size={18} /></button>}
              </div>
            </div>
            {!models.length && <p className="as-note">No AI model is set up yet: add OPENROUTER_API_KEY, GROQ_API_KEY or ANTHROPIC_API_KEY to the server’s .env and restart it.</p>}
          </div>
        </Shell>
        </OpenRef.Provider>
      )}
    </AnimatePresence>
  )
}

/** One read the model made: a quiet line that opens to show the exact input and result. */
function ToolLine({ part }: { part: Extract<Part, { kind: 'tool' }> }) {
  const [open, setOpen] = useState(false)
  const running = part.ok === undefined
  return (
    <div className={`as-tool${running ? ' is-running' : ''}${part.ok === false ? ' is-bad' : ''}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <ChevronRightIcon size={14} className="as-tool-chev" />
        <span>{part.label}{running ? '…' : ''}</span>
      </button>
      {open && (
        <div className="as-tool-body">
          <span>Asked</span><pre>{JSON.stringify(part.input, null, 2)}</pre>
          {!running && <><span>Got</span><pre>{JSON.stringify(part.result, null, 2)}</pre></>}
        </div>
      )}
    </div>
  )
}

/** The message you just sent flies in from the box (respects reduced motion). */
function SentBubble({ text, flight }: { text: string; flight: React.MutableRefObject<{ text: string; x: number; y: number } | null> }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => {
    const f = flight.current, el = ref.current
    if (!f || !el || f.text !== text) return
    flight.current = null
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const list = el.closest('.as-list')
    if (list) list.scrollTop = list.scrollHeight
    const r = el.getBoundingClientRect()
    el.animate([
      { transform: `translate(${f.x - r.left}px, ${f.y - (r.top + r.height / 2)}px) scale(0.92)`, opacity: 0.4, borderRadius: '10px' },
      { opacity: 1, offset: 0.35 },
      { transform: 'none', opacity: 1, borderRadius: '16px 16px 6px 16px' },
    ], { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' })
  }, [text, flight])
  return <p ref={ref}>{text}</p>
}

/** A proposed change: what would change, before → after, and Apply / Discard (then Undo). */
function ChangeCard({ card, chat, onCard }: { card: Card; chat: string | null; onCard: (c: Card) => void }) {
  const router = useRouter()
  const open = useContext(OpenRef)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const run = async (action: 'apply' | 'discard' | 'undo') => {
    setBusy(action); setErr(null)
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: { id: card.id, action, chat: chat ?? undefined } }) }).then((x) => x.json())
      if (!r.ok) setErr(r.reason ?? 'That didn’t work.')
      else {
        onCard(r.data)
        // Refresh the page's data without losing your place in the chat or the page.
        const main = document.querySelector<HTMLElement>('.db-main')
        const top = main?.scrollTop ?? 0
        if (action !== 'discard') void router.invalidate().then(() => { if (main) main.scrollTop = top })
      }
    } catch { setErr('That didn’t work. Try again.') } finally { setBusy(null) }
  }
  const show = (v: unknown) => (v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v))
  return (
    <div className={`as-change is-${card.status}`}>
      {/* What is changing and where: flow › page › part, with a link to that page. */}
      <div className="as-change-head">
        <span className="as-change-kicker">
          {{ pending: 'Proposed change', applied: 'Applied', discarded: 'Discarded', undone: 'Undone', stale: 'Out of date' }[card.status] ?? card.status}
        </span>
        <b>{card.title}</b>
        <span className="as-change-where">
          {[card.flow, ...(card.where ?? [])].map((w, i) => <span key={i}>{w}</span>)}
          {card.page && <button type="button" className="as-change-open" onClick={() => open(card.page!)}>Open <ArrowUpRightIcon size={12} /></button>}
        </span>
      </div>
      <ul className="as-change-lines">
        {card.lines.map((l, i) => (
          <li key={i}>
            <span className="as-change-what">{l.what}</span>
            <span className="as-change-diff">
              {show(l.from) && <del>{show(l.from)}</del>}
              {show(l.from) && show(l.to) && <span aria-hidden>→</span>}
              {show(l.to) && <ins>{show(l.to)}</ins>}
            </span>
          </li>
        ))}
      </ul>
      {card.status === 'stale' && <p className="as-change-note">The flow was saved after this was proposed, so it can't be applied as it is. Ask again for a fresh proposal.</p>}
      {err && <p className="as-err">{err}</p>}
      <div className="as-change-actions">
        {card.status === 'pending' && <>
          <button type="button" className="db-btn db-primary db-btn-sm" disabled={!!busy} onClick={() => void run('apply')}>{busy === 'apply' ? <><ThinkingOrb state="working" size={20} />Applying…</> : 'Apply'}</button>
          <button type="button" className="db-btn db-btn-sm" disabled={!!busy} onClick={() => void run('discard')}>Discard</button>
        </>}
        {card.status === 'applied' && <button type="button" className="db-btn db-btn-sm" disabled={!!busy} onClick={() => void run('undo')}>{busy === 'undo' ? 'Undoing…' : 'Undo'}</button>}
      </div>
    </div>
  )
}
