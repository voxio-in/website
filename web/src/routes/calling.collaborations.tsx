import { createFileRoute, Link } from '@tanstack/react-router'

import { Glyph } from '#/components/Glyphs'
import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/calling-collaborations.css'

export const Route = createFileRoute('/calling/collaborations')({
  head: () => ({
    meta: [
      { title: 'Collaborations — Voxio Agents Calling' },
      { name: 'description', content: 'The calling agent running inside products that are not ours.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxioagents.com/calling/collaborations' }],
  }),
  component: CallingCollaborations,
})

function CallingCollaborations() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">Calling &middot; Collaborations</span>
          <h1><em>Hiring OS</em>, on the phone.</h1>
          <p className="section-lede">
            Echobotics is a hiring platform with four products on one engine. Hiring OS is the
            recruiter&rsquo;s side of it, and the calling stack is what it screens with.
          </p>
        </div>

        <section className="section" id="hiring-os">
          <div className="section-head rise">
            <span className="eyebrow">Hiring OS</span>
            <h2 className="section-title">First-round interviews, at volume</h2>
            <p className="section-lede">
              Calling agents run first-round interviews, confirm availability and shortlist
              candidates against a role &mdash; handing a recruiter a ranked list instead of a
              call queue.
            </p>
          </div>

          <div className="cards rise">
            <article className="card">
              <Glyph name="outbound" />
              <span className="card-kicker">Outbound</span>
              <h3 className="card-title">No dead air on pickup</h3>
              <p className="card-body">
                It is already talking as the candidate says hello &mdash; no silent beat on
                answer, which is the pause that makes people hang up on unknown numbers. Booked
                outbound takes a date, time and timezone.
              </p>
            </article>
            <article className="card">
              <Glyph name="voicemail" />
              <span className="card-kicker">Answering machines</span>
              <h3 className="card-title">It hangs up on voicemail</h3>
              <p className="card-body">
                Answering-machine detection ends the call rather than interviewing a recording
                &mdash; which is the difference between a screening run you can trust and a
                transcript full of answerphone greetings.
              </p>
            </article>
            <article className="card">
              <Glyph name="after" />
              <span className="card-kicker">Structured output</span>
              <h3 className="card-title">A shortlist, not a call queue</h3>
              <p className="card-body">
                Everything the workflow emits beyond the spoken words &mdash; the verdict, the
                shortlist flag, the answers they gave &mdash; reaches your systems ready to use,
                intact.
              </p>
            </article>
          </div>

          <p className="section-lede rise section-tail">
            Hiring OS is one of four products co-built with Echobotics &mdash; Career OS for the
            candidate, Training OS for the student, Placement OS for the institution &mdash; and
            the other three run on the browser and avatar surfaces.
            <Link className="card-link" to="/collaborations">See all four</Link>
          </p>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Screening on your <em>own numbers</em>?</h2>
            <p className="section-lede">The same workflow runs inbound, outbound and scheduled outbound.</p>
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
