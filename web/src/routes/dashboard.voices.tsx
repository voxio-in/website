import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { CopyJson } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import ProviderEditor from '#/components/dashboard/ProviderEditor'
import { Dialog, Notice, rowLink } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import { STT_PROVIDERS, TTS_PROVIDERS, describe } from '#/lib/dashboard/providers'
import type { Account, VoicePreset } from '#/lib/dashboard/types'
import { accountOp, getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/voices')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: Voices,
})

const blank = (kind: 'stt' | 'tts'): VoicePreset => {
  const p = (kind === 'stt' ? STT_PROVIDERS : TTS_PROVIDERS)[0]
  return { id: '', name: '', kind, config: { service: p.service, ...p.defaults }, used_by: [] }
}

// Ready-made setups offered when a section is empty; picking one opens it in the editor.
const EXAMPLES: Record<'stt' | 'tts', { name: string; blurb: string; config: VoicePreset['config'] }[]> = {
  tts: [
    { name: 'Simran (Hinglish)', blurb: 'Warm Indian English and Hindi', config: { service: 'sarvam', speaker: 'simran', language: 'en-IN' } },
    { name: 'Thalia (US English)', blurb: 'Clear, friendly American voice', config: { service: 'deepgram', model: 'aura-2-thalia-en' } },
  ],
  stt: [
    { name: 'Nova-3 Indian English', blurb: 'Fast, tuned for Indian accents', config: { service: 'deepgram-streaming', model: 'nova-3', language: 'en-IN' } },
    { name: 'Soniox Hindi + English', blurb: 'Understands callers switching languages', config: { service: 'soniox', language: ['hi', 'en'] } },
  ],
}

const SECTIONS = [
  { kind: 'tts' as const, title: 'Speaking voices', sub: 'How your agents sound', icon: 'bolt' as const, add: 'New speaking voice' },
  { kind: 'stt' as const, title: 'Listening', sub: 'How your agents understand callers', icon: 'voice' as const, add: 'New listening setup' },
]

function Voices() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const [edit, setEdit] = useState<VoicePreset | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const voices = res.ok ? res.data.voices : []

  const run = async (op: object) => {
    const r = unwire(await accountOp({ data: { op: JSON.stringify(op) } }))
    if (!r.ok) { setErr(r.reason); return false }
    setErr(null)
    await router.invalidate()
    return true
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Voices</h1>
          <p className="db-sub">Set a voice up once and use it in any flow. Changing it updates every flow that uses it.</p>
        </div>
      </header>
      {err && <Notice kind="err">{err}</Notice>}

      {SECTIONS.map((sec) => {
        const list = voices.filter((v) => v.kind === sec.kind)
        return (
          <section key={sec.kind} className={`db-voicesec is-${sec.kind}`}>
            <div className="db-voicesec-head">
              <span className="db-voicesec-icon"><Icon name={sec.icon} size={22} /></span>
              <div className="db-voicesec-title">
                <h2 className="db-h2">{sec.title}</h2>
                <span>{sec.sub}</span>
              </div>
              <div className="db-voicesec-actions">
                <button className="db-btn db-primary db-btn-icon" onClick={() => setEdit(blank(sec.kind))}><Icon name="plus" size={17} />{sec.add}</button>
              </div>
            </div>
            {!list.length ? (
              <div className="db-emptystate is-compact">
                <b>{sec.kind === 'tts' ? 'No speaking voices yet' : 'No listening setups yet'}</b>
                <span>Start from one of these, or make your own with the button above.</span>
                <div className="db-examples">
                  {EXAMPLES[sec.kind].map((ex) => (
                    <button key={ex.name} className="db-example" onClick={() => setEdit({ ...blank(sec.kind), name: ex.name, config: structuredClone(ex.config) })}>
                      <span className="db-example-icon"><Icon name={sec.icon} size={18} /></span>
                      <span><b>{ex.name}</b><small>{ex.blurb}</small></span>
                      <Icon name="plus" size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="db-voicegrid">
                {list.map((v) => (
                  <div key={v.id} className="db-voicecard" {...rowLink(() => setEdit(structuredClone(v)))}>
                    <div className="db-voicecard-top">
                      <b>{v.name}</b>
                      <span className="db-chip">{v.used_by.length ? `${v.used_by.length} flow${v.used_by.length > 1 ? 's' : ''}` : 'Not used'}</span>
                    </div>
                    <span className="db-muted">{describe(v.config)}</span>
                    <div className="db-voicecard-actions">
                      <CopyJson value={v.config} label="Copy config" />
                      <button className="db-iconbtn" aria-label="Edit" title="Edit" onClick={() => setEdit(structuredClone(v))}><Icon name="edit" size={17} /></button>
                      <button className="db-iconbtn is-danger" aria-label="Delete" title={v.used_by.length ? 'In use by a flow' : 'Delete'} disabled={v.used_by.length > 0}
                        onClick={() => run({ op: 'voice.delete', id: v.id })}><Icon name="trash" size={17} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      {edit && (
        <Dialog wide title={edit.id ? edit.name || 'Edit voice' : edit.kind === 'tts' ? 'New speaking voice' : 'New listening setup'}
          sub={edit.used_by.length ? `Used by ${edit.used_by.length} flow${edit.used_by.length > 1 ? 's' : ''} — saving updates all of them.` : undefined}
          onClose={() => setEdit(null)}>
          <label className="db-field">
            <span className="db-flabel">Name</span>
            <input className="db-in db-in-lg" autoFocus placeholder={edit.kind === 'tts' ? 'e.g. Simran, warm Hinglish' : 'e.g. Hindi + English'} value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </label>
          <ProviderEditor kind={edit.kind} value={edit.config} onChange={(config) => setEdit({ ...edit, config })} />
          <div className="db-dialog-foot">
            <CopyJson value={edit.config} label="Copy config" />
            <span style={{ flex: 1 }} />
            <button className="db-btn" onClick={() => setEdit(null)}>Cancel</button>
            <button className="db-btn db-primary" disabled={!edit.name.trim()} onClick={async () => { if (await run({ op: 'voice.save', voice: edit })) setEdit(null) }}>Save voice</button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
