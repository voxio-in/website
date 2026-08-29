// Echobotics' four faces, arranged so the layout carries the commercial fact.

import { Link } from '@tanstack/react-router'

import { Glyph } from '#/components/Glyphs'

export default function EchoMosaic() {
  return (
    <div className="mosaic">
      <div className="mosaic-top">
        <Link
          to="/collaborations"
          hash="career-os"
          className="tile rise"
          style={{ '--rd': '0.06s' } as React.CSSProperties}
        >
          <Glyph name="match" />
          <span className="tile-kicker">The candidate</span>
          <h3 className="tile-title">Career OS</h3>
          <p className="tile-body">
            Point it at the job you actually want and get a straight answer: where you
            match, where you are weak, what closes the gap. Two scores that are never
            blended &mdash; whether you <em>have</em> the thing, and whether the page{' '}
            <em>shows</em> it.
          </p>
        </Link>

        <Link
          to="/collaborations"
          hash="hiring-os"
          className="tile rise"
          style={{ '--rd': '0.12s' } as React.CSSProperties}
        >
          <Glyph name="shortlist" />
          <span className="tile-kicker">The recruiter</span>
          <h3 className="tile-title">Hiring OS</h3>
          <p className="tile-body">
            Screening at a volume no team could staff. It runs the first-round conversation
            on every applicant instead of the twenty someone had time for, and hands back a
            ranked shortlist with the reasoning attached &mdash; not a call queue.
          </p>
        </Link>
      </div>

      <div
        className="mosaic-pair rise"
        style={{ '--rd': '0.18s' } as React.CSSProperties}
      >
        <div className="mosaic-pair-tag">Sold together &middot; one system</div>
        <div className="mosaic-pair-grid">
          <Link to="/collaborations" hash="training-os" className="tile">
            <Glyph name="interview" />
            <span className="tile-kicker">The student</span>
            <h3 className="tile-title">Training OS</h3>
            <p className="tile-body">
              A live AI interview that behaves like the real thing &mdash; questions that
              adapt, follow-ups that probe when an answer sounds thin, and feedback naming
              exactly where you stumbled, turn by turn, with the video to prove it.
            </p>
          </Link>

          <Link to="/collaborations" hash="placement-os" className="tile">
            <Glyph name="triage" />
            <span className="tile-kicker">The institution</span>
            <h3 className="tile-title">Placement OS</h3>
            <p className="tile-body">
              Not another dashboard &mdash; a short list of the students where coaching
              failed to land, so a human can step in. Readiness is computed as advice and
              then conferred by a named person. The machine never signs it.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
