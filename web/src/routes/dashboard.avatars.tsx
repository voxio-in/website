import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { DropZone, Dropdown, Label } from '#/components/dashboard/controls'
import Icon, { type IconName } from '#/components/dashboard/Icon'
import { Notice } from '#/components/dashboard/ui'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { Account } from '#/lib/dashboard/types'
import { accountOp, getAccount } from '#/server/dashboard/api'

export const Route = createFileRoute('/dashboard/avatars')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account>(await getAccount()),
  component: Avatars,
})

const TIPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'voice', title: 'Stay silent', text: 'Keep your mouth gently closed and don’t talk. We make the lips move.' },
  { icon: 'eye', title: 'Look at the camera', text: 'Face straight on, with your head and shoulders in view.' },
  { icon: 'bolt', title: 'Good, even light', text: 'Light on your face and a background that doesn’t move.' },
  { icon: 'calendar', title: '10–20 seconds', text: 'Blink and move a little, naturally. Stillness looks robotic.' },
]

const TRACKING = [
  { value: 's3fd', label: 'Standard', hint: 'Recommended', info: 'Works with the default lip-sync. Choose this unless you’ve been told otherwise.' },
  { value: 'dwpose', label: 'Full pose', info: 'Only for flows set to the MuseTalk lip-sync.' },
]

function Avatars() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const avatars = res.ok ? res.data.avatars : []
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [detector, setDetector] = useState<'s3fd' | 'dwpose'>('s3fd')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const run = async (op: object, ok?: string) => {
    const r = unwire(await accountOp({ data: { op: JSON.stringify(op) } }))
    if (!r.ok) return setMsg({ kind: 'err', text: r.reason }), false
    setMsg(ok ? { kind: 'ok', text: ok } : null)
    await router.invalidate()
    return true
  }

  const save = async () => {
    setBusy(true)
    if (await run({ op: 'avatar.add', label: label.trim(), detector }, `“${label.trim()}” added. Use it on any flow’s Avatar tab.`)) {
      setFile(null)
      setLabel('')
    }
    setBusy(false)
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Avatars</h1>
          <p className="db-sub">A face for your agent on video calls. Upload a short video of a face and we’ll move its lips to match what your agent says.</p>
        </div>
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <section className="db-upload">
        <div className="db-upload-main">
          {!file ? (
            <DropZone accept="video/*,image/*" title="Drop a video of a face" hint="MP4, MOV or WebM · a photo also works" onFiles={(f) => setFile(f[0])} />
          ) : (
            <div className="db-upload-picked">
              <div className="db-upload-preview">
                {file.type.startsWith('image/') ? <img src={preview ?? ''} alt="" /> : <video src={preview ?? ''} autoPlay muted loop playsInline />}
                <button className="db-iconbtn db-upload-clear" onClick={() => setFile(null)} aria-label="Choose a different file"><Icon name="close" size={18} /></button>
              </div>
              <div className="db-upload-form">
                <span className="db-upload-file"><Icon name="avatar" size={16} />{file.name}</span>
                <label className="db-field">
                  <Label info="Use it to pick this face on a flow, e.g. “Priya – friendly”.">Name</Label>
                  <input className="db-in" autoFocus placeholder="e.g. Priya" value={label} onChange={(e) => setLabel(e.target.value)} />
                </label>
                <div className="db-field">
                  <Label info="How we follow the face in your video. Standard suits almost everyone.">Face tracking</Label>
                  <Dropdown value={detector} options={TRACKING} onChange={(v) => setDetector(v as 's3fd' | 'dwpose')} aria-label="Face tracking" />
                </div>
                <button className="db-btn db-primary db-btn-icon" disabled={!label.trim() || busy} onClick={save}>
                  <Icon name="plus" size={17} />{busy ? 'Adding…' : 'Add face'}
                </button>
              </div>
            </div>
          )}
        </div>
        <aside className="db-tips">
          <b className="db-tips-title">For the best result</b>
          {TIPS.map((t) => (
            <div key={t.title} className="db-tip">
              <span className="db-tip-icon"><Icon name={t.icon} size={17} /></span>
              <span><b>{t.title}</b><span>{t.text}</span></span>
            </div>
          ))}
        </aside>
      </section>

      <section>
        <h2 className="db-h2 db-section-title">Your faces</h2>
        {!avatars.length ? <p className="db-muted">No faces yet.</p> : (
          <div className="db-facegrid">
            {avatars.map((a) => (
              <div key={a.uuid} className="db-facecard">
                <div className="db-facecard-media">
                  {a.preview ? <video src={a.preview} autoPlay muted loop playsInline /> : <span>{a.label.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="db-facecard-body">
                  <b>{a.label}</b>
                  <span className="db-muted">Added {fmtDate(a.created_at)}</span>
                </div>
                <div className="db-facecard-actions">
                  <button className="db-iconbtn" title="Copy face ID" aria-label="Copy face ID" onClick={() => navigator.clipboard?.writeText(a.uuid)}><Icon name="copy" size={17} /></button>
                  <button className="db-iconbtn is-danger" title="Delete" aria-label="Delete face" onClick={() => run({ op: 'avatar.delete', uuid: a.uuid })}><Icon name="trash" size={17} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
