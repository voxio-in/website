// The sidebar's list of saved Ask Voxio chats, below a line under Developers.
// Newest first; click one to open it in the full view. Delete asks once more
// on the same button. Refreshes when a chat starts (CHATS_EVENT).

import { useEffect, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { CHATS_EVENT } from './Assistant'

type Chat = { id: string; title: string; updatedAt: string }

export function ChatList() {
  const [chats, setChats] = useState<Chat[]>([])
  const [confirm, setConfirm] = useState<string | null>(null)
  const navigate = useNavigate()
  const open = useRouterState({ select: (s) => (s.location.pathname === '/dashboard/assistant' ? (s.location.search as { chat?: string }).chat ?? '' : null) })

  useEffect(() => {
    const load = () => fetch('/api/assistant?chats=1').then((r) => r.json()).then((r) => { if (r.ok) setChats(r.data) }).catch(() => {})
    void load()
    window.addEventListener(CHATS_EVENT, load)
    return () => window.removeEventListener(CHATS_EVENT, load)
  }, [])

  const remove = async (id: string) => {
    setChats((c) => c.filter((x) => x.id !== id))
    setConfirm(null)
    await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chatAction: { id, remove: true } }) }).catch(() => {})
    try { if (JSON.parse(localStorage.getItem('vx-assistant-chat') ?? 'null') === id) localStorage.setItem('vx-assistant-chat', 'null') } catch { /* private mode */ }
    if (open === id) void navigate({ to: '/dashboard/assistant' })
    window.dispatchEvent(new CustomEvent('vx-assistant-sync', { detail: { from: 'list' } }))
  }

  if (!chats.length) return null
  return (
    <div className="db-chats" aria-label="Ask Voxio chats">
      <div className="db-chats-head">
        <span>Chats</span>
        <button type="button" className="db-chats-new" title="New chat" aria-label="New chat"
          onClick={() => {
            try { localStorage.setItem('vx-assistant-chat', 'null') } catch { /* private mode */ }
            window.dispatchEvent(new CustomEvent('vx-assistant-sync', { detail: { from: 'list' } }))
            void navigate({ to: '/dashboard/assistant' })
          }}><PlusIcon size={14} /></button>
      </div>
      <ul>
        {chats.map((c) => (
          <li key={c.id} className={`db-chat${open === c.id ? ' is-active' : ''}`} onMouseLeave={() => confirm === c.id && setConfirm(null)}>
            <button type="button" className="db-chat-open" title={c.title} onClick={() => navigate({ to: '/dashboard/assistant', search: { chat: c.id } })}>{c.title}</button>
            <button type="button" className={`db-chat-del${confirm === c.id ? ' is-confirm' : ''}`} aria-label={confirm === c.id ? `Really delete ${c.title}` : `Delete ${c.title}`}
              title={confirm === c.id ? 'Click again to delete' : 'Delete'} onClick={() => (confirm === c.id ? void remove(c.id) : setConfirm(c.id))}>
              {confirm === c.id ? 'Delete?' : <Trash2Icon size={13} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
