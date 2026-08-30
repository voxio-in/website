import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/about.css'

/* Short answers on purpose. Anything that needs a paragraph is a conversation,
   and the conversation is what the contact form is for. */
const FAQ = [
  {
    q: 'How long does it take to get an agent running?',
    a: 'A working demo of your own conversation in days, not months. A production deployment depends on how much of your system the agent has to touch — reading a schedule is quick, writing into a case management system takes longer because it has to be right every time.',
  },
  {
    q: 'What does it connect to?',
    a: 'Anything with an API. The agent works your system through the same interfaces your own software uses — calendars, CRMs, case systems, ticketing, internal databases. Where there is no API, we look at what else the workflow can hang off before we promise it.',
  },
  {
    q: 'Which languages does it speak?',
    a: 'English is what every deployment on this site runs in today, including Singapore English with its own rhythm and vocabulary. Other languages are a configuration change rather than a rebuild, but we test a language properly before we put it in front of your customers.',
  },
  {
    q: 'Does it replace our people?',
    a: 'No, and the deployments here are the evidence. The training work makes existing officers better at the conversations they already have. The calling work takes the calls nobody had capacity for. The agent hands over the moment a person should be on the line.',
  },
  {
    q: 'What happens when it does not know the answer?',
    a: 'It says so and hands over, rather than inventing something. Where a handover target exists — a person, a queue, a callback — that is where the conversation goes. The transcript goes with it, so whoever picks it up is not starting from nothing.',
  },
  {
    q: 'Where does our data go?',
    a: 'Into your systems and the services needed to run the conversation, and nowhere else. We do not train models on your conversations. For a deployment, the data handling is written into the agreement we sign, and it is a question we expect to be asked hard.',
  },
  {
    q: 'What does it cost?',
    a: 'It depends on the volume of conversations and how deep the system integration goes, so there is no list price that would be honest. Tell us the conversation you want handled and we will scope it.',
  },
  {
    q: 'How do we start?',
    a: 'Describe one conversation your people keep getting wrong, or keep not having because there is no time. That is how every engagement on this site started.',
  },
]

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About Us — Voxio Agents' },
      { name: 'description', content: 'Who builds Voxio Agents, and why every deployment starts with somebody describing a conversation their people keep getting wrong.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/about' }],
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

        {/* The questions that arrive in the first reply to almost every enquiry.
            Answering them here shortens that exchange, and it is the one block
            on the site a search engine or an assistant can quote back verbatim
            — which is why it also emits FAQPage structured data. */}
        <section className="section" id="faq">
          <div className="section-head rise">
            <span className="eyebrow">Common questions</span>
            <h2 className="section-title">Asked <em>every time</em>.</h2>
          </div>

          <div className="faq rise">
            {FAQ.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
          />
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
