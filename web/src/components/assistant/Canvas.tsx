// A VAD opened from Ask Voxio, beside the chat (like an artifact): the real dashboard, live.
// Opened with window.dispatchEvent(new CustomEvent('vx-canvas', { detail: { id } })); detail null closes it.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLinkIcon, Maximize2Icon, Minimize2Icon, XIcon } from 'lucide-react'

import { Dashboard } from '#/components/vad/Dashboard'
import type { Spec } from '#/lib/vad/spec'
import '#/styles/vad.css'

export function Canvas() {
  const [id, setId] = useState<string | null>(null)
  const [spec, setSpec] = useState<Spec | null>(null)
  const [err, setErr] = useState<string | null>(null)
  // Enlarged: the canvas takes the whole window, over the chat.
  const [big, setBig] = useState(false)

  useEffect(() => {
    const on = (e: Event) => setId(((e as CustomEvent).detail as { id?: string } | null)?.id ?? null)
    window.addEventListener('vx-canvas', on)
    return () => window.removeEventListener('vx-canvas', on)
  }, [])
  // The chat's full view makes room for it.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-canvas', !!id)
    if (!id) setBig(false)
    return () => document.documentElement.removeAttribute('data-canvas')
  }, [id])

  const load = (d: string) => fetch(`/api/vad?id=${encodeURIComponent(d)}`).then((r) => r.json())
    .then((r) => { if (r.ok) setSpec(r.data.spec); else setErr(r.reason) })
    .catch(() => setErr('Couldn’t load the VAD.'))
  useEffect(() => {
    setSpec(null); setErr(null)
    if (!id) return
    void load(id)
    const on = () => void load(id)
    window.addEventListener('vx-applied', on)
    return () => window.removeEventListener('vx-applied', on)
  }, [id])

  return (
    <AnimatePresence>
      {id && (
        <motion.aside className={`as-canvas${big ? ' is-big' : ''}`} aria-label="VAD" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
          <header className="as-canvas-head">
            <b>{spec?.title ?? 'VAD'}</b>
            <span className="db-btngroup is-icons" role="group" aria-label="VAD">
              <button type="button" className="db-gbtn" aria-pressed={big} onClick={() => setBig(!big)}>
                {big ? <Minimize2Icon size={17} /> : <Maximize2Icon size={17} />}<span className="db-gbtn-label">{big ? 'Smaller' : 'Enlarge'}</span>
              </button>
              <a className="db-gbtn" href={`/dashboard/dashboards/${encodeURIComponent(id)}`} target="_blank" rel="noreferrer">
                <ExternalLinkIcon size={17} /><span className="db-gbtn-label">Open</span>
              </a>
            </span>
            <button type="button" className="db-iconbtn" title="Close" aria-label="Close" onClick={() => setId(null)}><XIcon size={18} /></button>
          </header>
          <div className="as-canvas-body">
            {err && <p className="as-err">{err}</p>}
            {spec && <Dashboard id={id} spec={spec} onSaved={setSpec} />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
