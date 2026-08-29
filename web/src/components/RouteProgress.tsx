// The bar that runs across the top while a route is being fetched.
//
// Navigation on this site is instant on a warm cache and distinctly not on a
// cold one, and the gap was silent: you clicked, nothing moved, you clicked
// again. The bar is the acknowledgement.
//
// It eases toward 90% and waits there, because the honest alternative — a bar
// that reflects real bytes — would sit at 0 for the whole request and then jump.
// What the visitor needs to know is "heard you, working", and that is what this
// says.

import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export default function RouteProgress() {
  const loading = useRouterState({ select: (s) => s.status === 'pending' })
  const [pct, setPct] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!show) return
      // Complete, then leave — snapping to invisible reads as a glitch.
      setPct(100)
      const t = window.setTimeout(() => {
        setShow(false)
        setPct(0)
      }, 320)
      return () => window.clearTimeout(t)
    }

    // A navigation that resolves in 120ms should never flash a loading bar.
    const arm = window.setTimeout(() => {
      setShow(true)
      setPct(12)
    }, 140)

    const creep = window.setInterval(() => {
      setPct((p) => (p >= 90 ? p : p + (90 - p) * 0.14))
    }, 220)

    return () => {
      window.clearTimeout(arm)
      window.clearInterval(creep)
    }
  }, [loading, show])

  if (!show) return null

  return (
    <div className="rprog" aria-hidden="true">
      <div className="rprog-bar" style={{ width: `${pct}%` }} />
    </div>
  )
}
