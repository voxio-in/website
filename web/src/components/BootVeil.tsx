// The first-paint veil.
//
// The page ships a fixed video backdrop, two web fonts and a stylesheet that
// arrive in no fixed order, so the first second used to be visible assembly:
// text in a fallback face reflowing into Inter, the ground colour sitting bare
// while the video decoded. The veil covers that second with the mark, then
// lifts.
//
// It lifts on whichever comes first — fonts ready, or a hard 1.4s ceiling — so
// a font that never loads cannot hold the page hostage behind a blank screen.

import { useEffect, useState } from 'react'

export default function BootVeil() {
  const [gone, setGone] = useState(false)
  const [lifting, setLifting] = useState(false)

  useEffect(() => {
    let done = false
    const lift = () => {
      if (done) return
      done = true
      setLifting(true)
      window.setTimeout(() => setGone(true), 620)
    }

    const ceiling = window.setTimeout(lift, 1400)
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    if (fonts) void fonts.ready.then(() => window.setTimeout(lift, 180))
    else lift()

    return () => window.clearTimeout(ceiling)
  }, [])

  if (gone) return null

  return (
    <div className={`boot${lifting ? ' is-lifting' : ''}`} aria-hidden="true">
      <div className="boot-mark">
        <span className="boot-word">voxio</span>
        <span className="boot-track">
          <span className="boot-run" />
        </span>
      </div>
    </div>
  )
}
