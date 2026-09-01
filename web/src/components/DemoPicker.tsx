// The try-it panel on /avatar. Same card as the phone demo on /calling, because
// they are the same offer made on two different transports — see demo.css.

import { useState } from 'react'

import AccentPicker from '#/components/AccentPicker'
import IdleFace from '#/components/IdleFace'
import VoiceRoom from '#/components/VoiceRoom'
import { DEFAULT_ACCENT, type AccentId } from '#/lib/accents'
import { DEFAULT_DEMO, DEMOS, demoById, type DemoId } from '#/lib/demos'

export default function DemoPicker() {
  const [demoId, setDemoId] = useState<DemoId>(DEFAULT_DEMO)
  const [accent, setAccent] = useState<AccentId>(DEFAULT_ACCENT)
  const demo = demoById(demoId)

  return (
    <div className="dcard dcard--wide">
      {/* Keyed on the demo and the accent: both are fixed at connect, so
          changing either must end the session you were in rather than carry
          it across to an agent with a different voice. */}
      <VoiceRoom
        key={`${demo.id}:${accent}`}
        demoId={demo.id}
        accent={accent}
        idleFace={<IdleFace demoId={demo.id} name={demo.label} role={demo.role} />}
      >
        <div className="dstep">
          <span className="dstep-n" aria-hidden="true">1</span>
          <span className="dstep-t">Who do you want to talk to?</span>
        </div>

        <div className="segstrip" role="radiogroup" aria-label="Who do you want to talk to?">
          {DEMOS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={d.id === demoId}
              className={`seg-o${d.id === demoId ? ' is-on' : ''}`}
              onClick={() => setDemoId(d.id)}
            >
              <span>{d.label}</span>
              <span className="seg-sub">{d.role}</span>
            </button>
          ))}
        </div>

        <p className="dhint">{demo.blurb}</p>

        <AccentPicker value={accent} onChange={setAccent} />

        {/* "Try saying" used to be a sidebar block you read before starting,
            a nudge while you are actually talking. See VoiceRoom's live state. */}
      </VoiceRoom>

      <p className="dnote">
        Runs in this tab over your microphone. Five-minute sessions.
      </p>

      <details className="dexpect">
        <summary>What to expect</summary>
        <p>
          Nothing to install and no phone call. Talk over it whenever you like &mdash; it
          stops and listens, the way a person would. Sessions are capped at five minutes.
        </p>
      </details>
    </div>
  )
}
