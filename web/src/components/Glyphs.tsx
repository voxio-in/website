// Line art for the cards across the whole site — one glyph per card, drawn to be
// the card's claim rather than decoration beside it. Kept out of the routes so
// the copy there stays readable.

export type GlyphName =
  | 'answer'
  | 'interrupt'
  | 'protect'
  | 'language'
  | 'honest'
  | 'signal'
  | 'inbound'
  | 'outbound'
  | 'voicemail'
  | 'later'
  | 'dropped'
  | 'after'
  | 'face'
  | 'logged'
  | 'drive'
  | 'expression'
  | 'anyface'
  | 'withhold'
  | 'refuse'
  | 'refund'
  | 'abandon'
  | 'buried'
  | 'unhelpful'
  | 'oversimple'
  | 'elevenscreens'
  | 'assistant'
  | 'built'
  | 'journey'
  | 'conversation'
  | 'shortlist'
  | 'match'
  | 'interview'
  | 'triage'
  | 'dialtone'

export function Glyph({ name }: { name: GlyphName }) {
  return (
    <span className={`sicon sicon--${name}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        {GLYPHS[name]}
      </svg>
    </span>
  )
}

const GLYPHS: Record<GlyphName, React.ReactElement> = {
  answer: (
    <g className="sg">
      <path className="sg-you" d="M4 20h10" />
      <circle className="sg-gap" cx="20" cy="20" r="2" />
      <path className="sg-it" d="M26 20h4" />
      <path className="sg-wave" d="M32 16v8M36 18v4" />
    </g>
  ),

  interrupt: (
    <g className="sg">
      <path className="sg-its" d="M5 14h30" />
      <path className="sg-cut" d="M21 7v26" />
      <path className="sg-yours" d="M5 28h30" />
    </g>
  ),

  protect: (
    <g className="sg">
      <path className="sg-brk" d="M12 12v16M28 12v16" />
      <path className="sg-held" d="M15 20h10" />
      <path className="sg-push" d="M3 20h6" />
    </g>
  ),

  language: (
    <g className="sg">
      <text className="sg-hi" x="20" y="25" textAnchor="middle">अ</text>
      <text className="sg-en" x="20" y="25" textAnchor="middle">A</text>
      <path className="sg-rule" d="M11 31h18" />
    </g>
  ),

  honest: (
    <g className="sg">
      <rect className="sg-box" x="7" y="12" width="26" height="16" rx="3" />
      <path className="sg-num" d="M14 20h4M22 20h4" />
      <path className="sg-none" d="M14 20h12" />
    </g>
  ),

  signal: (
    <g className="sg">
      <path className="sg-b1" d="M9 28v-5" />
      <path className="sg-b2" d="M16 28v-9" />
      <path className="sg-b3" d="M23 28v-13" />
      <path className="sg-b4" d="M30 28v-17" />
      <path className="sg-floor" d="M6 31h28" />
    </g>
  ),

  inbound: (
    <g className="sg">
      <circle className="sg-ring sg-r1" cx="20" cy="20" r="7" />
      <circle className="sg-ring sg-r2" cx="20" cy="20" r="7" />
      <circle className="sg-ring sg-r3" cx="20" cy="20" r="7" />
      <circle className="sg-core" cx="20" cy="20" r="2.4" />
    </g>
  ),

  outbound: (
    <g className="sg">
      <circle className="sg-ring sg-o1" cx="20" cy="20" r="7" />
      <circle className="sg-ring sg-o2" cx="20" cy="20" r="7" />
      <circle className="sg-ring sg-o3" cx="20" cy="20" r="7" />
      <circle className="sg-core" cx="20" cy="20" r="2.4" />
    </g>
  ),

  voicemail: (
    <g className="sg">
      <path className="sg-speech" d="M6 20c3 0 3-8 6-8s3 16 6 16" />
      <path className="sg-flat" d="M18 20h11" />
      <path className="sg-hangup" d="M32 20v7" />
      <circle className="sg-end" cx="32" cy="20" r="1.8" />
    </g>
  ),

  later: (
    <g className="sg">
      <circle className="sg-face" cx="20" cy="20" r="13" />
      <path className="sg-hand" d="M20 20v-8" />
      <path className="sg-hour" d="M20 20h5" />
      <circle className="sg-pin" cx="20" cy="20" r="1.6" />
    </g>
  ),

  dropped: (
    <g className="sg">
      <path className="sg-lineA" d="M4 20h11" />
      <path className="sg-lineB" d="M25 20h11" />
      <path className="sg-span" d="M15 20h10" />
      <circle className="sg-carry" cx="15" cy="20" r="2.2" />
    </g>
  ),

  after: (
    <g className="sg">
      <path className="sg-bars" d="M7 24v-8M12 24v-12M17 24v-5" />
      <path className="sg-rows" d="M22 14h12M22 20h9M22 26h12" />
    </g>
  ),

  face: (
    <g className="sg">
      <circle className="sg-head" cx="20" cy="20" r="13" />
      <path className="sg-brow" d="M13 15h4M23 15h4" />
      <path className="sg-eyes" d="M15 19h0.01M25 19h0.01" />
      <path className="sg-mouth" d="M14 26q6 3 12 0" />
    </g>
  ),

  logged: (
    <g className="sg">
      <path className="sg-said" d="M5 13c3 0 3-6 6-6s3 12 6 12" />
      <rect className="sg-rec" x="18" y="16" width="18" height="15" rx="2.5" />
      <path className="sg-fill" d="M22 21h10M22 26h6" />
    </g>
  ),

  drive: (
    <g className="sg">
      <rect className="sg-ui" x="5" y="7" width="30" height="26" rx="3" />
      <path className="sg-bar" d="M5 14h30" />
      <rect className="sg-btn" x="21" y="20" width="10" height="7" rx="2" />
      <path className="sg-ptr" d="M11 18l7 9-3 0.5 2 4" />
    </g>
  ),

  expression: (
    <g className="sg">
      <circle className="sg-head" cx="20" cy="20" r="13" />
      <path className="sg-calm" d="M14 24q6 4 12 0" />
      <path className="sg-hard" d="M14 26q6-4 12 0" />
      <path className="sg-b1" d="M13 15h4M23 15h4" />
    </g>
  ),

  anyface: (
    <g className="sg">
      <rect className="sg-frame" x="7" y="7" width="26" height="26" rx="3" />
      <circle className="sg-a" cx="20" cy="18" r="5" />
      <path className="sg-a2" d="M12 30c2-5 14-5 16 0" />
      <circle className="sg-b" cx="20" cy="17" r="6" />
      <path className="sg-b2" d="M11 30c3-6 15-6 18 0" />
    </g>
  ),

  withhold: (
    <g className="sg">
      <path className="sg-bub" d="M7 11h26v14H21l-6 6v-6H7z" />
      <path className="sg-dots" d="M14 18h0.01M20 18h0.01M26 18h0.01" />
      <path className="sg-held" d="M20 18h6" />
    </g>
  ),

  refuse: (
    <g className="sg">
      <path className="sg-wall" d="M28 8v24" />
      <path className="sg-push" d="M8 20h13" />
      <path className="sg-tip" d="M18 16l4 4-4 4" />
      <path className="sg-shock" d="M32 15l3-2M32 20h4M32 25l3 2" />
    </g>
  ),

  refund: (
    <g className="sg">
      <rect className="sg-note" x="10" y="14" width="20" height="13" rx="2" />
      <path className="sg-back" d="M27 33H15a5 5 0 0 1 0-10h3" />
      <path className="sg-arrow" d="M21 20l-4 3 4 3" />
      <path className="sg-heat" d="M14 9l1 3M20 7v4M26 9l-1 3" />
    </g>
  ),

  abandon: (
    <g className="sg">
      <path className="sg-track" d="M5 20h30" />
      <path className="sg-fill" d="M5 20h13" />
      <circle className="sg-head2" cx="18" cy="20" r="2.4" />
      <path className="sg-gone" d="M25 14l6 6-6 6" />
    </g>
  ),

  buried: (
    <g className="sg">
      <path className="sg-l1" d="M5 10h22" />
      <path className="sg-l2" d="M10 17h20" />
      <path className="sg-l3" d="M15 24h17" />
      <path className="sg-l4" d="M20 31h9" />
      <circle className="sg-it" cx="33" cy="31" r="2.2" />
    </g>
  ),

  unhelpful: (
    <g className="sg">
      <path className="sg-step1" d="M6 20h7" />
      <path className="sg-chev" d="M15 17l3 3-3 3" />
      <path className="sg-step2" d="M20 20h7" />
      <path className="sg-chev2" d="M29 17l3 3-3 3" />
      <path className="sg-lost" d="M34 20h2" />
    </g>
  ),

  oversimple: (
    <g className="sg">
      <rect className="sg-big" x="7" y="9" width="26" height="22" rx="3" />
      <path className="sg-bits" d="M12 15h7M12 21h5M25 15h4M23 21h6M12 27h9" />
      <path className="sg-one" d="M14 20h12" />
    </g>
  ),

  elevenscreens: (
    <g className="sg">
      <rect className="sg-s3" x="6" y="6" width="21" height="17" rx="2.5" />
      <rect className="sg-s2" x="10" y="11" width="21" height="17" rx="2.5" />
      <rect className="sg-s1" x="14" y="16" width="21" height="17" rx="2.5" />
    </g>
  ),

  assistant: (
    <g className="sg">
      <circle className="sg-head3" cx="13" cy="12" r="4.5" />
      <path className="sg-body" d="M6 32c0-6 3.5-9 7-9s7 3 7 9" />
      <path className="sg-shelf" d="M25 11v22M25 15h10M25 23h10" />
      <path className="sg-say" d="M22 17h0.01" />
    </g>
  ),

  built: (
    <g className="sg">
      <rect className="sg-box2" x="7" y="7" width="26" height="26" rx="4" />
      <path className="sg-check" d="M13 20.5l5 5 9-11" />
    </g>
  ),

  journey: (
    <g className="sg">
      <path className="sg-route" d="M7 30c8 0 4-10 12-10s5-10 13-10" />
      <circle className="sg-from" cx="7" cy="30" r="2.4" />
      <circle className="sg-to" cx="32" cy="10" r="2.4" />
    </g>
  ),

  conversation: (
    <g className="sg">
      <path className="sg-c1" d="M5 9h18v11H14l-5 5v-5H5z" />
      <path className="sg-c2" d="M35 19H19v10h6l5 5v-5h5z" />
    </g>
  ),

  shortlist: (
    <g className="sg">
      <path className="sg-many" d="M5 9h11M5 14h11M5 19h11M5 24h11M5 29h11" />
      <path className="sg-fan" d="M18 19h4" />
      <path className="sg-few" d="M25 13h11M25 20h9M25 27h11" />
      <circle className="sg-top" cx="22" cy="13" r="1.8" />
    </g>
  ),

  match: (
    <g className="sg">
      <circle className="sg-job" cx="15" cy="20" r="9" />
      <circle className="sg-you2" cx="25" cy="20" r="9" />
      <path className="sg-lap" d="M20 12.5a9 9 0 0 0 0 15 9 9 0 0 0 0-15" />
    </g>
  ),

  interview: (
    <g className="sg">
      <circle className="sg-them" cx="11" cy="14" r="4" />
      <circle className="sg-me" cx="29" cy="14" r="4" />
      <path className="sg-table" d="M5 23h30" />
      <path className="sg-q" d="M15 28h10" />
      <path className="sg-probe" d="M25 28h5" />
    </g>
  ),

  triage: (
    <g className="sg">
      <path className="sg-rows2" d="M8 11h20M8 18h20M8 25h20M8 32h20" />
      <path className="sg-flag" d="M32 14v10" />
      <circle className="sg-pick" cx="32" cy="18" r="2.6" />
    </g>
  ),

  dialtone: (
    <g className="sg">
      <path
        className="sg-set"
        d="M9 9h6l3 7-4 3c1.5 4 4 6.5 8 8l3-4 7 3v6c0 1.5-1 2.5-2.5 2.5C19 34.5 5.5 21 5.5 11.5 5.5 10 6.5 9 8 9"
      />
      <path className="sg-ring2" d="M26 8c3 1 5 3 6 6" />
      <path className="sg-ring3" d="M24 3c5.5 1.5 9.5 5.5 11 11" />
    </g>
  ),
}
