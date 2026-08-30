// happens in: Hiring OS and Career OS are bought separately by the two ends of a
// hire; Training OS and Placement OS are one purchase by the institution. The

import { createFileRoute, Link } from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import { useReveal } from '#/components/useReveal'

import '#/styles/collaborations.css'

export const Route = createFileRoute('/collaborations')({
  head: () => ({
    meta: [
      { title: 'Collaborations — Voxio Agents' },
      { name: 'description', content: 'Voxio Agents as the conversational layer inside somebody else’s product — the voice, the face, or an agent that drives the page while it talks.' },
    ],
    links: [{ rel: 'canonical', href: 'https://voxio.in/collaborations' }],
  }),
  component: Collaborations,
})

function Collaborations() {
  useReveal()

  return (
    <>
      <div className="scroll">

        <div className="masthead rise">
          <span className="eyebrow">Collaborations</span>
          <h1>One hiring conversation, <em>four sides of the table</em>.</h1>
          <p className="section-lede">
            Echobotics is a hiring platform. Voxio Agents is the voice inside it &mdash; the same engine
            that runs the calling agents and the 3D avatars, pointed at interviews instead of
            consultations. Four products sit on one engine because the hiring journey is really
            one long conversation seen from four positions.
          </p>
        </div>

        <section className="section">
          <div className="section-head rise">
            <span className="eyebrow">The partnership</span>
            <h2 className="section-title">Echobotics: one engine, four products</h2>
            <p className="section-lede">
              The recruiter screening, the candidate applying, the student rehearsing, the
              institution placing them &mdash; four people standing around the same job, and the
              same conversation engine facing each of them. The scoring, the evidence gathering
              and the two scores do not change between the four. What changes is ownership and who
              is allowed to see what &mdash; and that is the product, not a skin.
            </p>
          </div>

          {/* Four articles, in the order the platform is sold, not the order the journey
               #hash on each is linked to from EchoMosaic on the home page. */}

          <div className="principle rise">
            <p>
              <strong>Evidence over wording.</strong> The system will help someone present what
              they have, and refuse to help them claim what they do not. When something is
              genuinely missing, the answer is not a better sentence &mdash; it is a scoped piece
              of work that produces the missing evidence.
            </p>
          </div>

          <article className="os rise" id="hiring-os">
            <div>
              <h3 className="os-name">Hiring OS</h3>
              <p className="os-for">The recruiter &middot; N candidates → 1 shortlist</p>
              <div className="os-ours">
                <span className="os-ours-k">Voxio Agents inside it</span>
                <ul>
                  <li>The whole calling stack &mdash; inbound, outbound and scheduled, on real numbers</li>
                  <li>Turn-taking and barge-in: it stops when the candidate cuts in, and finishes the lines that must be said in full</li>
                  <li>Answering-machine detection, so a run of calls is not a folder of voicemail greetings</li>
                  <li>Structured output written back as fields, not a transcript</li>
                </ul>
              </div>
            </div>
            <div className="os-copy">
              <p>
                Screening at a volume no team could staff. It runs the first-round conversation on
                every applicant instead of the twenty someone had time for, and hands back a ranked
                shortlist rather than a call queue.
              </p>
              <p>
                This is the end of the platform that runs on the phone, on real numbers, inbound
                and outbound &mdash; so the constraint is not the model, it is the line. It is
                already talking as the candidate says hello, because a silent beat on answer is the
                pause that makes people hang up on an unknown number. Answering-machine detection
                ends the call rather than interviewing a recording.
              </p>
              <p>
                <strong>The ranking carries its reasoning.</strong> A shortlist a recruiter cannot
                interrogate is a shortlist they will re-do by hand, so every verdict arrives with
                the answers it was drawn from and the requirement it was judged against &mdash; and
                it reaches the recruiter&rsquo;s systems as structured fields, not a transcript to
                read.
              </p>
              <div className="built-on">
                <span>First-round screening at volume</span>
                <span>Ranked shortlist with reasoning</span>
                <span>Inbound &amp; outbound calling</span>
                <span>Structured output</span>
              </div>
            </div>
          </article>

          <article className="os rise" id="career-os">
            <div>
              <h3 className="os-name">Career OS</h3>
              <p className="os-for">The candidate &middot; 1 candidate → N openings</p>
              <div className="os-ours">
                <span className="os-ours-k">Voxio Agents inside it</span>
                <ul>
                  <li>The interview the candidate practises against, aimed at the specific job they are applying for</li>
                  <li>The same roleplay engine as Training OS and the SIT and MSF deployments &mdash; different room, one engine</li>
                  <li>Under 500ms before it answers, and follow-ups that push when an answer is thin</li>
                </ul>
                <p className="os-ours-none">
                  The scoring and the resume repository are Echobotics&rsquo;. Our part starts the
                  moment the candidate has to say any of it out loud.
                </p>
              </div>
            </div>
            <div className="os-copy">
              <p>
                The candidate points the system at the actual job they want and gets a straight
                answer: where they already match, where they are weak, and what closes the gap.
                Not <em>improve your communication skills</em> &mdash; either <em>this fact is in
                your resume but buried on page two</em>, which is an edit, or <em>this requirement
                has no evidence anywhere</em>, which is a project.
              </p>
              <p>
                <strong>Two scores, never blended.</strong> <em>Fit</em> asks how much of what the
                job wants the resume&rsquo;s substance actually satisfies. <em>Conveyance</em> asks
                how findable that substance is. Two resumes with identical facts, one crisp and one
                badly structured, have the same fit and different conveyance. A single blended
                number would hide exactly the thing the candidate needs to know.
              </p>
              <p>
                A resume is a repository, not a file. Every change is an immutable version; it can
                branch into a data-analyst line and a devops line that evolve independently; any two
                versions diff line by line, and one is pinned as the one that actually goes out.
                Gaps marked <em>missing</em> generate a scoped project with milestones, tracked by
                hand with an artifact attached, that lands back in the resume as a reviewable diff.
              </p>
              <div className="built-on">
                <span>Fit &amp; conveyance scoring</span>
                <span>Versioned resumes</span>
                <span>Gap-driven projects</span>
                <span>Anchored edit diffs</span>
              </div>
            </div>
          </article>

          <article className="os rise" id="training-os">
            <div>
              <h3 className="os-name">Training OS</h3>
              <p className="os-for">The student &middot; rehearsal under real pressure</p>
              <div className="os-ours">
                <span className="os-ours-k">Voxio Agents inside it</span>
                <ul>
                  <li>The interview agent itself &mdash; the same roleplay engine as the SIT and MSF deployments</li>
                  <li>Under 500ms before it answers, which is what stops the student performing for it</li>
                  <li>Follow-ups that push when an answer sounds thin, rather than a fixed question list</li>
                  <li>The agent&rsquo;s own state on screen: waiting, listening, thinking, speaking</li>
                  <li>Two-channel recording &mdash; agent on one side, student on the other</li>
                </ul>
              </div>
            </div>
            <div className="os-copy">
              <p>
                A final-year student in a placement programme alongside three hundred classmates.
                The traditional version is a set of workshops, a couple of mock interviews if they
                are lucky, and no idea how they would actually perform under pressure.
              </p>
              {/* The line that does the most work on this page. Everything else here is a
                  that already exist, on /work and /avatar. Keep it. */}
              <p>
                <strong>It is the same practice engine as the medical and frontline training</strong>
                {' '}&mdash; the avatar that plays the anxious patient for Singapore&rsquo;s
                universities and the resident who has decided no for its ministries &mdash; pointed
                at a job interview instead of a consultation. Not a similar idea reimplemented:
                the same engine, already in production in rooms with more at stake.{' '}
                <Link className="card-link" to="/avatar">See it running</Link>
              </p>
              <p>
                Here that becomes a live, AI-run interview that behaves like the real thing:
                questions that adapt to the answers, follow-ups that probe when something sounds
                thin, and feedback afterwards naming exactly where they stumbled, turn by turn,
                with the video to prove it. The student picks <em>which resume and which version</em>
                they are presenting before it starts, and that version is pinned to the session
                permanently &mdash; so the score beside the session and the words spoken in it refer
                to the same document. <em>Your paper says X</em> and <em>you said Y about X out
                loud</em> are finally comparable.
              </p>
              <p>
                The room shows the agent&rsquo;s own state &mdash; waiting, listening, thinking,
                speaking &mdash; because a silent agent that is thinking and a silent agent that has
                crashed look identical otherwise. The whole session records: webcam video plus a
                two-channel mix, agent on one side and student on the other.
              </p>
              <div className="built-on">
                <span>Adaptive live interview</span>
                <span>Version-pinned sessions</span>
                <span>Turn-by-turn feedback</span>
                <span>Two-channel recording</span>
              </div>
            </div>
          </article>

          <article className="os rise" id="placement-os">
            <div>
              <h3 className="os-name">Placement OS</h3>
              <p className="os-for">The educator &amp; placement officer &middot; N students → 1 drive</p>
              <div className="os-ours">
                <span className="os-ours-k">Voxio Agents inside it</span>
                <ul>
                  <li>Per-student and per-class configuration of what the agent weights, set by the teacher before the session</li>
                  <li>Accommodations that change how the agent behaves, not just how it scores &mdash; it can be told not to probe or counter on eye contact</li>
                  <li>Push-to-talk, chosen by the student, so a stammer or a long pause never ends a turn early</li>
                  <li>Every number on the page derives from interviews our engine ran &mdash; which is why bail-outs and turn counts exist to be counted</li>
                </ul>
              </div>
            </div>
            <div className="os-copy">
              <p>
                Not another dashboard. What an educator gets is a short list of names: the students
                where coaching demonstrably failed to land, so a human can step in. Students with
                nothing stuck are omitted entirely &mdash; it is a to-do list, not a roster. That is
                also the answer to <em>does this replace teachers</em>: no, it hands them the people
                it could not reach.
              </p>
              <p>
                Around that sit the numbers a placement cell actually decides on. A requirement
                &times; class heat map, where <em>212 of 300 fail production deployment
                experience</em> is a curriculum decision. Class trajectory plotted by session
                ordinal rather than by date, because students start on different days and a calendar
                series measures scheduling, not learning. Bail-outs counted separately, because a
                three-turn session is not a short session, it is someone who quit, and counting it
                as completed flatters every other number on the page. And drive readiness: before a
                company visits, how many eligible students clear its bar.
              </p>
              <p>
                <strong>The teacher decides what the interview is for.</strong> Before a session
                runs, they set what it should lean on for a particular student or a whole class
                &mdash; the requirement a cohort keeps failing, the thing this one person needs to
                be pushed on. It is not a difficulty slider: it changes what the agent asks about
                and what it lets go.
              </p>
              <p>
                That is also where accommodations live, and they are behavioural rather than
                cosmetic. An autistic student can be marked so the agent does not probe eye
                contact and does not counter them on it &mdash; the agent stops doing the thing,
                rather than doing it and then discounting the result. And the student picks
                push-to-talk if they want it, so a stammer or a pause for thought never ends their
                turn early and costs them the interview. Nobody should lose a round to the
                microphone.
              </p>
              <p>
                <strong>The machine never has the final word about a person.</strong> Readiness is
                computed as an advisory band and then has to be <em>conferred</em> by a named human
                who saw the basis for it. Two fields, never one; the default is not-ready, and a
                computed band moving to <em>ready</em> promotes nobody &mdash; it moves them into a
                review queue.
              </p>
              <div className="built-on">
                <span>Per-student &amp; per-class tuning</span>
                <span>Behavioural accommodations</span>
                <span>Push-to-talk</span>
                <span>Coaching triage list</span>
                <span>Class gap map</span>
                <span>Drive readiness</span>
                <span>Human-conferred readiness</span>
              </div>
            </div>
          </article>
        </section>

        <section className="section">
          <div className="section-head rise">
            <span className="eyebrow">Also with Echobotics</span>
            <h2 className="section-title">AI calling agents</h2>
            <p className="section-lede">
              Beyond the four OS products, Echobotics runs the Voxio Agents calling agent itself.
              <Link className="card-link" to="/calling/work" hash="echobotics">See the deployment</Link>
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head rise">
            <span className="eyebrow">In their words</span>
            <h2 className="section-title">What the partner says about it</h2>
          </div>

          {/* Verbatim the quote on / and /testimonials. If it changes, it changes in
              page than on the home page is the kind of thing people notice. */}
          <figure className="quote rise">
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
                <span className="quote-role">Hiring, Career, Training &amp; Placement OS</span>
              </span>
            </figcaption>
          </figure>
        </section>

        <section className="section cta">
          <div className="section-head rise">
            <h2 className="section-title">Want to build on the <em>same platform</em>?</h2>
            <p className="section-lede">
              You bring the domain. We bring the agents, the avatar and the calling stack.
            </p>
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
