// The reveal machinery from the static pages (the inline script on index.html
// and site.js on the rest), as one hook.

import { useEffect } from 'react'

export function useReveal() {
  useEffect(() => {
    const appears = Array.from(document.querySelectorAll<HTMLElement>('.appear'))
    const photo = document.querySelector<HTMLVideoElement>('.hero-photo')
    const targets = photo ? [...appears, photo] : appears

    targets.forEach((el) => {
      el.addEventListener('animationend', () => el.classList.add('is-in'), {
        once: true,
      })
    })

    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const live = targets.some((el) =>
          typeof el.getAnimations === 'function'
            ? el
                .getAnimations()
                .some((a) => a.playState === 'running' || a.playState === 'finished')
            : false,
        )
        if (!live) targets.forEach((el) => el.classList.add('is-in'))
      })
    })

    const rises = Array.from(document.querySelectorAll<HTMLElement>('.rise'))
    const cleanups: Array<() => void> = [() => cancelAnimationFrame(raf)]

    if (rises.length) {
      document.documentElement.classList.add('js-rise')
      let pending = rises.slice()

      const show = (el: HTMLElement) => {
        el.classList.add('in-view')
        pending = pending.filter((x) => x !== el)
      }
      const sweep = () => {
        pending.slice().forEach((el) => {
          const r = el.getBoundingClientRect()
          if (r.top < window.innerHeight * 0.94 && r.bottom > 0) show(el)
        })
      }

      let io: IntersectionObserver | null = null
      if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              show(entry.target as HTMLElement)
              io?.unobserve(entry.target)
            })
          },
          { rootMargin: '0px 0px -6% 0px', threshold: 0.01 },
        )
        rises.forEach((el) => io?.observe(el))
        cleanups.push(() => io?.disconnect())
      }

      let ticking = false
      let armed = false
      const onScroll = () => {
        if (ticking) return
        ticking = true
        requestAnimationFrame(() => {
          ticking = false
          sweep()
          if (!pending.length) disarm()
        })
      }
      const arm = () => {
        if (armed || !pending.length) return
        armed = true
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll, { passive: true })
      }
      const disarm = () => {
        if (!armed) return
        armed = false
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }

      window.addEventListener('load', sweep)
      requestAnimationFrame(sweep)

      if (io) {
        const grace = setTimeout(() => {
          if (pending.length === rises.length) arm()
        }, 400)
        cleanups.push(() => clearTimeout(grace))
      } else {
        arm()
      }

      const deadline = setTimeout(() => {
        if (pending.length === rises.length) pending.slice().forEach(show)
      }, 2500)

      cleanups.push(() => {
        disarm()
        window.removeEventListener('load', sweep)
        clearTimeout(deadline)
        document.documentElement.classList.remove('js-rise')
      })
    }

    if (typeof IntersectionObserver === 'function') {
      const sections = document.querySelectorAll<HTMLElement>('.section')
      if (sections.length) {
        const idle = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              e.target.classList.toggle('anim-idle', !e.isIntersecting)
            })
          },
          { rootMargin: '400px 0px 400px 0px' },
        )
        sections.forEach((el) => {
          el.classList.add('anim-idle')
          idle.observe(el)
        })
        cleanups.push(() => {
          idle.disconnect()
          sections.forEach((el) => el.classList.remove('anim-idle'))
        })
      }
    }

    return () => cleanups.forEach((fn) => fn())
  }, [])
}
