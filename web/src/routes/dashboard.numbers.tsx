// Numbers, for the Voxio team: every number Voxio rents, who owns it, and which
// flow answers it. The one decision made here is "who gets this number"; a
// customer then attaches it to a flow from that flow's Numbers & calls tab.
// Admins only (the server checks too). See docs/NUMBER_OWNERSHIP.md.

import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { Dropdown } from '#/components/dashboard/controls'
import Icon from '#/components/dashboard/Icon'
import { TableCard, TableFilter } from '#/components/dashboard/TableCard'
import { Dialog, Notice } from '#/components/dashboard/ui'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import { addNumber, getNumberAdmin, removeLegacyAttachment, removeNumber, setNumberOwner, type AdminNumber, type NumberAdmin } from '#/server/dashboard/numbers'

export const Route = createFileRoute('/dashboard/numbers')({
  staleTime: 5_000,
  pendingMs: 800,
  loader: async () => unwire<NumberAdmin>(await getNumberAdmin()),
  component: Numbers,
})

const NOBODY = ''

const SHOW = [
  { value: 'all', label: 'All numbers' },
  { value: 'free', label: 'Not given to anyone' },
  { value: 'owned', label: 'Given, not attached' },
  { value: 'attached', label: 'Answering a flow' },
]

type Ask = { kind: 'owner'; n: AdminNumber; userId: string } | { kind: 'remove'; n: AdminNumber }

function Numbers() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [q, setQ] = useState('')
  const [show, setShow] = useState('all')
  const [ask, setAsk] = useState<Ask | null>(null)
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState('')
  const [newOwner, setNewOwner] = useState(NOBODY)

  const data = res.ok ? res.data : null
  const users = data?.users ?? []
  const userOptions = useMemo(() => [
    { value: NOBODY, label: 'Nobody', hint: 'Voxio keeps it' },
    ...users.map((u) => ({ value: u.id, label: u.email, hint: u.name || undefined })),
  ], [users])
  const nameOf = (id: string) => users.find((u) => u.id === id)?.email ?? 'nobody'

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/[\s-]/g, '')
    return (data?.numbers ?? []).filter((n) => {
      if (show === 'free' && n.owner) return false
      if (show === 'owned' && (!n.owner || n.flow)) return false
      if (show === 'attached' && !n.flow) return false
      return !t || `${n.phone_number} ${n.owner?.email ?? ''} ${n.owner?.name ?? ''} ${n.flow?.name ?? ''}`.toLowerCase().replace(/[\s-]/g, '').includes(t)
    })
  }, [data, q, show])

  if (!res.ok) {
    return (
      <div className="db-page">
        <header className="db-pagehead"><div><h1 className="db-h1">Numbers</h1></div></header>
        <Notice kind="err">{res.reason}</Notice>
      </div>
    )
  }

  const run = async (call: () => Promise<string>, ok: string) => {
    setBusy(true)
    const r = unwire(await call())
    setBusy(false)
    setAsk(null)
    setMsg(r.ok ? { kind: 'ok', text: [ok, r.note].filter(Boolean).join(' ') } : { kind: 'err', text: r.reason })
    if (r.ok) await router.invalidate()
    return r.ok
  }

  // Changing the owner of an attached number detaches it, so say so first.
  const changeOwner = (n: AdminNumber, userId: string) => {
    if ((n.owner?.id ?? NOBODY) === userId) return
    if (n.flow) return setAsk({ kind: 'owner', n, userId })
    void run(() => setNumberOwner({ data: { phone: n.phone_number, userId: userId || null } }),
      userId ? `${n.phone_number} now belongs to ${nameOf(userId)}.` : `${n.phone_number} is back with Voxio.`)
  }

  const add = async () => {
    const ok = await run(() => addNumber({ data: { phone, userId: newOwner || null } }),
      newOwner ? `Added, and given to ${nameOf(newOwner)}.` : 'Added. Give it to someone below.')
    if (ok) { setPhone(''); setNewOwner(NOBODY) }
  }

  const counts = {
    total: data!.numbers.length,
    free: data!.numbers.filter((n) => !n.owner).length,
  }

  return (
    <div className="db-page">
      <header className="db-pagehead">
        <div>
          <h1 className="db-h1">Numbers</h1>
          <p className="db-sub">Every number Voxio rents. Give one to a customer, and they can attach it to their flows from Numbers &amp; calls.</p>
        </div>
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <section className="db-setcard">
        <div className="db-setcard-head">
          <div>
            <h2 className="db-h2">Add a number</h2>
            <p className="db-setcard-sub">A number Voxio has rented from the carrier. Calls to it still need the carrier pointed at Voxio.</p>
          </div>
        </div>
        <div className="db-attach-row db-numadd">
          <input className="db-in" placeholder="+91 80 4567 8901" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone number"
            onKeyDown={(e) => { if (e.key === 'Enter' && phone.trim()) void add() }} />
          <Dropdown value={newOwner} options={userOptions} onChange={setNewOwner} aria-label="Give it to" />
          <button className="db-btn db-primary" disabled={busy || !phone.trim()} onClick={add}><Icon name="plus" size={17} />Add</button>
        </div>
      </section>

      <TableCard
        title="All numbers"
        description={counts.total ? `${counts.total} number${counts.total === 1 ? '' : 's'}, ${counts.free} not given to anyone.` : undefined}
        search={counts.total ? { value: q, onChange: setQ, placeholder: 'Search by number, owner or flow', count: `${rows.length} of ${counts.total}` } : undefined}
        filters={counts.total ? <TableFilter label="Show" value={show} options={SHOW} onChange={setShow} /> : undefined}
      >
        {!counts.total ? <p className="db-tcard-empty">No numbers yet. Add the first one above.</p>
          : !rows.length ? <p className="db-tcard-empty">No numbers match. Try another search or filter.</p> : (
          <table className="db-flows db-numtable">
            <thead>
              <tr><th>Number</th><th>Belongs to</th><th>Answering</th><th>Added</th><th aria-label="Remove" /></tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.phone_number}>
                  <td className="db-mono">{n.phone_number}<span className="db-muted"> · {n.provider}</span></td>
                  <td className="db-ownercell">
                    <Dropdown value={n.owner?.id ?? NOBODY} options={userOptions} onChange={(v) => changeOwner(n, v)} aria-label={`Who owns ${n.phone_number}`} />
                  </td>
                  <td>
                    {n.flow
                      ? <Link to="/dashboard/flows/$flowId/numbers" params={{ flowId: n.flow.key }} className="db-textlink">{n.flow.name}</Link>
                      : <span className="db-muted">{n.owner ? 'Not attached yet' : '—'}</span>}
                  </td>
                  <td className="db-whencell">{fmtDate(n.added_at)}</td>
                  <td className="db-actcell">
                    <button className="db-iconbtn is-danger" title="Remove from the list" aria-label={`Remove ${n.phone_number}`} onClick={() => setAsk({ kind: 'remove', n })}>
                      <Icon name="trash" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      {data!.legacy.length > 0 && (
        <TableCard title="Attached, but not on the list"
          description="These are attached to an account but aren't on the list of numbers Voxio rents; they were attached before ownership existed. Keep the real ones (they're added to the list, owned by that account, and keep answering). Detach the rest.">
          <table className="db-flows db-numtable">
            <thead><tr><th>Number</th><th>Account</th><th>Answering</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {data!.legacy.map((l) => (
                <tr key={l.phone_number}>
                  <td className="db-mono">{l.phone_number}</td>
                  <td>{l.userEmail}</td>
                  <td>{l.flow?.name ?? <span className="db-muted">—</span>}</td>
                  <td className="db-actcell">
                    <span className="db-btngroup" role="group" aria-label={`Actions for ${l.phone_number}`}>
                      <button type="button" className="db-gbtn" disabled={busy} title={`Add it to the list, owned by ${l.userEmail}. Its flow keeps answering.`}
                        onClick={() => run(() => addNumber({ data: { phone: l.phone_number, userId: users.find((u) => u.email === l.userEmail)?.id ?? null } }),
                          `${l.phone_number} is on the list, owned by ${l.userEmail}.`)}>
                        <Icon name="check" size={16} />Keep, owned by {l.userEmail.split('@')[0]}
                      </button>
                      <button type="button" className="db-gbtn is-danger" disabled={busy} onClick={() => run(() => removeLegacyAttachment({ data: { phone: l.phone_number } }), `${l.phone_number} detached.`)}>
                        <Icon name="close" size={16} />Detach
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {ask && (
        <Dialog title={ask.kind === 'remove' ? `Remove ${ask.n.phone_number}?` : `Give ${ask.n.phone_number} to ${nameOf(ask.userId)}?`} onClose={() => setAsk(null)}>
          <p>
            {ask.kind === 'remove'
              ? <>It comes off the list{ask.n.flow ? <> and stops answering <b>{ask.n.flow.name}</b></> : null}. Do this only when Voxio no longer rents it.</>
              : <>It answers <b>{ask.n.flow!.name}</b> ({ask.n.flow!.ownerEmail}) right now. Changing who owns it detaches it, so that flow stops answering at once.</>}
          </p>
          <div className="db-btngroup db-dialog-split" role="group">
            <button type="button" className="db-gbtn" onClick={() => setAsk(null)}>Cancel</button>
            <button type="button" className="db-gbtn is-lead is-danger" disabled={busy}
              onClick={() => ask.kind === 'remove'
                ? run(() => removeNumber({ data: { phone: ask.n.phone_number } }), `${ask.n.phone_number} removed.`)
                : run(() => setNumberOwner({ data: { phone: ask.n.phone_number, userId: ask.userId || null } }),
                  ask.userId ? `${ask.n.phone_number} now belongs to ${nameOf(ask.userId)}.` : `${ask.n.phone_number} is back with Voxio.`)}>
              {ask.kind === 'remove' ? 'Remove' : 'Change owner'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
