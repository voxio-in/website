// The university site, rebuilt from a real one's shape: eleven menus that open
// into link panels, a ticker, a carousel, announcement tabs, and a footer that
// is a small website on its own. Over a hundred links before a menu is even
// opened. The thing a student needs is never on the home page — the
// re-evaluation form is a row on page two of the Examination Branch's
// notifications table, and the fee table most parents find first is the one
// for next year's new admissions, not for their child.

import { useEffect, useMemo, useState } from 'react'

import { Alert, Busy, Dropdown, LinkColumns, Modal, useBusy } from '#/components/sites/kit'
import {
  calendar,
  CERTIFICATES,
  currentFees,
  examNotices,
  HOME_TABS,
  keyDates,
  MENUS,
  newAdmissionFees,
  NOTICE_CATEGORIES,
  PROGRAMMES,
  SEMESTERS,
  TICKER,
  UTILITY,
  type Notice,
} from '#/lib/sites/uni'
import { startOfDay } from '#/lib/sites/util'

const PER_PAGE = 15
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`

type Page = { menu: string; title: string } | { search: string } | null

const FOOTER = [
  { head: 'Quick Links', links: ['Academic Calendar', 'Admissions', 'Examinations', 'Results', 'Scholarships', 'Anti-Ragging', 'NIRF', 'NAAC', 'IQAC', 'AISHE'] },
  { head: 'Students', links: ['Fee Payment', 'Student Portal', 'Hostel', 'Library', 'Grievance', 'Internal Complaints Committee', 'Equal Opportunity Cell', 'Counselling'] },
  { head: 'Information', links: ['RTI', 'Tenders', 'Recruitment', 'Holiday List', 'Telephone Directory', 'Campus Map', 'Annual Accounts'] },
  { head: 'Government', links: ['Ministry of Education', 'UGC', 'AICTE', 'National Scholarship Portal', 'SWAYAM', 'Digital India', 'MyGov'] },
  { head: 'Policies', links: ['Privacy Policy', 'Copyright Policy', 'Hyperlinking Policy', 'Terms of Use', 'Accessibility Statement', 'Website Policy', 'Sitemap'] },
]

const QUICK = ['Results', 'Date Sheets', 'Admit Cards', 'Fee Payment', 'Academic Calendar', 'Scholarships', 'Hostel Allotment', 'Certificates & Documents', 'Syllabus & Curriculum', 'Student Login', 'Library Account', 'Anti-Ragging']

const SLIDES = [
  'National Conference on Sustainable Computing — inaugural session',
  'Meridian ranked among top 50 universities in NIRF 2026',
  'Convocation 2026: 4,112 degrees conferred',
]

function menuOf(title: string): string {
  return MENUS.find((m) => m.groups.some((g) => g.links.includes(title)))?.title ?? 'About'
}

export function UniversitySite() {
  const today = useMemo(() => startOfDay(new Date()), [])
  const k = keyDates(today)
  const notices = useMemo(() => examNotices(today), [today])

  const [open, setOpen] = useState<string | null>(null)
  const [page, setPage] = useState<Page>(null)
  const [q, setQ] = useState('')
  const [homeTab, setHomeTab] = useState('Notices')
  const [slide, setSlide] = useState(0)
  const [busy, run] = useBusy()

  // Notifications table
  const [cat, setCat] = useState('All')
  const [nq, setNq] = useState('')
  const [npage, setNpage] = useState(1)
  const [pdf, setPdf] = useState<Notice | null>(null)

  // Results
  const [rProg, setRProg] = useState('')
  const [rSem, setRSem] = useState('')
  const [rShown, setRShown] = useState(false)
  const [enrol, setEnrol] = useState('')
  const [dob, setDob] = useState('')
  const [sheet, setSheet] = useState(false)
  const [rError, setRError] = useState('')

  // Fees
  const [fProg, setFProg] = useState('')
  const [paid, setPaid] = useState(false)

  // Certificates
  const [cert, setCert] = useState<string | null>(null)
  const [cf, setCf] = useState({ enrol: '', name: '', prog: '', purpose: '', mode: '' })
  const [certDone, setCertDone] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  const goTo = (title: string) => {
    setOpen(null)
    run(700, () => {
      setPage({ menu: menuOf(title), title })
      setCat('All')
      setNq('')
      setNpage(1)
      setRShown(false)
      setSheet(false)
      setPaid(false)
    })
  }

  const searchSite = (text: string) => {
    if (!text.trim()) return
    setOpen(null)
    run(800, () => setPage({ search: text.trim() }))
  }

  const filtered = notices.filter(
    (n) => (cat === 'All' || n.category === cat) && (!nq || n.title.toLowerCase().includes(nq.toLowerCase())),
  )
  const npages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const nshown = filtered.slice((npage - 1) * PER_PAGE, npage * PER_PAGE)

  const menu = page && 'menu' in page ? MENUS.find((m) => m.title === page.menu) : null
  const title = page && 'title' in page ? page.title : ''

  const allLinks = MENUS.flatMap((m) => m.groups.flatMap((g) => g.links))
  const searchResults =
    page && 'search' in page
      ? [
          ...allLinks.filter((l) => page.search.toLowerCase().split(/\s+/).some((w) => w.length > 2 && l.toLowerCase().includes(w))).map((l) => ({ kind: 'Page', text: l })),
          ...notices.filter((n) => page.search.toLowerCase().split(/\s+/).some((w) => w.length > 3 && n.title.toLowerCase().includes(w))).map((n) => ({ kind: 'Notice', text: n.title })),
          ...Object.values(HOME_TABS).flat().filter((t) => page.search.toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.toLowerCase().includes(w))).map((t) => ({ kind: 'News', text: t })),
        ]
      : []

  return (
    <div className="surface site-mu">
      <div className="mu-util">
        <span className="mu-util-l">Institution of Eminence · Deemed to be University</span>
        <span className="mu-util-r">
          {UTILITY.map((u) => <a key={u} href="#" onClick={(e) => e.preventDefault()}>{u}</a>)}
          <span className="mu-a11y" aria-label="Font size"><a href="#" onClick={(e) => e.preventDefault()}>A-</a><a href="#" onClick={(e) => e.preventDefault()}>A</a><a href="#" onClick={(e) => e.preventDefault()}>A+</a></span>
          <a href="#" onClick={(e) => e.preventDefault()}>Skip to main content</a>
        </span>
      </div>

      <header className="mu-head">
        <span className="mu-crest" aria-hidden="true">M</span>
        <div>
          <p className="mu-hi" lang="hi">मेरिडियन प्रौद्योगिकी संस्थान</p>
          <p className="mu-name">Meridian Institute of Technology</p>
        </div>
        <form className="mu-search" role="search" onSubmit={(e) => { e.preventDefault(); searchSite(q) }}>
          <input type="search" aria-label="Search this site" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit">Go</button>
        </form>
      </header>

      <nav className="mu-nav" aria-label="Main menu">
        <button type="button" className="mu-home" onClick={() => { setOpen(null); setPage(null) }}>Home</button>
        {MENUS.map((m) => (
          <div key={m.title} className="mu-nav-item">
            <button type="button" aria-expanded={open === m.title} onClick={() => setOpen(open === m.title ? null : m.title)}>{m.title} ˅</button>
            {open === m.title ? (
              <div className="mu-mega" role="menu" aria-label={m.title}>
                {m.groups.map((g) => (
                  <div key={g.head}>
                    <p>{g.head}</p>
                    {g.links.map((l) => (
                      <a key={l} role="menuitem" href="#" onClick={(e) => { e.preventDefault(); goTo(l) }}>{l}</a>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="mu-ticker" aria-label="Latest updates">
        <strong>LATEST</strong>
        <div className="mu-ticker-track"><span>{[...TICKER, ...TICKER].map((t, i) => <em key={i}>★ {t}</em>)}</span></div>
      </div>

      {/* ---------- home ---------- */}
      {page === null ? (
        <>
          <section className="mu-carousel" aria-roledescription="carousel">
            <div className="mu-slide"><span>{SLIDES[slide]}</span></div>
            <div className="mu-dots">
              {SLIDES.map((s, i) => (
                <button key={s} type="button" aria-label={`Slide ${i + 1}`} className={i === slide ? 'is-on' : ''} onClick={() => setSlide(i)} />
              ))}
            </div>
          </section>

          <div className="mu-home">
            <section className="mu-ann">
              <div className="mu-ann-tabs" role="tablist" aria-label="Announcements">
                {Object.keys(HOME_TABS).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={homeTab === t} className={homeTab === t ? 'is-on' : ''} onClick={() => setHomeTab(t)}>{t}</button>
                ))}
              </div>
              <ul className="mu-ann-list">
                {HOME_TABS[homeTab]!.map((t, i) => (
                  <li key={t}>
                    <a href="#" onClick={(e) => e.preventDefault()}>{t}</a>
                    {i < 2 ? <span className="mu-new">NEW</span> : null}
                    <small>{fmt(new Date(today.getTime() - (i + 1) * 86400000 * 2))}</small>
                  </li>
                ))}
              </ul>
              <a href="#" className="mu-more" onClick={(e) => e.preventDefault()}>View All ›</a>
            </section>

            <section className="mu-quick">
              <h2>Quick Links</h2>
              <div className="mu-quick-grid">
                {QUICK.map((l) => (
                  <a key={l} href="#" onClick={(e) => { e.preventDefault(); goTo(l) }}><span aria-hidden="true" />{l}</a>
                ))}
              </div>
            </section>
          </div>

          <section className="mu-stats">
            {[['90+', 'Departments'], ['11,400', 'Students'], ['612', 'Faculty'], ['A++', 'NAAC Grade'], ['#47', 'NIRF 2026']].map(([n, l]) => (
              <div key={l}><strong>{n}</strong><span>{l}</span></div>
            ))}
          </section>

          <section className="mu-events">
            <h2>Events</h2>
            <div>
              {HOME_TABS.Events!.map((e, i) => (
                <article key={e}><b>{fmt(new Date(today.getTime() + (i + 3) * 86400000 * 3))}</b><span>{e}</span></article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* ---------- a section page ---------- */}
      {menu ? (
        <div className="mu-page">
          <aside className="mu-side" aria-label={`${menu.title} section`}>
            <p className="mu-side-h">{menu.title}</p>
            {menu.groups.map((g) => (
              <div key={g.head}>
                <p className="mu-side-g">{g.head}</p>
                {g.links.map((l) => (
                  <a key={l} href="#" className={l === title ? 'is-on' : ''} onClick={(e) => { e.preventDefault(); goTo(l) }}>{l}</a>
                ))}
              </div>
            ))}
          </aside>

          <main className="mu-main">
            <p className="mu-crumbs">Home › {menu.title} › {title}</p>
            <h1>{title}</h1>

            {title === 'Notifications & Circulars' ? (
              <>
                <div className="mu-tools">
                  <Dropdown label="Category" value={cat} options={NOTICE_CATEGORIES} onChange={(v) => run(500, () => { setCat(v); setNpage(1) })} />
                  <input type="text" aria-label="Search by title" placeholder="Search by title" value={nq} onChange={(e) => { setNq(e.target.value); setNpage(1) }} />
                  <span>{filtered.length} records</span>
                </div>
                <table className="mu-table">
                  <thead><tr><th>S.No.</th><th>Date</th><th>Title</th><th>Category</th><th>Download</th></tr></thead>
                  <tbody>
                    {nshown.map((n, i) => (
                      <tr key={n.title}>
                        <td>{(npage - 1) * PER_PAGE + i + 1}</td>
                        <td>{fmt(n.date)}</td>
                        <td>
                          <a href="#" onClick={(e) => { e.preventDefault(); setPdf(n) }}>{n.title}</a>
                          {n.isNew ? <span className="mu-new">NEW</span> : null}
                        </td>
                        <td>{n.category}</td>
                        <td><button type="button" className="mu-pdf" aria-label={`Download ${n.title}`} onClick={() => setPdf(n)}>PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <nav className="mu-pages" aria-label="Pagination">
                  <button type="button" disabled={npage === 1} onClick={() => run(400, () => setNpage(npage - 1))}>« Previous</button>
                  {Array.from({ length: npages }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" aria-label={`Page ${n}`} aria-current={n === npage ? 'page' : undefined} className={n === npage ? 'is-on' : ''} onClick={() => run(400, () => setNpage(n))}>{n}</button>
                  ))}
                  <button type="button" disabled={npage === npages} onClick={() => run(400, () => setNpage(npage + 1))}>Next »</button>
                </nav>
              </>
            ) : title === 'Results' ? (
              <>
                <div className="mu-tools">
                  <Dropdown label="Programme" placeholder="Select Programme" value={rProg} options={PROGRAMMES} searchable onChange={setRProg} />
                  <Dropdown label="Semester" placeholder="Select Semester" value={rSem} options={SEMESTERS} onChange={setRSem} />
                  <button type="button" className="mu-btn" onClick={() => run(700, () => setRShown(true))}>Show Results</button>
                </div>
                {rShown ? (
                  <table className="mu-table">
                    <thead><tr><th>Programme</th><th>Semester</th><th>Declared on</th><th>Result</th></tr></thead>
                    <tbody>
                      {PROGRAMMES.filter((p) => !rProg || p === rProg).slice(0, 8).map((p) =>
                        (rSem ? [rSem] : ['Semester V', 'Semester III']).map((s) => (
                          <tr key={p + s}>
                            <td>{p}</td><td>{s}</td>
                            <td>{s === 'Semester V' ? fmt(k.resultsDeclared) : s === 'Semester VI' || s === 'Semester VII' || s === 'Semester VIII' ? '—' : fmt(new Date(today.getTime() - 120 * 86400000))}</td>
                            <td>{s === 'Semester VI' || s === 'Semester VII' || s === 'Semester VIII' ? 'Not declared' : <a href="#" onClick={(e) => e.preventDefault()}>View PDF</a>}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                ) : null}

                <h2>Check Individual Result</h2>
                <div className="mu-form">
                  <label>Enrollment No.<input type="text" aria-label="Enrollment No." value={enrol} onChange={(e) => setEnrol(e.target.value.toUpperCase())} /></label>
                  <label>Date of Birth<input type="text" aria-label="Date of Birth (DD/MM/YYYY)" placeholder="DD/MM/YYYY" value={dob} onChange={(e) => setDob(e.target.value)} /></label>
                  <button
                    type="button"
                    className="mu-btn"
                    onClick={() => {
                      if (enrol.replace(/\W/g, '').length < 6 || !/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
                        setRError('Please enter a valid Enrollment No. and Date of Birth.')
                        return
                      }
                      setRError('')
                      run(900, () => setSheet(true))
                    }}
                  >
                    View Result
                  </button>
                </div>
                {rError ? <Alert>{rError}</Alert> : null}
                {sheet ? (
                  <div className="mu-sheet" aria-label="Statement of Marks">
                    <p><strong>Statement of Marks — Semester V</strong> · Enrollment {enrol} · B.Tech Computer Science &amp; Engineering</p>
                    <table className="mu-table">
                      <thead><tr><th>Code</th><th>Paper</th><th>Credits</th><th>Grade</th></tr></thead>
                      <tbody>
                        {[['CS501', 'Operating Systems', 4, 'A'], ['CS502', 'Computer Networks', 4, 'B+'], ['CS503', 'Theory of Computation', 4, 'B'], ['CS504', 'Machine Learning', 3, 'A'], ['CS505', 'Software Engineering', 3, 'B+'], ['HS501', 'Professional Ethics', 2, 'A+']].map(([c, p, cr, g]) => (
                          <tr key={c as string}><td>{c}</td><td>{p}</td><td>{cr}</td><td>{g}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    <p>SGPA: <strong>7.6</strong> · CGPA: <strong>7.9</strong> · Result: <strong>PASS</strong> · Declared {fmt(k.resultsDeclared)}</p>
                    <p className="mu-fine">Candidates seeking re-evaluation must apply within the notified window. The application form is published by the Examination Branch under Notifications &amp; Circulars.</p>
                  </div>
                ) : null}
              </>
            ) : title === 'Fee Payment' ? (
              <>
                <p className="mu-copy">Fee for the odd semester (2026-27) for students already enrolled is payable online through the Student Portal between <strong>{fmt(k.feeOpens)}</strong> and <strong>{fmt(k.feeCloses)}</strong>. A late fee of ₹1,000 is charged from {fmt(k.lateFrom)}. Cash and demand drafts are not accepted at the counter.</p>
                <div className="mu-tools">
                  <Dropdown label="Programme" placeholder="Select Programme" value={fProg} options={PROGRAMMES} searchable onChange={(v) => run(500, () => setFProg(v))} />
                </div>
                {fProg ? (
                  <table className="mu-table">
                    <thead><tr><th>Fee Head</th><th>Amount</th><th>Remarks</th></tr></thead>
                    <tbody>
                      {currentFees(fProg).map((r) => <tr key={r.head}><td>{r.head}</td><td>{inr(r.amount)}</td><td>{r.note ?? ''}</td></tr>)}
                      <tr className="mu-total"><td>Total (without hostel)</td><td>{inr(currentFees(fProg).slice(0, 4).reduce((n, r) => n + r.amount, 0))}</td><td /></tr>
                    </tbody>
                  </table>
                ) : <p className="mu-fine">Select your programme to view the fee payable.</p>}
                <button type="button" className="mu-btn" onClick={() => setPaid(true)}>Pay Online</button>
                {paid ? <Alert tone="info">This is where the payment portal would open. Nothing is charged — this is a demo.</Alert> : null}
              </>
            ) : title === 'Fee Structure 2026-27 (New Admissions)' ? (
              <>
                <Alert tone="info">Applicable only to students admitted in the academic year 2026-27. Existing students, see Students › Fee Payment.</Alert>
                <div className="mu-tools">
                  <Dropdown label="Programme" placeholder="Select Programme" value={fProg} options={PROGRAMMES} searchable onChange={setFProg} />
                </div>
                {fProg ? (
                  <table className="mu-table">
                    <thead><tr><th>Fee Head</th><th>Amount</th></tr></thead>
                    <tbody>{newAdmissionFees(fProg).map((r) => <tr key={r.head}><td>{r.head}</td><td>{inr(r.amount)}</td></tr>)}</tbody>
                  </table>
                ) : null}
              </>
            ) : title === 'Certificates & Documents' ? (
              <>
                <p className="mu-copy">Applications are processed by the Registrar&rsquo;s Office (Admin Block, Ground Floor). Fees are paid online at the time of application.</p>
                <table className="mu-table">
                  <thead><tr><th>Certificate</th><th>Processing Time</th><th>Fee</th><th>Apply</th></tr></thead>
                  <tbody>
                    {CERTIFICATES.map((c) => (
                      <tr key={c.name}>
                        <td>{c.name}</td><td>{c.days}</td><td>{inr(c.fee)}</td>
                        <td><button type="button" className="mu-btn mu-btn--s" aria-label={`Apply for ${c.name}`} onClick={() => { setCert(c.name); setCertDone(false) }}>Apply</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : title === 'Academic Calendar' ? (
              <table className="mu-table">
                <thead><tr><th>Activity</th><th>Date(s)</th></tr></thead>
                <tbody>{calendar(today).map((r) => <tr key={r.what}><td>{r.what}</td><td>{r.when}</td></tr>)}</tbody>
              </table>
            ) : title === 'Examination Fee Structure' ? (
              <table className="mu-table">
                <thead><tr><th>Item</th><th>Fee</th></tr></thead>
                <tbody>
                  {[['End semester examination (per semester)', 3500], ['Backlog paper (per paper)', 800], ['Re-evaluation (per paper)', 500], ['Photocopy of answer script (per paper)', 300], ['Transcript (per copy)', 1000]].map(([a, b]) => (
                    <tr key={a as string}><td>{a}</td><td>{inr(b as number)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="mu-copy">
                <p>The {title} page provides information for students, staff and visitors of the Institute. Content on this page is maintained by the concerned office and is updated periodically.</p>
                <p>For queries, contact the office concerned between 10:00 AM and 4:00 PM on working days. Please refer to the notices section for the latest updates.</p>
                <p className="mu-fine">This page was last updated on {fmt(new Date(today.getTime() - 40 * 86400000))}.</p>
              </div>
            )}
          </main>
        </div>
      ) : null}

      {/* ---------- search ---------- */}
      {page && 'search' in page ? (
        <div className="mu-page mu-page--search">
          <main className="mu-main">
            <p className="mu-crumbs">Home › Search</p>
            <h1>Search results for &ldquo;{page.search}&rdquo;</h1>
            <p className="mu-fine">About {searchResults.length * 7 + 11} results ({(0.21 + searchResults.length / 100).toFixed(2)} seconds)</p>
            <ol className="mu-results">
              {searchResults.slice(0, 20).map((r) => (
                <li key={r.kind + r.text}>
                  <small>{r.kind}</small>
                  <a href="#" onClick={(e) => { e.preventDefault(); if (r.kind === 'Page') goTo(r.text) }}>{r.text}</a>
                </li>
              ))}
              {searchResults.length === 0 ? <li>No results found.</li> : null}
            </ol>
          </main>
        </div>
      ) : null}

      <footer className="mu-foot">
        <LinkColumns columns={FOOTER} />
        <p>© 2026 Meridian Institute of Technology · Meridian Campus, Bengaluru 560064 · Last updated: {fmt(today)} · Visitors: 49,12,338</p>
      </footer>

      {busy ? <Busy /> : null}

      {pdf ? (
        <Modal title={pdf.title} onClose={() => setPdf(null)} className="mu-pdfview">
          {pdf.title.startsWith('Re-evaluation') ? (
            <div className="mu-doc">
              <p><strong>MERIDIAN INSTITUTE OF TECHNOLOGY — EXAMINATION BRANCH</strong></p>
              <p>No. EX/2026/211 · Dated {fmt(pdf.date)}</p>
              <p><strong>Re-evaluation of Answer Scripts, Semester V (May-June 2026)</strong></p>
              <ol>
                <li>Applications are invited from candidates of Semester V who wish to have their answer scripts re-evaluated.</li>
                <li>Last date for submission: <strong>{fmt(k.revalCloses)}</strong>. No application will be accepted after this date under any circumstances.</li>
                <li>Fee: ₹500 per paper, payable online. Attach the fee receipt.</li>
                <li>Submit the completed form at the Examination Branch, Block C, Room 114, between 10:00 AM and 4:00 PM.</li>
                <li>Revised results, if any, will be communicated within 30 days.</li>
              </ol>
              <p className="mu-fine">Controller of Examinations</p>
            </div>
          ) : (
            <div className="mu-doc">
              <p><strong>MERIDIAN INSTITUTE OF TECHNOLOGY</strong></p>
              <p>{pdf.title}</p>
              <p className="mu-fine">Scanned document · 2 pages · Dated {fmt(pdf.date)}</p>
            </div>
          )}
        </Modal>
      ) : null}

      {cert ? (
        <Modal title={`Apply for ${cert}`} onClose={() => setCert(null)}>
          <div className="mu-form mu-form--stack">
            <label>Enrollment No.<input type="text" aria-label="Enrollment No." value={cf.enrol} onChange={(e) => setCf({ ...cf, enrol: e.target.value.toUpperCase() })} /></label>
            <label>Student Name<input type="text" aria-label="Student Name" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} /></label>
            <Dropdown label="Programme" placeholder="Select Programme" value={cf.prog} options={PROGRAMMES} searchable onChange={(v) => setCf({ ...cf, prog: v })} />
            <Dropdown label="Purpose" placeholder="Select Purpose" value={cf.purpose} options={['Bank Loan', 'Passport', 'Scholarship', 'Visa', 'Internship', 'Other']} onChange={(v) => setCf({ ...cf, purpose: v })} />
            <Dropdown label="Mode of Delivery" placeholder="Mode of Delivery" value={cf.mode} options={['Collect in person', 'Email (digitally signed)']} onChange={(v) => setCf({ ...cf, mode: v })} />
            <button type="button" className="mu-btn" onClick={() => setCertDone(true)}>Submit Application</button>
            {certDone ? <Alert tone="info">Nothing was submitted — this is a demo of the form.</Alert> : null}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
