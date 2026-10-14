// A small panel that morphs out of its trigger, after Cult UI's Floating
// Panel: Motion shared layout, anchored under the trigger (kept inside the
// window), with a title. Esc or a click outside closes it. Used on the
// workflow canvas for quick picks and short lists.

import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '#/lib/utils'

import '#/styles/floating-panel.css'

const SPRING = { type: 'spring' as const, bounce: 0.1, duration: 0.4 }

export function FloatingPanel({ title, trigger, triggerClassName, width = 320, align = 'start', className, children }: {
  /** Shown at the top of the open panel. */
  title: string
  /** What the trigger button shows. */
  trigger: ReactNode
  triggerClassName?: string
  width?: number
  /** Line the panel up with the trigger's left (start) or right (end) edge. */
  align?: 'start' | 'end'
  className?: string
  /** The panel's content; call `close` after a pick. */
  children: (close: () => void) => ReactNode
}) {
  const id = useId()
  const reduce = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const want = align === 'end' ? r.right - width : r.left
    setPos({ left: Math.max(8, Math.min(want, window.innerWidth - width - 8)), top: r.bottom + 8 })
  }

  useLayoutEffect(() => { if (open) place() }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onMove = () => place()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onMove)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <MotionConfig transition={reduce ? { duration: 0 } : SPRING}>
      <div className="fp-root">
        <motion.button
          ref={triggerRef}
          type="button"
          layoutId={`fp-${id}`}
          className={cn('fp-trigger', triggerClassName)}
          style={{ borderRadius: 10, visibility: open ? 'hidden' : 'visible' }}
          onClick={() => setOpen((o) => !o)}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {trigger}
        </motion.button>
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={panelRef}
              layoutId={`fp-${id}`}
              className={cn('fp-panel', className)}
              style={{ left: pos.left, top: pos.top, width, borderRadius: 14 }}
              role="dialog"
              aria-label={title}
            >
              <motion.div className="fp-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{title}</motion.div>
              <motion.div className="fp-body" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.08, duration: 0.2 }}>
                {children(close)}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

/** A row in a panel's list: a bold name and a short line under it. */
export function FloatingPanelItem({ title, text, onClick, tone }: { title: ReactNode; text?: ReactNode; onClick?: () => void; tone?: 'err' | 'warn' }) {
  return (
    <motion.button type="button" className={cn('fp-item', tone && `is-${tone}`)} onClick={onClick} whileTap={{ scale: 0.98 }}>
      <b>{title}</b>
      {text && <span>{text}</span>}
    </motion.button>
  )
}
