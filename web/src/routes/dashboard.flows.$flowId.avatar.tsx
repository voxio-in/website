import { Link, createFileRoute } from '@tanstack/react-router'

import { CopyJson, Dropdown, Label } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { KnobList } from '#/components/dashboard/KnobInput'
import { SaveBar, useDraft } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import { knobsIn } from '#/lib/dashboard/knobs'
import type { Account, FlowDoc } from '#/lib/dashboard/types'
import { getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/$flowId/avatar')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: AvatarTab,
})

function AvatarTab() {
  const acct = Route.useLoaderData()
  const avatars = acct.ok ? acct.data.avatars : []
  const lipKeys = knobsIn('Avatar').map((k) => k.key) as (keyof FlowDoc)[]
  const { draft, set, dirty, commit, reset, status } = useDraft(['faces', ...lipKeys])
  const faces: FlowDoc['faces'] = (draft.faces as FlowDoc['faces'] | undefined) ?? { expressions: [], transitions: [] }
  const setFaces = (f: Partial<FlowDoc['faces']>) => set('faces', { ...faces, ...f })
  const faceOpts = avatars.map((a) => ({ value: a.uuid, label: a.label, hint: a.uuid.slice(0, 8) }))
  const labels = faces.expressions.map((e) => e.label).filter(Boolean).map((l) => ({ value: l, label: l }))

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Avatar</h1>
          <p className="db-sub">The face your agent shows on video calls.</p>
        </div>
      </header>

      <ol className="db-steps">
        <li><span>1</span><div><b>Choose a face</b><p>Upload one on the <Link to="/dashboard/avatars" className="db-textlink">Avatars</Link> page.</p></div></li>
        <li><span>2</span><div><b>Add looks</b><p>Optional — like “happy” or “listening”.</p></div></li>
        <li><span>3</span><div><b>That’s it</b><p>Your agent switches looks as the call goes.</p></div></li>
      </ol>

      <section className="db-setcard">
        <div className="db-setcard-head">
          <h2 className="db-h2"><Label info="Different looks for the same face. The first one is used unless your workflow asks for another.">Looks</Label></h2>
          <CopyJson value={faces} />
        </div>
        {!faces.expressions.length && <p className="db-muted">No face yet — video calls are voice only until you add one.</p>}
        <div className="db-exprs">
          {faces.expressions.map((e, i) => {
            const upd = (patch: Partial<typeof e>) => setFaces({ expressions: faces.expressions.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
            return (
              <div className="db-expr" key={i}>
                <span className="db-expr-face">{(e.label || '?').slice(0, 1).toUpperCase()}</span>
                <div className="db-expr-fields">
                  <Dropdown value={e.uuid} options={faceOpts.some((o) => o.value === e.uuid) ? faceOpts : [{ value: e.uuid, label: e.uuid.slice(0, 8) }, ...faceOpts]} onChange={(uuid) => upd({ uuid })} aria-label="Face" />
                  <input className="db-in" placeholder="Name, e.g. happy" value={e.label} onChange={(ev) => upd({ label: ev.target.value })} />
                  <input className="db-in" placeholder="When to use it" value={e.usage ?? ''} onChange={(ev) => upd({ usage: ev.target.value })} />
                </div>
                {i === 0 && <span className="db-chip">Default</span>}
                <button className="db-iconbtn is-danger" aria-label="Remove" onClick={() => setFaces({ expressions: faces.expressions.filter((_, j) => j !== i) })}><Icon name="trash" size={17} /></button>
              </div>
            )
          })}
        </div>
        <button className="db-add" disabled={!avatars.length}
          onClick={() => setFaces({ expressions: [...faces.expressions, { uuid: avatars[0].uuid, label: faces.expressions.length ? '' : 'main', usage: '' }] })}>
          + Add a look
        </button>
      </section>

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2"><Label info="Optional. A short clip that plays when changing from one look to another, so it doesn’t jump.">Smooth changes</Label></h2></div>
        <div className="db-exprs">
          {faces.transitions.map((t, i) => {
            const upd = (patch: Partial<typeof t>) => setFaces({ transitions: faces.transitions.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
            return (
              <div className="db-expr db-trans" key={i}>
                <Dropdown value={t.from} options={labels} onChange={(from) => upd({ from })} aria-label="From" />
                <Icon name="back" size={18} className="db-flip db-muted" />
                <Dropdown value={t.to} options={labels} onChange={(to) => upd({ to })} aria-label="To" />
                <Dropdown value={t.uuid} options={faceOpts} onChange={(uuid) => upd({ uuid, label: avatars.find((a) => a.uuid === uuid)?.label ?? '' })} aria-label="Clip" />
                <button className="db-iconbtn is-danger" aria-label="Remove" onClick={() => setFaces({ transitions: faces.transitions.filter((_, j) => j !== i) })}><Icon name="trash" size={17} /></button>
              </div>
            )
          })}
        </div>
        <button className="db-add" disabled={faces.expressions.length < 2 || !avatars.length}
          onClick={() => setFaces({ transitions: [...faces.transitions, { from: faces.expressions[0].label, to: faces.expressions[1].label, uuid: avatars[0].uuid, label: avatars[0].label }] })}>
          + Add a smooth change
        </button>
      </section>

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2"><Label info="How the lips follow your agent’s voice.">Lip-sync</Label></h2></div>
        <KnobList knobs={knobsIn('Avatar')} values={draft as Record<string, unknown>} onChange={(k, v) => set(k as keyof FlowDoc, v as never)} />
      </section>

      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}
