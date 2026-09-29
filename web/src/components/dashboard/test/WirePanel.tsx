// The "Show code" side of a test dialog: every request and message, in order.
// A new entry opens for a few seconds so it's clear each row holds its JSON,
// then folds away; clicking a row keeps it open.

import { useEffect, useRef, useState } from 'react'

import Icon from '../Icon'
import type { WireEntry } from './wire'

const PEEK_MS = 5000
const secs = (ms: number) => (ms < 1000 ? `${Math.max(0, Math.round(ms))}ms` : `${(ms / 1000).toFixed(1)}s`)

export default function WirePanel({ entries, onClear }: { entries: WireEntry[]; onClear: () => void }) {
  const [filter, setFilter] = useState<'all' | 'out' | 'in'>('all')
  const [pinned, setPinned] = useState<Set<number>>(() => new Set())
  const [peek, setPeek] = useState<Set<number>>(() => new Set())
  const [copied, setCopied] = useState(false)
  const shown = filter === 'all' ? entries : entries.filter((e) => e.dir === filter)

  // Open each new entry briefly, then fold it again.
  // One timer per batch: a later entry must not cancel an earlier one's fold.
  // What was logged before the panel opened counts as seen, so opening it
  // mid-test doesn't unfold the whole history at once.
  const seen = useRef(entries.length ? entries[entries.length - 1].id : 0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    const fresh = entries.filter((e) => e.id > seen.current)
    if (!fresh.length) return
    seen.current = entries[entries.length - 1].id
    const ids = fresh.map((e) => e.id)
    setPeek((s) => new Set([...s, ...ids]))
    timers.current.push(setTimeout(() => setPeek((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n }), PEEK_MS))
  }, [entries])
  useEffect(() => { if (!entries.length) { seen.current = 0; setPinned(new Set()); setPeek(new Set()) } }, [entries.length])

  const list = useRef<HTMLDivElement>(null)
  const stuck = useRef(true)
  useEffect(() => {
    const el = list.current
    if (el && stuck.current) el.scrollTop = el.scrollHeight
  }, [shown.length])

  // What a received row is timed from: the request it answers, or else the
  // last thing sent before it. Looked up in the full log, so filters don't change it.
  const sentFor = (e: WireEntry) => {
    if (e.ref) return entries.find((x) => x.id === e.ref) ?? null
    for (let i = entries.findIndex((x) => x.id === e.id) - 1; i >= 0; i--) if (entries[i].dir === 'out') return entries[i]
    return null
  }

  const isOpen = (id: number) => pinned.has(id) || peek.has(id)
  const toggle = (id: number) => {
    const open = isOpen(id)
    setPeek((s) => { const n = new Set(s); n.delete(id); return n })
    setPinned((s) => { const n = new Set(s); open ? n.delete(id) : n.add(id); return n })
  }
  const copy = () => {
    const text = shown.map((e) => `${e.dir === 'out' ? '→ sent' : '← received'} ${e.label}\n${JSON.stringify(e.data ?? null, null, 2)}`).join('\n\n')
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <aside className="db-wire">
      <div className="db-wire-head">
        <b>Sent and received</b>
        <div className="db-pills">
          {(['all', 'out', 'in'] as const).map((f) => (
            <button key={f} className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'out' ? 'Sent' : 'Received'}
            </button>
          ))}
        </div>
        <span className="db-wire-tools">
          <button className="db-iconbtn" onClick={copy} title="Copy" aria-label="Copy the log"><Icon name={copied ? 'check' : 'copy'} size={16} /></button>
          <button className="db-iconbtn" onClick={onClear} title="Clear" aria-label="Clear the log"><Icon name="trash" size={16} /></button>
        </span>
      </div>
      <p className="db-wire-hint">Click any row to see its JSON. The time on a received row is how long after its request it arrived.</p>
      <div className="db-wire-list" ref={list}
        onScroll={(e) => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }}>
        {!shown.length && <p className="db-muted">Nothing yet. Start the test and every request and message shows up here.</p>}
        {shown.map((e) => {
          const open = isOpen(e.id)
          // Received rows only: time since what was sent for it.
          const sent = e.dir === 'in' ? sentFor(e) : null
          return (
            <div key={e.id} className={`db-wire-row is-${e.dir}${open ? ' is-open' : ''}`}>
              <button className="db-wire-line" onClick={() => toggle(e.id)} aria-expanded={open}>
                <Icon name="back" size={13} className="db-wire-caret" />
                <span className="db-wire-dir">{e.dir === 'out' ? '→' : '←'}</span>
                <span className="db-wire-label">{e.label}</span>
                {sent && <span className="db-wire-time" title={`${secs(e.at - sent.at)} after “${sent.label}” · ${secs(e.at)} since the test started`}>+{secs(e.at - sent.at)}</span>}
              </button>
              <div className="db-wire-body">
                <div>
                  <pre className="db-code db-wire-data">{e.data === undefined ? '(no data)' : JSON.stringify(e.data, null, 2)}</pre>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
