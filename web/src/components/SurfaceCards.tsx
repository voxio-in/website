// The three places the agent shows up, as three cards that are each a link to
// that product's page.

import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'

const stageDelay = (i: number, n: number, loop: number) =>
  `${-(((n - i) % n) * (loop / n)).toFixed(2)}s`

const WAVE = [
  34, 52, 78, 46, 92, 64, 100, 72, 44, 86, 58, 96, 40, 68, 82, 50, 74, 38, 90, 56,
]

const CALL_LINES = [
  { who: 'Caller', text: 'My order never arrived.' },
  { who: 'Agent',  text: 'I have it — shipped Tuesday, stuck in transit.' },
  { who: 'Caller', text: 'I need it before Friday.' },
  { who: 'Agent',  text: 'Replacement goes out tonight, with you Thursday.' },
  { who: 'Agent',  text: 'Logged on your account. Anything else?' },
] as const

const FACE_LOOP = 14 // seconds for all four; 3.5s each is long enough to read

const FACES = [
  { name: 'Neutral',   brows: 'M45 26.5h9M75 26.5h-9',     mouth: 'M53 51h14' },
  { name: 'Guarded',   brows: 'M45 27.5l9 2.5M75 27.5l-9 2.5', mouth: 'M54 51.5h12' },
  { name: 'Softening', brows: 'M45 28l9-3M75 28l-9-3',     mouth: 'M53 50q7 5 14 0' },
  { name: 'Impatient', brows: 'M45 25l9 1.5M75 28.5l-9-1', mouth: 'M53 52q7-4 14-1' },
] as const

type Surface = {
  to: LinkProps['to']
  kicker: string
  title: React.ReactNode
  body: string
  go: string
  panel: React.ReactNode
}

const SURFACES: Surface[] = [
  {
    to: '/calling',
    kicker: 'On a call',
    title: (
      <>
        Built for the network your customer is <em>calling from</em>.
      </>
    ),
    body:
      'Inbound, outbound and scheduled calls on a real number. A bad line, a noisy room, one bar of signal — it holds the conversation anyway, and the call ends with your records already updated.',
    go: 'Calling agents',
    panel: (
      <div className="panel callflow" aria-hidden="true">
        <div className="cstate">
          <span className="cstate-s cstate-s--ring">
            <span className="cring" />
            Incoming &#183; +91 98&#8230;41
          </span>
          <span className="cstate-s cstate-s--live">
            <span className="dot" />
            Answered in 0.4s
          </span>
          <span className="cstate-s cstate-s--end">Call ended &#183; 2:14</span>
        </div>

        <div className="wave">
          {WAVE.map((h, i) => (
            <span
              key={i}
              style={{
                '--h': `${h}%`,
                '--wd': `${(i % 7) * 0.11}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* The transcript ACCUMULATES. It used to replace itself line by line,
            you see grow is the record itself. */}
        <div className="ctrans">
          {CALL_LINES.map((l, i) => (
            <span key={i} className={`ctrans-l ctrans-l--${i + 1}`}>
              {/* A speaker label, not emphasis. <b> here was presentational and
                  repeating it five times dilutes what a real <b> on the page
                  means; the weight now comes from .ctrans-who in CSS. */}
              <span className="ctrans-who">{l.who}</span>
              {l.text}
            </span>
          ))}
        </div>

        <div className="cdone">Record saved before the line dropped</div>
      </div>
    ),
  },
  {
    to: '/avatar',
    kicker: 'With a face',
    title: (
      <>
        A face that fits the person, chosen <em>mid-conversation</em>.
      </>
    ),
    body:
      'The AI drives it — every look, pause and reaction it picks itself. Nobody animates the anger, the hesitation, or the moment it softens.',
    go: '3D avatar agents',
    panel: (
      <div className="panel">
        {/* The face has to be here. This card's whole claim is that there is a
            picture whose only job is to say "on a screen, and watched". */}
        <div className="vidbox" aria-hidden="true">
          <svg className="vidbox-face" viewBox="0 0 120 78" fill="none">
            {/* shoulders, so it reads as a person on a call and not a mask */}
            <path
              d="M18 78c4-13 18-19 42-19s38 6 42 19"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1.2"
            />
            <ellipse
              cx="60"
              cy="36"
              rx="21"
              ry="25"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="1.2"
            />
            {/* THE FOUR EXPRESSIONS.

                loses patience. It is a conversation going somewhere. */}
            {FACES.map((f, i) => (
              <g
                key={f.name}
                className="fx"
                style={{ animationDelay: stageDelay(i, FACES.length, FACE_LOOP) } as React.CSSProperties}
              >
                <path d={f.brows} stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M48.5 35.5h5M66.5 35.5h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M60 40v6" stroke="rgba(255,255,255,0.34)" strokeWidth="1.2" strokeLinecap="round" />
                <path d={f.mouth} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>
            ))}

            {/* the landmarks it is actually reading */}
            <g className="vidbox-pts" fill="#8ab4ff">
              <circle cx="45" cy="27.5" r="1.3" />
              <circle cx="75" cy="27.5" r="1.3" />
              <circle cx="51" cy="35.5" r="1.3" />
              <circle cx="69" cy="35.5" r="1.3" />
              <circle cx="60" cy="46" r="1.3" />
              <circle cx="53" cy="51" r="1.3" />
              <circle cx="67" cy="51" r="1.3" />
              <circle cx="60" cy="61" r="1.3" />
            </g>

            {/* corner brackets, breathing, so the box looks like it is tracking */}
            <g className="vidbox-track" stroke="rgba(138,180,255,0.75)" strokeWidth="1.3" strokeLinecap="round">
              <path d="M36 13h-6v6M84 13h6v6M36 65h-6v-6M84 65h6v-6" />
            </g>
          </svg>

          <div className="vidbox-bar">
            <span className="vidbox-rec" />
            cam 01 · live
          </div>
          <div className="vidbox-scan" />
          <div className="vidbox-read">
            reading <b>brow, gaze, jaw</b>
          </div>
        </div>

        <div className="faces" aria-hidden="true">
          {FACES.map((f, i) => (
            <span
              key={f.name}
              className="chip chip--auto"
              style={{ animationDelay: stageDelay(i, FACES.length, FACE_LOOP) } as React.CSSProperties}
            >
              {f.name}
            </span>
          ))}
        </div>
        <div className="beats">
          <div className="beat">
            <span className="beat-t">0:12</span>
            <span className="beat-x">
              Looks away — <b>guarded</b>
            </span>
          </div>
          <div className="beat">
            <span className="beat-t">0:58</span>
            <span className="beat-x">
              You named the risk — <b>softening</b>
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    to: '/webnav',
    kicker: 'On the web',
    title: (
      <>
        Your system, at <em>your voice</em>.
      </>
    ),
    body:
      "It doesn't explain the software. It uses it — scrolling, opening, filling and submitting while it talks you through what it is doing.",
    go: 'Website navigation',
    panel: (
      <div className="browser" aria-hidden="true">
        <div className="browser-bar">
          <i />
          <i />
          <i />
          <span className="browser-url">
            <span className="burl burl--1">portal / dashboard</span>
            <span className="burl burl--2">portal / re-evaluation</span>
            <span className="burl burl--3">submitted &#183; ref A-2291</span>
          </span>
        </div>

        <div className="browser-body">
          {/* step 1 — the menu it has to get through first */}
          <div className="bnav">
            <span className="bnav-i">Results</span>
            <span className="bnav-i bnav-i--hit">Re-evaluation</span>
            <span className="bnav-i">Fees</span>
          </div>

          {/* step 2 — a real dropdown, opened and chosen from */}
          <div className="bsel">
            <span className="bsel-k">Semester</span>
            <span className="bsel-v">
              <span className="bsel-cur">Select&#8230;</span>
              <span className="bsel-pick">Semester 4 &#183; 2025</span>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M2 4l3 3 3-3" />
              </svg>
            </span>
            <span className="bsel-menu">
              <span>Semester 3 &#183; 2024</span>
              <span className="is-hit">Semester 4 &#183; 2025</span>
              <span>Semester 5 &#183; 2025</span>
            </span>
          </div>

          {/* step 3 — the typing, which is only one beat of the errand */}
          <div className="bfield">
            <span className="bfield-k">Subject</span>
            <span className="bfield-v is-typing">Signals &amp; Systems</span>
          </div>
          <div className="bfield">
            <span className="bfield-k">Reason</span>
            <span className="bfield-v is-typing bfield-v--late">Marks not updated</span>
          </div>

          {/* step 4 — submit, pressed */}
          <div className="bsubmit">Submit request</div>

          {/* step 5 — the receipt, which is the point of all of it */}
          <div className="bdone">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10.5l4 4 8-9" />
            </svg>
            Submitted &#183; ref A-2291
          </div>

          <span className="bcursor" />
        </div>
      </div>
    ),
  },
]

export default function SurfaceCards() {
  return (
    <div className="venues">
      {SURFACES.map((s, i) => (
        <Link
          key={String(s.to)}
          to={s.to}
          className="venue rise"
          style={{ '--rd': `${0.06 * i}s` } as React.CSSProperties}
        >
          <span className="venue-kicker">{s.kicker}</span>
          <h3 className="venue-title">{s.title}</h3>
          <p className="venue-body">{s.body}</p>

          <div className="venue-panel">{s.panel}</div>

          <span className="venue-go">
            {s.go}
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 10h12" />
              <path d="M11 5l5 5-5 5" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  )
}
