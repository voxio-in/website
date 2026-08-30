// the hero — the numbers each product page led with — and it is gone from all
// three product pages together so they stay one device, not two. The hero is now
// copy and its two buttons, and the section under it starts

import { createFileRoute, Link } from '@tanstack/react-router'

import Rotator, { WEBNAV_LINES } from '#/components/Rotator'

import { Glyph } from '#/components/Glyphs'
import ProductCross from '#/components/ProductCross'
import SiteFooter from '#/components/SiteFooter'
import WebActionRoom from '#/components/WebActionRoom'
import { useReveal } from '#/components/useReveal'

import '#/styles/forms.css'
import '#/styles/webnav.css'
import '#/styles/surfaces.css'
import '#/styles/demo.css'

export const Route = createFileRoute('/webnav')({
  head: () => ({
    meta: [
      { title: 'Website Navigation — An Agent That Drives the Page' },
      { name: 'description', content: 'Your customer says what they want and the agent does it on the screen in front of them — fills the form, finds the booking, files the report. Five real systems on this page, and you can watch it work them.' },
      { property: 'og:title', content: 'An agent that drives the page while it talks' },
      { property: 'og:description', content: 'Your customer says what they want and the agent does it on the screen in front of them — fills the form, finds the booking, files the report. Five real systems on this page, and you can watch it work them.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/webnav' }],
  }),
  component: Webnav,
})

function Webnav() {
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
              <Rotator lines={WEBNAV_LINES} />
            </span>

            <h1>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.42s" }}>Stop hunting for <em>the button</em>.</span>
              </span>
              <span className="headline-line">
                <span className="headline-text appear appear--mask" style={{ "--d": "0.62s" }}>Just say what you want.</span>
              </span>
            </h1>

            <p className="lede appear appear--soft" style={{ "--d": "0.82s" }}>
              Every help system does the same unhelpful thing: it tells you which button to
              press. If you could find the button you would not have asked. This one takes the
              wheel and does it on the page in front of you.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-solid appear appear--btn"  to="/contact" style={{ "--d": "0.96s" }}>See it drive your system</Link>
              <a className="btn btn-ghost appear appear--side" href="#how" style={{ "--d": "1.10s" }}>See how it works</a>
            </div>

          </div>
        </main>

        {/* The stats row was removed. It was three claims strung along the floor of
            higher up the page. */}
      </div>

      <div className="scroll">

        {/* ---------- how it works ---------- */}
        <section className="section section--peek" id="try">
          <div className="section-head rise">
            <span className="eyebrow">Try it</span>
            <h2 className="section-title">
              Watch it <em>use the page</em>.
            </h2>
            {/* The lede no longer names one portal — the picker below has five,
                and each states its own trap in its own caption. The care record
                is called out separately because it is a different claim: the
                other four are an agent reading a page for you, and that one is
                an agent writing in a language you cannot. */}
            <p className="section-lede">
              Five real systems, rebuilt faithfully &mdash; a hospital, a university, the
              railway booking flow, a shop, and a Japanese care home&rsquo;s incident
              report. Pick one, try to do the job yourself, then hand it over: you hear
              what the agent is about to do, then you watch it happen on the screen in
              front of you. Nothing is submitted anywhere.
            </p>
          </div>

          {/* No .glass-panel wrapper — the demo card is the surface now. */}
          <div className="dcard dcard--stage rise" style={{ "--rd": "0.08s" }}>
            <WebActionRoom />
          </div>
        </section>

        {/* Six, on the same three-across grid as the calling page's list, and each
             on. */}
        <section className="section" id="how">
          <div className="section-head rise">
            <span className="eyebrow">How it works</span>
            <h2 className="section-title">You ask. It <em>does the thing</em>.</h2>
            <p className="section-lede">
              Not a chat window that quotes the manual back at you. An agent with its hands on
              the page you are already looking at.
            </p>
          </div>

          <ol className="steps steps--try">
            <li className="step rise">
              <h3 className="step-t">Say it in your own words</h3>
              <p className="step-b">
                &ldquo;I need to change the card on my account.&rdquo; No menu names, no jargon,
                no guessing what the feature is called on this particular site.
              </p>
              <a className="step-go" href="#try" aria-label="Try it — watch it use the page"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.06s" }}>
              <h3 className="step-t">It takes the wheel</h3>
              <p className="step-b">
                Scrolling to the right place, opening the right thing, filling what needs
                filling &mdash; on the page in front of you, where you can watch it happen
                rather than being sent a link to somewhere else.
              </p>
              <a className="step-go" href="#try" aria-label="Try it — watch it use the page"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.12s" }}>
              <h3 className="step-t">It teaches while it does it</h3>
              <p className="step-b">
                It narrates the route as it goes, so you learn where the thing lives instead of
                just arriving there. Next time you will not need to ask &mdash; which is the
                opposite of what a support ticket teaches you.
              </p>
              <a className="step-go" href="#try" aria-label="Try it — watch it use the page"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.18s" }}>
              <h3 className="step-t">It knows where things actually are</h3>
              <p className="step-b">
                Not a search box guessing at keywords. It finds the form that lives under
                Examinations, three clicks past where anyone looks, because it reads the page
                the way you do.
              </p>
              <a className="step-go" href="#try" aria-label="Try it — watch it use the page"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.24s" }}>
              <h3 className="step-t">You keep the wheel</h3>
              <p className="step-b">
                Say wait, or press escape, and it stops. It is driving your screen, so nothing
                gets submitted without you watching it happen first.
              </p>
              <a className="step-go" href="#try" aria-label="Try it — watch it use the page"></a>
            </li>
            <li className="step rise" style={{ "--rd": "0.30s" }}>
              <h3 className="step-t">No rebuild of your site</h3>
              <p className="step-b">
                It reads the page as it is &mdash; no restructuring, no tagging every button, no
                six-month integration project before anyone can try it.
              </p>
              <a className="step-go" href="#try" aria-label="Try it — watch it use the page"></a>
            </li>
          </ol>
        </section>

        {/* ---------- what it is for ---------- */}
        <section className="section" id="for">
          <div className="section-head rise">
            <span className="eyebrow">What it is for</span>
            <h2 className="section-title">The places people <em>give up</em>.</h2>
          </div>

          <div className="split rise">
            <article className="who">
              <Glyph name="abandon" />
              <span className="who-k">The form nobody finishes</span>
              <h3 className="who-t">Halfway through, then gone</h3>
              <p className="who-b">
                Long applications lose people in the middle &mdash; a field they do not
                understand, a document they cannot find. The agent walks them through it in the
                moment, instead of you finding out later that they abandoned it.
              </p>
            </article>

            <article className="who">
              <Glyph name="buried" />
              <span className="who-k">The setting four menus deep</span>
              <h3 className="who-t">It exists, but nobody finds it</h3>
              <p className="who-b">
                Every mature product accumulates features its own users never discover. Asking
                for something by description rather than by location makes the depth of the
                menu tree stop mattering.
              </p>
            </article>

            <article className="who">
              <Glyph name="unhelpful" />
              <span className="who-k">The help article that does not help</span>
              <h3 className="who-t">&ldquo;Click Settings &rarr; Advanced&rdquo;</h3>
              <p className="who-b">
                Written for a version of the interface that has since changed, and useless to
                anyone who cannot map the words to what is on their screen.
              </p>
            </article>

            <article className="who">
              <Glyph name="oversimple" />
              <span className="who-k">The site simplified into unusability</span>
              <h3 className="who-t">Built so anyone can use it, so nobody can</h3>
              <p className="who-b">
                Some portals strip out every affordance in the name of being simple and end up
                with a wall of identical grey links. Asking for what you want routes around the
                simplification instead of fighting it.
              </p>
            </article>

            <article className="who">
              <Glyph name="elevenscreens" />
              <span className="who-k">The system staff dread opening</span>
              <h3 className="who-t">Eleven screens to raise one request</h3>
              <p className="who-b">
                Internal tools are where the training budget goes and the shortcuts multiply.
                Talking through a task beats remembering which of eleven screens it lives on,
                especially for the person who does it twice a year.
              </p>
            </article>

            <article className="who">
              <Glyph name="assistant" />
              <span className="who-k">The thing they would have bought</span>
              <h3 className="who-t">A shop assistant, not a banner</h3>
              <p className="who-b">
                It can mention the thing that is selling out, or the size that actually fits,
                the way a good assistant would &mdash; and it asks before opening anything.
                Nothing is added to the cart because an algorithm decided you wanted it.
              </p>
            </article>
          </div>
        </section>

        {/* ---------- status ---------- */}
        <section className="section" id="status">
          <div className="section-head rise">
            <span className="eyebrow">Where it stands</span>
            <h2 className="section-title">Built, working, and <em>ready for your site</em>.</h2>
            <p className="section-lede">
              It drives a real page today, on the same engine as the calling agents and the 3D
              avatars that run across Singapore&rsquo;s public sector. Point it at the journey
              your users struggle with and watch it work.
            </p>
          </div>

          <div className="cards rise">
            <article className="card">
              <Glyph name="built" />
              <span className="card-kicker">What exists</span>
              <h3 className="card-title">The agent itself</h3>
              <p className="card-body">
                It drives a real page, talks while it works, and sees through the camera. It
                runs on the same engine as the calling and avatar agents &mdash; the part that
                is new is the hands, not the conversation.
              </p>
            </article>
            <article className="card">
              <Glyph name="journey" />
              <span className="card-kicker">What we want</span>
              <h3 className="card-title">A site with a hard journey</h3>
              <p className="card-body">
                Somewhere with a form people abandon, or a feature buried where nobody finds
                it. That is where the difference is obvious, and it is the kind of problem we
                would like to be measured on.
              </p>
            </article>
            <article className="card">
              <Glyph name="conversation" />
              <span className="card-kicker">What it costs you</span>
              <h3 className="card-title">A conversation</h3>
              <p className="card-body">
                Tell us the journey people struggle with. We will put the agent on it and let
                you watch it drive, before anyone talks about price.
              </p>
            </article>
          </div>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Where do your users <em>get stuck</em>?</h2>
            <p className="section-lede">
              Name the journey. We will put an agent on it and let you watch it work.
            </p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/contact">Start for free</Link>
            <Link className="btn btn-ghost" to="/work">See the rest of the work</Link>
          </div>
        </section>
      <ProductCross current="webnav" />
      <SiteFooter />

      </div>
    </>
  )
}
