// The site background, rendered once in __root for every route.

import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

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
      {photo && (video ? <AuroraVideo src={video} /> : <div className="aur-photo" />)}
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

        </defs>

        {/* The softening is a CSS filter on the group, not an SVG one.
            feGaussianBlur is not on the compositor's path: any transform inside
            a filtered subtree invalidates the filter, so the swaying curtains
            re-rasterised a full-viewport blur on the CPU every frame, on every
            browser, on every page of the site. The same blur expressed in CSS
            is a composited layer the sway then moves for free. Radius lives in
            aurora.css, in screen pixels rather than viewBox units. */}
        {showRibbons && (
          <g className="aur-curtains">
            <path className="aur-wave aur-wave--1" fill="url(#aur-curtain)"
              d="M-200 250 C 160 120, 420 400, 760 260 S 1360 90, 1800 250 L1800 900 L-200 900 Z" />
            <path className="aur-wave aur-wave--2" fill="url(#aur-curtain-2)"
              d="M-200 400 C 240 250, 520 540, 880 380 S 1420 240, 1800 400 L1800 900 L-200 900 Z" />
            <path className="aur-wave aur-wave--3" fill="url(#aur-curtain)"
              d="M-200 560 C 300 430, 640 700, 980 540 S 1500 420, 1800 560 L1800 900 L-200 900 Z" />
          </g>
        )}

        {showInfinity && (
          <g className="aur-inf">
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

/* The video, and the still that stands in when it will not play.

   Three things go wrong outside Chrome and all three land here.

   React does not reflect `muted` as an ATTRIBUTE on the server-rendered
   markup, so WebKit and Gecko see an unmuted autoplay video, refuse it, and
   draw their own play glyph over the top — the "video shows a play button"
   report. Setting the PROPERTY imperatively before the first play() is the
   only reliable fix, so we do that on mount, ahead of the attempt.

   If play() is still rejected (a battery saver, Brave's shields, a data-saver
   mode) there is no point leaving a dead black rectangle: we fall back to the
   still frame, which is what the design asks for anyway when there is no video.

   And we do not reveal the video until it has actually decoded a frame, so the
   first paint is the ground colour rather than a flash of white. */
function AuroraVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'wait' | 'ok' | 'fail'>('wait')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Before play(), never after: an autoplay attempt on an unmuted element is
    // rejected once and not retried by the engine.
    el.muted = true
    el.defaultMuted = true

    let done = false
    const ok = () => {
      if (done) return
      done = true
      setState('ok')
    }
    const fail = () => {
      if (done) return
      done = true
      setState('fail')
    }

    if (el.readyState >= 2) ok()
    el.addEventListener('loadeddata', ok)
    el.addEventListener('error', fail)

    void el.play().catch(fail)

    // Some engines resolve neither: they simply never start. But a plain
    // deadline is wrong here — it punishes a slow connection for being slow,
    // and drops to the still while the bytes are actually arriving. So we watch
    // PROGRESS, not the clock: give up only once the transfer has gone quiet
    // for a stretch with nothing decoded.
    let lastMoved = performance.now()
    const moved = () => {
      lastMoved = performance.now()
    }
    el.addEventListener('progress', moved)
    el.addEventListener('loadstart', moved)

    const STALL_MS = 6000
    const watch = window.setInterval(() => {
      if (done) return window.clearInterval(watch)
      if (el.readyState >= 2) return ok()
      if (performance.now() - lastMoved > STALL_MS) fail()
    }, 1000)

    return () => {
      window.clearInterval(watch)
      el.removeEventListener('progress', moved)
      el.removeEventListener('loadstart', moved)
      el.removeEventListener('loadeddata', ok)
      el.removeEventListener('error', fail)
    }
  }, [src])

  return (
    <>
      {/* Always rendered, never conditionally: the still sits UNDER the video
          for the whole of its life, so the fade has something to fade from and
          the fallback needs no swap. Making it conditional changed the child
          list, and React then destroyed and recreated the <video> mid-load —
          which is a fine way to make a working video look like a broken one. */}
      <div className="aur-photo aur-photo--hold" />
      <video
        ref={ref}
        hidden={state === 'fail'}
        className={`aur-video${state === 'ok' ? ' is-ready' : ''}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        src={src}
      />
    </>
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

    // Scrolling is the one thing the page has to be good at, and while it
    // happens the video is the most expensive thing on the screen — not to
    // draw, but because a backdrop-filter re-samples whenever what it samples
    // changes, and the site has roughly seventy of them stacked over this one
    // element. A playing video invalidates all of them thirty times a second
    // whether or not anyone is scrolling. Holding it still for the length of a
    // scroll gives those frames back to the scroll, and nobody has ever
    // noticed a blurred aurora behind glass stop moving for a third of a
    // second while the page was travelling.
    let resume = 0
    const holdVideo = () => {
      if (!video || idle) return
      if (!video.paused) video.pause()
      window.clearTimeout(resume)
      resume = window.setTimeout(() => {
        if (!idle) void video.play().catch(() => {})
      }, 220)
    }

    const onScroll = () => {
      holdVideo()
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
      window.clearTimeout(resume)
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
