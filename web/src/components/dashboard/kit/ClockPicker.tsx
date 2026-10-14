// Picking a time on a clock face: tap or drag the hour, it moves on to the
// minutes, AM / PM beside the big readout. `value` is 24-hour `HH:mm`.

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const pad = (n: number) => String(n).padStart(2, '0')
const SIZE = 232
const C = SIZE / 2
const R = 88 // where the numbers sit

export function ClockPicker({ value, onChange, onDone }: {
  value: string
  onChange: (v: string) => void
  /** Called once the minutes are picked. */
  onDone?: () => void
}) {
  const [h24, m] = value.split(':').map(Number)
  const pm = h24 >= 12
  const h12 = h24 % 12 || 12
  const [mode, setMode] = useState<'hour' | 'minute'>('hour')
  const dial = useRef<SVGSVGElement>(null)
  // While dragging the hand follows the pointer freely; the value snaps.
  const [drag, setDrag] = useState<number | null>(null)
  const shown = useRef<number | null>(null)

  const set = (h: number, min: number) => onChange(`${pad(h)}:${pad(min)}`)
  const setHour12 = (h: number, isPm = pm) => set((h % 12) + (isPm ? 12 : 0), m)

  // Angle from 12 o'clock, clockwise, of a pointer on the dial.
  const pick = (e: React.PointerEvent) => {
    const r = dial.current!.getBoundingClientRect()
    const x = e.clientX - r.left - r.width / 2
    const y = e.clientY - r.top - r.height / 2
    const deg = (Math.atan2(x, -y) * 180) / Math.PI
    const turn = (deg + 360) % 360
    setDrag(turn)
    if (mode === 'hour') setHour12(Math.round(turn / 30) % 12 || 12)
    else set(h24, Math.round(turn / 6) % 60)
  }

  const ticks = mode === 'hour'
    ? Array.from({ length: 12 }, (_, i) => ({ n: i + 1, label: String(i + 1), at: (i + 1) * 30 }))
    : Array.from({ length: 12 }, (_, i) => ({ n: i * 5, label: pad(i * 5), at: i * 30 }))
  const handDeg = mode === 'hour' ? h12 * 30 : m * 6
  // Turn the short way round, so 11 → 1 does not spin backwards.
  const target = drag ?? handDeg
  shown.current = shown.current === null ? target : shown.current + ((target - shown.current + 540) % 360) - 180
  const ease = drag === null ? 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
  const selected = (n: number) => (mode === 'hour' ? n === h12 : n === m)

  const seg = (on: boolean) => cn(
    'rounded-xl px-2.5 py-1 text-[34px] font-semibold tabular-nums leading-none transition-colors',
    on ? 'bg-accent text-primary' : 'text-foreground hover:bg-muted',
  )
  const ampm = (on: boolean) => cn(
    'rounded-lg px-2.5 py-1 text-[13px] font-semibold transition-colors',
    on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

  return (
    <div className="flex w-[260px] flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          <button type="button" className={seg(mode === 'hour')} onClick={() => setMode('hour')} aria-label="Hour">{pad(h12)}</button>
          <span className="text-muted-foreground text-[30px] font-semibold">:</span>
          <button type="button" className={seg(mode === 'minute')} onClick={() => setMode('minute')} aria-label="Minutes">{pad(m)}</button>
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" className={ampm(!pm)} onClick={() => pm && set(h24 - 12, m)}>AM</button>
          <button type="button" className={ampm(pm)} onClick={() => !pm && set(h24 + 12, m)}>PM</button>
        </div>
      </div>

      <svg
        ref={dial}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="cursor-pointer touch-none select-none"
        role="slider"
        aria-label={mode === 'hour' ? 'Hour' : 'Minutes'}
        aria-valuenow={mode === 'hour' ? h12 : m}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e) }}
        onPointerMove={(e) => drag !== null && pick(e)}
        onPointerUp={() => {
          setDrag(null)
          if (mode === 'hour') setMode('minute')
          else onDone?.()
        }}
      >
        <circle cx={C} cy={C} r={C} fill="var(--sh-muted)" />
        <g style={{ transform: `rotate(${shown.current}deg)`, transformOrigin: `${C}px ${C}px`, transition: ease }}>
          <line x1={C} y1={C} x2={C} y2={C - R} stroke="var(--sh-primary)" strokeWidth={2} />
          <circle cx={C} cy={C - R} r={19} fill="var(--sh-primary)" />
          {/* A minute between the fives still gets a dot on the hand. */}
          {mode === 'minute' && m % 5 !== 0 && drag === null && <circle cx={C} cy={C - R} r={3} fill="var(--sh-primary-foreground)" />}
        </g>
        <circle cx={C} cy={C} r={4} fill="var(--sh-primary)" />
        {ticks.map((t) => {
          const a = (t.at * Math.PI) / 180
          return (
            <text key={t.n} x={C + R * Math.sin(a)} y={C - R * Math.cos(a)} textAnchor="middle" dominantBaseline="central"
              fontSize={15} style={{ transition: 'fill 0.15s' }} fontWeight={selected(t.n) ? 700 : 500}
              fill={selected(t.n) ? 'var(--sh-primary-foreground)' : 'var(--sh-foreground)'} pointerEvents="none">
              {t.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
