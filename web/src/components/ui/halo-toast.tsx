// Toasts after Cult UI's Halo Toast, on Sonner: a frosted card with a slow
// gradient rim (default, success or error), a light trail that runs round the
// border on hover, and a title and description that fade in letter by letter.
// Ported without shadcn tokens or styled-jsx; colours are Voxio's, in
// styles/halo-toast.css. Mount <PolishedToaster /> once; call showToast().

import { X } from 'lucide-react'
import { motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { toast as sonner, Toaster as SonnerToaster, type ExternalToast } from 'sonner'

import { cn } from '#/lib/utils'

import '#/styles/halo-toast.css'

export type RimVariant = 'default' | 'success' | 'destructive'

/* Rim colours. Default uses the brand palette (teal, blue, violet). */
const RIM: Record<RimVariant, { a: string; b: string; c: string; trail: string; glow: string }> = {
  default: {
    a: 'linear-gradient(90deg, #5ee6c8, #7aa9ff, #c79bff, #5ee6c8)',
    b: 'linear-gradient(90deg, #7aa9ff, #5ee6c8, #9ad8ff)',
    c: 'linear-gradient(90deg, #c79bff, #7aa9ff, #5ee6c8)',
    trail: 'linear-gradient(90deg, transparent 0%, rgba(94,230,200,0.75) 20%, rgba(154,216,255,0.95) 50%, rgba(199,155,255,0.8) 80%, transparent 100%)',
    glow: '0 0 14px rgba(94,230,200,0.4), 0 0 28px rgba(122,169,255,0.32)',
  },
  success: {
    a: 'linear-gradient(90deg, #047857, #10b981, #14b8a6, #0d9488)',
    b: 'linear-gradient(90deg, #34d399, #6ee7b7, #2dd4bf, #5eead4)',
    c: 'linear-gradient(90deg, #065f46, #047857, #0f766e)',
    trail: 'linear-gradient(90deg, transparent 0%, rgba(5,150,105,0.7) 20%, rgba(52,211,153,0.9) 50%, rgba(20,184,166,0.8) 80%, transparent 100%)',
    glow: '0 0 14px rgba(5,150,105,0.42), 0 0 28px rgba(20,184,166,0.4)',
  },
  destructive: {
    a: 'linear-gradient(90deg, #991b1b, #dc2626, #e11d48, #f43f5e, #be123c)',
    b: 'linear-gradient(90deg, #fb7185, #fda4af, #f87171, #fecdd3)',
    c: 'linear-gradient(90deg, #7f1d1d, #b91c1c, #dc2626)',
    trail: 'linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.75) 20%, rgba(251,113,133,0.9) 50%, rgba(244,63,94,0.82) 80%, transparent 100%)',
    glow: '0 0 14px rgba(220,38,38,0.48), 0 0 28px rgba(244,63,94,0.4)',
  },
}

const TRAIL_LOOP_MS = 5250

/** The light that runs round the border while the toast is hovered or focused. */
function BorderTrail({ active, rim }: { active: boolean; rim: RimVariant }) {
  const progress = useMotionValue(0)
  const offsetDistance = useTransform(progress, (v: number) => `${((v % 100) + 100) % 100}%`)
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      progress.set((progress.get() + ((now - last) / TRAIL_LOOP_MS) * 100) % 100)
      last = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, progress])

  const box = { width: 184, height: 32, offsetPath: 'rect(0 auto auto 0 round 16px)' } as const
  return (
    <div className={cn('ht-trail', active && 'is-on')} aria-hidden="true">
      <motion.div className="ht-trail-dot" style={{ ...box, offsetDistance, filter: 'blur(4px)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 999, background: RIM[rim].trail, boxShadow: RIM[rim].glow }} />
      </motion.div>
    </div>
  )
}

/** Three slow gradient blobs under the card's lower edge: the "halo". */
function RimBlobs({ rim, strong, still }: { rim: RimVariant; strong: boolean; still: boolean }) {
  const c = RIM[rim]
  const blob = (bg: string, left: string[], cls: string, dur: number) => (
    <motion.div
      className={cls}
      style={{ background: bg }}
      animate={{ left }}
      transition={{ duration: still ? 0.01 : dur, repeat: still ? 0 : Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
    />
  )
  return (
    <div className="ht-blobs" aria-hidden="true">
      <motion.div className="ht-blobs-in" animate={{ opacity: still ? 0.6 : strong ? 0.92 : 0.72 }} transition={{ duration: 0.25 }}>
        {blob(c.a, ['-5%', '75%', '-5%'], 'ht-blob ht-blob-a', 6)}
        {blob(c.b, ['65%', '10%', '65%'], 'ht-blob ht-blob-b', 5)}
        {blob(c.c, ['25%', '55%', '25%'], 'ht-blob ht-blob-c', 4)}
      </motion.div>
    </div>
  )
}

const STAGGER = 0.018
const GLYPH = 0.16

function Glyphs({ text, delay = 0, still, className }: { text: string; delay?: number; still: boolean; className: string }) {
  const chars = useMemo(() => Array.from(text), [text])
  if (still) return <p className={className}>{text}</p>
  return (
    <motion.p
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { delayChildren: delay, staggerChildren: STAGGER } } }}
    >
      {chars.map((ch, i) => (
        <motion.span key={i} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} transition={{ duration: GLYPH, ease: 'easeOut' }}>
          {ch}
        </motion.span>
      ))}
    </motion.p>
  )
}

export function PolishedToastSurface({ title, description, politeness = 'status', rimVariant = 'default', toastId, closeButton = false, action }: {
  title: string
  description?: string
  politeness?: 'status' | 'alert'
  rimVariant?: RimVariant
  toastId?: number | string
  closeButton?: boolean
  action?: { label: string; onClick: () => void }
}) {
  const still = useReducedMotion() ?? false
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const lit = hover || focus
  const bodyDelay = still ? 0 : (Math.max(0, title.length - 1) * STAGGER + GLYPH) * 0.35

  return (
    <div className="ht" role={politeness === 'alert' ? 'alert' : 'status'} aria-live={politeness === 'alert' ? 'assertive' : 'polite'}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false) }}>
      <div className="ht-frame">
        <RimBlobs rim={rimVariant} strong={lit} still={still} />
        <div className={cn('ht-card', lit && 'is-lit')}>
          <div className="ht-text">
            <Glyphs className="ht-title" text={title} still={still} />
            {description && <Glyphs className="ht-desc" text={description} delay={bodyDelay} still={still} />}
          </div>
          {action && (
            <button type="button" className="ht-action" onClick={() => { action.onClick(); if (toastId != null) sonner.dismiss(toastId) }}>
              {action.label}
            </button>
          )}
          {closeButton && toastId != null && (
            <button type="button" className="ht-close" onClick={() => sonner.dismiss(toastId)} aria-label="Dismiss">
              <X size={15} />
            </button>
          )}
        </div>
        {!still && <BorderTrail active={lit} rim={rimVariant} />}
      </div>
    </div>
  )
}

export type PolishedToastOptions = Omit<ExternalToast, 'description'> & {
  title: string
  description?: string
  politeness?: 'status' | 'alert'
  rimVariant?: RimVariant
  action?: { label: string; onClick: () => void }
}

export function showPolishedToast({ title, description, politeness = 'status', rimVariant = 'default', duration, closeButton = true, className, action, ...rest }: PolishedToastOptions) {
  return sonner.custom(
    (id) => (
      <PolishedToastSurface title={title} description={description} politeness={politeness}
        rimVariant={rimVariant} toastId={id} closeButton={closeButton} action={action} />
    ),
    { duration: duration ?? 4000, ...rest, className: cn('ht-host', className) },
  )
}

/** Shorthands for the common cases. */
export const toast = {
  success: (title: string, description?: string) => showPolishedToast({ title, description, rimVariant: 'success' }),
  error: (title: string, description?: string) => showPolishedToast({ title, description, rimVariant: 'destructive', politeness: 'alert', duration: 6000 }),
  info: (title: string, description?: string) => showPolishedToast({ title, description }),
}

/** Undo instead of "are you sure": the change shows at once, `commit` runs when the toast
 *  closes, and Undo calls `undo` and skips the commit. Closing the tab before then skips it too. */
export function undoToast(title: string, { commit, undo, duration = 6000 }: { commit: () => unknown; undo: () => void; duration?: number }) {
  let settled = false
  const finish = () => { if (!settled) { settled = true; void commit() } }
  return showPolishedToast({
    title, duration, closeButton: false,
    action: { label: 'Undo', onClick: () => { settled = true; undo() } },
    onAutoClose: finish, onDismiss: finish,
  })
}

/** Mount once. `theme` follows the dashboard's light or dark mode. */
export function PolishedToaster({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  return <SonnerToaster className="polished-sonner" position="bottom-right" gap={12} theme={theme} />
}
