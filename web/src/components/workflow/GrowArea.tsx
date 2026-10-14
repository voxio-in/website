// A text box that grows with what's typed, up to half the panel's height, then
// scrolls. "Open large" morphs the box into a full-screen editor (Motion shared
// layout), and closing morphs it back. Escape closes.

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Maximize2Icon, XIcon } from 'lucide-react'

export function GrowArea({ value, onChange, placeholder, title, className = '', glow, minRows = 2 }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Heading of the large editor. */
  title: string
  className?: string
  /** Wraps the small box, e.g. the AI glow. */
  glow?: (area: React.ReactNode) => React.ReactNode
  minRows?: number
}) {
  const id = useId()
  const [big, setBig] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Fit the height to the text; CSS max-height caps it and turns on scrolling.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value, big])

  useEffect(() => {
    if (!big) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setBig(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [big])

  const words = value.trim() ? value.trim().split(/\s+/).length : 0
  const small = (
    <motion.div layoutId={`grow-${id}`} className="wf-grow-shell" style={{ borderRadius: 10 }}>
      <textarea ref={ref} className={`db-in wf-grow ${className}`} rows={minRows} value={value} placeholder={placeholder} spellCheck
        onChange={(e) => onChange(e.target.value)} />
    </motion.div>
  )

  return (
    <div className="wf-grow-wrap">
      {!big && (glow ? glow(small) : small)}
      {big && <div className="wf-grow-ghost" />}
      <div className="wf-prompt-foot">
        <span>{words ? `${words.toLocaleString()} word${words === 1 ? '' : 's'}` : 'Empty'}</span>
        <button type="button" className="db-copyjson" onClick={() => setBig(true)}><Maximize2Icon size={14} />Open large</button>
      </div>
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {big && (
            <div className="wf-big" onMouseDown={(e) => e.target === e.currentTarget && setBig(false)}>
              <motion.div layoutId={`grow-${id}`} className="wf-big-card" style={{ borderRadius: 24 }} transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}>
                <motion.div className="wf-big-inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.12, duration: 0.2 }}>
                  <div className="wf-big-head">
                    <h2 className="db-h2">{title}</h2>
                    <span className="db-muted">{words ? `${words.toLocaleString()} words` : 'Empty'}</span>
                    <button type="button" className="db-iconbtn" onClick={() => setBig(false)} aria-label="Close"><XIcon size={20} /></button>
                  </div>
                  <textarea className="db-in wf-big-text" value={value} placeholder={placeholder} spellCheck autoFocus
                    onChange={(e) => onChange(e.target.value)} />
                </motion.div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        (document.querySelector('.db') as HTMLElement | null) ?? document.body,
      )}
    </div>
  )
}
