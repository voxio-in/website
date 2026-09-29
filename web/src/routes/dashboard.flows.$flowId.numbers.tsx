import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { Dropdown, Label } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { Notice, useFlow } from '#/components/dashboard/ui'
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
              <button className="db-btn db-primary" disabled={!pick} onClick={() => change(pick, true)}>Attach</button>
            </div>
          </div>
        )}
        <p className="db-fhelp db-getnumber"><Icon name="phone" size={15} /> Need a number? Ask the Voxio team and it’ll appear here.</p>
      </section>

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2">Place a call</h2></div>
        <div className="db-knobs">
          <div className="db-knob-row">
            <Label>Call</Label>
            <div className="db-knob-ctl"><input className="db-in" placeholder="+91 98xxxx xxxx" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="db-knob-row">
            <Label info="The number the person sees.">From</Label>
            <div className="db-knob-ctl">
              <Dropdown value={from} onChange={setFrom} aria-label="From"
                options={[{ value: '', label: 'Default number' }, ...mine.map((n) => ({ value: n.phone_number, label: n.phone_number }))]} />
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
          <button className="db-btn db-primary db-btn-icon" disabled={busy || !to || (later && !when)} onClick={call}>
            <Icon name="phone" size={17} />{busy ? 'Calling…' : later ? 'Schedule call' : 'Call now'}
          </button>
        </div>
      </section>
    </div>
  )
}
