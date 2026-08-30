// A mock, not a page of the site: the home hero exactly as it is, with the video
// swapped for a drawn backdrop.

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import AuroraBackdrop, { type Variant } from '#/components/AuroraBackdrop'
import { useReveal } from '#/components/useReveal'

import '#/styles/test.css'

export const Route = createFileRoute('/test')({
  head: () => ({
    meta: [
      { title: 'Backdrop test — Voxio Agents' },
      // A workbench page. It says nothing a search result should ever carry.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Test,
})

const VARIANTS: Variant[] = ['ribbons', 'infinity', 'both']

function Test() {
  useReveal()
  const [variant, setVariant] = useState<Variant>('ribbons')
  const [photo, setPhoto] = useState(true)

  return (
    <>
      <AuroraBackdrop variant={variant} photo={photo} />

      <div className="page">
        <main className="hero" id="top">
          <div className="hero-copy">

            <span className="badge appear appear--pop" style={{ "--d": "0.22s" }}>
              <svg className="badge-star" width="18" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Giving the voice your business needs
            </span>

            <h1>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.42s" }}>Voice agents that</span>
              </span>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.62s" }}>adapt to <em>the room</em>.</span>
              </span>
            </h1>

            <p className="lede appear appear--soft" style={{ "--d": "0.82s" }}>
              An agent that talks back with a face, reads the room, and changes how it behaves
              as the conversation turns. On the phone, in the browser, and on the screen in
              front of the person who has to get the conversation right.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-solid appear appear--btn" to="/contact" style={{ "--d": "0.96s" }}>Start for free</Link>
              <a className="btn btn-ghost appear appear--side" href="#top" style={{ "--d": "1.10s" }}>See it in the room</a>
            </div>

          </div>
        </main>

        <footer className="stats">
          <span className="stat appear appear--stat" style={{ "--d": "1.12s" }}>
            Replies in under half a second &mdash; it feels like talking, not waiting
          </span>
          <span className="stat appear appear--stat" style={{ "--d": "1.28s" }}>
            On a website it does not point at the button &mdash; it takes you there
          </span>
          <span className="stat appear appear--stat" style={{ "--d": "1.44s" }}>
            It answers the phone, and the caller does not ask to be transferred
          </span>
        </footer>
      </div>

      <div className="test-note">
        {VARIANTS.map((v) => (
          <button
            key={v}
            type="button"
            className={v === variant ? 'is-on' : undefined}
            onClick={() => setVariant(v)}
          >
            {v}
          </button>
        ))}
        <span>|</span>
        <button
          type="button"
          className={photo ? 'is-on' : undefined}
          onClick={() => setPhoto(!photo)}
        >
          photo
        </button>
      </div>
    </>
  )
}
