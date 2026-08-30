import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/testimonials.css'

export const Route = createFileRoute('/testimonials')({
  head: () => ({
    meta: [
      { title: 'Testimonials — Voxio Agents' },
      { name: 'description', content: 'What the people running these deployments say about them, in their own words.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxioagents.com/testimonials' }],
  }),
  component: Testimonials,
})

function Testimonials() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">Testimonials</span>
          <h1>In their <em>own words</em>.</h1>
          <p className="section-lede">
            Attributed, in their words, and trimmed to what they actually said about the
            work. Where we do not have a quote yet, the space is left empty rather than
            filled.
          </p>
        </div>

        <section className="section" id="all">
          <div className="quotes-full">
            <figure className="quote rise">
              <span className="quote-mark" aria-hidden="true">&ldquo;</span>
              <blockquote>
                <p>
                  Adopting Voxio AI&rsquo;s voicebot and 3D avatar has fundamentally transformed
                  our user engagement at SilverWings XR. It has empowered our team to shift focus
                  from routine inquiries to high-value, complex projects, knowing our users are
                  in capable hands.
                </p>
              </blockquote>
              <figcaption className="quote-by">
                <img src="/assets/silver-wings-xr-logo.png" alt="SilverWings XR" />
                <span>
                  <span className="quote-name">Kapil Chabria</span>
                  <span className="quote-role">CEO &amp; Founder, SilverWings XR</span>
                </span>
              </figcaption>
            </figure>

            <figure className="quote rise" style={{ "--rd": "0.12s" }}>
              <span className="quote-mark" aria-hidden="true">&ldquo;</span>
              <blockquote>
                <p>
                  People lose jobs over how they answer, not over what they know. That only works
                  if the interview pushes back when an answer is thin and does not wait a beat too
                  long before it speaks &mdash; Voxio is the reason ours does. Candidates stop
                  performing for it after about a minute.
                </p>
              </blockquote>
              <figcaption className="quote-by">
                <img className="logo-invert logo-crest" src="/assets/echobotics.svg" alt="Echobotics" />
                <span>
                  <span className="quote-name">Echobotics</span>
                  <span className="quote-role">Echobotics &mdash; Hiring, Career, Training &amp; Placement OS</span>
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Want to be the next one?</h2>
            <p className="section-lede">Tell us the conversation you want handled. We will show you it running.</p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/contact">Start for free</Link>
            <Link className="btn btn-ghost" to="/work">See our work</Link>
          </div>
        </section>
      <SiteFooter />

      </div>
    </>
  )
}
