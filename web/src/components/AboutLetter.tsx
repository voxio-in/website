// About us, written as a letter with evidence attached rather than as a spec
// sheet: what the industry has genuinely already solved, the thing it has not,
// what we did about it, then the numbers.

import { Link } from '@tanstack/react-router'

const METRICS = [
  { k: 'Before it answers you', v: 'Under 500ms' },
  { k: 'Expressions animated by hand', v: '0' },
  { k: 'Surfaces, one agent', v: '3' },
]

export default function AboutLetter() {
  return (
    <div className="aboutltr">
      <span className="aboutltr-eyebrow">About us</span>

      <h2 className="aboutltr-title">
        We build the <em>unglamorous</em> parts.
      </h2>

      <div className="aboutltr-copy">
        <p>
          Sounding human is a solved problem. Anyone can rent a voice that reads a
          paragraph beautifully and a face that lip-syncs to it, and most of this
          industry is doing exactly that &mdash; assembling three hosted services and
          calling the seams a product. What is not solved is everything the vendor
          decided for you: when the agent takes its turn, how long it waits before it
          assumes you have finished, what it does with a caller who talks over it, and
          what happens in the ten seconds after the line drops.
        </p>
        <p>
          So we did not assemble ours out of someone else&rsquo;s library. We built the
          pipeline from the ground up &mdash; the turn-taking, the interruption handling,
          the reconnect, the half-second budget, the expression layer that lets the same
          intelligence choosing the words choose the face behind them. Each of those is a
          decision, and a library makes it once, for everyone. Ours are ours to change:
          when a deployment needs the agent to wait longer before it speaks, or to hold
          a line through silence instead of hanging up, that is a value we own rather
          than a feature request to somebody else&rsquo;s roadmap.
        </p>
        <p>
          Which is the point. Owning the pipeline is what let us build it around the
          caller who actually exists rather than the one in the demo video &mdash; Hindi
          and English trading places mid-sentence, an accent nothing was tuned for, one
          bar of signal, a room with other people talking in it. The result is not a
          better demo. It is an agent still working in the fourth minute of a difficult
          conversation, which is the only minute that counts.
        </p>
      </div>

      <div className="aboutltr-metrics">
        {METRICS.map((m) => (
          <div className="metric" key={m.k}>
            <span className="metric-k">{m.k}</span>
            <span className="metric-v">{m.v}</span>
          </div>
        ))}
      </div>

      <hr className="aboutltr-rule" />

      {/* No signature: there was a placeholder name here and an unsigned letter
          footer goes back to space-between on its own. */}
      <div className="aboutltr-foot">
        <Link className="aboutltr-link" to="/about">
          Read the longer version
          <svg
            width="13"
            height="13"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 10h12" />
            <path d="M11 5l5 5-5 5" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
