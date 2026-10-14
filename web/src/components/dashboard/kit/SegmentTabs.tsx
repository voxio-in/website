// A row of choices that switch what a chart shows, as a Material 3 segmented
// button (Material 3 Design Kit): one outlined pill split into segments, the
// chosen one filled with the tonal container and marked with a check.

import { CheckIcon } from 'lucide-react'

export function SegmentTabs<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T | null
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="m3-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={`m3-seg-btn${on ? ' is-on' : ''}`} onClick={() => onChange(o.value)}>
            <span className="m3-seg-check" aria-hidden><CheckIcon size={18} strokeWidth={2.4} /></span>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
