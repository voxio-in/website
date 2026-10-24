// The one face upload, used by the Avatars page and a flow's Avatar tab. Several
// photos or clips at once; each is named after its file and uploaded one at a time
// to /api/faces, with its own status. Face tracking sits under More options.

import { useEffect, useRef, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'

import { DropZone, Dropdown, Label } from '../controls'
import Icon from '../Icon'
import { Notice } from '../ui'
import { TRACKING } from '#/lib/dashboard/faces'
import type { FlowDoc } from '#/lib/dashboard/types'

export type Look = FlowDoc['faces']['expressions'][number]
export type Shot = { src: string; type: 'image' | 'video' }

/** A looping preview clip that stops while uploads run. */
function Clip({ src, playing }: { src: string; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (playing) void v.play().catch(() => {})
    else v.pause()
  }, [playing])
  return <video ref={ref} src={src} autoPlay muted loop playsInline />
}

/** A face's name from its file: "back_pain.mp4" → "back_pain". */
const nameOf = (file: File) => file.name.replace(/\.[^.]+$/, '').trim().replace(/\s+/g, '_')

type Pick = { file: File; src: string; label: string; usage: string; state?: 'busy' | 'done' | 'error'; note?: string }

/** Upload one file; the reason comes back in words, a dropped connection included. */
async function sendFace(p: Pick, detector: string): Promise<string> {
  const body = new FormData()
  body.set('file', p.file)
  body.set('label', p.label.trim())
  body.set('detector', detector)
  let r: { ok: boolean; reason?: string; data?: { uuid: string } }
  try {
    r = await (await fetch('/api/faces', { method: 'POST', body })).json()
  } catch {
    throw new Error('The upload didn’t reach the server. Check your connection, then try again.')
  }
  if (!r.ok || !r.data) throw new Error(r.reason ?? 'The face couldn’t be added. Try again.')
  return r.data.uuid
}

/**
 * Upload photos or clips of a face. `looks`: on a flow, each also gets "When to use
 * it", and with no looks yet the file called "main" (or the first) becomes the default.
 */
export function FaceUpload({ looks, first, onAdded, onCancel }: {
  looks?: boolean
  first?: boolean
  onAdded: (looks: Look[], shots: Record<string, Shot>, close: boolean) => void
  onCancel: () => void
}) {
  const [picks, setPicks] = useState<Pick[]>([])
  const [detector, setDetector] = useState<'s3fd' | 'dwpose'>('s3fd')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // An upload takes minutes; leaving the page would lose it.
  useEffect(() => {
    if (!busy) return
    const stay = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', stay)
    return () => window.removeEventListener('beforeunload', stay)
  }, [busy])

  const take = (files: File[]) => {
    const add = files.map((file) => ({ file, src: URL.createObjectURL(file), label: nameOf(file), usage: '' }))
    setPicks((p) => {
      const all = [...p, ...add]
      if (!(looks && first)) return all
      // The file called "main" (or the first) is the default look, and the default is always called main.
      all.sort((a, b) => Number(b.label.toLowerCase() === 'main') - Number(a.label.toLowerCase() === 'main'))
      return all.map((p, i) => (i === 0 ? { ...p, label: 'main' } : p))
    })
  }
  const set = (i: number, patch: Partial<Pick>) => setPicks((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const drop = (i: number) => setPicks((ps) => { URL.revokeObjectURL(ps[i].src); return ps.filter((_, j) => j !== i) })

  const todo = picks.filter((p) => p.state !== 'done')
  const unnamed = todo.filter((p) => !p.label.trim()).length

  const upload = async () => {
    // Never greyed out: say what's missing instead.
    if (!todo.length) return setErr('Add a photo or clip first.')
    if (unnamed) return setErr(`Give ${unnamed === 1 ? 'the face' : `all ${unnamed} faces`} a name first.`)
    setBusy(true)
    setErr(null)
    const added: Look[] = []
    const shots: Record<string, Shot> = {}
    let failed = 0
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i]
      if (p.state === 'done') continue
      set(i, { state: 'busy', note: undefined })
      try {
        const uuid = await sendFace(p, detector)
        added.push({ uuid, label: p.label.trim(), usage: p.usage.trim() })
        shots[uuid] = { src: p.src, type: p.file.type.startsWith('image/') ? 'image' : 'video' }
        set(i, { state: 'done' })
      } catch (e) {
        failed++
        set(i, { state: 'error', note: (e as Error).message })
      }
    }
    setBusy(false)
    if (failed) setErr(`${failed} didn’t upload. Fix or remove ${failed === 1 ? 'it' : 'them'}, then try again.`)
    if (added.length || !failed) onAdded(added, shots, !failed)
  }

  const current = picks.find((p) => p.state === 'busy')
  const what = looks ? 'look' : 'face'
  const count = (n: number) => `${n} ${what}${n === 1 ? '' : 's'}`
  return (
    <div className="db-addlook">
      {err && <Notice kind="err">{err}</Notice>}
      {!busy && (
        <DropZone accept="video/*,image/*" multiple title={picks.length ? 'Add more photos or clips' : 'Drop photos or clips of the face'}
          hint={`JPG, PNG, MP4, MOV or WebM · one file per ${what} · the file name becomes its name`} onFiles={take} />
      )}
      {picks.length > 0 && (
        <ul className="db-looklist">
          {picks.map((p, i) => (
            <li key={p.src} className={`db-lookpick${looks ? '' : ' is-plain'}${p.state ? ` is-${p.state}` : ''}`}>
              <span className="db-lookpick-thumb">
                {p.file.type.startsWith('image/') ? <img src={p.src} alt="" /> : <Clip src={p.src} playing={!busy} />}
              </span>
              <label className="db-lookrow-field"><span className="db-look-cap">Name{looks && first && i === 0 && <span className="db-look-badge">Default</span>}</span>
                <input className="db-in" value={p.label} disabled={busy || p.state === 'done'} readOnly={looks && first && i === 0}
                  title={looks && first && i === 0 ? 'The default look is always called main' : undefined} placeholder="e.g. Margaret, happy" onChange={(e) => set(i, { label: e.target.value })} />
              </label>
              {looks && (
                <label className="db-lookrow-field"><span className="db-look-cap">When to use it</span>
                  <input className="db-in" value={p.usage} disabled={busy || p.state === 'done'} placeholder="e.g. when the caller agrees" onChange={(e) => set(i, { usage: e.target.value })} />
                </label>
              )}
              <span className="db-lookpick-state">
                {p.state === 'busy' ? <ThinkingOrb state="working" size={20} /> : p.state === 'done' ? <><Icon name="check" size={16} /> Added</> : p.state === 'error' ? p.note : (
                  <button className="db-iconbtn" disabled={busy} onClick={() => drop(i)} aria-label={`Remove ${p.label}`}><Icon name="close" size={18} /></button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {current && (
        <div className="db-lookpick-working" role="status">
          <ThinkingOrb state="working" size={32} />
          <span>Finding the face in <b>{current.label}</b>. This can take a few minutes per file; keep this page open.</span>
        </div>
      )}
      {picks.length > 0 && (
        <details className="db-addlook-more">
          <summary>More options</summary>
          <div className="db-field db-lookpick-track">
            <Label info="How we follow the face. Standard suits almost everyone.">Face tracking</Label>
            <Dropdown value={detector} options={TRACKING} onChange={(v) => setDetector(v as 's3fd' | 'dwpose')} aria-label="Face tracking" />
          </div>
        </details>
      )}
      <div className="db-addlook-actions">
        <button className="db-btn" disabled={busy} onClick={onCancel}>Cancel</button>
        {picks.length > 0 && (
          <button className="db-btn db-primary db-btn-icon" disabled={busy} aria-busy={busy} onClick={upload}>
            <Icon name="plus" size={18} />{busy ? 'Uploading…' : `Upload ${count(todo.length)}`}
          </button>
        )}
      </div>
    </div>
  )
}
