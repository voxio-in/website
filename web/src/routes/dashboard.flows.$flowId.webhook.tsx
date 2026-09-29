import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Label } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { SaveBar, Toggle, useDraft } from '#/components/dashboard/ui'

export const Route = createFileRoute('/dashboard/flows/$flowId/webhook')({
  component: Webhook,
})

const EVENTS = [
  { key: 'session.started', label: 'Call started', info: 'When someone picks up or opens a web call.' },
  { key: 'session.turn', label: 'Every reply', info: 'After each thing the agent says, with anything your workflow outputs.' },
  { key: 'session.ended', label: 'Call ended', info: 'When a call finishes, with the full transcript.' },
  { key: 'call.no-answer', label: 'No answer', info: 'When an outbound call isn’t picked up.' },
]

const newSecret = () => `whsec_${Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('')}`
const mask = (s: string) => `${s.slice(0, 8)}${'•'.repeat(16)}${s.slice(-4)}`

function Webhook() {
  const { draft, set, dirty, commit, reset, status } = useDraft(['webhook-url', 'webhook-secret', 'webhook-events'])
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = (draft['webhook-url'] as string) ?? ''
  const secret = draft['webhook-secret'] as string | undefined
  const events = (draft['webhook-events'] as string[] | undefined) ?? EVENTS.map((e) => e.key)
  const validUrl = !url || /^https?:\/\/\S+\.\S+/.test(url)

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Webhook</h1>
          <p className="db-sub">Get notified on your server when things happen on this flow.</p>
        </div>
      </header>

      <section className="db-setcard">
        <div className="db-knobs">
          <div className="db-knob-row is-block">
            <Label info="We send a POST request with JSON to this address.">Endpoint URL</Label>
            <div className="db-knob-ctl">
              <label className={`db-urlfield${validUrl ? '' : ' is-bad'}`}>
                <Icon name="webhook" size={18} />
                <input placeholder="https://your-app.com/voxio/webhook" value={url} onChange={(e) => set('webhook-url', e.target.value)} />
              </label>
              {!validUrl && <span className="db-fhelp db-err-text">That doesn’t look like a web address.</span>}
            </div>
          </div>

          <div className="db-knob-row">
            <Label info="Check this signature on your server to be sure a request really came from Voxio.">Signing secret</Label>
            <div className="db-knob-ctl">
              {secret ? (
                <div className="db-keychip db-secretchip">
                  <code>{shown ? secret : mask(secret)}</code>
                  <button className="db-iconbtn" onClick={() => setShown(!shown)} title={shown ? 'Hide' : 'Reveal'} aria-label={shown ? 'Hide secret' : 'Reveal secret'}>
                    <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                  <button className="db-iconbtn" title="Copy" aria-label="Copy secret"
                    onClick={() => { navigator.clipboard?.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
                    <Icon name={copied ? 'check' : 'copy'} size={18} />
                  </button>
                  <button className="db-iconbtn" title="Make a new secret" aria-label="Make a new secret" onClick={() => set('webhook-secret', newSecret())}>
                    <Icon name="rotate" size={18} />
                  </button>
                </div>
              ) : (
                <button className="db-btn db-btn-icon" onClick={() => set('webhook-secret', newSecret())}><Icon name="bolt" size={16} />Create secret</button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2">Events</h2></div>
        <div className="db-knobs">
          {EVENTS.map((e) => (
            <div key={e.key} className="db-knob-row">
              <Label info={e.info}>{e.label}</Label>
              <div className="db-knob-ctl">
                <Toggle on={events.includes(e.key)} onChange={(on) => set('webhook-events', on ? [...events, e.key] : events.filter((x) => x !== e.key))} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}
