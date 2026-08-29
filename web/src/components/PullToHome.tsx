// Scroll up past the top of any page and you go back to voxio.ai.

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

const QUIET_MS = 380 // stillness of the INPUT at the top before the gesture arms
const NEED_PX = 460 // upward travel required to fire
const DECAY_AFTER = 150 // ms of no pulling before progress starts draining
const DECAY_PER_MS = 1.6 // px of progress lost per ms while draining
const LEAVE_MS = 460 // must match the .pull-leaving transition in home.css
const ARRIVE_MS = 700 // .pull-arriving animation plus its stagger, rounded up

const scrollTop = () =>
  window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0

function insideScrolledPane(target: EventTarget | null) {
  let el = target instanceof Element ? target : null
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollTop > 0) {
      const o = getComputedStyle(el).overflowY
      if (o === 'auto' || o === 'scroll' || o === 'overlay') return true
    }
    el = el.parentElement
  }
  return false
}

export default function PullToHome() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)

  const active = (pathname.replace(/\/$/, '') || '/') !== '/'

  const armed = useRef(false)
  const acc = useRef(0)
  const lastPull = useRef(0)
  const lastInput = useRef(0)
  const firing = useRef(false)
  const quietTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const raf = useRef(0)

  useEffect(() => {
    if (!active) return

    armed.current = false
    acc.current = 0
    setProgress(0)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const disarm = () => {
      armed.current = false
      if (quietTimer.current) clearTimeout(quietTimer.current)
      quietTimer.current = null
    }

    const reset = () => {
      acc.current = 0
      setProgress(0)
    }

    const considerArming = () => {
      if (quietTimer.current) clearTimeout(quietTimer.current)
      if (scrollTop() > 2) {
        armed.current = false
        reset()
        return
      }
      const wait = Math.max(0, QUIET_MS - (performance.now() - lastInput.current))
      quietTimer.current = setTimeout(() => {
        if (scrollTop() > 2) return
        if (performance.now() - lastInput.current < QUIET_MS) {
          considerArming()
          return
        }
        armed.current = true
      }, wait || QUIET_MS)
    }

    const noteInput = () => {
      lastInput.current = performance.now()
      if (!armed.current) considerArming()
    }

    const onScroll = () => {
      if (scrollTop() > 2) {
        disarm()
        reset()
        return
      }
      considerArming()
    }

    const tick = () => {
      raf.current = 0
      if (firing.current) return
      const idle = performance.now() - lastPull.current
      if (idle > DECAY_AFTER && acc.current > 0) {
        acc.current = Math.max(0, acc.current - (idle - DECAY_AFTER) * DECAY_PER_MS * 0.06)
        setProgress(acc.current / NEED_PX)
      }
      if (acc.current > 0) raf.current = requestAnimationFrame(tick)
    }
    const drain = () => {
      if (!raf.current) raf.current = requestAnimationFrame(tick)
    }

    const fire = () => {
      if (firing.current) return
      firing.current = true
      setProgress(1)
      disarm()

      const root = document.documentElement

      const go = () => {
        root.classList.remove('pull-leaving')
        navigate({ to: '/' }).then(() => {
          window.scrollTo({ top: 0, behavior: 'auto' })
          if (reduced) return
          root.classList.add('pull-arriving')
          setTimeout(() => root.classList.remove('pull-arriving'), ARRIVE_MS)
        })
      }

      if (reduced) {
        go()
        return
      }
      document.documentElement.classList.add('pull-leaving')
      setTimeout(go, LEAVE_MS)
    }

    const pull = (px: number) => {
      if (!armed.current || firing.current) return
      acc.current = Math.min(NEED_PX, acc.current + px)
      lastPull.current = performance.now()
      setProgress(acc.current / NEED_PX)
      if (acc.current >= NEED_PX) fire()
      else drain()
    }

    const onWheel = (e: WheelEvent) => {
      if (insideScrolledPane(e.target)) return

      noteInput()
      if (scrollTop() > 2) return
      if (e.deltaY > 0) {
        reset()
        return
      }
      if (e.deltaY < 0) pull(-e.deltaY)
    }

    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY
      if (y == null || touchY == null) return
      noteInput()
      if (insideScrolledPane(e.target) || scrollTop() > 2) {
        touchY = y
        return
      }
      const dy = y - touchY
      touchY = y
      if (dy < 0) reset()
      else if (dy > 0) pull(dy * 1.7)
    }
    const onTouchEnd = () => {
      touchY = null
    }

    considerArming()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      if (quietTimer.current) clearTimeout(quietTimer.current)
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = 0
      firing.current = false
      document.documentElement.classList.remove('pull-leaving')
    }
  }, [active, pathname, navigate])

  if (!active) return null

  return (
    <div
      className="pull"
      style={{ '--p': progress } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="pull-inner">
        <span className="pull-ring" />
        <svg
          className="pull-arrow"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 16V4" />
          <path d="M5 9l5-5 5 5" />
        </svg>
        Keep pulling for Voxio.ai
      </div>
    </div>
  )
}
