import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/calling-about.css'

export const Route = createFileRoute('/calling/about')({
  head: () => ({
    meta: [
      { title: 'About — Voxio Agents Calling' },
      { name: 'description', content: 'How the calling agent works: how it holds a conversation, works your system mid-call, and hands over the moment a person should take it.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/calling/about' }],
  }),
  component: CallingAbout,
})

function CallingAbout() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">Calling &middot; About</span>
          <h1>The part you <em>actually hear</em>.</h1>
          <p className="section-lede">
            Most of the perceived quality of a calling agent is not the model. It is when it
            starts talking, whether it stops when you cut in, and how long the silence is
            before it answers.
          </p>
        </div>

        <section className="section" id="turn-taking">
          <div className="about-grid">
            <div className="about-copy rise">
              <p>
                <strong>It answers on your rhythm, not a timer.</strong> Everyone pauses
                differently &mdash; some people think mid-sentence, some rattle through. A voice
                agent working off a fixed wait either talks over the first group or leaves the
                second hanging. Ours learns the pace of whoever is on the line and answers to
                that. If someone was only pausing, it goes quiet again and picks up their whole
                sentence &mdash; they never have to say it twice.
              </p>
              <p>
                <strong>You can talk over it &mdash; except where you should not.</strong>
                Cut in and it stops properly: it does not trail off, keep going under your voice,
                or resume the old sentence once you finish. You choose the handful of lines it
                will always complete &mdash; a confirmation number, a required disclosure &mdash;
                and it finishes those regardless. Everything else belongs to the caller.
              </p>
              <p>
                <strong>It says goodbye before it goes.</strong> The line stays open until the
                last word has actually reached the caller. No agent clipping its own sign-off,
                which is the single cheapest way to make a company sound careless.
              </p>
            </div>

            <div className="facts rise" style={{ "--rd": "0.12s" }}>
              <div className="fact"><span className="fact-k">Your own number</span><span className="fact-v">People ring it like any other</span></div>
              <div className="fact"><span className="fact-k">Which direction</span><span className="fact-v">It answers, calls out, and books ahead</span></div>
              <div className="fact"><span className="fact-k">How fast it answers</span><span className="fact-v">Under half a second</span></div>
              <div className="fact"><span className="fact-k">Interrupting it</span><span className="fact-v">Works, the way it does with a person</span></div>
              <div className="fact"><span className="fact-k">Hours</span><span className="fact-v">All of them</span></div>
            </div>
          </div>
        </section>

        <section className="section" id="honest">
          <div className="section-head rise">
            <span className="eyebrow">Straight answer</span>
            <h2 className="section-title">Why most voice agents feel slow</h2>
            <p className="section-lede">
              It is almost never the AI thinking. It is the system waiting, over-cautiously, to
              be certain you have finished talking &mdash; and that caution is what makes a call
              feel like filling in a form. Nearly all of our work goes into removing that wait
              without cutting people off. The target is a reply in under 500&nbsp;ms, and that is
              what the stack is tuned to hold.
            </p>
          </div>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Hear it on a <em>real call</em>.</h2>
            <p className="section-lede">Pick a desk, press call, and talk to it.</p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/calling" hash="demo">Place a call</Link>
            <Link className="btn btn-ghost" to="/calling/work">See the work</Link>
          </div>
        </section>
      <SiteFooter />

      </div>
    </>
  )
}
