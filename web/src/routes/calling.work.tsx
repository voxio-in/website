import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/calling-work.css'

export const Route = createFileRoute('/calling/work')({
  head: () => ({
    meta: [
      { title: 'Work — Voxio Agents Calling' },
      { name: 'description', content: 'Calling agents in production — the desks they answer, the calls they place, and what happens to the ones they hand over.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxioagents.com/calling/work' }],
  }),
  component: CallingWork,
})

function CallingWork() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">Calling &middot; Work</span>
          <h1>Where the <em>calls land</em>.</h1>
          <p className="section-lede">
            Real numbers, real callers, no demo conditions. Here is what the agents are
            actually doing on the line today.
          </p>
        </div>

        <section className="section" id="echobotics">
          <div className="section-head rise">
            <span className="eyebrow">Echobotics</span>
            <h2 className="section-title">AI calling agents</h2>
          </div>
          <article className="case rise">
            <div className="case-id">
              <img className="logo-invert logo-crest" src="/assets/echobotics.svg" alt="Echobotics" />
              <span className="case-name">Echobotics</span>
              <span className="case-meta">AI calling agents<br />Collaboration partner</span>
            </div>
            <div className="case-copy">
              <p>
                Voxio Agents is the voice on the Echobotics line. Everything a caller hears is ours
                &mdash; the turn-taking, the barge-in, the recovery when someone talks over it
                &mdash; running on a real number that answers every call, rings people back,
                works a booked list on a schedule, and writes up what happened the moment each
                call ends.
              </p>
              <p>
                What makes it usable is not the AI &mdash; it is the manners. It waits for people
                to finish, stops when they cut in, refuses to be interrupted on the handful of
                lines that must be said in full, and never hangs up on its own goodbye. Those are
                the things callers notice, and they are the things most voice agents get wrong.
              </p>
              <div className="case-tags">
                <span className="case-tag">Inbound &amp; outbound</span>
                <span className="case-tag">Scheduled calls</span>
                <span className="case-tag">Interruptible</span>
                <span className="case-tag">Call recording</span>
              </div>
            </div>
          </article>
        </section>

        <section className="section" id="admissions">
          <div className="section-head rise">
            <span className="eyebrow">Higher education</span>
            <h2 className="section-title">Admissions desk</h2>
          </div>
          <article className="case rise">
            <div className="case-id">
              <span className="logo-word" style={{ fontSize: "19px" }}>University admissions</span>
              <span className="case-name">Inbound admissions</span>
              <span className="case-meta">Hinglish &middot; Inbound admissions</span>
            </div>
            <div className="case-copy">
              <p>
                An inbound admissions counsellor that picks up every call: course, fee and
                eligibility questions, name and interest captured, and a handover when the caller
                wants a human.
              </p>
              <p>
                It speaks the way the callers actually do &mdash; Hindi, with English for course
                names &mdash; and follows them into English the moment they switch. A quick
                <em>haan</em> or <em>theek hai</em> will not tip it into the wrong language
                halfway through, which is the failure that makes bilingual phone lines
                exhausting to use.
              </p>
              <div className="case-tags">
                <span className="case-tag">Inbound</span>
                <span className="case-tag">Hinglish</span>
                <span className="case-tag">Language switching</span>
              </div>
              <p style={{ marginTop: "18px" }}><Link className="card-link" to="/calling" hash="demo">Call it yourself</Link></p>
            </div>
          </article>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Want one on your <em>own number</em>?</h2>
            <p className="section-lede">Inbound, outbound and scheduled outbound over a real carrier.</p>
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
