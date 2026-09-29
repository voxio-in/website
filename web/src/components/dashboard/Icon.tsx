// Stroke icons for the dashboard (24px grid, currentColor).
//
// Like the site's card glyphs, each icon is drawn in parts so it can act out
// what it does while its button or link is hovered: the gear turns, the trash
// lid lifts, the copy sheet slides out, the bars grow. The scenes live in
// styles/dashboard-motion.css, keyed on data-icon and the part classes below.

const ICONS = {
  home: <>
    <path d="M3 10.5 12 3l9 7.5M5 9v11h14V9" />
    <path className="i-door" d="M10 20v-6h4v6" />
  </>,
  flows: <>
    <circle cx="6" cy="6" r="3" />
    <circle className="i-dot i-b" cx="6" cy="18" r="3" />
    <circle className="i-dot" cx="18" cy="6" r="3" />
    <path className="i-draw" d="M6 9v6M18 9v2a4 4 0 0 1-4 4H9" />
  </>,
  voice: <>
    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM12 18v3" />
    <path className="i-wave" d="M5 11a7 7 0 0 0 14 0" />
    <path className="i-wave i-b" d="M2 10a10 10 0 0 0 20 0" />
  </>,
  avatar: <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
    <path className="i-blink" d="M10.5 8h.01M13.5 8h.01" />
  </>,
  book: <>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13" />
    <path className="i-page" d="M8 7h7M8 10h5" />
  </>,
  plug: <>
    <path className="i-prongs" d="M9 3v5m6-5v5" />
    <path d="M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4" />
    <path className="i-spark" d="M4 19l-2 1M20 19l2 1M12 21v2" />
  </>,
  code: <>
    <path className="i-l" d="m8 7-5 5 5 5" />
    <path className="i-r" d="m16 7 5 5-5 5" />
    <path className="i-slash" d="M14 4l-4 16" />
  </>,
  settings: <>
    <g className="i-spin">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />
    </g>
  </>,
  copy: <>
    <path className="i-back" d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    <path className="i-front" d="M9 9h10v12H9z" />
  </>,
  check: <path className="i-tick" d="m5 12 5 5 9-10" pathLength={1} />,
  edit: <>
    <g className="i-pen"><path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" /></g>
    <path className="i-ink" d="M12 21h8" pathLength={1} />
  </>,
  trash: <>
    <g className="i-lid"><path d="M4 7h16M9 7V4h6v3" /></g>
    <path d="M6 7l1 13h10l1-13" />
    <path className="i-lines" d="M10 11v6m4-6v6" />
  </>,
  search: <g className="i-lens"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5" /></g>,
  plus: <g className="i-turn"><path d="M12 5v14M5 12h14" /></g>,
  panel: <>
    <path d="M4 4h16v16H4z" />
    <path className="i-divider" d="M9 4v16" />
  </>,
  back: <path className="i-arrowl" d="M15 18 9 12l6-6" />,
  sun: <>
    <circle className="i-core" cx="12" cy="12" r="4" />
    <g className="i-rays"><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></g>
  </>,
  moon: <>
    <path className="i-moon" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    <path className="i-star" d="M17 3v3M15.5 4.5h3" />
    <path className="i-star i-b" d="M21 7.5v2M20 8.5h2" />
  </>,
  logout: <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path className="i-exit" d="M16 17l5-5-5-5M21 12H9" />
  </>,
  phone: <>
    <g className="i-ring"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></g>
    <path className="i-wave" d="M15 3a6 6 0 0 1 6 6" />
    <path className="i-wave i-b" d="M15 6.5a2.5 2.5 0 0 1 2.5 2.5" />
  </>,
  webhook: <>
    <path d="M10 14a4 4 0 1 1-3-6.5M14 10a4 4 0 1 1 3 6.5M9 17h8M12 7l-3 6" />
    <path className="i-flow" d="M10 14a4 4 0 1 1-3-6.5M14 10a4 4 0 1 1 3 6.5M9 17h8M12 7l-3 6" pathLength={1} />
  </>,
  chart: <>
    <path d="M3 20h18" />
    <path className="i-bar" d="M4 20V10" />
    <path className="i-bar i-b" d="M10 20V4" />
    <path className="i-bar i-c" d="M16 20v-7" />
  </>,
  list: <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path className="i-pt" d="M3 6h.01" />
    <path className="i-pt i-b" d="M3 12h.01" />
    <path className="i-pt i-c" d="M3 18h.01" />
  </>,
  sliders: <>
    <path d="M4 6h16M4 12h16M4 18h16" opacity={0.45} />
    <path className="i-knob" d="M14 4v4" />
    <path className="i-knob i-b" d="M8 10v4" />
    <path className="i-knob i-c" d="M16 16v4" />
  </>,
  cursor: <>
    <g className="i-click"><path d="m4 4 7 17 2-7 7-2L4 4Z" /></g>
    <path className="i-ripple" d="M3 1.5 1.5 3M6 1v1.5M1 6h1.5" />
  </>,
  bolt: <path className="i-flash" d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />,
  eye: <>
    <g className="i-lidd"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /></g>
    <circle className="i-pupil" cx="12" cy="12" r="3" />
  </>,
  eyeOff: <>
    <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path className="i-slashd" d="M3 3l18 18" pathLength={1} />
  </>,
  rotate: <g className="i-spin"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></g>,
  close: <g className="i-turn"><path d="M6 6l12 12M18 6 6 18" /></g>,
  play: <path className="i-go" d="M7 4v16l13-8L7 4Z" />,
  calendar: <>
    <path d="M4 6h16v14H4zM4 10h16" />
    <path className="i-rings" d="M8 3v4m8-4v4" />
    <path className="i-day" d="M8 14h.01" />
  </>,
  grid: <>
    <path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16" />
    <path className="i-cell" d="M5.5 5.5h3v3h-3z" />
  </>,
} as const

export type IconName = keyof typeof ICONS

export default function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} data-icon={name} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
