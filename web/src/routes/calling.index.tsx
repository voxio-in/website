// The sample behind the 400ms figure below. Update it and the sentence updates
// with it — a stat that says "measured, not claimed" cannot carry a number
// nobody counted.

import { createFileRoute, Link } from '@tanstack/react-router'

import Rotator, { CALLING_LINES } from '#/components/Rotator'

import CallForm from '#/components/CallForm'
import { Glyph } from '#/components/Glyphs'
import ProductCross from '#/components/ProductCross'
import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/forms.css'
import '#/styles/calling.css'
import '#/styles/demo.css'

const MEASURED_CALLS = 1200

export const Route = createFileRoute('/calling/')({
  head: () => ({ meta: [{ title: 'Calling Agents — Voxio' }] }),
  component: CallingHome,
})

function CallingHome() {
  useReveal()

  return (
    <>
      {/* ============================================================
           ============================================================ */}
      <section className="callhero hero-shell" id="top">

        <main className="hero">
          <div className="hero-copy">

            <span className="badge appear appear--pop" style={{ "--d": "0.22s" }}>
              <svg className="badge-star" width="18" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              <Rotator lines={CALLING_LINES} />
            </span>

            <h1>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.42s" }}>Every call picked up.</span>
              </span>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.62s" }}>Every caller <em>actually heard</em>.</span>
              </span>
            </h1>

            <p className="lede appear appear--soft" style={{ "--d": "0.82s" }}>
              No hold music, no phone tree, no callback promise. An agent that answers on the
              first ring, talks like a person, lets you cut in mid-sentence, and hands your team
              the outcome instead of a recording to listen through.
            </p>

            <div className="hero-actions">
              <a className="btn-ember appear appear--btn" href="#demo" style={{ "--d": "0.96s" }}>Place a call</a>
              <Link className="btn btn-ghost appear appear--side" to="/calling/work" style={{ "--d": "1.10s" }}>Hear where it runs</Link>
            </div>

          </div>
        </main>

        {/* The stats row was removed. It was three claims strung along the floor of
            higher up the page. */}
      </section>

      <div className="scroll">

        <section className="section section--peek" id="demo">
          <div className="section-head rise">
            <span className="eyebrow">Try it</span>
            <h2 className="section-title">Have it <em>ring your phone</em>.</h2>
            <p className="section-lede">
              Pick a desk, give us the number, and we will call it. The agent answers as
              whichever institution you name, in Hinglish or English &mdash; whichever you
              speak to it in.
            </p>
          </div>

          {/* No .glass-panel wrapper any more — the demo card IS the surface, and
              old one read as fog. */}
          <div className="rise" style={{ "--rd": "0.08s" }}>
            <CallForm />
          </div>
        </section>

        {/* ---------- how a call goes ----------
             that it is testable now, not later. */}
        <section className="section" id="how">
          <div className="section-head rise">
            <span className="eyebrow">How a call goes</span>
            <h2 className="section-title">Six things <em>every voice agent claims</em>.</h2>
            <p className="section-lede">
              Every platform in this category says it handles interruptions, answers fast, and
              works in Hindi. Almost none of them tell you which one breaks on a bad line at four
              in the afternoon. Ours is about to ring your phone, so here is the list to check
              while it does.
            </p>
          </div>

          <ol className="steps steps--try">
            <li className="step rise">
              <Glyph name="answer" />
              <h3 className="step-t">It does not leave you hanging</h3>
              <p className="step-b">
                Most agents wait a beat too long, and that beat is what makes them feel like
                machines. This one answers on your rhythm, not on a fixed timer. Change your mind
                mid-sentence and it listens again instead of pushing on with the answer it had
                already started.
              </p>
              <p className="step-try"><em>Try it:</em> pause halfway through a sentence, as if you are thinking.</p>
              <a className="step-go" href="#demo" aria-label="Try it — place a call"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.06s" }}>
              <Glyph name="interrupt" />
              <h3 className="step-t">You can talk over it</h3>
              <p className="step-b">
                Cut in and it stops &mdash; properly. It does not trail off, finish the thought
                under your voice, or pick the old sentence back up three seconds later. It drops
                what it was saying and listens, the way a person would.
              </p>
              <p className="step-try"><em>Try it:</em> interrupt it mid-answer with a completely different question.</p>
              <a className="step-go" href="#demo" aria-label="Try it — place a call"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.12s" }}>
              <Glyph name="protect" />
              <h3 className="step-t">Except when it matters</h3>
              <p className="step-b">
                A confirmation number or a policy line gets finished &mdash; you decide which
                ones. And an <em>um</em> or an <em>uh</em> never counts as interrupting, so it
                does not stop dead every time someone thinks out loud.
              </p>
              <p className="step-try"><em>Try it:</em> say &ldquo;mm-hmm&rdquo; while it is speaking. It should carry on.</p>
              <a className="step-go" href="#demo" aria-label="Try it — place a call"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.18s" }}>
              <Glyph name="language" />
              <h3 className="step-t">It switches when you do</h3>
              <p className="step-b">
                Start in Hindi and move to English mid-sentence and it follows without resetting
                or asking you to pick a language. Most agents translate. This one just keeps up.
              </p>
              <p className="step-try"><em>Try it:</em> ask half your question in Hindi and finish it in English.</p>
              <a className="step-go" href="#demo" aria-label="Try it — place a call"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.24s" }}>
              <Glyph name="honest" />
              <h3 className="step-t">It does not invent an answer</h3>
              <p className="step-b">
                Ask for a fee it was never told and it says it does not have that, instead of
                producing a confident number. The failure everyone fears from a voice agent is
                not silence &mdash; it is a fluent wrong answer given to a parent.
              </p>
              <p className="step-try"><em>Try it:</em> ask for a detail it could not possibly know.</p>
              <a className="step-go" href="#demo" aria-label="Try it — place a call"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.30s" }}>
              <Glyph name="signal" />
              <h3 className="step-t">It works on the line you actually have</h3>
              <p className="step-b">
                One bar of signal, a fan running, a landline from a small town. The demo that
                only works on office wifi is the one you find out about in month two.
              </p>
              <p className="step-try"><em>Try it:</em> call from wherever your customers actually call from.</p>
              <a className="step-go" href="#demo" aria-label="Try it — place a call"></a>
            </li>
          </ol>
        </section>

        {/* ---------- what it does on a real line ---------- */}
        <section className="section" id="carrier">
          <div className="section-head rise">
            <span className="eyebrow">On a real number</span>
            <h2 className="section-title">A phone line that runs itself</h2>
            <p className="section-lede">
              It is a real number people can call, and a real number that can call them. Nothing
              to install, nothing for a caller to download.
            </p>
          </div>

          {/* Six, held at three across so they read as two rows rather than a
              two grids are one system rather than two decorations. */}
          <div className="cards cards--three rise">
            <article className="card">
              <Glyph name="inbound" />
              <span className="card-kicker">Inbound</span>
              <h3 className="card-title">Every call picked up</h3>
              <p className="card-body">
                Nothing rings out, nothing queues, nothing arrives at 2am to an empty office.
                Every call is recorded and written up the moment it ends.
              </p>
            </article>
            <article className="card">
              <Glyph name="outbound" />
              <span className="card-kicker">Outbound &amp; scheduled</span>
              <h3 className="card-title">It&rsquo;s already talking when you say hello</h3>
              <p className="card-body">
                No dead air on pickup, which is the pause that gets people to hang up. Book calls
                for a date, a time and a timezone and it works the list.
              </p>
            </article>
            <article className="card">
              <Glyph name="voicemail" />
              <span className="card-kicker">Answering machines</span>
              <h3 className="card-title">It hangs up on voicemail</h3>
              <p className="card-body">
                It recognises a machine and hangs up instead of cheerfully briefing an
                answerphone. The difference between a call list you can trust and a folder of
                transcripts nobody will read.
              </p>
            </article>
            <article className="card">
              <Glyph name="later" />
              <span className="card-kicker">&ldquo;Call me later&rdquo;</span>
              <h3 className="card-title">It calls back when you asked it to</h3>
              <p className="card-body">
                Say you are driving, or in a meeting, or that six o&rsquo;clock is better. It does
                not push on regardless and it does not lose you in a spreadsheet &mdash; it rings
                again when you said to.
              </p>
            </article>
            <article className="card">
              <Glyph name="dropped" />
              <span className="card-kicker">Dropped calls</span>
              <h3 className="card-title">The call drops, the conversation doesn&rsquo;t</h3>
              <p className="card-body">
                Signal goes, or you ring back after lunch, and it picks up where you left off
                instead of asking your name again. It remembers your number for a day. Nobody in
                India has a call that never drops &mdash; starting over is what makes people stop
                answering.
              </p>
            </article>
            <article className="card">
              <Glyph name="after" />
              <span className="card-kicker">Afterwards</span>
              <h3 className="card-title">You get the answer, not the audio</h3>
              <p className="card-body">
                Whatever the call was for &mdash; the booking, the qualifying answer, the reason
                they were unhappy &mdash; lands in your systems as something you can act on.
                Nobody has to sit and listen back.
              </p>
            </article>
          </div>
        </section>

        {/* ---------- measured ----------
             sample size; it has to be a count somebody can point at. */}
        <section className="section" id="numbers">
          <div className="section-head rise">
            <span className="eyebrow">Measured, not claimed</span>
            <h2 className="section-title">What it feels like on the line</h2>
            <p className="section-lede">
              The only number that matters on a phone call is the silence after you stop
              talking. That is the one we measure.
            </p>
          </div>
          <div className="numbers numbers--one rise">
            <div className="num">
              <span className="num-v">400<span className="num-u">ms</span></span>
              <span className="num-k">median time to first word, on live Indian mobile calls</span>
              <span className="num-note">
                Measured across {MEASURED_CALLS} production calls, not in a lab.
              </span>
            </div>
          </div>
          <p className="section-lede rise section-tail" style={{ "--rd": "0.12s" }}>
            <Link className="card-link" to="/calling/about">Why it sounds like a person</Link>
          </p>
        </section>

        {/* ---------- proof ---------- */}
        <section className="section" id="proof">
          <div className="section-head rise">
            <span className="eyebrow">In production</span>
            <h2 className="section-title">Already on real lines</h2>
          </div>
          <div className="cards rise">
            <article className="card">
              <Glyph name="dialtone" />
              <span className="card-kicker">Echobotics</span>
              <h3 className="card-title">AI calling agents</h3>
              <p className="card-body">
                Their calling agents run on this stack &mdash; our voice layer, their line:
                inbound, outbound and booked calls, on real numbers.
              </p>
              <Link className="card-link" to="/calling/work" hash="echobotics">Read the deployment</Link>
            </article>
            <article className="card">
              <Glyph name="language" />
              <span className="card-kicker">Higher education</span>
              <h3 className="card-title">Admissions, in Hinglish</h3>
              <p className="card-body">
                An inbound counsellor that answers course, fee and eligibility questions, and
                switches language when the caller does.
              </p>
              <Link className="card-link" to="/calling/work" hash="admissions">Read the deployment</Link>
            </article>
            <article className="card">
              <Glyph name="interview" />
              <span className="card-kicker">Placement OS</span>
              <h3 className="card-title">First-round interviews</h3>
              <p className="card-body">
                Screening at a volume no team could staff, handing recruiters a ranked list
                instead of a call queue.
              </p>
              <Link className="card-link" to="/calling/collaborations">See the collaboration</Link>
            </article>
          </div>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Want one on your <em>own number</em>?</h2>
            <p className="section-lede">
              Tell us what the call is for. We will put an agent on a line and let you ring it.
            </p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/contact">Start for free</Link>
            <Link className="btn btn-ghost" to="/calling/work" hash="echobotics">See it deployed</Link>
          </div>
        </section>
      <ProductCross current="calling" />
      <SiteFooter />

      </div>

      <audio id="agent-audio" autoPlay></audio>
    </>
  )
}
