import { Link, createFileRoute } from '@tanstack/react-router'

import { CopyJson } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { KnobList } from '#/components/dashboard/KnobInput'
import ProviderEditor from '#/components/dashboard/ProviderEditor'
import { SaveBar, useDraft } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import { knobsIn } from '#/lib/dashboard/knobs'
import { describe } from '#/lib/dashboard/providers'
import type { Account, FlowDoc, VoicePreset } from '#/lib/dashboard/types'
import { getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/$flowId/voice')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: VoiceTab,
})

const SECTIONS = {
  stt: { title: 'Listening', sub: 'Speech to text — how your agent hears callers', icon: 'voice', knobs: 'Listening' },
  tts: { title: 'Speaking', sub: 'Text to speech — how your agent sounds', icon: 'bolt', knobs: 'Speaking' },
} as const

function VoiceTab() {
  const acct = Route.useLoaderData()
  const voices = acct.ok ? acct.data.voices : []
  const audioKeys = [...knobsIn('Listening'), ...knobsIn('Speaking')].map((k) => k.key) as (keyof FlowDoc)[]
  const { draft, set, setDraft, dirty, commit, reset, status } = useDraft(['stt', 'tts', 'stt_ref', 'tts_ref', ...audioKeys])
  const values = draft as Record<string, unknown>

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Voice</h1>
          <p className="db-sub">How your agent hears and speaks.</p>
        </div>
      </header>

      {(['stt', 'tts'] as const).map((kind) => {
        const sec = SECTIONS[kind]
        const refKey = `${kind}_ref` as const
        const ref = draft[refKey] as string | null
        const presets = voices.filter((v) => v.kind === kind)
        const preset = presets.find((p) => p.id === ref)
        const config = draft[kind] as FlowDoc['stt']
        return (
          <section key={kind} className={`db-voicesec is-${kind}`}>
            <div className="db-voicesec-head">
              <span className="db-voicesec-icon"><Icon name={sec.icon} size={22} /></span>
              <div className="db-voicesec-title">
                <h2 className="db-h2">{sec.title}</h2>
                <span>{sec.sub}</span>
              </div>
              <div className="db-voicesec-actions">
                <div className="db-pills">
                  <button className={!ref ? 'is-on' : ''} onClick={() => set(refKey, null)}>This flow only</button>
                  <button className={ref ? 'is-on' : ''} disabled={!presets.length}
                    onClick={() => presets[0] && setDraft((d) => ({ ...d, [refKey]: ref ?? presets[0].id, [kind]: (preset ?? presets[0]).config }))}>
                    Shared voice
                  </button>
                </div>
                <CopyJson value={config} label="Copy config" />
              </div>
            </div>

            {ref ? (
              <div className="db-presets">
                {presets.map((p: VoicePreset) => (
                  <button key={p.id} className={`db-tpl${p.id === ref ? ' is-on' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, [refKey]: p.id, [kind]: p.config }))}>
                    <b>{p.name}</b><span>{describe(p.config)}</span>
                  </button>
                ))}
                {preset && <p className="db-fhelp">Change “{preset.name}” on the <Link to="/dashboard/voices">Voices</Link> page — every flow using it updates.</p>}
              </div>
            ) : (
              <ProviderEditor kind={kind} value={config} onChange={(v) => set(kind, v)} />
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
