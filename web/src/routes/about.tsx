import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/about.css'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About Us — Voxio Agents' },
      { name: 'description', content: 'Who builds Voxio Agents, and why every deployment starts with somebody describing a conversation their people keep getting wrong.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxioagents.com/about' }],
  }),
  component: About,
})

function About() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">About us</span>
          <h1>We build the <em>unglamorous</em> parts.</h1>
          <p className="section-lede">
            The part of a voice agent nobody demos: knowing when you have finished speaking.
          </p>
        </div>

        <section className="section" id="what">
          <div className="about-grid">
            <div className="about-copy rise">
              <p>
                Voxio Agents turns a phone call or a browser tab into a real-time speech-to-speech
                conversation with an AI agent. Audio streams in, a streaming transcriber turns it
                into text, a configurable workflow graph decides what to say and do, and a
                streaming synthesiser speaks it back.
              </p>
              <p>
                Most of the perceived quality of a voice agent is not the model. It is{' '}
                <em>when</em> it starts talking, whether it stops when you cut in, and how long
                the silence is before it answers. That turn-taking engine &mdash; adaptive
                pre-fire, per-response barge-in policy, hanging up only after the last syllable
                is heard &mdash; is the part we actually build.
              </p>
              <p>
                One workflow definition drives three surfaces: a phone call, a browser voice
                session, and a browser session with a lip-synced video avatar. On the browser the
                agent can also drive the user&rsquo;s page mid-sentence and see through their
                camera while it talks. Nothing is hard-wired &mdash; speech, synthesis and model
                providers are all a config change.
              </p>
            </div>

            <div className="facts rise" style={{ "--rd": "0.12s" }}>
              <div className="fact"><span className="fact-k">Where you meet it</span><span className="fact-v">Phone &middot; Browser &middot; Face on screen</span></div>
              <div className="fact"><span className="fact-k">On a website</span><span className="fact-v">It navigates for you</span></div>
              <div className="fact"><span className="fact-k">How fast it answers</span><span className="fact-v">Under half a second</span></div>
              <div className="fact"><span className="fact-k">Who moves the face</span><span className="fact-v">The AI, not an animator</span></div>
              <div className="fact"><span className="fact-k">Primary market</span><span className="fact-v">Singapore &middot; India</span></div>
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-head rise">
            <span className="eyebrow">How we work</span>
            <h2 className="section-title">Measured, not claimed</h2>
            <p className="section-lede">
              Every number above comes from a harness run or a config value, not from a deck.
              Where a limit exists we state it. The target is a reply in under 500&nbsp;ms, and
              that is what the stack is tuned to hold.
            </p>
          </div>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Put an agent on your <em>hardest workflow</em>.</h2>
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
