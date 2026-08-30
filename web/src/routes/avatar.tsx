// the hero — the numbers each product page led with — and it is gone from all
// three product pages together so they stay one device, not two. The hero is now
// copy and its two buttons, and the section under it starts

import { createFileRoute, Link } from '@tanstack/react-router'

import Rotator, { AVATAR_LINES } from '#/components/Rotator'

import DemoPicker from '#/components/DemoPicker'
import { Glyph } from '#/components/Glyphs'
import ProductCross from '#/components/ProductCross'
import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/forms.css'
import '#/styles/avatar.css'
import '#/styles/demo.css'

export const Route = createFileRoute('/avatar')({
  head: () => ({
    meta: [
      { title: '3D Avatar Agents — Practice the Conversation That Goes Wrong' },
      { name: 'description', content: 'A 3D character plays the difficult person — the frightened patient, the resident who has stopped cooperating — and refuses to make it easy. It watches how your people answer, then drops the character and tells them what they missed.' },
      { property: 'og:title', content: 'Practice the conversation that goes wrong' },
      { property: 'og:description', content: 'A 3D character plays the difficult person — the frightened patient, the resident who has stopped cooperating — and refuses to make it easy. It watches how your people answer, then drops the character and tells them what they missed.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/avatar' }],
  }),
  component: Avatar,
})

function Avatar() {
  useReveal()

  return (
    <>
      <div className="page hero-shell">

        <main className="hero" id="top">
          <div className="hero-copy">

            <span className="badge appear appear--pop" style={{ "--d": "0.22s" }}>
              <svg className="badge-star" width="18" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              <Rotator lines={AVATAR_LINES} />
            </span>

            <h1>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.42s" }}>A face that <em>argues back</em>.</span>
              </span>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.62s" }}>Then tells you what you missed.</span>
              </span>
            </h1>

            <p className="lede appear appear--soft" style={{ "--d": "0.82s" }}>
              It plays the anxious patient, the resident who has decided the answer is no, the
              customer demanding a refund &mdash; and it does not make it easy. When the
              conversation ends it changes character and walks you back through everything you
              should have asked.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-solid appear appear--btn"  to="/contact" style={{ "--d": "0.96s" }}>Book a live session</Link>
              <a className="btn btn-ghost appear appear--side" href="#where" style={{ "--d": "1.10s" }}>See where it runs</a>
            </div>

          </div>
        </main>

        {/* The stats row was removed. It was three claims strung along the floor of
            higher up the page. */}
      </div>

      <div className="scroll">

        {/* ---------- how a session goes ---------- */}
        <section className="section section--peek" id="try">
          <div className="section-head rise">
            <span className="eyebrow">Try it</span>
            <h2 className="section-title">
              Talk to one <em>now</em>.
            </h2>
            <p className="section-lede">
              In this tab, over your microphone &mdash; no install, no phone call. Interrupt
              it, change your mind, go quiet: it handles all three, and that is the part
              worth testing.
            </p>
          </div>

          {/* No .glass-panel wrapper — the demo card is the surface now. */}
          <div className="rise" style={{ "--rd": "0.08s" }}>
            <DemoPicker />
          </div>
        </section>

        {/* Six, each with a way to check it, and each a link back up to #try —
             is testable now rather than a set of claims to take on trust. */}
        <section className="section" id="how">
          <div className="section-head rise">
            <span className="eyebrow">How a session goes</span>
            <h2 className="section-title">Six things a <em>role-play</em> usually gets wrong.</h2>
            <p className="section-lede">
              Everyone has sat through a training exercise where a colleague half-heartedly
              pretends to be angry. It does not work, because they are being polite to you.
            </p>
          </div>

          <ol className="steps steps--try">
            <li className="step rise">
              <h3 className="step-t">It commits to the character</h3>
              <p className="step-b">
                Vague when a nervous patient would be vague, stubborn when a stubborn person
                would be stubborn. No menu of options, no right answer to click &mdash; you have
                to actually run the conversation.
              </p>
              <p className="step-try"><em>Try it:</em> ask a closed question and watch it stay unhelpful.</p>
              <a className="step-go" href="#try" aria-label="Try it — talk to one now"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.06s" }}>
              <h3 className="step-t">It will not be talked round</h3>
              <p className="step-b">
                Handle it badly and it escalates. It settles only when the right things are said
                in the right order, which means a bad attempt <em>feels</em> like a bad attempt
                instead of ending in polite applause.
              </p>
              <p className="step-try"><em>Try it:</em> apologise without fixing anything. It should stay angry.</p>
              <a className="step-go" href="#try" aria-label="Try it — talk to one now"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.12s" }}>
              <h3 className="step-t">It is watching you</h3>
              <p className="step-b">
                What it grades is not only what you said but how you said it &mdash; where you
                looked, where you hurried, where you backed off when it pushed.
              </p>
              <p className="step-try"><em>Try it:</em> look away while it is asking you something difficult.</p>
              <a className="step-go" href="#try" aria-label="Try it — talk to one now"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.18s" }}>
              <h3 className="step-t">The face is not animated</h3>
              <p className="step-b">
                Nobody scripted the anger, the hesitation, or the moment it softens. The same
                intelligence choosing the words chooses the expression behind them.
              </p>
              <p className="step-try"><em>Try it:</em> say something reassuring and watch the face change before the reply comes.</p>
              <a className="step-go" href="#try" aria-label="Try it — talk to one now"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.24s" }}>
              <h3 className="step-t">Then it changes who it is</h3>
              <p className="step-b">
                Same session, new person. The patient becomes the teacher &mdash; a far more
                useful critic than someone who watched from the back of the room.
              </p>
              <p className="step-try"><em>Try it:</em> end the consultation and see who you are talking to.</p>
              <a className="step-go" href="#try" aria-label="Try it — talk to one now"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.30s" }}>
              <h3 className="step-t">It names what you never asked</h3>
              <p className="step-b">
                Not a score. What you asked, what you could have asked instead, and the questions
                that never came up at all &mdash; while it is still fresh enough to remember why
                you did not ask them.
              </p>
              <p className="step-try"><em>Try it:</em> finish badly on purpose and read the debrief.</p>
              <a className="step-go" href="#try" aria-label="Try it — talk to one now"></a>
            </li>
          </ol>
        </section>

        {/* ---------- where it runs ---------- */}
        <section className="section" id="where">
          <div className="section-head rise">
            <span className="eyebrow">In production</span>
            <h2 className="section-title">Already in the <em>toughest rooms</em>.</h2>
            <p className="section-lede">
              Singapore&rsquo;s universities, ministries and reintegration agencies use it to
              let their people practise the conversation before it counts.
            </p>
          </div>

          <div className="logo-wall rise" style={{ "--rd": "0.06s" }}>
            <span className="logo-tip" data-label="Singapore Institute of Technology"><img src="/assets/SIT.png" width={1200} height={549} alt="Singapore Institute of Technology" /></span>
            <span className="logo-tip" data-label="Ministry of Social &amp; Family Development"><img src="/assets/MSF.png" width={250} height={123} alt="Ministry of Social and Family Development, Singapore" /></span>
            <span className="logo-tip" data-label="SilverWings XR"><img src="/assets/silver-wings-xr-logo.png" width={267} height={68} alt="SilverWings XR" /></span>
            <span className="logo-tip" data-label="Yellow Ribbon Singapore"><img className="logo-crest logo-fine" src="/assets/yellow-ribbon.png" width={661} height={320} alt="Yellow Ribbon Singapore" /></span>
          </div>

          {/* Kept out of the wall above rather than mixed into it. A logo wall
              is read as a customer list, and these two are being built. */}
          <div className="logo-soon rise" style={{ "--rd": "0.09s" }}>
            <span className="logo-soon-k">In development</span>
            <span className="logo-tip" data-label="Agency for Integrated Care"><img className="logo-crest" src="/assets/agency-for-integrated-care.png" width={324} height={228} alt="Agency for Integrated Care" /></span>
            <span className="logo-tip" data-label="Acetek College"><img className="logo-fine" src="/assets/acetek-college.png" width={385} height={159} alt="Acetek College" /></span>
          </div>

          {/* Three, filling the grid exactly. .split is auto-fit minmax(300px, 1fr),
              with a different person in it. Keep this at three or six, never four. */}
          <div className="split rise section-block" style={{ "--rd": "0.12s" }}>
            <article className="who">
              <Glyph name="withhold" />
              <span className="who-k">Singapore Institute of Technology</span>
              <h3 className="who-t">The patient who will not just tell you</h3>
              <p className="who-b">
                Medical students can name the disease and prescribe the drug, then freeze in
                front of a real person. The avatar hedges, drifts off the point and gets uneasy
                when pushed &mdash; so they have to learn how to <em>ask</em>. It holds a fear it
                will not volunteer until someone gives it room. Afterwards it becomes the teacher
                and reviews the consultation.
              </p>
            </article>

            <article className="who">
              <Glyph name="refuse" />
              <span className="who-k">Ministry of Social and Family Development</span>
              <h3 className="who-t">The resident who has decided no</h3>
              <p className="who-b">
                Officers meet elderly residents who cannot follow the process and residents who
                simply will not budge. You cannot rehearse that against a colleague being polite
                to you &mdash; so the avatar refuses to cooperate, and gets louder when it is
                talked over.
              </p>
            </article>

            <article className="who">
              <Glyph name="refund" />
              <span className="who-k">Yellow Ribbon Singapore</span>
              <h3 className="who-t">The customer demanding a refund</h3>
              <p className="who-b">
                Preparing for retail work on the other side of the gate. Acknowledge the
                complaint, check the receipt, explain the policy without hiding behind it, offer
                the remedy &mdash; wrong order and the customer stays angry, which is the honest
                outcome and the reason it works.
              </p>
            </article>
          </div>

          <p className="section-lede rise section-tail" style={{ "--rd": "0.18s" }}>
            <Link className="card-link" to="/work" hash="singapore">Read the deployments</Link>
          </p>
        </section>

        {/* ---------- the face ---------- */}
        <section className="section" id="face">
          <div className="section-head rise">
            <span className="eyebrow">The part we are proudest of</span>
            <h2 className="section-title">Nobody animates <em>any of this</em>.</h2>
            <p className="section-lede">
              Most talking-head systems are a puppet: someone builds the expressions in advance
              and the software picks one off a shelf. That is why they feel uncanny &mdash; the
              face is always a beat behind the meaning.
            </p>
          </div>

          <div className="cards cards--two rise">
            <article className="card">
              <Glyph name="expression" />
              <span className="card-kicker">The difference</span>
              <h3 className="card-title">The AI chooses the expression</h3>
              <p className="card-body">
                The same intelligence choosing the words chooses the face behind them &mdash;
                when to look away, when to soften, when to stay angry. Which is why people forget
                they are talking to software and start behaving as though it is real.
              </p>
            </article>
            <article className="card">
              <Glyph name="anyface" />
              <span className="card-kicker">Setup</span>
              <h3 className="card-title">Any face, no modelling</h3>
              <p className="card-body">
                You are not commissioning a character. Give it a face and it speaks, lip-synced,
                in the language the person in front of it actually uses.
              </p>
            </article>
          </div>

          {/* Two, not four. "1 browser tab" and "2 characters" are facts about the
              figure they made it read as one of them. */}
          <div className="numbers numbers--two rise section-block" style={{ "--rd": "0.12s" }}>
            <div className="num"><span className="num-v">&lt;500<span className="num-u">ms</span></span><span className="num-k">before it answers you</span></div>
            <div className="num"><span className="num-v">0</span><span className="num-k">expressions animated by hand</span></div>
          </div>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Which conversation do your people <em>dread</em>?</h2>
            <p className="section-lede">
              Tell us, and we will build the character for it and let you sit across from it.
            </p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/contact">Start for free</Link>
            <Link className="btn btn-ghost" to="/work" hash="singapore">Read the deployments</Link>
          </div>
        </section>
      <ProductCross current="avatar" />
      <SiteFooter />

      </div>
    </>
  )
}
