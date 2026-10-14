// The collapsed sidebar as a dock, after Cult UI's Dock but vertical: items
// grow as the mouse passes over them and their neighbours ease aside, on
// Motion springs. Only active while the rail is folded to icons on a wide
// screen; reduced-motion turns it off.

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react'
import { createContext, useContext, useRef, type ReactNode } from 'react'

const BASE = 42
const PEAK = 60
const REACH = 110

type DockCtx = { mouseY: MotionValue<number>; on: boolean }
const Ctx = createContext<DockCtx | null>(null)

/** Wraps the rail's items; tracks where the mouse is along it. */
export function DockArea({ active, className, children }: { active: boolean; className?: string; children: ReactNode }) {
  const mouseY = useMotionValue(Infinity)
  const reduce = useReducedMotion() ?? false
  const on = active && !reduce
  return (
    <Ctx.Provider value={{ mouseY, on }}>
      <div
        className={className}
        onMouseMove={on ? (e) => mouseY.set(e.clientY) : undefined}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        {children}
      </div>
    </Ctx.Provider>
  )
}

/** One rail item; grows with the mouse's distance from its centre. */
export function DockSlot({ children }: { children: ReactNode }) {
  const ctx = useContext(Ctx)
  const ref = useRef<HTMLDivElement>(null)
  const fallback = useMotionValue(Infinity)
  const mouseY = ctx?.mouseY ?? fallback
  const on = !!ctx?.on

  const distance = useTransform(mouseY, (y) => {
    const r = ref.current?.getBoundingClientRect()
    return r ? y - (r.top + r.height / 2) : Infinity
  })
  const target = useTransform(distance, [-REACH, 0, REACH], [BASE, PEAK, BASE])
  const height = useSpring(target, { mass: 0.1, stiffness: 170, damping: 13 })
  const scale = useTransform(height, [BASE, PEAK], [1, 1.32])

  return (
    <motion.div
      ref={ref}
      className="db-dock-slot"
      style={on ? { height, ['--dock-s' as string]: scale } : undefined}
    >
      {children}
    </motion.div>
  )
}
