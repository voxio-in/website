// The face you see BEFORE you press start.

export type FaceBuild = {
  /** head width relative to height — the cheapest way to make faces differ */
  rx: number
  /** resting brow path */
  brows: string
  /** resting mouth path */
  mouth: string
  /** the wash behind them, so each character owns a colour */
  tint: string
}

export const FACE_BUILDS: Record<string, FaceBuild> = {
  interview: { rx: 21, brows: 'M45 27h9M75 27h-9', mouth: 'M53 51h14', tint: '#0fd6ad' },
  navigator: { rx: 20, brows: 'M45 26.5l9 1M75 26.5l-9 1', mouth: 'M53 50q7 4 14 0', tint: '#7cc7ff' },
  mm: { rx: 19.5, brows: 'M45 28l9-3M75 28l-9-3', mouth: 'M54 52q6-3 12 0', tint: '#ffd479' },
  pr: { rx: 22, brows: 'M45 27l9 3M75 27l-9 3', mouth: 'M54 52.5h12', tint: '#ff9d7a' },
  vps: { rx: 21, brows: 'M45 26h9M75 26h-9', mouth: 'M55 51.5h10', tint: '#b9a7ff' },
}

const NEUTRAL_BUILD: FaceBuild = {
  rx: 21,
  brows: 'M45 27h9M75 27h-9',
  mouth: 'M53 51h14',
  tint: '#0fd6ad',
}

export const faceBuild = (id: string): FaceBuild => FACE_BUILDS[id] ?? NEUTRAL_BUILD

export default function IdleFace({
  demoId,
  name,
  role,
}: {
  demoId: string
  name: string
  role: string
}) {
  const b = faceBuild(demoId)

  return (
    <div className="iface" style={{ '--iface-tint': b.tint } as React.CSSProperties}>
      <svg className="iface-svg" viewBox="0 0 120 80" fill="none" aria-hidden="true">
        {/* shoulders, so it reads as a person on a call rather than a mask */}
        <path d="M16 80c4-14 19-20 44-20s40 6 44 20" stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" />

        {/* the head breathes: a tiny, slow scale, which is what stops a drawing
            from reading as a diagram */}
        <g className="iface-head">
          <ellipse cx="60" cy="36" rx={b.rx} ry="25" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
          <path d={b.brows} stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" />

          {/* The eyes blink. Two lids that drop on their own clock, offset by a
              alive at a glance. */}
          <g className="iface-eyes">
            <path d="M48.5 35.5h5M66.5 35.5h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          <g className="iface-lids">
            <path d="M47.5 35.5h7M65.5 35.5h7" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round" />
          </g>

          <path d="M60 40v6" stroke="rgba(255,255,255,0.34)" strokeWidth="1.2" strokeLinecap="round" />
          <path d={b.mouth} stroke="rgba(255,255,255,0.62)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </svg>

      {/* Name and role sit over the lower-left of the frame, the way a broadcast
          caption underneath it. */}
      <div className="iface-id">
        <span className="iface-name">{name}</span>
        <span className="iface-role">{role}</span>
      </div>
    </div>
  )
}
