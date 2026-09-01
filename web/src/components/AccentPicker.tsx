// The accent control, shared by /avatar and /webnav.
//
// A dropdown rather than another segstrip: the accent is a setting on the
// conversation, not a choice of who you are talking to, and giving it the
// same weight as "who do you want to talk to?" would read as a second
// question of equal size. Three options do not earn a row of buttons.

import { ACCENTS, type AccentId } from '#/lib/accents'

export default function AccentPicker({
  value,
  onChange,
  disabled,
}: {
  value: AccentId
  onChange: (next: AccentId) => void
  /** Locked once a session is live — the voice and the ears are fixed at connect. */
  disabled?: boolean
}) {
  const accent = ACCENTS.find((a) => a.id === value) ?? ACCENTS[0]!

  return (
    <div className="daccent">
      <label className="daccent-l" htmlFor="accent">
        Accent
      </label>
      <select
        id="accent"
        className="daccent-s"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as AccentId)}
      >
        {ACCENTS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
      <span className="daccent-n">Speak {accent.note}</span>
    </div>
  )
}
