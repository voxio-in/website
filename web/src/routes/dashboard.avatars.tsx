import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { EllipsisIcon } from 'lucide-react'
import { useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'

import Icon, { type IconName } from '#/components/dashboard/Icon'
import { Dialog, Notice } from '#/components/dashboard/ui'
import { undoToast } from '#/components/ui/halo-toast'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { Avatar } from '#/lib/dashboard/types'
import { FaceMedia } from '#/components/dashboard/kit/FaceMedia'
import { FaceUpload } from '#/components/dashboard/kit/FaceUpload'
import { SegmentTabs } from '#/components/dashboard/kit/SegmentTabs'
import { VideoPlayer } from '#/components/dashboard/kit/VideoPlayer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/base-ui/popover'
import { getFaceLibrary, type FaceLibrary } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/avatars')({
  staleTime: 30_000,
  pendingMs: 800,
  // Faces and the flows that use them, in two small queries; not the whole account.
  loader: async () => unwire<FaceLibrary>(await getFaceLibrary({ data: { scope: 'all' } })),
  component: Avatars,
})

const TIPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'voice', title: 'Stay silent', text: 'Keep your mouth gently closed and don’t talk. We make the lips move.' },
  { icon: 'eye', title: 'Look at the camera', text: 'Face straight on, with your head and shoulders in view.' },
  { icon: 'bolt', title: 'Good, even light', text: 'Light on your face and a background that doesn’t move.' },
  { icon: 'calendar', title: '10–20 seconds', text: 'Blink and move a little, naturally. Stillness looks robotic.' },
]

const SCOPES = [{ value: 'mine', label: 'Mine' }, { value: 'all', label: 'Everyone’s' }] as const
// Past this many faces a search helps; below it, it's clutter.
const SEARCH_FROM = 8

type Group = { key: string | null; name: string; faces: Avatar[] }

/** Faces grouped by the flow that uses them (by name), then the ones no flow uses. */
function groupFaces(faces: Avatar[]): Group[] {
  const byFlow = new Map<string, Group>()
  const unused: Avatar[] = []
  for (const a of faces) {
    if (!a.usedBy?.length) { unused.push(a); continue }
    for (const f of a.usedBy) {
      const g = byFlow.get(f.key) ?? { key: f.key, name: f.name, faces: [] }
      g.faces.push(a)
      byFlow.set(f.key, g)
    }
  }
  const groups = [...byFlow.values()].sort((a, b) => a.name.localeCompare(b.name))
  return unused.length ? [...groups, { key: null, name: 'Not used yet', faces: unused }] : groups
}

/**
 * Avatars (mindsets/voxio-users.md, Avatars): with no faces the upload is the page;
 * after that the faces come first, grouped by the flow that uses them.
 */
function Avatars() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const all = res.ok ? res.data.avatars : []
  const admin = res.ok && res.data.admin
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [playing, setPlaying] = useState<Avatar | null>(null)
  const [confirm, setConfirm] = useState<Avatar | null>(null)

  // Delete with Undo: the face disappears at once and the backend delete runs when the toast closes.
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [gone, setGone] = useState<Set<string>>(new Set())
  const unhide = (uuid: string) => setGone((g) => { const n = new Set(g); n.delete(uuid); return n })
  const del = async (a: Avatar, force: boolean) => {
    setDeleting((d) => new Set(d).add(a.uuid))
    try {
      const r = (await (await fetch(`/api/faces?uuid=${encodeURIComponent(a.uuid)}${force ? '&force=1' : ''}`, { method: 'DELETE' })).json()) as { ok: boolean; reason?: string }
      if (!r.ok) { unhide(a.uuid); setMsg({ kind: 'err', text: r.reason ?? 'The face couldn’t be deleted. Try again.' }) }
      else void router.invalidate()
    } catch {
      unhide(a.uuid)
      setMsg({ kind: 'err', text: 'The delete didn’t reach the server. Check your connection, then try again.' })
    }
    setDeleting((d) => { const n = new Set(d); n.delete(a.uuid); return n })
  }
  const remove = (a: Avatar, force = false) => {
    if (deleting.has(a.uuid) || gone.has(a.uuid)) return
    // A face a flow uses is never deleted without saying which flows lose it.
    if (a.usedBy?.length && !force) return setConfirm(a)
    setMsg(null)
    setGone((g) => new Set(g).add(a.uuid))
    undoToast(`Deleted “${a.label || 'Face'}”`, { undo: () => unhide(a.uuid), commit: () => del(a, force) })
  }

  const mine = all.filter((a) => !a.owner)
  const inScope = (scope === 'all' ? all : mine).filter((a) => !gone.has(a.uuid))
  const needle = q.trim().toLowerCase()
  const shown = needle ? inScope.filter((a) => `${a.label} ${(a.usedBy ?? []).map((f) => f.name).join(' ')}`.toLowerCase().includes(needle)) : inScope
  const groups = groupFaces(shown)
  const empty = !mine.length && !(scope === 'all' && all.length)
  const showUpload = adding || empty

  return (
    <div className="db-page db-avatars">
      <header className="db-pagehead">
        <div><h1 className="db-h1">Avatars</h1></div>
        {!empty && (
          <div className="db-pagehead-side">
            {admin && <SegmentTabs label="Whose faces" value={scope} options={SCOPES} onChange={setScope} />}
            {!adding && (
              <button type="button" className="db-btn db-primary db-btn-icon db-btn-lg" onClick={() => { setMsg(null); setAdding(true) }}>
                <Icon name="plus" size={20} />Add a face
              </button>
            )}
          </div>
        )}
      </header>
      {!res.ok && <Notice kind="err">{res.reason}</Notice>}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {showUpload && (
        <section className="db-upload">
          <div className="db-upload-main">
            {empty && <p className="db-avatars-lead">Add a photo or short clip of a face. Any flow can then show it talking on video calls.</p>}
            <FaceUpload onCancel={() => setAdding(false)} onAdded={(added, _shots, close) => {
              if (added.length) {
                setMsg({ kind: 'ok', text: `${added.length === 1 ? `“${added[0].label}” is` : `${added.length} faces are`} added. Use ${added.length === 1 ? 'it' : 'them'} on a flow’s Avatar tab.` })
                void router.invalidate()
              }
              if (close) setAdding(false)
            }} />
          </div>
          <aside className="db-tips">
            <b className="db-tips-title">For the best result</b>
            {TIPS.map((t) => (
              <div key={t.title} className="db-advice">
                <span className="db-advice-icon"><Icon name={t.icon} size={18} /></span>
                <span><b>{t.title}</b><span>{t.text}</span></span>
              </div>
            ))}
          </aside>
        </section>
      )}

      {!empty && (
        <>
          {inScope.length > SEARCH_FROM && (
            <label className="db-tsearch db-avatars-search">
              <Icon name="search" size={18} />
              <input placeholder="Search by face or flow" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search faces" />
            </label>
          )}
          {!shown.length && <p className="db-muted db-avatars-none">{needle ? 'No faces match. Try another name.' : 'No faces here yet.'}</p>}
          {groups.map((g) => (
            <section key={g.key ?? 'unused'} className="db-facegroup" aria-label={g.name}>
              <h2 className="db-facegroup-title">
                {g.key ? (
                  <Link to="/dashboard/flows/$flowId/avatar" params={{ flowId: g.key }}>{g.name}<Icon name="back" size={18} className="db-flip" /></Link>
                ) : <span>{g.name}</span>}
                <span className="db-muted">{g.faces.length} face{g.faces.length === 1 ? '' : 's'}</span>
              </h2>
              <div className="db-facegrid">
                {g.faces.map((a) => (
                  <FaceCard key={a.uuid} a={a} here={g.key} busy={deleting.has(a.uuid)} onPlay={() => setPlaying(a)} onDelete={() => remove(a)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {playing && (
        <Dialog title={playing.label || 'Face'} onClose={() => setPlaying(null)} wide>
          <div className="db-lookplayer">
            {playing.previewType === 'image'
              ? <img src={playing.preview} alt={playing.label} />
              : playing.preview && <VideoPlayer src={playing.preview} name={playing.label} autoPlay loop />}
          </div>
        </Dialog>
      )}

      {confirm && (
        <Dialog title={`Delete “${confirm.label || 'Face'}”?`} onClose={() => setConfirm(null)}>
          <p className="db-confirm-text">
            {confirm.usedBy!.length === 1 ? 'This flow uses it:' : `These ${confirm.usedBy!.length} flows use it:`}
          </p>
          <ul className="db-confirm-list">
            {confirm.usedBy!.map((f) => <li key={f.key}><Link to="/dashboard/flows/$flowId/avatar" params={{ flowId: f.key }}>{f.name}</Link></li>)}
          </ul>
          <p className="db-confirm-text db-muted">Their video calls lose this face until you choose another on their Avatar tab.</p>
          <div className="db-dialog-split is-two">
            <button type="button" className="db-gbtn" onClick={() => setConfirm(null)}>Keep it</button>
            <button type="button" className="db-gbtn is-danger" onClick={() => { const a = confirm; setConfirm(null); remove(a, true) }}>
              <Icon name="trash" size={18} />Delete anyway
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

/** One face: click it to play; where it's used; Copy face ID and Delete behind ⋯. */
function FaceCard({ a, here, busy, onPlay, onDelete }: { a: Avatar; here: string | null; busy: boolean; onPlay: () => void; onDelete: () => void }) {
  const others = (a.usedBy ?? []).filter((f) => f.key !== here)
  return (
    <div className={`db-facecard${busy ? ' is-deleting' : ''}`} aria-busy={busy}>
      <button type="button" className="db-facecard-media" disabled={!a.preview} onClick={onPlay} aria-label={`Play ${a.label || 'face'}`}>
        {a.preview ? <FaceMedia src={a.preview} type={a.previewType} /> : <span>{(a.label || '?').slice(0, 1).toUpperCase()}</span>}
        {a.preview && <span className="db-lookrow-play" aria-hidden><Icon name="play" size={20} /></span>}
      </button>
      <div className="db-facecard-body">
        <b>{a.label || 'Unnamed'}</b>
        <span className="db-muted">
          {a.owner ? `${a.owner}’s · ` : ''}
          {others.length ? <>Also on {others.map((f, i) => (
            <span key={f.key}>{i ? ', ' : ''}<Link to="/dashboard/flows/$flowId/avatar" params={{ flowId: f.key }} className="db-textlink">{f.name}</Link></span>
          ))}</> : `Added ${fmtDate(a.created_at)}`}
        </span>
      </div>
      <div className="db-facecard-actions">
        {busy ? <ThinkingOrb state="working" size={20} /> : <FaceMenu a={a} onDelete={onDelete} />}
      </div>
    </div>
  )
}

function FaceMenu({ a, onDelete }: { a: Avatar; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // Open the menu inside the dashboard root so it keeps the dashboard's colours.
  const [root, setRoot] = useState<HTMLElement | null>(null)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span ref={(el) => setRoot((r) => r ?? (el?.closest<HTMLElement>('.db') ?? null))}>
        <PopoverTrigger asChild>
          <button type="button" className="db-iconbtn" aria-label={`More for ${a.label || 'face'}`} title="More">
            <EllipsisIcon size={20} />
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent align="end" sideOffset={6} className="db-menu" container={root}>
        <button type="button" className="db-menu-item" onClick={() => { void navigator.clipboard?.writeText(a.uuid); setCopied(true); setTimeout(() => { setCopied(false); setOpen(false) }, 900) }}>
          <Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy face ID'}
        </button>
        {a.owner ? (
          <span className="db-menu-item db-menu-note">Only {a.owner} can delete it</span>
        ) : (
          <button type="button" className="db-menu-item is-danger" onClick={() => { setOpen(false); onDelete() }}>
            <Icon name="trash" size={18} />{a.usedBy?.length ? 'Delete…' : 'Delete'}
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
