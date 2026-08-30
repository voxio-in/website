// Decides how much of the backdrop this browser can actually afford.
//
// The design leans on three things that Blink composites almost for free and
// that WebKit and Gecko do not: a full-screen SVG feGaussianBlur re-run every
// frame because its children are animating, `mix-blend-mode` on full-viewport
// layers, and a CSS filter on a PLAYING video, which drops the video off the
// accelerated path and re-filters every decoded frame on the way to the screen.
// Stack the site's ~70 backdrop-filters on top and Safari, Brave and Edge crawl
// while Chrome looks fine.
//
// We do not sniff for those browsers. User agents lie, Brave and Edge are Blink
// anyway, and a cheap Chromebook deserves the same mercy as a Mac on Safari. So
// we measure: sample real frame times for a moment and, if the page cannot hold
// a comfortable rate, put `perf-lite` on <html> and let CSS stand the costly
// effects down. Everything that goes is decoration; nothing that goes is
// information.

import { useEffect } from 'react'

const SAMPLE_MS = 900 // long enough to outlast first-paint jank
const WARMUP_MS = 400 // ...which we skip entirely
const FLOOR_FPS = 46

export default function PerfTier() {
  useEffect(() => {
    const root = document.documentElement

    // An explicit ask always wins over anything we measure.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('perf-lite')
      return
    }

    // A machine that admits to being small does not need measuring.
    const cores = navigator.hardwareConcurrency ?? 8
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8
    if (cores <= 4 || mem <= 4) {
      root.classList.add('perf-lite')
      return
    }

    let frames = 0
    let start = 0
    let raf = 0

    const tick = (t: number) => {
      if (!start) {
        start = t
        raf = requestAnimationFrame(tick)
        return
      }
      const elapsed = t - start
      if (elapsed < WARMUP_MS) {
        raf = requestAnimationFrame(tick)
        return
      }
      frames++
      if (elapsed < WARMUP_MS + SAMPLE_MS) {
        raf = requestAnimationFrame(tick)
        return
      }
      const fps = (frames * 1000) / (elapsed - WARMUP_MS)
      if (fps < FLOOR_FPS) root.classList.add('perf-lite')
      root.classList.add('perf-measured')
    }

    // Measuring during the entrance animations would condemn every browser, so
    // start once the page has settled.
    let begin = 0
    const startWhenVisible = () => {
      // A tab that is not on screen gets no rAF at all, so starting the sample
      // there does not produce a slow reading — it produces no reading, and the
      // page stays on the expensive tier for the whole of its life. Opening the
      // site in a background tab is ordinary (a middle-click, a restored
      // session), so wait for the tab rather than measuring into the void.
      if (document.hidden) return
      document.removeEventListener('visibilitychange', startWhenVisible)
      begin = window.setTimeout(() => {
        raf = requestAnimationFrame(tick)
      }, 1200)
    }
    document.addEventListener('visibilitychange', startWhenVisible)
    startWhenVisible()

    // The one sample above is taken at rest, and at rest almost everything
    // passes. What people actually feel is the scroll, where the pinned glass
    // is re-sampled every frame. So keep a cheap watchdog running afterwards:
    // if three frames inside one second run long, the machine has told us more
    // than the benchmark did. It only ever moves in one direction — dropping
    // back out on a single good second would flicker the whole backdrop.
    let longFrames = 0
    let windowStart = 0
    let prev = 0
    let watchRaf = 0
    const watch = (t: number) => {
      watchRaf = requestAnimationFrame(watch)
      if (prev) {
        if (t - windowStart > 1000) {
          longFrames = 0
          windowStart = t
        }
        if (t - prev > 34) longFrames++
        if (longFrames >= 3) {
          root.classList.add('perf-lite')
          cancelAnimationFrame(watchRaf)
          window.removeEventListener('scroll', arm)
          return
        }
      } else {
        windowStart = t
      }
      prev = t
    }
    // Armed by scrolling, because that is the only time the question matters,
    // and disarmed as soon as it answers itself.
    const arm = () => {
      if (root.classList.contains('perf-lite') || watchRaf) return
      prev = 0
      watchRaf = requestAnimationFrame(watch)
      window.setTimeout(() => {
        cancelAnimationFrame(watchRaf)
        watchRaf = 0
      }, 2500)
    }
    window.addEventListener('scroll', arm, { passive: true })

    return () => {
      window.clearTimeout(begin)
      document.removeEventListener('visibilitychange', startWhenVisible)
      window.removeEventListener('scroll', arm)
      cancelAnimationFrame(watchRaf)
      cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
