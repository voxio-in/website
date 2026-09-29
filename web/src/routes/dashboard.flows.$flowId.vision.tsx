import { createFileRoute } from '@tanstack/react-router'

import { CopyJson, Dropdown, Label, NumberUnit } from '#/components/dashboard/controls'
import { AiGlow, SaveBar, Toggle, useDraft } from '#/components/dashboard/ui'

export const Route = createFileRoute('/dashboard/flows/$flowId/vision')({
  component: VisionTab,
})

const DEFAULT = {
  service: 'google-ai-studio',
  model: 'gemini-3.1-flash-lite',
  input: 'frames-only',
  'video-fps': 1,
  'system-prompt': 'Describe what the user looks like and what is on camera, briefly.',
}

const PROVIDERS = [
  { value: 'google-ai-studio', label: 'Google AI Studio' },
  { value: 'google-vertex', label: 'Google Vertex AI' },
]
const INPUTS = [
  { value: 'frames-only', label: 'Camera frames', hint: 'Recommended' },
  { value: 'video', label: 'Video and audio' },
  { value: 'audio-only', label: 'Audio only' },
]
const MODELS = [
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', hint: 'Fastest' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
]

function VisionTab() {
  const { draft, set, dirty, commit, reset, status } = useDraft(['running_vision_id'])
  const v = draft.running_vision_id as Record<string, unknown> | null
  const put = (k: string, x: unknown) => set('running_vision_id', { ...(v ?? DEFAULT), [k]: x })

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Vision</h1>
          <p className="db-sub">Let your agent see the caller’s camera during video calls.</p>
        </div>
      </header>

      <section className="db-setcard">
        <div className="db-setcard-head">
          <h2 className="db-h2">Camera understanding</h2>
          {v && <CopyJson value={v} />}
        </div>
        <div className="db-knobs">
          <div className="db-knob-row">
            <Label info="The agent gets a running description of what the camera shows.">See the caller’s camera</Label>
            <div className="db-knob-ctl"><Toggle on={!!v} onChange={(on) => set('running_vision_id', on ? DEFAULT : null)} /></div>
          </div>
          {v && (
            <>
              <div className="db-knob-row is-child">
                <Label>Provider</Label>
                <div className="db-knob-ctl"><Dropdown value={String(v.service)} options={PROVIDERS} onChange={(x) => put('service', x)} /></div>
              </div>
              <div className="db-knob-row is-child">
                <Label>Model</Label>
                <div className="db-knob-ctl"><Dropdown value={String(v.model)} options={MODELS} onChange={(x) => put('model', x)} /></div>
              </div>
              <div className="db-knob-row is-child">
                <Label>Looks at</Label>
                <div className="db-knob-ctl"><Dropdown value={String(v.input)} options={INPUTS} onChange={(x) => put('input', x)} /></div>
              </div>
              <div className="db-knob-row is-child">
                <Label info="How often a frame is looked at.">Frames per second</Label>
                <div className="db-knob-ctl"><NumberUnit value={Number(v['video-fps'] ?? 1)} unit="fps" min={0.2} max={5} step={0.2} onChange={(x) => put('video-fps', x ?? 1)} /></div>
              </div>
              <div className="db-knob-row is-block is-child">
                <Label>What to look for</Label>
                <div className="db-knob-ctl">
                  <AiGlow><textarea className="db-in" rows={4} value={String(v['system-prompt'] ?? '')} onChange={(e) => put('system-prompt', e.target.value)} /></AiGlow>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}
