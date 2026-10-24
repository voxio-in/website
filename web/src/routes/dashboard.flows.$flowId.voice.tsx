import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { EarIcon, Volume2Icon } from 'lucide-react'

import { CopySettingsMenu } from '#/components/dashboard/kit/CopySettingsMenu'
import { KnobList } from '#/components/dashboard/KnobInput'
import ProviderEditor from '#/components/dashboard/ProviderEditor'
import { Notice, SaveBar, useDraft } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import { knobsIn } from '#/lib/dashboard/knobs'
import { describe, languagesOf } from '#/lib/dashboard/providers'
import type { Account, FlowDoc, VoicePreset } from '#/lib/dashboard/types'
import { getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/$flowId/voice')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: VoiceTab,
})

// Speaking first: people decide how their agent sounds before how it hears
// (mindsets/voxio-users.md). Each half asks one question in plain words.
const SECTIONS = {
  tts: { title: 'How your agent sounds', sub: 'Its voice, language and speed.', Icon: Volume2Icon, knobs: 'Speaking', saved: 'a speaking voice' },
  stt: { title: 'How your agent hears', sub: 'The language people speak to it, and words it must never mishear.', Icon: EarIcon, knobs: 'Listening', saved: 'a listening setup' },
} as const

function VoiceTab() {
  const acct = Route.useLoaderData()
  const { flowId } = Route.useParams()
  const voices = acct.ok ? acct.data.voices : []
  const audioKeys = [...knobsIn('Listening'), ...knobsIn('Speaking')].map((k) => k.key) as (keyof FlowDoc)[]
  const { draft, set, setDraft, dirty, commit, reset, status } = useDraft(['stt', 'tts', 'stt_ref', 'tts_ref', ...audioKeys])
  const values = draft as Record<string, unknown>
  const [noSaved, setNoSaved] = useState<'stt' | 'tts' | null>(null)

  // The agent speaks one language and listens for another: callers would not be understood.
  const speaks = languagesOf(draft.tts as FlowDoc['tts'])
  const hears = languagesOf(draft.stt as FlowDoc['stt'])
  const mismatch = speaks.length > 0 && hears.length > 0 && !speaks.some((l) => hears.includes(l))

  const settings = { stt: draft.stt, tts: draft.tts, stt_ref: draft.stt_ref, tts_ref: draft.tts_ref, ...Object.fromEntries(audioKeys.map((k) => [k, values[k]])) }

  return (
    <div className="db-page db-bigform db-voicepage">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Voice</h1>
          <p className="db-sub">How your agent sounds and hears.</p>
        </div>
        <div className="db-pagehead-side">
          <Link to="/dashboard/flows/$flowId/test" params={{ flowId }} className="db-btn db-btn-icon">Try it in Test</Link>
          <CopySettingsMenu settings={settings} />
        </div>
      </header>

      {(['tts', 'stt'] as const).map((kind) => {
        const sec = SECTIONS[kind]
        const refKey = `${kind}_ref` as const
        const ref = draft[refKey] as string | null
        const presets = voices.filter((v) => v.kind === kind)
        const preset = presets.find((p) => p.id === ref)
        const config = draft[kind] as FlowDoc['stt']
        const useSaved = () => {
          // Never a greyed-out choice: with nothing saved yet, say where to save one.
          if (!presets.length) return setNoSaved(kind)
          setDraft((d) => ({ ...d, [refKey]: ref ?? presets[0].id, [kind]: (preset ?? presets[0]).config }))
        }
        return (
          <section key={kind} className="db-voicesec">
            <div className="db-voicesec-head">
              <span className="db-voicesec-icon"><sec.Icon size={24} /></span>
              <div className="db-voicesec-title">
                <h2 className="db-h2">{sec.title}</h2>
                <span>{sec.sub}</span>
              </div>
              <div className="db-voicesec-actions db-btngroup" role="radiogroup" aria-label={`${sec.title}: own or saved`}>
                <button type="button" role="radio" className={`db-gbtn${!ref ? ' is-sel' : ''}`} aria-checked={!ref} onClick={() => { set(refKey, null); setNoSaved(null) }}>Set here</button>
                <button type="button" role="radio" className={`db-gbtn${ref ? ' is-sel' : ''}`} aria-checked={!!ref} onClick={useSaved}>Use a saved one</button>
              </div>
            </div>

            {noSaved === kind && !ref && (
              <Notice>No saved {sec.saved} yet. Save one on the <Link to="/dashboard/voices">Voices</Link> page to reuse it across flows.</Notice>
            )}

            {ref ? (
              <div className="db-presets">
                {presets.map((p: VoicePreset) => (
                  <button key={p.id} className={`db-tpl${p.id === ref ? ' is-on' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, [refKey]: p.id, [kind]: p.config }))}>
                    <b>{p.name}</b><span>{describe(p.config)}</span>
                  </button>
                ))}
                {preset && <p className="db-fhelp">Change “{preset.name}” on the <Link to="/dashboard/voices">Voices</Link> page. Every flow using it updates.</p>}
              </div>
            ) : (
              <ProviderEditor kind={kind} value={config} onChange={(v) => set(kind, v)} />
            )}

            {kind === 'stt' && mismatch && (
              <Notice kind="err">
                Your agent speaks {speaks.join(', ').toUpperCase()} but listens for {hears.join(', ').toUpperCase()}. Add the speaking language here, or callers who answer in it won’t be understood.
              </Notice>
            )}

            <div className="db-voicesec-audio">
              <KnobList knobs={knobsIn(sec.knobs)} values={values} onChange={(k, v) => set(k as keyof FlowDoc, v as never)} />
            </div>
          </section>
        )
      })}
      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}


