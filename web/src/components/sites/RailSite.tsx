// The railway booking site, rebuilt from the real one rather than simplified.
//
// What makes the real one hard is all here, because it is what the demo is
// about: a language dialog that blocks the page on arrival; station boxes that
// only accept a picked suggestion, with seven Delhis to pick from; class and
// quota pickers that are not dropdowns the browser knows; a results page where
// half the trains terminate somewhere other than the station you asked for;
// availability you have to load per class before Book Now does anything; a
// login wall; a passenger form that refuses to continue until you answer the
// insurance question; and a captcha at the end that is the person's to type.

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Alert,
  Autocomplete,
  Busy,
  DateField,
  Dropdown,
  LinkColumns,
  Modal,
  useBusy,
} from '#/components/sites/kit'
import {
  availabilityAround,
  CLASSES,
  classCode,
  QUOTAS,
  RUN_LETTERS,
  stationFromLabel,
  STATIONS,
  suggestStations,
  TRAINS,
  type Train,
} from '#/lib/sites/rail'
import { addDays, ddmmyyyy, hash, parseDdmmyyyy, shortDate, startOfDay } from '#/lib/sites/util'

const JAIPUR_SIDE = ['JP', 'GADJ', 'DPA']
const DELHI_SIDE = ['NDLS', 'DLI', 'DEE', 'NZM', 'ANVT', 'DEC', 'DSA', 'DKZ', 'DAZ']

const classLabel = (code: string) => CLASSES.find((c) => classCode(c) === code) ?? code
const stationName = (code: string) => STATIONS.find((s) => s.code === code)?.name ?? code

type View = 'home' | 'results' | 'passengers' | 'review'

type Search = {
  from: string
  to: string
  date: string
  cls: string
  quota: string
}

type Picked = { train: Train; cls: string; date: Date; status: string }

type Pax = { name: string; age: string; gender: string; berth: string; food: string }
const NO_PAX: Pax = { name: '', age: '', gender: '', berth: 'No Preference', food: '' }

const NAV_MENUS: Record<string, string[]> = {
  'EXCLUSIVE': ['Maharajas\' Express', 'Bharat Gaurav Tourist Train', 'Golden Chariot', 'Buddhist Circuit Train', 'Hill Railways', 'Luxury Trains'],
  TRAINS: ['Book Ticket', 'PNR Enquiry', 'Train Schedule', 'Track Your Train', 'Book Your Coach/Train', 'Retiring Room Booking', 'Indian Railways Tourist Map', 'Tourist Train', 'Hill Railways', 'Charter Train', 'Cancel Ticket', 'Refund History', 'File TDR', 'Chart Vacancy'],
  LOYALTY: ['Co-branded Credit Card', 'Travel Rewards Card', 'Loyalty Points Redemption', 'Loyalty Terms'],
  'EWALLET': ['About eWallet', 'Register eWallet', 'Deposit', 'eWallet User Guide', 'Transaction History'],
  BUSES: ['Bus Tickets', 'Bus Booking Rules', 'Cancel Bus Ticket'],
  FLIGHTS: ['Domestic Flights', 'International Flights', 'LTC Fares', 'Defence Travel', 'Cancel Flight'],
  HOTELS: ['Rail Hotels', 'Retiring Rooms', 'Lounge', 'Dormitory'],
  HOLIDAYS: ['Tour Packages', 'Rail Tour Packages', 'Air Tour Packages', 'International Packages', 'Char Dham Yatra', 'Mata Vaishno Devi'],
  MEALS: ['e-Catering', 'Food on Track', 'Order Food', 'Food Menu & Tariff'],
  PROMOTIONS: ['Advertise with us', 'Daily Deals', 'Offers'],
  MORE: ['Counter Ticket Cancellation', 'Travel Insurance', 'Know your Refund Rules', 'Tatkal Rules', 'Senior Citizen Concession', 'Railway Pass', 'Mobile Apps', 'Tourist Map', 'Rail Drishti', 'Suggestions'],
}

const SERVICES = [
  'FLIGHTS', 'HOTELS', 'RAIL DRISHTI', 'E-CATERING', 'BUS', 'HOLIDAY PACKAGES',
  'TOURIST TRAIN', 'HILL RAILWAYS', 'CHARTER TRAIN', 'GALLERY', 'LOUNGE', 'RETIRING ROOM',
]

const HOLIDAYS = [
  { t: 'Maharajas\' Express', s: 'Redefining Royalty, Luxury and Comfort, Maharajas\' express takes you on a sojourn…' },
  { t: 'International Packages', s: 'Best deals in international holiday packages, handpicked for rail travellers…' },
  { t: 'Domestic Air Packages', s: 'Be it the spiritual devotee seeking blessings of Tirupati…' },
  { t: 'Bharat Gaurav Tourist Train', s: 'Bharat Gaurav Tourist Trains with AC III-Tier coaches, on themed circuits…' },
  { t: 'Rail Tour Packages', s: 'Exclusive rail tour packages with confirmed train tickets…' },
  { t: 'Buddhist Circuit Tourist Train', s: 'Visit the spiritual centres of Buddhism, from Lumbini to Kushinagar…' },
]

const FOOTER = [
  { head: 'Trains', links: ['General Information', 'Important Information', 'Agents', 'Enquiries', 'How To', 'Official App', 'Advertise with us', 'Refund Rules', 'Person With Disability Facilities'] },
  { head: 'For Newly Migrated Agents', links: ['Mobile Zone', 'Policies', 'Ask Disha ChatBot', 'About us', 'Help & Support', 'E-Wallet', 'iPay Payment Gateway', 'Rail Zone'] },
  { head: 'Customer Care', links: ['Holiday Packages', 'Tourist Train', 'Rail Drishti', 'Cancel Ticket', 'Book Tatkal', 'Refund Status', 'Booking History', 'Complaint Registration'] },
  { head: 'Follow Us', links: ['Facebook', 'Twitter', 'YouTube', 'Instagram', 'LinkedIn', 'Telegram', 'Koo', 'Pinterest'] },
  { head: 'Legal', links: ['Terms & Conditions', 'Privacy Policy', 'Copyright Policy', 'Disclaimer', 'Sitemap', 'Accessibility Statement', 'Hyperlinking Policy', 'Security Policy'] },
]

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function statusTone(s: string) {
  if (s.startsWith('AVAILABLE')) return 'is-free'
  if (s.startsWith('RAC')) return 'is-rac'
  if (s.startsWith('WL') || s.startsWith('REGRET')) return 'is-wl'
  return 'is-off'
}

/* One train on the results page. Its class boxes do nothing until pressed,
   then load their own availability — which is the step everybody misses when
   they press Book Now and nothing happens. */
function TrainCard({
  train,
  date,
  quota,
  onBook,
}: {
  train: Train
  date: Date
  quota: string
  onBook: (p: Picked) => void
}) {
  const [cls, setCls] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const [day, setDay] = useState(0)
  const [busy, run] = useBusy()

  const grid = loaded ? availabilityAround(train, loaded, date) : []
  const chosen = grid[day]
  const bookable = !!chosen && !/NOT RUNNING|REGRET|NOT AVAILABLE/.test(chosen.status)
  const fareOf = (code: string) => {
    const base = train.classes.find((c) => c.code === code)?.fare ?? 0
    return quota === 'TATKAL' || quota === 'PREMIUM TATKAL' ? Math.round(base * 1.32) : base
  }
  // Every class the train has, the one searched for included — the real
  // results page does the same, and it is what lets a caller change their mind.
  const classes = train.classes

  return (
    <article className="ir-train" aria-label={`${train.name} (${train.no})`}>
      <header className="ir-train-head">
        <strong>{train.name} ({train.no})</strong>
        <span className="ir-runs">
          Runs On:{' '}
          {RUN_LETTERS.map((l, i) => (
            <b key={i} className={train.runs[i] ? 'is-on' : ''}>{l}</b>
          ))}
        </span>
        <a href="#" className="ir-sched" onClick={(e) => e.preventDefault()}>Train Schedule</a>
      </header>

      <div className="ir-train-times">
        <span><strong>{train.dep}</strong> | {stationName(train.from)} | {shortDate(date)}</span>
        <span className="ir-dur">— {train.dur} —</span>
        <span><strong>{train.arr}</strong> | {stationName(train.to)} ({train.to}) | {shortDate(train.arr < train.dep ? addDays(date, 1) : date)}</span>
      </div>

      <div className="ir-cls-row">
        {classes.map((c) => (
          <button
            key={c.code}
            type="button"
            className={`ir-cls${cls === c.code ? ' is-on' : ''}`}
            onClick={() => {
              setCls(c.code)
              setDay(0)
              run(700 + (hash(train.no + c.code) % 500), () => setLoaded(c.code))
            }}
          >
            <span>{classLabel(c.code)}</span>
            <small>{loaded === c.code ? `₹ ${fareOf(c.code)}` : 'Refresh'}</small>
          </button>
        ))}
      </div>

      {busy ? (
        <div className="ir-loading" aria-busy="true">Fetching availability…</div>
      ) : loaded ? (
        <div className="ir-avail" role="group" aria-label={`Availability ${classLabel(loaded)}`}>
          {grid.map((g, i) => (
            <button
              key={i}
              type="button"
              className={`ir-day ${statusTone(g.status)}${day === i ? ' is-on' : ''}`}
              aria-label={`${shortDate(g.date)} ${g.status}`}
              onClick={() => setDay(i)}
            >
              <span>{shortDate(g.date)}</span>
              <strong>{g.status}</strong>
            </button>
          ))}
        </div>
      ) : null}

      <footer className="ir-train-foot">
        <span className="ir-quota">{quota}</span>
        {loaded && chosen ? <span className="ir-fare">₹ {fareOf(loaded)}</span> : null}
        <button
          type="button"
          className="ir-book"
          disabled={!loaded || !bookable}
          onClick={() => loaded && chosen && onBook({ train, cls: loaded, date: chosen.date, status: chosen.status })}
        >
          Book Now
        </button>
        <span className="ir-other">Other Dates</span>
      </footer>
    </article>
  )
}

export function RailSite() {
  const clock = useClock()
  const today = useMemo(() => startOfDay(new Date()), [])

  const [lang, setLang] = useState<string | null>(null)
  const [beta, setBeta] = useState(true)
  const [menu, setMenu] = useState<string | null>(null)
  const [view, setView] = useState<View>('home')
  const [busy, run] = useBusy()

  const [q, setQ] = useState<Search>({ from: '', to: '', date: ddmmyyyy(today), cls: 'All Classes', quota: 'GENERAL' })
  const [flags, setFlags] = useState({ pwd: false, flexible: false, berth: false, pass: false })
  const [errors, setErrors] = useState<string[]>([])
  const [shown, setShown] = useState<Search | null>(null)

  const [filters, setFilters] = useState({ types: [] as string[], arrive: [] as string[], times: [] as string[], onlyAvail: false })
  const [sort, setSort] = useState('Departure Time')

  const [login, setLogin] = useState<Picked | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [pax, setPax] = useState<Pax[]>([{ ...NO_PAX }])
  const [prefs, setPrefs] = useState({ upgrade: true, confirmOnly: false, insurance: '', pay: 'cards' })
  const [paxErrors, setPaxErrors] = useState<string[]>([])
  const [left, setLeft] = useState(20 * 60)
  const [captcha, setCaptcha] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (view !== 'passengers' && view !== 'review') return
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [view])

  const source = useCallback((text: string) => suggestStations(text), [])

  const search = (next: Search = q) => {
    const errs: string[] = []
    if (!next.from) errs.push('Please enter a valid From station — select one from the list.')
    if (!next.to) errs.push('Please enter a valid To station — select one from the list.')
    if (next.from && next.from === next.to) errs.push('From and To stations cannot be the same.')
    const d = parseDdmmyyyy(next.date)
    if (!d) errs.push('Please enter the journey date as DD/MM/YYYY.')
    else if (d < today) errs.push('Journey date cannot be in the past.')
    else if (d > addDays(today, 60)) errs.push('Advance reservation period is 60 days.')
    setErrors(errs)
    if (errs.length) return
    setMenu(null)
    run(1100, () => {
      setShown(next)
      setView('results')
    })
  }

  const journey = shown ? parseDdmmyyyy(shown.date)! : today
  const results = useMemo(() => {
    if (!shown) return []
    /* The timetable only covers Jaipur (and its suburbs) to the Delhi
       stations. Anything else gets what the real site says for a route
       with no direct trains, rather than Jaipur trains under a wrong heading. */
    const from = stationFromLabel(shown.from)?.code ?? ''
    const to = stationFromLabel(shown.to)?.code ?? ''
    if (!JAIPUR_SIDE.includes(from) || !DELHI_SIDE.includes(to)) return []
    let list = TRAINS.filter((t) => flags.flexible || t.runs[journey.getDay()])
    if (shown.cls !== 'All Classes') list = list.filter((t) => t.classes.some((c) => classLabel(c.code) === shown.cls))
    if (filters.types.length) list = list.filter((t) => filters.types.includes(t.type))
    if (filters.arrive.length) list = list.filter((t) => filters.arrive.includes(t.to))
    if (filters.times.length) {
      list = list.filter((t) => {
        const h = Number(t.dep.slice(0, 2))
        const bucket = h < 6 ? '00:00 - 06:00' : h < 12 ? '06:00 - 12:00' : h < 18 ? '12:00 - 18:00' : '18:00 - 24:00'
        return filters.times.includes(bucket)
      })
    }
    if (filters.onlyAvail) list = list.filter((t) => Object.values(t.status).some((s) => s.startsWith('AVAILABLE')))
    const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
    return [...list].sort((a, b) =>
      sort === 'Duration' ? mins(a.dur) - mins(b.dur) : sort === 'Arrival Time' ? mins(a.arr) - mins(b.arr) : mins(a.dep) - mins(b.dep),
    )
  }, [shown, flags.flexible, journey, filters, sort])

  const toggle = (key: 'types' | 'arrive' | 'times', v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }))

  const book = (p: Picked) => {
    if (!signedIn) {
      setLogin(p)
      return
    }
    setPicked(p)
    setView('passengers')
  }

  const rajdhani = picked?.train.type === 'RAJDHANI' || picked?.train.type === 'SHATABDI' || picked?.train.type === 'VANDE BHARAT'

  const toReview = () => {
    const errs: string[] = []
    pax.forEach((p, i) => {
      const n = `Passenger ${i + 1}`
      if (p.name.trim().length < 3) errs.push(`${n}: Name should be minimum 3 characters.`)
      if (p.name.length > 16) errs.push(`${n}: Name should not exceed 16 characters.`)
      const age = Number(p.age)
      if (!p.age || !Number.isInteger(age) || age < 1 || age > 125) errs.push(`${n}: Please enter a valid age.`)
      if (!p.gender) errs.push(`${n}: Please select gender.`)
      if (rajdhani && !p.food) errs.push(`${n}: Please select a catering service option.`)
    })
    if (!prefs.insurance) errs.push('Please select an option for Travel Insurance.')
    setPaxErrors(errs)
    if (errs.length) return
    run(900, () => {
      setCaptcha('')
      setView('review')
    })
  }

  const setP = (i: number, patch: Partial<Pax>) => setPax((all) => all.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const fare = picked ? picked.train.classes.find((c) => c.code === picked.cls)?.fare ?? 0 : 0
  const code = picked ? (hash(picked.train.no + picked.date.toDateString()).toString(36).toUpperCase().slice(0, 5)) : ''

  return (
    <div className="surface site-ir">
      {/* ---------- the strip and the header ---------- */}
      <div className="ir-strip">
        <span className="ir-clock">
          {clock ? `${String(clock.getDate()).padStart(2, '0')}-${clock.toLocaleString('en-GB', { month: 'short' })}-${clock.getFullYear()} [${clock.toLocaleTimeString('en-GB')}]` : ''}
        </span>
        <span className="ir-strip-links">
          {['LOGIN', 'REGISTER', 'AGENT LOGIN', 'CONTACT US', 'HELP & SUPPORT', 'DAILY DEALS', 'ALERTS'].map((l) => (
            <a key={l} href="#" onClick={(e) => e.preventDefault()}>{l}</a>
          ))}
          <span className="ir-a11y"><a href="#" onClick={(e) => e.preventDefault()}>A-</a><a href="#" onClick={(e) => e.preventDefault()}>A</a><a href="#" onClick={(e) => e.preventDefault()}>A+</a></span>
          <a href="#" onClick={(e) => e.preventDefault()}>हिंदी</a>
        </span>
      </div>

      <header className="ir-head">
        <span className="ir-logo" aria-hidden="true">IR</span>
        <nav className="ir-nav" aria-label="Main">
          {Object.keys(NAV_MENUS).map((m) => (
            <div key={m} className="ir-nav-item">
              <button type="button" aria-expanded={menu === m} onClick={() => setMenu(menu === m ? null : m)}>{m}</button>
              {menu === m ? (
                <ul className="ir-nav-menu" role="menu" aria-label={m}>
                  {NAV_MENUS[m]!.map((l) => (
                    <li key={l}><a role="menuitem" href="#" onClick={(e) => { e.preventDefault(); setMenu(null) }}>{l}</a></li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </nav>
        <span className="ir-logo ir-logo--r" aria-hidden="true">🚆</span>
      </header>

      {beta ? (
        <div className="ir-beta">
          <span className="ir-beta-new">NEW</span>
          Explore the beta version of our new website and give your valuable suggestions.
          <button type="button" className="ir-beta-go">Explore beta</button>
          <button type="button" className="ir-beta-x" aria-label="Close banner" onClick={() => setBeta(false)}>×</button>
        </div>
      ) : null}

      {/* ---------- home ---------- */}
      {view === 'home' ? (
        <>
          <section className="ir-hero">
            <div className="ir-book-card">
              <div className="ir-book-tabs">
                <button type="button">PNR STATUS</button>
                <button type="button">CHARTS / VACANCY</button>
              </div>
              <h2 className="ir-book-title">BOOK TICKET</h2>

              <div className="ir-form">
                <div className="ir-row">
                  <Autocomplete
                    label="Enter From station. Input is Mandatory."
                    placeholder="From*"
                    value={q.from}
                    onChange={(v) => setQ({ ...q, from: v })}
                    source={source}
                    invalid={errors.some((e) => e.includes('From'))}
                  />
                  <button
                    type="button"
                    className="ir-swap"
                    aria-label="Swap From and To stations"
                    onClick={() => setQ({ ...q, from: q.to, to: q.from })}
                  >
                    ⇅
                  </button>
                  <Autocomplete
                    label="Enter To station. Input is Mandatory."
                    placeholder="To*"
                    value={q.to}
                    onChange={(v) => setQ({ ...q, to: v })}
                    source={source}
                    invalid={errors.some((e) => e.includes('To station'))}
                  />
                </div>
                <div className="ir-row">
                  <DateField
                    label="Journey Date(dd/mm/yyyy) is Mandatory"
                    value={q.date}
                    onChange={(v) => setQ({ ...q, date: v })}
                    min={today}
                    invalid={errors.some((e) => e.includes('date'))}
                  />
                  <Dropdown label="Class" value={q.cls} options={CLASSES} onChange={(v) => setQ({ ...q, cls: v })} />
                </div>
                <div className="ir-row">
                  <Dropdown label="Quota" value={q.quota} options={QUOTAS} onChange={(v) => setQ({ ...q, quota: v })} />
                </div>
                <div className="ir-checks">
                  <label><input type="checkbox" checked={flags.pwd} onChange={(e) => setFlags({ ...flags, pwd: e.target.checked })} /> Person With Disability Concession</label>
                  <label><input type="checkbox" checked={flags.flexible} onChange={(e) => setFlags({ ...flags, flexible: e.target.checked })} /> Flexible With Date</label>
                  <label><input type="checkbox" checked={flags.berth} onChange={(e) => setFlags({ ...flags, berth: e.target.checked })} /> Train with Available Berth</label>
                  <label><input type="checkbox" checked={flags.pass} onChange={(e) => setFlags({ ...flags, pass: e.target.checked })} /> Railway Pass Concession</label>
                </div>
                {errors.length ? <Alert>{errors.map((e) => <p key={e}>{e}</p>)}</Alert> : null}
                <button type="button" className="ir-search" onClick={() => search()}>Search</button>
              </div>
            </div>

            <div className="ir-hero-art" aria-hidden="true">
              <p className="ir-hero-big">INDIAN RAILWAYS</p>
              <p className="ir-hero-sub">Safety | Security | Punctuality</p>
            </div>
          </section>

          <section className="ir-services">
            <h3>Have you not found the right one? Find a service suitable for you here.</h3>
            <div className="ir-service-grid">
              {SERVICES.map((s) => (
                <a key={s} href="#" onClick={(e) => e.preventDefault()} className="ir-service">
                  <span aria-hidden="true" className="ir-service-ico" />
                  {s}
                </a>
              ))}
            </div>
          </section>

          <section className="ir-holidays">
            <h3>HOLIDAYS</h3>
            <div className="ir-hol-grid">
              {HOLIDAYS.map((h) => (
                <article key={h.t} className="ir-hol">
                  <div className="ir-hol-img" aria-hidden="true" />
                  <strong>{h.t}</strong>
                  <p>{h.s}</p>
                  <a href="#" onClick={(e) => e.preventDefault()}>Read more</a>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* ---------- results ---------- */}
      {view === 'results' && shown ? (
        <div className="ir-results">
          {/* The modify bar, as the real results page has it: the date, class
              and quota stay editable here under the same names they had on
              the search card, so changing one does not mean going back. */}
          <div className="ir-modify">
            <span>
              <strong>{stationFromLabel(shown.from)?.name} ({stationFromLabel(shown.from)?.code})</strong> →{' '}
              <strong>{stationFromLabel(shown.to)?.name} ({stationFromLabel(shown.to)?.code})</strong>
            </span>
            <div className="ir-modify-fields">
              <DateField label="Journey Date(dd/mm/yyyy) is Mandatory" value={q.date} onChange={(v) => setQ({ ...q, date: v })} min={today} />
              <Dropdown label="Class" value={q.cls} options={CLASSES} onChange={(v) => setQ({ ...q, cls: v })} />
              <Dropdown label="Quota" value={q.quota} options={QUOTAS} onChange={(v) => setQ({ ...q, quota: v })} />
              <button type="button" className="ir-search ir-search--s" onClick={() => search()}>Search</button>
            </div>
            <button type="button" onClick={() => setView('home')}>Modify Search</button>
          </div>
          {errors.length ? <Alert>{errors.map((e) => <p key={e}>{e}</p>)}</Alert> : null}

          <div className="ir-datestrip">
            <button type="button" aria-label="Previous day" onClick={() => search({ ...shown, date: ddmmyyyy(addDays(journey, -1)) })} disabled={+journey <= +today}>‹ {shortDate(addDays(journey, -1))}</button>
            <strong>{shortDate(journey)}</strong>
            <button type="button" aria-label="Next day" onClick={() => search({ ...shown, date: ddmmyyyy(addDays(journey, 1)) })}>{shortDate(addDays(journey, 1))} ›</button>
          </div>

          <div className="ir-res-body">
            <aside className="ir-filters" aria-label="Refine Result">
              <p className="ir-f-head">Refine Result <button type="button" onClick={() => setFilters({ types: [], arrive: [], times: [], onlyAvail: false })}>Reset Filters</button></p>
              <fieldset>
                <legend>Train Type</legend>
                {['RAJDHANI', 'SHATABDI', 'VANDE BHARAT', 'DOUBLE DECKER', 'SUPERFAST', 'MAIL/EXP'].map((t) => (
                  <label key={t}><input type="checkbox" checked={filters.types.includes(t)} onChange={() => toggle('types', t)} /> {t}</label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Departure Time</legend>
                {['00:00 - 06:00', '06:00 - 12:00', '12:00 - 18:00', '18:00 - 24:00'].map((t) => (
                  <label key={t}><input type="checkbox" checked={filters.times.includes(t)} onChange={() => toggle('times', t)} /> {t}</label>
                ))}
              </fieldset>
              <fieldset>
                <legend>To Station</legend>
                {['NDLS', 'DLI', 'DEE', 'NZM'].map((s) => (
                  <label key={s}><input type="checkbox" checked={filters.arrive.includes(s)} onChange={() => toggle('arrive', s)} /> {stationName(s)} ({s})</label>
                ))}
              </fieldset>
              <label className="ir-only"><input type="checkbox" checked={filters.onlyAvail} onChange={(e) => setFilters({ ...filters, onlyAvail: e.target.checked })} /> Show Available Trains</label>
            </aside>

            <div className="ir-list">
              <div className="ir-list-head">
                <span>{results.length} Results for <strong>{stationFromLabel(shown.from)?.name}</strong> → <strong>{stationFromLabel(shown.to)?.name}</strong> | {shortDate(journey)} For Quota | {shown.quota}</span>
                <Dropdown label="Sort By" value={sort} options={['Departure Time', 'Duration', 'Arrival Time']} onChange={setSort} />
              </div>
              <p className="ir-list-note">
                Showing trains to all stations in the destination city. Trains may terminate at a different station from the one searched.
              </p>
              {results.length === 0 ? (
                <p className="ir-none">No trains found for the selected criteria. Try Flexible With Date or remove filters.</p>
              ) : (
                results.map((t) => (
                  <TrainCard key={`${t.no}-${shown.date}`} train={t} date={journey} quota={shown.quota} onBook={book} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- passengers ---------- */}
      {view === 'passengers' && picked ? (
        <div className="ir-pax">
          <ol className="ir-steps"><li className="is-on">Passenger Details</li><li>Review Journey</li><li>Payment</li></ol>
          <div className="ir-timer" role="timer">Session expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>

          <div className="ir-jcard">
            <strong>{picked.train.name} ({picked.train.no})</strong>
            <span>{picked.train.dep} {stationName(picked.train.from)} | {shortDate(picked.date)}</span>
            <span>→ {picked.train.arr} {stationName(picked.train.to)}</span>
            <span>{classLabel(picked.cls)} | {shown?.quota} | <b className={statusTone(picked.status)}>{picked.status}</b></span>
          </div>

          <h3>Passenger Details</h3>
          {pax.map((p, i) => (
            <fieldset key={i} className="ir-prow" aria-label={`Passenger ${i + 1}`}>
              <legend>Passenger {i + 1}</legend>
              <input type="text" aria-label="Passenger Name" placeholder="Name" maxLength={16} value={p.name} onChange={(e) => setP(i, { name: e.target.value })} />
              <input type="text" aria-label="Age" placeholder="Age" inputMode="numeric" value={p.age} onChange={(e) => setP(i, { age: e.target.value.replace(/\D/g, '') })} />
              <Dropdown label="Gender" placeholder="Gender" value={p.gender} options={['Male', 'Female', 'Transgender']} onChange={(v) => setP(i, { gender: v })} />
              <Dropdown label="Nationality" value="India" options={['India', 'Other']} onChange={() => {}} />
              <Dropdown label="Berth Preference" value={p.berth} options={['No Preference', 'Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper']} onChange={(v) => setP(i, { berth: v })} />
              {rajdhani ? (
                <Dropdown label="Catering Service Option" placeholder="Catering Service Option" value={p.food} options={['Veg', 'Non Veg', 'Jain Meal', 'No Food']} onChange={(v) => setP(i, { food: v })} />
              ) : null}
              {pax.length > 1 ? (
                <button type="button" className="ir-prm" aria-label={`Remove passenger ${i + 1}`} onClick={() => setPax(pax.filter((_, j) => j !== i))}>×</button>
              ) : null}
            </fieldset>
          ))}
          <div className="ir-padd">
            <button type="button" disabled={pax.length >= 6} onClick={() => setPax([...pax, { ...NO_PAX }])}>+ Add Passenger</button>
            <button type="button">+ Add Infant Without Berth</button>
          </div>

          <h3>Contact Details</h3>
          <p className="ir-contact">Ticket details will be sent to email and registered mobile number +91 98•••••421</p>

          <h3>Other Preferences</h3>
          <label><input type="checkbox" checked={prefs.upgrade} onChange={(e) => setPrefs({ ...prefs, upgrade: e.target.checked })} /> Consider for Auto Upgradation.</label>
          <label><input type="checkbox" checked={prefs.confirmOnly} onChange={(e) => setPrefs({ ...prefs, confirmOnly: e.target.checked })} /> Book only if confirm berths are allotted.</label>

          <h3>Travel Insurance (Incl. of GST)</h3>
          <div role="radiogroup" aria-label="Travel Insurance" className="ir-radios">
            <label><input type="radio" name="ir-ins" aria-label="Yes, and I accept the terms & conditions" checked={prefs.insurance === 'yes'} onChange={() => setPrefs({ ...prefs, insurance: 'yes' })} /> Yes, and I accept the terms &amp; conditions (₹0.45 per passenger)</label>
            <label><input type="radio" name="ir-ins" aria-label="No, I don't want travel insurance" checked={prefs.insurance === 'no'} onChange={() => setPrefs({ ...prefs, insurance: 'no' })} /> No, I don&rsquo;t want travel insurance</label>
          </div>

          <h3>Payment Mode</h3>
          <div role="radiogroup" aria-label="Payment Mode" className="ir-radios">
            <label><input type="radio" name="ir-pay" checked={prefs.pay === 'cards'} onChange={() => setPrefs({ ...prefs, pay: 'cards' })} /> Pay through Credit &amp; Debit Cards / Net Banking / Wallets / Bharat QR / Pay on Delivery</label>
            <label><input type="radio" name="ir-pay" checked={prefs.pay === 'upi'} onChange={() => setPrefs({ ...prefs, pay: 'upi' })} /> Pay through BHIM/UPI</label>
          </div>

          {paxErrors.length ? <Alert>{paxErrors.map((e) => <p key={e}>{e}</p>)}</Alert> : null}
          <div className="ir-pax-go">
            <button type="button" className="ir-back" onClick={() => setView('results')}>Back</button>
            <button type="button" className="ir-search" onClick={toReview}>Continue</button>
          </div>
        </div>
      ) : null}

      {/* ---------- review ---------- */}
      {view === 'review' && picked ? (
        <div className="ir-pax">
          <ol className="ir-steps"><li>Passenger Details</li><li className="is-on">Review Journey</li><li>Payment</li></ol>
          <div className="ir-timer" role="timer">Session expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>
          <div className="ir-jcard">
            <strong>{picked.train.name} ({picked.train.no})</strong>
            <span>{shortDate(picked.date)} | {classLabel(picked.cls)} | {shown?.quota}</span>
          </div>
          <table className="ir-review">
            <thead><tr><th>#</th><th>Name</th><th>Age</th><th>Gender</th><th>Berth</th><th>Status</th></tr></thead>
            <tbody>
              {pax.map((p, i) => (
                <tr key={i}><td>{i + 1}</td><td>{p.name}</td><td>{p.age}</td><td>{p.gender}</td><td>{p.berth}</td><td>{picked.status}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="ir-fare-t">
            <tbody>
              <tr><td>Ticket Fare</td><td>₹ {(fare * pax.length).toFixed(2)}</td></tr>
              <tr><td>Convenience Fee (Incl. of GST)</td><td>₹ 35.40</td></tr>
              <tr><td>Travel Insurance Premium (Incl. of GST)</td><td>₹ {prefs.insurance === 'yes' ? (0.45 * pax.length).toFixed(2) : '0.00'}</td></tr>
              <tr className="ir-total"><td>Total Fare</td><td>₹ {(fare * pax.length + 35.4 + (prefs.insurance === 'yes' ? 0.45 * pax.length : 0)).toFixed(2)}</td></tr>
            </tbody>
          </table>
          <div className="ir-captcha">
            <span className="ir-captcha-img" aria-label="Captcha image">{code}</span>
            <input type="text" aria-label="Enter Captcha" placeholder="Enter Captcha" value={captcha} onChange={(e) => setCaptcha(e.target.value)} />
          </div>
          {done ? (
            <Alert tone="info">This is where the payment gateway would open. Nothing was booked and nothing was charged — this is a demo of the flow.</Alert>
          ) : null}
          <div className="ir-pax-go">
            <button type="button" className="ir-back" onClick={() => setView('passengers')}>Back</button>
            <button type="button" className="ir-search" onClick={() => setDone(true)}>Continue</button>
          </div>
        </div>
      ) : null}

      <footer className="ir-foot">
        <LinkColumns columns={FOOTER} />
        <p className="ir-copy">Copyright © 2026 RailConnect Passenger Reservation System. All Rights Reserved. · A rebuilt specimen for a demo — not a railway website. · Compatible Browsers: Chrome, Firefox, Edge</p>
      </footer>

      {busy ? <Busy /> : null}

      {!lang ? (
        <Modal title="Alert">
          <div className="ir-lang">
            <span className="ir-logo" aria-hidden="true">IR</span>
            <p lang="hi">रेलकनेक्ट में आपका स्वागत है</p>
            <p><strong>Welcome to RailConnect</strong></p>
            <p lang="hi">कृपया अपनी पसंदीदा भाषा का चयन करें</p>
            <p>Please select your preferred language.</p>
            <div className="ir-lang-go">
              <button type="button" onClick={() => setLang('hi')}>हिंदी</button>
              <button type="button" onClick={() => setLang('en')}>English</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {login ? (
        <Modal title="LOGIN" onClose={() => setLogin(null)}>
          <div className="ir-login">
            <input type="text" aria-label="User Name" placeholder="User Name" />
            <input type="password" aria-label="Password" placeholder="Password" />
            <div className="ir-captcha">
              <span className="ir-captcha-img">X7K2P</span>
              <input type="text" aria-label="Enter Captcha" placeholder="Enter Captcha" />
            </div>
            <button type="button" className="ir-search" disabled>SIGN IN</button>
            <p className="ir-login-demo">Demo — nobody signs in here.</p>
            <button
              type="button"
              className="ir-guest"
              onClick={() => {
                setSignedIn(true)
                setPicked(login)
                setLogin(null)
                setView('passengers')
              }}
            >
              Continue as Guest (demo)
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
