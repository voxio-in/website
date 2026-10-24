import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Maximize2, Star } from 'lucide-react'
import { useState } from 'react'
import type { ParticipantsGraph } from 'voxioagent/client'
import { facesOn, withFace } from '#/lib/dashboard/participants'

import { CopyJson, Dropdown, Label } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { Dialog, SaveBar, Toggle, useDraft } from '#/components/dashboard/ui'
import { unwire } from '#/lib/dashboard/client'
import type { Account, FlowDoc } from '#/lib/dashboard/types'
import { FaceMedia } from '#/components/dashboard/kit/FaceMedia'
import { FaceUpload } from '#/components/dashboard/kit/FaceUpload'
import { VideoPlayer } from '#/components/dashboard/kit/VideoPlayer'
import { getAvatars } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/flows/$flowId/avatar')({
  staleTime: 30_000,
  pendingMs: 800,
  // Only the faces: loading the whole account (every flow's sessions) made this page slow.
  loader: async () => unwire<Account['avatars']>(await getAvatars()),
  component: AvatarTab,
})

function AvatarTab() {
  const acct = Route.useLoaderData()
  const avatars = acct.ok ? acct.data : []
  const { draft, set, dirty, commit, reset, status } = useDraft(['faces', 'participants'])
  const graph = draft.participants as ParticipantsGraph | null | undefined
  const showFace = facesOn(graph)
  const faces: FlowDoc['faces'] = (draft.faces as FlowDoc['faces'] | undefined) ?? { expressions: [], transitions: [] }
  const setFaces = (f: Partial<FlowDoc['faces']>) => set('faces', { ...faces, ...f })
  const faceOpts = avatars.map((a) => ({ value: a.uuid, label: a.label, hint: a.uuid.slice(0, 8) }))
  const [adding, setAdding] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const router = useRouter()
  const addLooks = (looks: Look[]) => {
    if (!looks.length) return
    setFaces({ expressions: asDefault([...faces.expressions, ...looks], 0) })
    // A face was added, so show it on calls.
    if (!showFace) set('participants', withFace(graph, true))
  }
  // Previews of faces uploaded in this visit, by face ID.
  const [shots, setShots] = useState<Record<string, { src: string; type: 'image' | 'video' }>>({})
  // The look playing in the bigger view, and which face ID was just copied.
  const [playing, setPlaying] = useState<{ src: string; type: 'image' | 'video'; label: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const copyId = (uuid: string) => { void navigator.clipboard?.writeText(uuid); setCopied(uuid); setTimeout(() => setCopied((c) => (c === uuid ? null : c)), 1200) }
  const labels = faces.expressions.map((e) => e.label).filter(Boolean).map((l) => ({ value: l, label: l }))

  return (
    <div className="db-page db-avatarpage">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Avatar</h1>
        </div>
      </header>

      <section className="db-setcard db-facechoice">
        <span className="db-facechoice-icon"><Icon name="avatar" size={22} /></span>
        <div className="db-facechoice-text">
          <b>Show your agent’s face on calls</b>
          <span>{showFace
            ? faces.expressions.length ? 'People see your agent talking.' : 'Add a look below, or calls use a default face.'
            : 'Calls are voice only.'}</span>
        </div>
        <Toggle on={showFace} onChange={(v) => set('participants', withFace(graph, v))} label="Show your agent’s face on calls" />
      </section>

      <section className="db-setcard">
        <div className="db-setcard-head">
          <h2 className="db-h2"><Label info="Different looks for the same face. The first one is used unless your workflow asks for another.">Looks</Label></h2>
          <CopyJson value={faces} />
        </div>
        {!faces.expressions.length && !adding && (
          <div className="db-lookempty">
            <span className="db-lookempty-icon"><Icon name="avatar" size={26} /></span>
            <b>No face yet</b>
            <span>Video calls are voice only until you add a look.</span>
          </div>
        )}
        {faces.expressions.length > 0 && (
          <div className="db-exprs">
            {faces.expressions.map((e, i) => {
              const upd = (patch: Partial<typeof e>) => setFaces({ expressions: faces.expressions.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
              const saved = avatars.find((a) => a.uuid === e.uuid)
              const preview = shots[e.uuid] ?? (saved?.preview ? { src: saved.preview, type: saved.previewType } : null)
              return (
                <div className={`db-lookrow${i === 0 ? ' is-default' : ''}`} key={i}>
                  <button type="button" className="db-lookrow-thumb" disabled={!preview} aria-label={`Play ${e.label || 'look'}`}
                    onClick={() => preview && setPlaying({ ...preview, label: e.label || 'Look' })}>
                    {preview ? <FaceMedia src={preview.src} type={preview.type} /> : (e.label || '?').slice(0, 1).toUpperCase()}
                    {preview && <span className="db-lookrow-play" aria-hidden><Icon name="play" size={18} /></span>}
                  </button>
                  {/* One connected group: name, when to use it, face ID, then the actions. */}
                  <div className="db-btngroup db-lookgroup" role="group" aria-label={`Look ${i + 1}`}>
                    <label className="db-gfield" title={i === 0 ? 'The default look is always called main' : undefined}>
                      <span className="db-look-cap">Name</span>
                      <input className="db-in" placeholder="e.g. happy" value={e.label} readOnly={i === 0} onChange={(ev) => upd({ label: ev.target.value })} />
                    </label>
                    <label className="db-gfield is-wide">
                      <span className="db-look-cap">When to use it</span>
                      <input className="db-in" placeholder="e.g. when the caller agrees" value={e.usage ?? ''} onChange={(ev) => upd({ usage: ev.target.value })} />
                    </label>
                    <button type="button" className="db-gbtn db-gbtn-tall" title="Copy face ID" onClick={() => copyId(e.uuid)}>
                      <span className="db-gbtn-stack"><span className="db-look-cap">Face ID</span><code>{copied === e.uuid ? 'Copied' : `${e.uuid.slice(0, 8)}…`}</code></span>
                      <Icon name={copied === e.uuid ? 'check' : 'copy'} size={18} />
                    </button>
                    <button type="button" className={`db-gbtn db-gbtn-tall${i === 0 ? ' is-on' : ''}`} disabled={i === 0}
                      title={i === 0 ? 'Used unless the workflow asks for another' : 'Use this look unless the workflow asks for another'}
                      onClick={() => setFaces(makeDefault(faces, i))}>
                      {i === 0 ? <Icon name="check" size={18} /> : <Star size={18} />}{i === 0 ? 'Default' : 'Make default'}
                    </button>
                    <button type="button" className="db-gbtn db-gbtn-tall" disabled={!preview} aria-label="Play in a bigger view"
                      onClick={() => preview && setPlaying({ ...preview, label: e.label || 'Look' })}>
                      <Maximize2 size={18} />
                    </button>
                    <button type="button" className="db-gbtn db-gbtn-tall is-danger" aria-label="Remove look"
                      onClick={() => setFaces(removeLook(faces, i))}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {adding
          ? <FaceUpload looks first={!faces.expressions.length} onCancel={() => setAdding(false)} onAdded={(looks, shot, close) => {
              setShots((x) => ({ ...x, ...shot }))
              addLooks(looks)
              // Uploads also land in Avatars, so other flows can pick them.
              if (looks.length) void router.invalidate()
              if (close) setAdding(false)
            }} />
          : choosing
            ? <ChooseLooks avatars={avatars} used={new Set(faces.expressions.map((e) => e.uuid))} onCancel={() => setChoosing(false)}
                onChoose={(looks) => { addLooks(looks); setChoosing(false) }} />
            : (
              <div className="db-addrows db-addgroup" role="group" aria-label="Add looks">
                <button className="db-addrow" disabled={!avatars.length} onClick={() => setChoosing(true)}>
                  <Icon name="avatar" size={18} />
                  <span><b>Choose from your avatars</b><small>{avatars.length ? `Pick any of the ${avatars.length} faces in Avatars` : 'Nothing in Avatars yet'}</small></span>
                </button>
                <button className="db-addrow" onClick={() => setAdding(true)}>
                  <Icon name="plus" size={18} />
                  <span><b>Upload new looks</b><small>Photos or short clips; each file’s name becomes the look’s name. They’re also saved to Avatars.</small></span>
                </button>
              </div>
            )}
      </section>

      <section className="db-setcard">
        <div className="db-setcard-head"><h2 className="db-h2"><Label info="Optional. A short clip that plays when changing from one look to another, so it doesn’t jump.">Smooth changes</Label></h2></div>
        {faces.transitions.length > 0 && (
          <div className="db-exprs">
            {faces.transitions.map((t, i) => {
              const upd = (patch: Partial<typeof t>) => setFaces({ transitions: faces.transitions.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
              return (
                <div className="db-change" key={i}>
                  <div className="db-change-path">
                    <Dropdown value={t.from} options={labels} onChange={(from) => upd({ from })} aria-label="From" />
                    <span className="db-change-arrow" aria-hidden><Icon name="back" size={18} className="db-flip" /></span>
                    <Dropdown value={t.to} options={labels} onChange={(to) => upd({ to })} aria-label="To" />
                  </div>
                  <div className="db-change-clip">
                    <span className="db-look-cap">Clip</span>
                    <Dropdown value={t.uuid} options={faceOpts} onChange={(uuid) => upd({ uuid, label: avatars.find((a) => a.uuid === uuid)?.label ?? '' })} aria-label="Clip" />
                  </div>
                  <button className="db-iconbtn is-danger" aria-label="Remove" onClick={() => setFaces({ transitions: faces.transitions.filter((_, j) => j !== i) })}><Icon name="trash" size={17} /></button>
                </div>
              )
            })}
          </div>
        )}
        <button className="db-addrow" disabled={faces.expressions.length < 2}
          onClick={() => setFaces({ transitions: [...faces.transitions, { from: faces.expressions[0].label, to: faces.expressions[1].label, uuid: avatars[0]?.uuid ?? faces.expressions[0].uuid, label: avatars[0]?.label ?? '' }] })}>
          <Icon name="plus" size={18} />
          <span><b>Add a smooth change</b><small>{faces.expressions.length < 2 ? 'Needs at least two looks' : 'A clip that plays between two looks'}</small></span>
        </button>
      </section>

      {playing && (
        <Dialog title={playing.label} onClose={() => setPlaying(null)} wide>
          <div className="db-lookplayer">
            {playing.type === 'image'
              ? <img src={playing.src} alt={playing.label} />
              : <VideoPlayer src={playing.src} name={playing.label} autoPlay loop />}
          </div>
        </Dialog>
      )}

      <SaveBar dirty={dirty} status={status} onSave={commit} onReset={reset} />
    </div>
  )
}

type Look = FlowDoc['faces']['expressions'][number]

/** The default look is the first, and is always called "main": workflows ask for looks by name. */
const MAIN = 'main'

/** Put look `i` first as "main". The old main takes the name the new one had, so nothing else is renamed. */
function asDefault(looks: Look[], i: number): Look[] {
  if (!looks.length) return looks
  const pick = looks[i]
  const rest = looks.filter((_, j) => j !== i)
  const freed = pick.label && pick.label !== MAIN ? pick.label : ''
  return [{ ...pick, label: MAIN }, ...rest.map((l) => (l.label === MAIN ? { ...l, label: freed || 'normal' } : l))]
}

/** Remove look `i`. Removing the default makes the next look "main", and its smooth changes follow. */
function removeLook(faces: FlowDoc['faces'], i: number): FlowDoc['faces'] {
  const left = faces.expressions.filter((_, j) => j !== i)
  if (i !== 0 || !left.length) return { ...faces, expressions: left }
  const old = left[0].label
  const rename = (n: string) => (n === old ? MAIN : n)
  return { ...faces, expressions: asDefault(left, 0), transitions: faces.transitions.map((t) => ({ ...t, from: rename(t.from), to: rename(t.to) })) }
}

/** Make look `i` the default, renaming the smooth changes that pointed at the swapped names. */
function makeDefault(faces: FlowDoc['faces'], i: number): FlowDoc['faces'] {
  const old = faces.expressions[i].label
  const expressions = asDefault(faces.expressions, i)
  const swapped = expressions.find((l, j) => j > 0 && faces.expressions.some((o) => o.uuid === l.uuid && o.label === MAIN))?.label
  const rename = (n: string) => (n === old ? MAIN : n === MAIN && swapped ? swapped : n)
  return { ...faces, expressions, transitions: faces.transitions.map((t) => ({ ...t, from: rename(t.from), to: rename(t.to) })) }
}

/** Pick faces already in Avatars (uploaded there or on any flow) to use as looks here. */
function ChooseLooks({ avatars, used, onChoose, onCancel }: {
  avatars: Account['avatars']
  used: Set<string>
  onChoose: (looks: Look[]) => void
  onCancel: () => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [q, setQ] = useState('')
  const toggle = (uuid: string) => setPicked((p) => (p.includes(uuid) ? p.filter((x) => x !== uuid) : [...p, uuid]))
  const shown = avatars.filter((a) => a.label.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="db-addlook">
      <div className="db-choose-head">
        <input className="db-in" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search avatars" />
        <Link to="/dashboard/avatars" className="db-btn db-btn-sm">Manage avatars</Link>
      </div>
      <ul className="db-choosegrid">
        {shown.map((a) => {
          const on = picked.includes(a.uuid)
          const inUse = used.has(a.uuid)
          return (
            <li key={a.uuid}>
              <button className={`db-choosecard${on ? ' is-on' : ''}`} disabled={inUse} aria-pressed={on} onClick={() => toggle(a.uuid)}
                title={inUse ? 'Already a look on this flow' : a.label}>
                <span className="db-choosecard-thumb">
                  {a.preview ? <FaceMedia src={a.preview} type={a.previewType} /> : a.label.slice(0, 1).toUpperCase()}
                  {on && <span className="db-choosecard-tick"><Icon name="check" size={14} /></span>}
                </span>
                <span className="db-choosecard-name">{a.label}</span>
                {inUse && <small>In use</small>}
              </button>
            </li>
          )
        })}
        {!shown.length && <li className="db-muted">No avatars match.</li>}
      </ul>
      <div className="db-addlook-actions">
        <button className="db-btn db-primary db-btn-icon" disabled={!picked.length}
          onClick={() => onChoose(picked.map((uuid) => ({ uuid, label: avatars.find((a) => a.uuid === uuid)?.label ?? '', usage: '' })))}>
          <Icon name="plus" size={17} />{picked.length ? `Add ${picked.length === 1 ? '1 look' : `${picked.length} looks`}` : 'Pick one or more'}
        </button>
        <button className="db-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
