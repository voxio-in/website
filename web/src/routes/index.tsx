// /avatar and /webnav. Its height, its paddings and the pull-up that breaks the
// fold are all in site.css so the four heroes cannot drift

import { createFileRoute, Link } from '@tanstack/react-router'

import AboutLetter from '#/components/AboutLetter'
import EchoMosaic from '#/components/EchoMosaic'
import { Glyph } from '#/components/Glyphs'
import Rotator from '#/components/Rotator'
import SiteFooter from '#/components/SiteFooter'
import SurfaceCards from '#/components/SurfaceCards'
import { useReveal } from '#/components/useReveal'

export const Route = createFileRoute('/')({
  // Title and description come from __root, which is written for this page.
  // The canonical is what stops the same page being indexed twice over a
  // trailing slash, a utm tag or a www host.
  head: () => ({ links: [{ rel: 'canonical', href: 'https://voxio.in/' }] }),
  component: Home,
})

function Home() {
  useReveal()

  return (
    <>
      {/* hero-shell: the ONE hero container class, shared with /calling,
          apart again. There is no per-page hero modifier by design. */}
      <div className="page hero-shell">

        <main className="hero" id="top">
          <div className="hero-copy">

            <span className="badge appear appear--pop" style={{ "--d": "0.22s" }}>
              <svg className="badge-star" width="18" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              <Rotator />
            </span>

            {/* Voice was only ever half of it. The headline now says the whole
                product — voice, chat and text on one engine — and still lands
                on the claim nobody else can make: it does not answer about the
                system, it works it. */}
            <h1>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.42s" }}>Agents that talk, type</span>
              </span>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.62s" }}>and <em>get it done</em>.</span>
              </span>
            </h1>

            <p className="lede appear appear--soft" style={{ "--d": "0.82s" }}>
              Voxio Agents puts one intelligent agent on every line your customer already uses
              &mdash; the phone, the chat window, a message thread, or face-to-face on a
              screen. It does not explain your system to them. It works it while they talk.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-solid appear appear--btn"  to="/contact" style={{ "--d": "0.96s" }}>Start for free</Link>
              <a className="btn btn-ghost appear appear--side" href="#work"   style={{ "--d": "1.10s" }}>See it in the room</a>
            </div>

          </div>
        </main>

      </div>

      {/* ============================================================
           ============================================================ */}
      <div className="scroll">

        {/* ---------- the three surfaces ----------
             section below then matches so the two read as one column. */}
        <section className="section section--wide section--peek" id="surfaces">
          <div className="section-head rise">
            <span className="eyebrow">Where it shows up</span>
            {/* No lede here on purpose. It was one more thing between the fold
                it said. */}
            <h2 className="section-title">One agent, <em>three rooms</em>.</h2>
          </div>

          <SurfaceCards />
        </section>

        {/* ---------- work ---------- */}
        <section className="section section--wide" id="work">
          <div className="section-head rise">
            <span className="eyebrow">Work</span>
            <h2 className="section-title">Already trusted in the <em>toughest rooms</em>.</h2>
            <p className="section-lede">
              A medical student who freezes in front of a patient. An officer facing someone
              furious. Singapore&rsquo;s universities and ministries use Voxio Agents so their people
              can practise the conversation before it counts. The same agent screens a hundred
              candidates on the phone, and runs your software while you talk to it.
            </p>
          </div>

          {/* Logos we hold files for are images; the rest are wordmarks until the
               marks are supplied, so the wall never shows a broken image. */}
          <div className="logo-wall rise" style={{ "--rd": "0.06s" }}>
            <span className="logo-tip" data-label="Singapore Institute of Technology"><img src="/assets/SIT.png" width={1200} height={549} alt="Singapore Institute of Technology" /></span>
            <span className="logo-tip" data-label="Ministry of Social &amp; Family Development"><img src="/assets/MSF.png" width={250} height={123} alt="Ministry of Social and Family Development, Singapore" /></span>
            <span className="logo-tip" data-label="SilverWings XR"><img src="/assets/silver-wings-xr-logo.png" width={267} height={68} alt="SilverWings XR" /></span>
            <span className="logo-tip" data-label="VOXA"><img src="/assets/voxa.png" width={1024} height={271} alt="VOXA" /></span>
            <span className="logo-tip" data-label="Yellow Ribbon Singapore"><img className="logo-crest logo-fine" src="/assets/yellow-ribbon.png" width={661} height={320} alt="Yellow Ribbon Singapore" /></span>
            <span className="logo-tip" data-label="Echobotics"><img className="logo-invert logo-crest" src="/assets/echobotics.svg" alt="Echobotics" /></span>
          </div>

          {/* Kept out of the wall above rather than mixed into it. A logo wall
              is read as a customer list, and these two are being built. */}
          <div className="logo-soon rise" style={{ "--rd": "0.09s" }}>
            <span className="logo-soon-k">In development</span>
            <span className="logo-tip" data-label="Agency for Integrated Care"><img className="logo-crest" src="/assets/agency-for-integrated-care.png" width={324} height={228} alt="Agency for Integrated Care" /></span>
            <span className="logo-tip" data-label="Acetek College"><img className="logo-fine" src="/assets/acetek-college.png" width={385} height={159} alt="Acetek College" /></span>
          </div>

          <div className="cards rise section-block" style={{ "--rd": "0.12s" }}>
            <article className="card">
              <Glyph name="face" />
              <span className="card-kicker">Face to face</span>
              <h3 className="card-title">A face that argues back</h3>
              <p className="card-body">
                It plays the anxious patient, the stubborn resident, the customer demanding a
                refund &mdash; and holds that character until the person opposite earns the
                turn. Then it drops the act and tells them what they missed.
              </p>
              <Link className="card-link" to="/work" hash="singapore">Read the deployments</Link>
            </article>

            <article className="card">
              <Glyph name="logged" />
              <span className="card-kicker">Over the phone</span>
              <h3 className="card-title">Calls that end in your system</h3>
              <p className="card-body">
                Inbound, outbound and scheduled calls on a real number, handled end to end. It
                works on the connection your customer actually has &mdash; a bad line, a noisy
                room, one bar of signal &mdash; and the call ends with your records already
                updated.
              </p>
              <Link className="card-link" to="/calling/work" hash="echobotics">Read the deployment</Link>
            </article>

            <article className="card">
              <Glyph name="drive" />
              <span className="card-kicker">Inside your software</span>
              <h3 className="card-title">It doesn&rsquo;t explain the system. It uses it.</h3>
              <p className="card-body">
                Say what you need and it works the screen &mdash; scrolling, opening, filling,
                submitting, explaining as it goes. A booking engine, an ERP, a checkout: if a
                person can do it, it can do it while you talk.
              </p>
              <Link className="card-link" to="/webnav">See it work</Link>
            </article>
          </div>
        </section>

        {/* ---------- collaborations: Echobotics ----------
             are not four equal cards. */}
        <section className="section section--wide" id="collaborations">
          <div className="section-head rise">
            <span className="eyebrow">Echobotics</span>
            <h2 className="section-title">One hiring conversation, <em>four sides of the table</em>.</h2>
            <p className="section-lede">
              Hiring OS for the recruiter screening. Career OS for the candidate trying to earn
              the role. Training OS for the student being prepared for it. Placement OS for the
              institution doing the preparing. Four products on one engine, with Voxio Agents as the
              voice inside it &mdash; the same engine as the calling agents and the 3D avatars,
              pointed at interviews.
            </p>
          </div>

          <EchoMosaic />

          <p className="section-lede rise section-tail" style={{ "--rd": "0.24s" }}>
            <Link className="card-link" to="/collaborations">More on the partnership</Link>
          </p>
        </section>

        {/* ---------- testimonials ---------- */}
        <section className="section" id="testimonials">
          <div className="section-head rise">
            <span className="eyebrow">Testimonials</span>
            <h2 className="section-title">In their <em>own words</em>.</h2>
          </div>

          <div className="quotes">
            <figure className="quote rise" style={{ "--rd": "0.06s" }}>
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
                <img src="/assets/silver-wings-xr-logo.png" width={267} height={68} alt="SilverWings XR" />
                <span>
                  <span className="quote-name">Kapil Chabria</span>
                  <span className="quote-role">CEO &amp; Founder,
                    SilverWings XR
                  </span>
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

          <p className="section-lede rise section-tail" style={{ "--rd": "0.18s" }}>
            <Link className="card-link" to="/testimonials">All testimonials</Link>
          </p>
        </section>

        {/* ---------- about, as a signed letter ---------- */}
        <section className="section" id="about">
          <div className="rise">
            <AboutLetter />
          </div>
        </section>

        {/* ---------- closing CTA ---------- */}
        <section className="section cta" id="start">
          <div className="section-head rise">
            <h2 className="section-title">Put an agent in your <em>hardest room</em>.</h2>
            <p className="section-lede">
              Tell us the conversation your people struggle with. We will build it into an
              agent and let you talk to it.
            </p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/contact">Start for free</Link>
            <Link className="btn btn-ghost" to="/avatar">See the avatar agents</Link>
          </div>
        </section>
            <SiteFooter />

      </div>

    </>
  )
}
