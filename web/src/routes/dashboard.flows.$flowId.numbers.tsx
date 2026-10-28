import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { Dropdown, Label } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { Notice, useFlow } from '#/components/dashboard/ui'
import { DEFAULT_XML } from '#/lib/dashboard/callXml'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { OwnedNumber } from '#/lib/dashboard/types'
import { getNumbers, placeCall, setFlowNumber } from '#/server/dashboard/api'

type Owned = OwnedNumber & { flow: { key: string; name: string } | null }

export const Route = createFileRoute('/dashboard/flows/$flowId/numbers')({
  staleTime: 10_000,
  pendingMs: 800,
  loader: async () => unwire<Owned[]>(await getNumbers()),
  component: Numbers,
})

const TZS = ['IST', 'UTC', 'GMT', 'EST', 'PST', 'CST', 'MST', 'SGT', 'JST', 'CET', 'AEST'].map((t) => ({ value: t, label: t }))

/** `2026-10-01T14:30` + IST → `01102026 1430 IST`, the format calls are scheduled with. */
function toCallTime(local: string, tz: string) {
  const [d, t] = local.split('T')
  const [y, m, day] = d.split('-')
  return `${day}${m}${y} ${t.replace(':', '')} ${tz}`
}


/** Null when it parses as XML, else the parser's complaint. */
function xmlError(text: string): string | null {
  if (!text.trim()) return null
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const err = doc.querySelector('parsererror')
  return err ? (err.textContent ?? 'Not valid XML.').split(/\r?\n/)[0] : null
}

function CallXml() {
  const { flow, save } = useFlow()
  const saved = String(flow.xml ?? '')
  const [text, setText] = useState(saved || DEFAULT_XML)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const bad = xmlError(text)
  const dirty = text.trim() !== saved.trim()

  const store = async (value: string) => {
    setBusy(true)
    const err = await save({ xml: value }).then(() => null, (e: Error) => e.message)
    setBusy(false)
    setMsg(err ? { kind: 'err', text: err } : { kind: 'ok', text: 'Saved. The next call to this flow’s numbers uses it.' })
  }

  return (
    <section className="db-setcard">
      <div className="db-setcard-head">
        <div>
          <h2 className="db-h2">Call XML</h2>
          <p className="db-setcard-sub">What the carrier is told to do when a call to this flow’s numbers connects: record it, and stream audio to the agent. </p>
        </div>
      </div>
      {!saved && <Notice kind="err">This flow has no call XML saved, so calls to its numbers fail. Check the XML below and save it.</Notice>}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <textarea className="db-in db-mono db-xml" rows={22} spellCheck={false} value={text} onChange={(e) => { setText(e.target.value); setMsg(null) }} aria-label="Call XML" />
      {bad && <p className="db-xml-err">{bad}</p>}
      <div className="db-setcard-foot">
        {text.trim() !== DEFAULT_XML && <button className="db-btn" disabled={busy} onClick={() => { setText(DEFAULT_XML); setMsg(null) }}>Start from the default</button>}
        {saved && dirty && <button className="db-btn" disabled={busy} onClick={() => { setText(saved); setMsg(null) }}>Discard changes</button>}
        <button className="db-btn db-primary" disabled={busy || !!bad || !dirty || !text.trim()} onClick={() => store(text.trim())}>{busy ? 'Saving…' : 'Save XML'}</button>
      </div>
    </section>
  )
}

function Numbers() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const { flow, reload } = useFlow()
  const owned = res.ok ? res.data : []
  const mine = owned.filter((n) => n.flow?.key === flow.key)
  const others = owned.filter((n) => n.flow?.key !== flow.key)
  const [pick, setPick] = useState('')
  const [to, setTo] = useState('')
  const [from, setFrom] = useState('')
  const [later, setLater] = useState(false)
  const [when, setWhen] = useState('')
  const [tz, setTz] = useState('IST')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const change = async (number: string, attach: boolean) => {
    const r = unwire(await setFlowNumber({ data: { key: flow.key, number, attach } }))
    if (!r.ok) return setMsg({ kind: 'err', text: r.reason })
    setPick('')
    setMsg({ kind: 'ok', text: attach ? `${number} now answers with this flow.` : `${number} detached.` })
    await Promise.all([router.invalidate(), reload()])
  }

  const call = async () => {
    setBusy(true)
    const r = unwire<string>(await placeCall({ data: { key: flow.key, to, from, when: later && when ? toCallTime(when, tz) : undefined } }))
    setBusy(false)
    setMsg(r.ok ? { kind: 'ok', text: r.note ?? 'Calling…' } : { kind: 'err', text: r.reason })
    if (r.ok) reload()
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Numbers & calls</h1>
          <p className="db-sub">The phone numbers this flow answers, and calls it can make.</p>
        </div>
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2">Phone numbers</h2></div>
        {mine.length ? (
          <div className="db-numlist">
            {mine.map((n) => (
              <div key={n.phone_number} className="db-numrow">
                <span className="db-numicon"><Icon name="phone" size={18} /></span>
                <span className="db-numtext"><b>{n.phone_number}</b><span>Answering since {fmtDate(n.added_at)}</span></span>
                <button className="db-iconbtn is-danger" title="Detach from this flow" aria-label={`Detach ${n.phone_number}`} onClick={() => change(n.phone_number, false)}>
                  <Icon name="close" size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="db-muted">No number on this flow yet.</p>
        )}

        {others.length > 0 && (
          <div className="db-attach">
            <Label info="Moves the number here. If another flow was using it, that flow stops answering it.">Attach a number</Label>
            <div className="db-attach-row">
              <Dropdown value={pick} placeholder="Choose one of your numbers" onChange={setPick} aria-label="Your numbers"
                options={others.map((n) => ({ value: n.phone_number, label: n.phone_number, hint: n.flow ? `on ${n.flow.name}` : 'Free' }))} />
              <button className="db-btn" disabled={!pick} onClick={() => change(pick, true)}>Attach</button>
            </div>
          </div>
        )}
        {!owned.length && <p className="db-muted">Your account has no phone numbers yet.</p>}
        <p className="db-fhelp db-getnumber"><Icon name="phone" size={15} /> Numbers are provided by Voxio. Ask the Voxio team for one and it’ll appear here.</p>
      </section>

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2">Place a call</h2></div>
        <div className="db-knobs">
          <div className="db-knob-row">
            <Label>Call</Label>
            <div className="db-knob-ctl"><input className="db-in" placeholder="98xxx xxxxx" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="db-knob-row">
            <Label info="The number the person sees.">From</Label>
            <div className="db-knob-ctl">
              {mine.length
                ? <Dropdown value={from || mine[0].phone_number} onChange={setFrom} aria-label="From"
                    options={mine.map((n) => ({ value: n.phone_number, label: n.phone_number }))} />
                : <span className="db-muted">Attach a number above first. Calls go out from it.</span>}
            </div>
          </div>
          <div className="db-knob-row">
            <Label>When</Label>
            <div className="db-knob-ctl">
              <div className="db-pills">
                <button className={!later ? 'is-on' : ''} onClick={() => setLater(false)}>Now</button>
                <button className={later ? 'is-on' : ''} onClick={() => setLater(true)}>Schedule</button>
              </div>
            </div>
          </div>
          {later && (
            <div className="db-knob-row is-child">
              <Label>Time</Label>
              <div className="db-knob-ctl db-when">
                <input className="db-in" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                <Dropdown value={tz} options={TZS} onChange={setTz} aria-label="Time zone" />
              </div>
            </div>
          )}
        </div>
        <div className="db-setcard-foot">
          <button className="db-btn db-primary db-btn-icon" disabled={busy || !to || !mine.length || (later && !when)} onClick={call}>
            <Icon name="phone" size={17} />{busy ? 'Calling…' : later ? 'Schedule call' : 'Call now'}
          </button>
        </div>
      </section>

      <CallXml />
    </div>
  )
}
