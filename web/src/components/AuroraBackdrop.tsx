// The site background, rendered once in __root for every route.

import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

export type Variant = 'ribbons' | 'infinity' | 'both'

const TEAL = '#006161'
const TEAL_LIT = '#0fd6ad'
const TEAL_PALE = '#7ef2d2'

export default function AuroraBackdrop({
  variant = 'ribbons',
  photo = true,
  video = AURORA_VIDEO,
}: {
  variant?: Variant
  photo?: boolean
  video?: string | null
}) {
  const showRibbons = variant === 'ribbons' || variant === 'both'
  const showInfinity = variant === 'infinity' || variant === 'both'
  const root = useIdleBelowTheFold()

  return (
    <div className="aur" aria-hidden="true" ref={root}>
      {photo &&
        (video ? (
          <video className="aur-video" autoPlay muted loop playsInline preload="auto">
            <source src={video} type="video/mp4" />
          </video>
        ) : (
          <div className="aur-photo" />
        ))}
      <div className="aur-wash" />
      <div className="aur-stars" />

      <svg className="aur-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Vertical falloff: a curtain is bright where it is thin at the top
              these reading as flat wallpaper stripes. */}
          <linearGradient id="aur-curtain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TEAL_PALE} stopOpacity="0" />
            <stop offset="0.28" stopColor={TEAL_LIT} stopOpacity="0.75" />
            <stop offset="0.62" stopColor={TEAL} stopOpacity="0.55" />
            <stop offset="1" stopColor={TEAL} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aur-curtain-2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TEAL_LIT} stopOpacity="0" />
            <stop offset="0.4" stopColor={TEAL_PALE} stopOpacity="0.5" />
            <stop offset="1" stopColor={TEAL} stopOpacity="0" />
          </linearGradient>

          {/* The travelling light on the lemniscate: a hard bright core that
              uniformly glowing wire. */}
          <linearGradient id="aur-trail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={TEAL} stopOpacity="0" />
            <stop offset="0.55" stopColor={TEAL_LIT} stopOpacity="0.9" />
            <stop offset="0.78" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor={TEAL_PALE} stopOpacity="0" />
          </linearGradient>

          <filter id="aur-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="38" />
          </filter>
          <filter id="aur-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {showRibbons && (
          <g filter="url(#aur-soft)" className="aur-curtains">
            <path className="aur-wave aur-wave--1" fill="url(#aur-curtain)"
              d="M-200 250 C 160 120, 420 400, 760 260 S 1360 90, 1800 250 L1800 900 L-200 900 Z" />
            <path className="aur-wave aur-wave--2" fill="url(#aur-curtain-2)"
              d="M-200 400 C 240 250, 520 540, 880 380 S 1420 240, 1800 400 L1800 900 L-200 900 Z" />
            <path className="aur-wave aur-wave--3" fill="url(#aur-curtain)"
              d="M-200 560 C 300 430, 640 700, 980 540 S 1500 420, 1800 560 L1800 900 L-200 900 Z" />
          </g>
        )}

        {showInfinity && (
          <g className="aur-inf" filter="url(#aur-glow)">
            <path className="aur-inf-wire" d={LEMNISCATE} />
            <path className="aur-inf-trail" d={LEMNISCATE} stroke="url(#aur-trail)" />
            <path className="aur-inf-head" d={LEMNISCATE} />
          </g>
        )}
      </svg>

      <div className="aur-vignette" />
    </div>
  )
}

function useIdleBelowTheFold() {
  const ref = useRef<HTMLDivElement>(null)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const video = el.querySelector('video')

    let idle: boolean | null = null
    let ticking = false

    const apply = () => {
      const next = document.hidden || window.scrollY > window.innerHeight * 0.9
      if (next === idle) return
      idle = next
      el.classList.toggle('aur--idle', next)
      if (!video) return
      if (next) video.pause()
      else void video.play().catch(() => {})
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        apply()
      })
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    document.addEventListener('visibilitychange', apply)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', apply)
    }
  }, [pathname])

  return ref
}

function lemniscate(cx: number, cy: number, a: number, steps = 240) {
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const d = 1 + Math.sin(t) ** 2
    const x = cx + (a * Math.cos(t)) / d
    const y = cy + (a * 0.62 * Math.sin(t) * Math.cos(t)) / d
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

const LEMNISCATE = lemniscate(800, 610, 400)

export const AURORA_VIDEO: string | null = '/assets/aurora.mp4'
