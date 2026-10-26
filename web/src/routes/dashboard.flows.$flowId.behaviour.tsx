import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { KnobList } from '#/components/dashboard/KnobInput'
import Icon from '#/components/dashboard/Icon'
import { CopySettingsMenu } from '#/components/dashboard/kit/CopySettingsMenu'
import { SegmentTabs } from '#/components/dashboard/kit/SegmentTabs'
import { Label } from '#/components/dashboard/controls'
import { SaveBar, Toggle, useDraft } from '#/components/dashboard/ui'
import { SHOW_DATA, showsData } from '#/lib/dashboard/client'
import { KNOBS, type Knob } from '#/lib/dashboard/knobs'
import type { FlowDoc } from '#/lib/dashboard/types'

export const Route = createFileRoute('/dashboard/flows/$flowId/behaviour')({
  component: Behaviour,
})

/**
 * Sections named after what the caller notices, not the engine's parts
 * (mindsets/voxio-users.md, Behaviour). `fine`: the exact settings sit under Fine-tune.
 */
const SECTIONS: { id: string; title: string; sub: string; keys: string[]; fine?: boolean }[] = [
  { id: 'pace', title: 'How fast it answers', sub: 'From waiting for your words to starting before you finish.', keys: ['process-type', 'warmup-agent', 'first-chunk-fast', 'pre-fire', 'pre-fire-config'], fine: true },
  { id: 'over', title: 'When you talk over it', sub: 'How it tells a real interruption from an “uh” or background noise.', keys: ['streaming-grace-ms', 'vad-threshold'] },
  { id: 'quiet', title: 'When the caller goes quiet', sub: 'Whether it checks in, what it says, and how often.', keys: ['inactivity', 'inactivity-metadata'] },
]

type Pace = 'wait' | 'quick' | 'early'
/** One choice for most people; each sets the pace settings below it. */
const PACES: { value: Pace; label: string; text: string; set: Record<string, unknown> }[] = [
  { value: 'wait', label: 'Waits for you', text: 'Answers once your words are written out. Steady, with a short pause before each reply.',
    set: { 'process-type': 'stt-native', 'warmup-agent': true, 'first-chunk-fast': false, 'pre-fire': false } },
  { value: 'quick', label: 'Answers quickly', text: 'Hears when you’ve finished from how you speak, and says its first words as soon as they’re ready.',
    set: { 'process-type': 'speech-native', 'warmup-agent': true, 'first-chunk-fast': true, 'pre-fire': false } },
  { value: 'early', label: 'Starts before you finish', text: 'Also starts its answer during your last pause, and drops it if you keep talking. The most natural, and the most likely to cut in.',
    set: { 'process-type': 'speech-native', 'warmup-agent': true, 'first-chunk-fast': true, 'pre-fire': true } },
]

// Matches the nudge field's max in knobs.ts; anything above was saved in milliseconds.
const MAX_NUDGE_SECONDS = 120

const byKey = new Map(KNOBS.map((k) => [k.key, k]))
const knobsOf = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((k): k is Knob => !!k)

function Behaviour() {
  const { flowId } = Route.useParams()
  const keys = [...SECTIONS.flatMap((s) => s.keys), SHOW_DATA]
  const { draft, set, dirty, commit, reset, status } = useDraft(keys as (keyof FlowDoc)[])
  const values = draft as Record<string, unknown>
  const valueOf = (k: string) => values[k] ?? byKey.get(k)?.default
  const pace = PACES.find((p) => Object.entries(p.set).every(([k, v]) => valueOf(k) === v))
  const choosePace = (v: Pace) => {
    const p = PACES.find((x) => x.value === v)
    if (p) for (const [k, x] of Object.entries(p.set)) set(k as keyof FlowDoc, x as never)
  }
  const onChange = (k: string, v: unknown) => set(k as keyof FlowDoc, v as never)
  // Shown when the timing was set by hand; otherwise one click away.
  const [fine, setFine] = useState(false)
  const fineOpen = fine || !pace

  // The nudge was once saved in milliseconds (1000), which the voice server reads as seconds.
  // Show it as the seconds that were meant; Save stores it that way.
  const nudge = values['inactivity-metadata'] as Record<string, unknown> | undefined
  const legacy = Number(nudge?.['time-period']) > MAX_NUDGE_SECONDS
  useEffect(() => {
    if (!legacy || !nudge) return
    onChange('inactivity-metadata', { ...nudge, 'time-period': Math.max(2, Math.round(Number(nudge['time-period']) / 1000)) })
  }, [legacy]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="db-page db-bigform db-behaviour">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Behaviour</h1>
          <p className="db-sub">When your agent answers, when it stops, and what it does when nobody talks.</p>
        </div>
        <div className="db-pagehead-side">
          <Link to="/dashboard/flows/$flowId/test" params={{ flowId }} className="db-btn db-btn-icon">Try it in Test</Link>
          <CopySettingsMenu settings={Object.fromEntries(keys.map((k) => [k, valueOf(k)]))} />
        </div>
      </header>
      <div className="db-settings">
        {SECTIONS.map((sec) => (
          <section key={sec.id} className="db-setcard">
            <div className="db-setcard-head">
              <div>
                <h2 className="db-h2">{sec.title}</h2>
                <p className="db-setcard-sub">{sec.sub}</p>
              </div>
            </div>
            {sec.fine ? (
              <>
                <SegmentTabs label="How fast it answers" value={pace?.value ?? null} options={PACES} onChange={choosePace} />
                <p className="db-pace-text">{pace ? pace.text : 'Set by hand. The settings are below.'}</p>
                <button type="button" className={`db-finetune${fineOpen ? ' is-open' : ''}`} aria-expanded={fineOpen} onClick={() => setFine(!fineOpen)}>
                  <Icon name="sliders" size={22} />
                  <span><b>Fine-tune the timing</b><small>The engine, warm-up, first words and reply early, one by one</small></span>
                  <ChevronDownIcon size={22} className="db-finetune-chev" />
                </button>
                {fineOpen && <KnobList knobs={knobsOf(sec.keys)} values={values} onChange={onChange} />}
              </>
            ) : <KnobList knobs={knobsOf(sec.keys)} values={values} onChange={onChange} />}
          </section>
        ))}
        <section className="db-setcard">
          <div className="db-setcard-head">
            <div>
              <h2 className="db-h2">What the conversation shows</h2>
              <p className="db-setcard-sub">In tests and session replays, for everyone who opens this flow.</p>
            </div>
          </div>
          <div className="db-knobs">
            <div className="db-knob-row">
              <Label info="Anything a step sends besides its words, such as a frame, a score or feedback, shown as “Agent · data”. Turn it off to show only what was said, for example in a demo. The data is still saved, so turning it back on shows it again.">Show extra data</Label>
              <div className="db-knob-ctl"><Toggle on={showsData(values)} onChange={(on) => onChange(SHOW_DATA, on)} /></div>
            </div>
          </div>
        </section>
      </div>
      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}
