import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/work.css'

export const Route = createFileRoute('/work')({
  head: () => ({
    meta: [
      { title: 'Work — Voxio Agents' },
      { name: 'description', content: 'Voice agents running in Singapore public-sector training, rehabilitation and hiring — the Singapore Institute of Technology, MSF, Yellow Ribbon, SilverWings XR and Echobotics. What was built, and what it changed.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/work' }],
  }),
  component: Work,
})

function Work() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">Work</span>
          <h1>Already trusted in the <em>toughest rooms</em>.</h1>
          <p className="section-lede">
            A pattern runs through everything below. The work happens in a conversation &mdash;
            a student who has to face a frightened patient, a caller who wants an answer now,
            someone who needs a system to do something and shouldn&rsquo;t have to learn it
            first. Voxio Agents is the voice on the other side. None of the deployments here was a
            pilot that stayed a pilot, and the two still being built are marked as such.
          </p>
        </div>

        {/* ---------- Singapore public sector ---------- */}
        <section className="section" id="singapore">
          <div className="section-head rise">
            <span className="eyebrow">Singapore &middot; Public sector</span>
            <h2 className="section-title">Training people to talk</h2>
            <p className="section-lede">
              A 3D character plays the difficult person &mdash; the frightened patient, the
              resident who has stopped cooperating &mdash; and refuses to make it easy. It
              watches while they answer, so what it grades is not only what they said but how
              they said it: where they looked, where they hurried, where they backed off. Then
              it drops the character and tells them what they missed. The AI decides how that
              character behaves in real time and how the face moves while it does; nobody
              scripts the anger, the hesitation, or the moment it softens.
            </p>
          </div>

          <article className="case rise">
            <div className="case-id">
              <img src="/assets/SIT.png" width={1200} height={549} alt="Singapore Institute of Technology" />
              <span className="case-name">Singapore Institute of Technology</span>
              <span className="case-meta">Higher education<br />Medical communication training</span>
            </div>
            <div className="case-copy">
              <p>
                SIT brought us a gap every medical school knows about. Their students can name
                the disease, list the symptoms and prescribe the right drug &mdash; and then
                freeze in front of an actual patient. Nobody had taught them how to
                <em>talk</em>: how to open, how to ask the question that surfaces the detail
                the patient did not think was important, how to get the history out of someone
                who is anxious and vague.
              </p>
              <p>
                So we built the patient. A 3D avatar sits across from the student and behaves
                like a real one &mdash; volunteering little, hedging, drifting off the point,
                getting uneasy when pushed too fast. The student has to run the consultation
                themselves. There is no menu of options and no right answer to click.
              </p>
              <p>
                The part SIT liked most happens when the consultation ends. The avatar changes
                character on the spot &mdash; same session, new person &mdash; and becomes the
                teacher. It walks back through what the student actually asked, what they could
                have asked instead, and, most usefully, the questions they never asked at all.
                Feedback lands while the conversation is still fresh, from the
                &ldquo;patient&rdquo; who just lived through it.
              </p>
              <div className="case-tags">
                <span className="case-tag">Simulated patient</span>
                <span className="case-tag">In-session role switch</span>
                <span className="case-tag">Coaching on what went unasked</span>
              </div>
            </div>
          </article>

          <article className="case rise">
            <div className="case-id">
              <img src="/assets/MSF.png" width={250} height={123} alt="Ministry of Social and Family Development, Singapore" />
              <span className="case-name">Ministry of Social and Family Development</span>
              <span className="case-meta">Government of Singapore<br />Frontline officer training</span>
            </div>
            <div className="case-copy">
              <p>
                MSF had the same problem in a harder room. Their officers meet elderly
                residents who cannot follow the process, and residents who have simply decided
                the answer is no &mdash; and the officers were being sent in with policy
                knowledge and nothing else. You cannot rehearse that against a colleague who is
                being polite to you.
              </p>
              <p>
                So the avatar is angry. It sits across from the officer refusing to cooperate,
                repeating itself, getting louder when it is talked over, and it does not calm
                down until the officer actually does the thing that would calm a person down.
                Because the AI is driving the face as well as the words, the officer is reading
                a real expression while they work &mdash; which is exactly the signal they need
                to learn to read.
              </p>
              <div className="case-tags">
                <span className="case-tag">Difficult-resident simulation</span>
                <span className="case-tag">Character held under pressure</span>
                <span className="case-tag">AI-driven expression</span>
              </div>
            </div>
          </article>

          <article className="case rise">
            <div className="case-id">
              <img className="logo-crest logo-fine" src="/assets/yellow-ribbon.png" width={661} height={320} alt="Yellow Ribbon Singapore" />
              <span className="case-name">Yellow Ribbon Singapore</span>
              <span className="case-meta">Rehabilitation &amp; reintegration<br />Work readiness before release</span>
            </div>
            <div className="case-copy">
              <p>
                Yellow Ribbon runs it for the job waiting on the other side of the gate.
                An inmate preparing for retail work stands in front of a customer who is
                furious about a refund &mdash; and has to bring that person down. The avatar
                argues, interrupts, escalates when handled badly, and only settles when the
                right things are said and done in the right order.
              </p>
              <p>
                The scenario asks for specific actions, not just soothing words: acknowledge
                the complaint, check the receipt, explain the policy without hiding behind it,
                offer the remedy. Getting the sequence wrong keeps the customer angry, which is
                the honest outcome and the reason the practice works.
              </p>
              <div className="case-tags">
                <span className="case-tag">Angry-customer scenario</span>
                <span className="case-tag">Required actions, in order</span>
                <span className="case-tag">Work readiness</span>
              </div>
            </div>
          </article>
        </section>

        {/* ---------- in development ----------

            Held apart from the section above rather than appended to it. Those
            are running; these two are being built, and a case study reads as a
            claim about something that already works unless it says otherwise.
            The stage badge is the only thing keeping that distinction, so it
            sits in the identity column where the client name is, not buried in
            the copy. */}
        <section className="section" id="building">
          <div className="section-head rise">
            <span className="eyebrow">In development</span>
            <h2 className="section-title">Being <em>built now</em>.</h2>
            <p className="section-lede">
              Two engagements in progress. Neither is live yet, and both are here because
              they point at where this goes next: teaching the people who teach, and
              teaching the people who will build these themselves.
            </p>
          </div>

          <article className="case rise">
            <div className="case-id">
              <img className="logo-crest" src="/assets/agency-for-integrated-care.png" width={324} height={228} alt="Agency for Integrated Care" />
              <span className="case-name">Agency for Integrated Care</span>
              <span className="case-stage">In development</span>
              <span className="case-meta">Care sector, Singapore<br />Training the trainers</span>
            </div>
            <div className="case-copy">
              <p>
                One level up from every other engagement on this page. AIC does not want us
                to train their officers &mdash; they want us to train the people who train
                their officers. The trainers are the ones who have to judge whether an
                officer handled someone well, and that judgement is the thing that is hard
                to teach and hard to keep consistent across a cohort.
              </p>
              <p>
                So the avatar becomes the shared reference. A trainer runs the difficult
                client themselves, sees what the scenario is actually testing, and then
                takes it to their own officers with the same standard in their head. The
                same character, held the same way, in every room.
              </p>
              <div className="case-tags">
                <span className="case-tag">Train-the-trainer</span>
                <span className="case-tag">Client-handling scenarios</span>
                <span className="case-tag">Consistent assessment</span>
              </div>
            </div>
          </article>

          <article className="case rise">
            <div className="case-id">
              <img className="logo-fine" src="/assets/acetek-college.png" width={385} height={159} alt="Acetek College" />
              <span className="case-name">Acetek College</span>
              <span className="case-stage">In development</span>
              <span className="case-meta">Co-developed course<br />Retail &amp; hotel management</span>
            </div>
            <div className="case-copy">
              <p>
                A course we are writing with the college rather than a deployment we are
                selling to it. Retail and hotel management students are walking into an
                industry where the first voice a guest hears is increasingly not a person,
                and the honest thing to teach them is both halves of that: what voice AI is
                already changing about the front desk and the shop floor, and how the work
                that stays human changes shape around it.
              </p>
              <p>
                The second half is the part that matters. They do not just study the
                technology, they build with it &mdash; students design and stand up their own
                voice agent for a booking desk or a returns counter, which is a far better
                way to understand what these things can and cannot do than being shown one.
              </p>
              <div className="case-tags">
                <span className="case-tag">Curriculum, co-developed</span>
                <span className="case-tag">Retail &amp; hospitality</span>
                <span className="case-tag">Students build their own</span>
              </div>
            </div>
          </article>
        </section>

        {/* ---------- Echobotics ---------- */}
        <section className="section" id="echobotics">
          <div className="section-head rise">
            <span className="eyebrow">Echobotics &middot; Collaboration</span>
            <h2 className="section-title">The <em>conversation</em> inside a hiring platform</h2>
            <p className="section-lede">
              Echobotics sells four hiring products. Every spoken moment in them is ours &mdash;
              the screening call a candidate picks up, and the interview they sit through. This is
              the deployment where our engine had to hold up against strangers on a phone line
              rather than trainees who agreed to be there.
            </p>
          </div>

          <article className="case rise">
            <div className="case-id">
              <img className="logo-invert logo-crest" src="/assets/echobotics.svg" alt="Echobotics" />
              <span className="case-name">Screening and interviewing, spoken</span>
              <span className="case-meta">Echobotics<br />Hiring &middot; Career &middot; Training &middot; Placement</span>
            </div>
            <div className="case-copy">
              <p>
                Four products, one conversation engine &mdash; and the conversation engine is
                ours. The hiring journey is one long conversation seen from four sides of the
                table, so the same engine faces the recruiter, the candidate, the student and the
                institution.
              </p>
              <p>
                <strong>On the phone, for the recruiter.</strong> Hiring OS screens at a volume no
                team could staff, and that is our calling stack doing it: already talking as the
                candidate says hello, stopping when they cut in, finishing the lines that have to
                be said in full, hanging up on voicemail instead of interviewing a recording, and
                writing the verdict back as fields rather than a transcript. A hundred first-round
                conversations instead of the twenty someone had time for.
              </p>
              <p>
                <strong>In the interview.</strong> Training OS for the student and Career OS for
                the candidate both put a live interview in front of a person, and it is the same
                practice engine as the medical and frontline training above, pointed at a job
                interview instead of a consultation &mdash; questions that adapt, follow-ups that push when an answer sounds
                thin, under 500ms before it replies, and feedback naming the exact moment it
                started going wrong with the recording to prove it. Candidates stop performing for
                it after about a minute, which is the whole point.
              </p>
              <p>
                <Link className="card-link" to="/collaborations">See how the four fit together</Link>
              </p>
              <div className="case-tags">
                <span className="case-tag">Hiring OS</span>
                <span className="case-tag">Career OS</span>
                <span className="case-tag">Training OS</span>
                <span className="case-tag">Placement OS</span>
                <span className="case-tag">Adaptive interviews</span>
              </div>
            </div>
          </article>

        </section>

        {/* ---------- partners ---------- */}
        <section className="section" id="partners">
          <div className="section-head rise">
            <span className="eyebrow">Partners &amp; product</span>
            <h2 className="section-title">Inside someone else&rsquo;s product</h2>
            <p className="section-lede">
              Voxio Agents as the conversational layer in a product that is not ours &mdash; the
              voice, the face, or an agent that drives the page while it talks.
            </p>
          </div>

          <article className="case rise">
            <div className="case-id">
              <img src="/assets/silver-wings-xr-logo.png" width={267} height={68} alt="SilverWings XR" />
              <span className="case-name">SilverWings XR</span>
              <span className="case-meta">Extended reality<br />Delivery partner &amp; customer</span>
            </div>
            <div className="case-copy">
              <p>
                SilverWings XR is both a customer and the partner we delivered the
                public-sector work alongside &mdash; the training deployments above were built
                with them. They also run the Voxio Agents voicebot and 3D avatar in front of their own
                users.
              </p>
              <div className="case-tags">
                <span className="case-tag">Delivery partner</span>
                <span className="case-tag">Browser voice</span>
              </div>
            </div>
          </article>

          <article className="case rise">
            <div className="case-id">
              <img src="/assets/voxa.png" width={1024} height={271} alt="VOXA" />
              <span className="case-name">VOXA</span>
              <span className="case-meta">Singapore<br />Product integration</span>
            </div>
            <div className="case-copy">
              <p>
                A Singapore client running Voxio Agents as the conversational layer inside their own
                product &mdash; the same engine as the training deployments, without the Voxio Agents
                name on it.
              </p>
              <div className="case-tags">
                <span className="case-tag">Embedded</span>
                <span className="case-tag">Singapore</span>
              </div>
            </div>
          </article>

          {/* A mark on its own, with no case beside it. Everything else on this
              page is a claim we are prepared to describe; this is only the fact
              that the name belongs here. Given its own quiet row rather than a
              case card with the copy left blank, because an empty card reads as
              something missing. The image removes itself if the file is not
              there, so a mark we have not been given yet degrades to nothing
              rather than to a broken icon. */}
          <div className="logo-quiet rise">
            <img
              className="logo-invert logo-crest"
              src="/assets/straits-interactive.png"
              alt="Straits Interactive"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        </section>

        {/* ---------- website navigation ---------- */}
        <section className="section" id="webnav">
          <div className="section-head rise">
            <span className="eyebrow">Website navigation</span>
            <h2 className="section-title">The one we are proudest of</h2>
            <p className="section-lede">
              The agent that stops explaining the interface and starts using it &mdash; built,
              running, and the one we would most like to put in front of you.
            </p>
          </div>

          <article className="case rise">
            <div className="case-id">
              <span className="logo-word" style={{ fontSize: "19px" }}>Voxio Agents</span>
              <span className="case-name">An agent that uses the site for you</span>
              <span className="case-meta">Available now<br />Live demo on this site</span>
            </div>
            <div className="case-copy">
              <p>
                Every website help system does the same unhelpful thing: it tells you which
                button to press. If you could find the button you would not have asked.
              </p>
              <p>
                Ours takes the wheel. You say what you came to do and the agent goes and does
                it on the page in front of you &mdash; scrolling to the right place, opening
                the right thing, filling what needs filling &mdash; narrating as it goes, so
                you learn the route rather than just arriving. And if showing the problem is
                easier than describing it, it can look through your camera while you talk.
              </p>
              <p>
                It is built, it works, and it is running on this site right now.
                <Link className="card-link" to="/webnav">Try it</Link>
              </p>
              <div className="case-tags">
                <span className="case-tag">Drives the page</span>
                <span className="case-tag">Talks while it works</span>
                <span className="case-tag">Camera-aware</span>
              </div>
            </div>
          </article>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Put an agent on your <em>hardest workflow</em>.</h2>
            <p className="section-lede">
              Tell us the conversation you want handled. We will show you it running.
            </p>
          </div>
          <div className="cta-actions rise" style={{ "--rd": "0.08s" }}>
            <Link className="btn btn-solid" to="/contact">Start for free</Link>
            <Link className="btn btn-ghost" to="/">Back to home</Link>
          </div>
        </section>
      <SiteFooter />

      </div>
    </>
  )
}
