import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/calling-testimonials.css'

export const Route = createFileRoute('/calling/testimonials')({
  head: () => ({ meta: [{ title: 'Testimonials — VoxioAgents Calling' }] }),
  component: CallingTestimonials,
})

function CallingTestimonials() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">Calling &middot; Testimonials</span>
          <h1>What callers&rsquo; <em>owners say</em>.</h1>
          <p className="section-lede">
            Quotes from the people who put a Voxio agent on their line.
          </p>
        </div>

        <section className="section" id="all">
          <div className="quotes-full">
            <figure className="quote rise">
              <span className="quote-mark" aria-hidden="true">&ldquo;</span>
              <blockquote>
                <p>
                  What surprised us was not that it answered every call &mdash; it was that people
                  argued with it, talked over it, changed their minds halfway through a sentence,
                  and it just kept up. Callers stop announcing that they know it is a machine
                  after about thirty seconds.
                </p>
              </blockquote>
              <figcaption className="quote-by">
                <img className="logo-invert logo-crest" src="/assets/echobotics.svg" alt="Echobotics" />
                <span>
                  <span className="quote-name">Echobotics</span>
                  <span className="quote-role">AI calling agents &mdash; Hiring OS</span>
                </span>
              </figcaption>
            </figure>
          </div>
          <p className="section-lede rise section-tail">
            More quotes as more lines go live. <Link className="card-link" to="/testimonials">Testimonials from the wider Voxio work</Link>
          </p>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Put an agent on your <em>line</em>.</h2>
            <p className="section-lede">Tell us the call you want handled. We will show you it running.</p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/contact">Start for free</Link>
            <Link className="btn btn-ghost" to="/calling" hash="demo">Place a call</Link>
          </div>
        </section>
      <SiteFooter />

      </div>
    </>
  )
}
