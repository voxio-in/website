// The pages the navigator drives on /webnav.

import { useState } from 'react'

const CLINIC_DEPTS = [
  { id: 'hp-d-gen', label: 'General Medicine (OPD-1)' },
  { id: 'hp-d-cardio', label: 'Cardiology' },
  { id: 'hp-d-ctvs', label: 'Cardiothoracic & Vascular Surgery' },
  { id: 'hp-d-ortho', label: 'Orthopaedics' },
  { id: 'hp-d-ent', label: 'ENT' },
  { id: 'hp-d-derma', label: 'Dermatology & Venereology' },
]

const CLINIC_SLOTS = [
  { id: 'hp-s-1', doc: 'Dr S. Ramanathan', dept: 'Cardiology', day: 'Mon 02 Mar', time: '11:40', free: 0 },
  { id: 'hp-s-2', doc: 'Dr A. Varghese', dept: 'Cardiology', day: 'Tue 03 Mar', time: '09:20', free: 2 },
  { id: 'hp-s-3', doc: 'Dr N. Prasad', dept: 'Cardiology', day: 'Wed 04 Mar', time: '10:00', free: 0 },
  { id: 'hp-s-4', doc: 'Dr A. Varghese', dept: 'Cardiology', day: 'Thu 05 Mar', time: '12:10', free: 5 },
]

/* The appointment system every government hospital runs. Everything that makes
   it hard is deliberate and load-bearing for the demo: departments named for
   doctors rather than patients, most slots showing FULL, and a form that only
   appears once a slot is chosen. */
export function ClinicSurface() {
  const [dept, setDept] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const chosen = CLINIC_SLOTS.find((x) => x.id === slot)

  return (
    <div className="surface surface--clinic">
      <div className="hp-gov">
        <span className="hp-gov-emblem" aria-hidden="true" />
        <span>Government of India &middot; Ministry of Health &amp; Family Welfare</span>
        <span className="hp-gov-right">Screen Reader | A+ A A&minus; | हिन्दी</span>
      </div>

      <div className="hp-head">
        <div className="hp-mark" aria-hidden="true">CH</div>
        <div>
          <p className="hp-name">Civil Hospital</p>
          <p className="hp-sub">Hospital Management System &middot; Patient Services Portal v2.4</p>
        </div>
        <div className="hp-login">
          <button id="hp-login" type="button">Patient Login</button>
          <button id="hp-register" type="button">New Registration</button>
        </div>
      </div>

      <div className="hp-tabs">
        <span className="is-on">Book Appointment</span>
        <span>Lab Reports</span>
        <span>Blood Bank</span>
        <span>Ayushman Bharat</span>
        <span>Grievance</span>
      </div>

      <div className="hp-ticker">
        <strong>NOTICE</strong> OPD registration closes at 11:00 AM. Appointments booked
        online must be confirmed at Counter 4 with a valid ID before the slot time.
      </div>

      <div className="hp-body">
        <div className="hp-col">
          <p className="hp-step">Step 1 &mdash; Select Department</p>
          <div className="hp-depts">
            {CLINIC_DEPTS.map((d) => (
              <button
                key={d.id}
                id={d.id}
                type="button"
                className={`hp-dept${dept === d.id ? ' is-on' : ''}`}
                onClick={() => {
                  setDept(d.id)
                  setSlot(null)
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="hp-tiny">
            Department not listed? Report at the General OPD counter between 8:00 and 10:30 AM.
          </p>
        </div>

        <div className="hp-col hp-col--wide">
          <p className="hp-step">Step 2 &mdash; Select Slot</p>
          {!dept ? (
            <p className="hp-empty">Select a department to view available slots.</p>
          ) : (
            <table className="hp-slots">
              <thead>
                <tr>
                  <th>Consultant</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {CLINIC_SLOTS.map((r) => (
                  <tr key={r.id} className={r.free === 0 ? 'is-full' : ''}>
                    <td>{r.doc}</td>
                    <td>{r.day}</td>
                    <td>{r.time}</td>
                    <td>
                      {r.free === 0 ? (
                        <span className="hp-full">FULL</span>
                      ) : (
                        <button id={r.id} type="button" className="hp-take" onClick={() => setSlot(r.id)}>
                          {r.free} left &mdash; Book
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="hp-step">Step 3 &mdash; Patient Details</p>
          {!chosen ? (
            <p className="hp-empty">Details open once a slot is held.</p>
          ) : (
            <div className="hp-form">
              <p className="hp-held">
                Holding {chosen.day}, {chosen.time} with {chosen.doc}. This hold expires in 10 minutes.
              </p>
              <div className="hp-grid">
                <label htmlFor="hp-name">Patient Name (as per ID)</label>
                <input id="hp-name" type="text" />
                <label htmlFor="hp-age">Age</label>
                <input id="hp-age" type="text" />
                <label htmlFor="hp-gender">Gender</label>
                <select id="hp-gender" defaultValue="Select">
                  <option>Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
                <label htmlFor="hp-abha">ABHA / Health ID</label>
                <input id="hp-abha" type="text" />
                <label htmlFor="hp-phone">Mobile Number</label>
                <input id="hp-phone" type="text" />
                <label htmlFor="hp-reason">Reason for Visit</label>
                <textarea id="hp-reason" rows={2} />
              </div>
              <div className="hp-actions">
                <button className="hp-submit" id="hp-submit" type="button" onClick={() => setSent(true)}>
                  Confirm Appointment
                </button>
                <span className="hp-note" role="status" aria-live="polite">
                  {sent ? 'Pressed — nothing was sent. This portal is the demo.' : 'Nothing here is submitted anywhere.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="hp-foot" id="hp-what">
        Site designed and hosted by NIC. Best viewed in 1024&times;768 resolution.
      </p>
    </div>
  )
}

type Tab = 'home' | 'admissions' | 'academics' | 'exams' | 'services'

const UNI_MENUS: Record<Tab, { id: string; label: string }[]> = {
  home: [],
  admissions: [
    { id: 'uni-ad-ug', label: 'Undergraduate' },
    { id: 'uni-ad-pg', label: 'Postgraduate' },
    { id: 'uni-ad-scholarships', label: 'Scholarships' },
  ],
  academics: [
    { id: 'uni-ac-calendar', label: 'Academic Calendar' },
    { id: 'uni-ac-syllabus', label: 'Syllabus & Curriculum' },
    { id: 'uni-ac-fees', label: 'Fee Payment' },
  ],
  exams: [
    { id: 'uni-ex-timetable', label: 'Examination Timetable' },
    { id: 'uni-ex-results', label: 'Results' },
    { id: 'uni-ex-forms', label: 'Examination Forms' },
  ],
  services: [
    { id: 'uni-sv-certificates', label: 'Certificates' },
    { id: 'uni-sv-hostel', label: 'Hostel Allotment' },
    { id: 'uni-sv-grievance', label: 'Grievance Redressal' },
  ],
}

const UNI_NOTICES = [
  { id: 'uni-notice-1', date: '18 Oct', text: 'Semester V results declared — check Examinations › Results' },
  { id: 'uni-notice-2', date: '16 Oct', text: 'Re-evaluation window closes 21 Oct, forms under Examinations' },
  { id: 'uni-notice-3', date: '11 Oct', text: 'Diwali break: campus closed 29 Oct to 02 Nov' },
  { id: 'uni-notice-4', date: '04 Oct', text: 'NAAC peer team visit — students to carry ID cards at all times' },
]

export function UniversitySurface() {
  const [tab, setTab] = useState<Tab>('home')
  const [panel, setPanel] = useState<string | null>(null)

  const jump = (nextTab: Tab, nextPanel: string) => {
    setTab(nextTab)
    setPanel(nextPanel)
  }

  return (
    <div className="surface surface--uni">
      <div className="uni-utility">
        <span>A+ A A−</span>
        <span className="uni-utility-sep" />
        <span>Screen reader access</span>
        <div className="uni-utility-right">
          <button id="uni-top-alumni" type="button">Alumni</button>
          <button id="uni-top-careers" type="button">Careers</button>
          <button id="uni-top-naac" type="button">NAAC / IQAC</button>
          <button id="uni-top-login" type="button" className="uni-utility-cta">Student Login</button>
        </div>
      </div>

      <div className="uni-bar">
        <span className="uni-crest">MIT</span>
        <div>
          <p className="uni-name">Meridian Institute of Technology</p>
          <p className="uni-sub">Deemed to be University · Estd. 1978 · NAAC A++ Accredited</p>
        </div>
        <div className="uni-search">
          <input id="uni-search" type="text" placeholder="Search this site" />
          <button id="uni-search-go" type="button">Go</button>
        </div>
      </div>

      <div className="uni-tabs">
        {(
          [
            ['home', 'Home'],
            ['admissions', 'Admissions'],
            ['academics', 'Academics'],
            ['exams', 'Examinations'],
            ['services', 'Student Services'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            id={`uni-tab-${id}`}
            type="button"
            className={`uni-tab${tab === id ? ' is-on' : ''}`}
            onClick={() => {
              setTab(id)
              setPanel(null)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="uni-body">
        <nav className="uni-side">
          <p className="uni-side-head">
            {tab === 'home' ? 'Quick Links' : 'In this section'}
          </p>
          {UNI_MENUS[tab].length === 0 ? (
            <>
              <button id="uni-quick-results" type="button" className="uni-link" onClick={() => jump('exams', 'uni-ex-results')}>
                Results
              </button>
              <button id="uni-quick-fees" type="button" className="uni-link" onClick={() => jump('academics', 'uni-ac-fees')}>
                Pay Fees
              </button>
              <button id="uni-quick-forms" type="button" className="uni-link" onClick={() => jump('exams', 'uni-ex-forms')}>
                Download Forms
              </button>
              <button id="uni-quick-certificates" type="button" className="uni-link" onClick={() => jump('services', 'uni-sv-certificates')}>
                Certificates
              </button>
            </>
          ) : (
            UNI_MENUS[tab].map((item) => (
              <button
                key={item.id}
                id={item.id}
                type="button"
                className={`uni-link${panel === item.id ? ' is-on' : ''}`}
                onClick={() => setPanel(item.id)}
              >
                {item.label}
              </button>
            ))
          )}

          <div className="uni-side-ad">
            <p className="uni-ad-kicker">Admissions 2026</p>
            <p className="uni-ad-copy">Last date to apply: 30 November</p>
            <button id="uni-side-apply" type="button" className="uni-ad-btn">Apply Now</button>
          </div>
        </nav>

        <div className="uni-panel">
          {panel === null ? (
            <>
              <div className="uni-hero">
                <div className="uni-hero-copy">
                  <p className="uni-hero-kicker">Admissions Open 2026–27</p>
                  <h2 className="uni-hero-title">Engineering, Management &amp; Design</h2>
                  <p className="uni-hero-sub">
                    Ranked among the top 100 institutions nationally. Placements up to 42 LPA.
                    Applications close 30 November.
                  </p>
                  <button id="uni-hero-apply" type="button" className="uni-hero-btn">Apply Online</button>
                </div>
                <div className="uni-hero-art" aria-hidden="true" />
              </div>

              <div className="uni-stats">
                <div><strong>11,400</strong><span>Students</span></div>
                <div><strong>612</strong><span>Faculty</span></div>
                <div><strong>96%</strong><span>Placement</span></div>
                <div><strong>48</strong><span>Programmes</span></div>
              </div>

              <div className="uni-cols">
                <div>
                  <p className="uni-block-head">Latest Notices &amp; Circulars</p>
                  <ul className="uni-notices">
                    {UNI_NOTICES.map((n) => (
                      <li key={n.id}>
                        <button id={n.id} type="button" className="uni-notice-link">
                          <span className="uni-notice-date">{n.date}</span>
                          {n.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button id="uni-notice-all" type="button" className="uni-more">View all notices</button>
                </div>
                <div>
                  <p className="uni-block-head">Events</p>
                  <div className="uni-event">
                    <span className="uni-event-date">24 Oct</span>
                    <span>National Conference on Sustainable Computing</span>
                  </div>
                  <div className="uni-event">
                    <span className="uni-event-date">02 Nov</span>
                    <span>Industry Connect: Placement Preparation Workshop</span>
                  </div>
                  <div className="uni-event">
                    <span className="uni-event-date">14 Nov</span>
                    <span>Annual Technical Festival — Meridia 2026</span>
                  </div>
                  <p className="uni-marquee">
                    Attention students: portal will be unavailable Sunday 2 AM – 5 AM for scheduled
                    maintenance · Fee payment window open till 18 November · Re-evaluation forms close 21 October
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {panel === 'uni-ex-forms' ? (
            <>
              <p className="uni-breadcrumb">Home › Examinations › Examination Forms</p>
              <table className="uni-table">
                <thead>
                  <tr><th>Sr.</th><th>Form</th><th>Applicable</th><th>Last date</th><th>Download</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td><td>Examination Registration Form</td><td>All semesters</td><td>30 Sep</td>
                    <td><button id="uni-dl-exam" type="button" className="uni-dl">PDF</button></td>
                  </tr>
                  <tr>
                    <td>2</td><td>Backlog / Supplementary Form</td><td>Sem I – VIII</td><td>12 Oct</td>
                    <td><button id="uni-dl-backlog" type="button" className="uni-dl">PDF</button></td>
                  </tr>
                  <tr id="uni-row-reval">
                    <td>3</td><td>Re-evaluation of Answer Script</td><td>Sem V</td><td>21 Oct</td>
                    <td><button id="uni-dl-reval" type="button" className="uni-dl">PDF</button></td>
                  </tr>
                  <tr>
                    <td>4</td><td>Transcript Request Form</td><td>Graduating batch</td><td>Rolling</td>
                    <td><button id="uni-dl-transcript" type="button" className="uni-dl">PDF</button></td>
                  </tr>
                </tbody>
              </table>
              <p className="uni-fine">
                Duly filled forms to be submitted at the Examination Section (Block C, Room 114)
                along with the fee receipt. Forms received after the last date attract a late fee.
              </p>
            </>
          ) : null}

          {panel === 'uni-ex-results' ? (
            <>
              <p className="uni-breadcrumb">Home › Examinations › Results</p>
              <table className="uni-table">
                <thead><tr><th>Semester</th><th>Declared</th><th>SGPA</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td>Semester III</td><td>28 Nov</td><td>7.9</td><td>Pass</td></tr>
                  <tr><td>Semester IV</td><td>02 Jun</td><td>8.1</td><td>Pass</td></tr>
                  <tr><td>Semester V</td><td>14 Oct</td><td>7.6</td><td>Pass</td></tr>
                </tbody>
              </table>
              <p className="uni-fine">
                Students seeking re-evaluation must apply within seven days of declaration using the
                prescribed form available under Examination Forms.
              </p>
            </>
          ) : null}

          {panel === 'uni-ac-fees' ? (
            <>
              <p className="uni-breadcrumb">Home › Academics › Fee Payment</p>
              <p className="uni-copy">
                Semester VI fee payment window is open from 01 Nov to <strong>18 Nov</strong>. A late
                fee of one thousand rupees applies from 19 Nov. Payment is accepted online only; the
                counter does not accept cash.
              </p>
              <table className="uni-table">
                <thead><tr><th>Head</th><th>Amount</th></tr></thead>
                <tbody>
                  <tr><td>Tuition fee</td><td>₹62,000</td></tr>
                  <tr><td>Examination fee</td><td>₹3,500</td></tr>
                  <tr><td>Hostel (optional)</td><td>₹48,000</td></tr>
                </tbody>
              </table>
            </>
          ) : null}

          {panel === 'uni-sv-certificates' ? (
            <>
              <p className="uni-breadcrumb">Home › Student Services › Certificates</p>
              <table className="uni-table">
                <thead><tr><th>Certificate</th><th>Processing</th><th>Fee</th><th>Apply</th></tr></thead>
                <tbody>
                  <tr id="uni-row-bonafide">
                    <td>Bonafide Certificate</td><td>3 working days</td><td>₹100</td>
                    <td><button id="uni-dl-bonafide" type="button" className="uni-dl">Form</button></td>
                  </tr>
                  <tr>
                    <td>Transfer Certificate</td><td>10 working days</td><td>₹500</td>
                    <td><button id="uni-dl-tc" type="button" className="uni-dl">Form</button></td>
                  </tr>
                  <tr>
                    <td>Migration Certificate</td><td>15 working days</td><td>₹750</td>
                    <td><button id="uni-dl-migration" type="button" className="uni-dl">Form</button></td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : null}

          {panel &&
          !['uni-ex-forms', 'uni-ex-results', 'uni-ac-fees', 'uni-sv-certificates'].includes(panel) ? (
            <>
              <p className="uni-breadcrumb">Home › Section</p>
              <p className="uni-copy">
                This page is being updated. Kindly refer to the notice board or contact the section
                office between 10 AM and 4 PM on working days.
              </p>
            </>
          ) : null}
        </div>
      </div>

      <div className="uni-foot">
        <span>© 2026 Meridian Institute of Technology · Block A, Meridian Campus, Bengaluru 560064</span>
        <span>Website last updated: 18 Oct 2026 · Visitors: 4,912,338</span>
      </div>
    </div>
  )
}

const TRAINS = [
  {
    no: '12951',
    name: 'Rajdhani Express',
    dep: '16:35',
    arr: '22:10',
    dur: '5h 35m',
    cls: '3A · 2A · 1A',
    avail: 'AVAILABLE 24',
    fare: '₹1,845',
    days: 'M T W T F S S',
  },
  {
    no: '12015',
    name: 'Shatabdi Express',
    dep: '06:10',
    arr: '10:40',
    dur: '4h 30m',
    cls: 'CC · EC',
    avail: 'RAC 11',
    fare: '₹1,120',
    days: 'M T W T F S —',
  },
  {
    no: '19711',
    name: 'Intercity Express',
    dep: '14:40',
    arr: '21:15',
    dur: '6h 35m',
    cls: 'SL · 3A',
    avail: 'WL 8',
    fare: '₹465',
    days: '— T — T — S —',
  },
]

export function RailSurface() {
  const [searched, setSearched] = useState(false)
  const [train, setTrain] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)

  return (
    <div className="surface surface--rail">
      <div className="rail-top">
        <span>Indian Railways Catering and Tourism Corporation</span>
        <div className="rail-top-right">
          <button id="rail-lang" type="button">हिंदी</button>
          <button id="rail-login" type="button" className="rail-top-cta">Login</button>
          <button id="rail-register" type="button">Register</button>
        </div>
      </div>

      <div className="rail-bar">
        <span className="rail-logo">IR</span>
        <div>
          <p className="rail-name">Passenger Reservation System</p>
          <p className="rail-sub">Book Ticket · Cancel · PNR Status · Charts</p>
        </div>
        <div className="rail-nav">
          <button id="rail-nav-book" type="button" className="is-on">BOOK TICKET</button>
          <button id="rail-nav-pnr" type="button">PNR STATUS</button>
          <button id="rail-nav-charts" type="button">CHARTS / VACANCY</button>
          <button id="rail-nav-holidays" type="button">HOLIDAY PACKAGES</button>
        </div>
      </div>

      <div className="rail-main">
        <div className="rail-left">
          <div className="rail-form">
            <label className="rail-field">
              <span>From</span>
              <input id="rail-from" type="text" placeholder="Station" />
            </label>
            <label className="rail-field">
              <span>To</span>
              <input id="rail-to" type="text" placeholder="Station" />
            </label>
            <label className="rail-field">
              <span>Journey date</span>
              <input id="rail-date" type="text" placeholder="14 March" />
            </label>
            <label className="rail-field">
              <span>Class</span>
              <select id="rail-class" defaultValue="All classes">
                <option>All classes</option>
                <option>Sleeper (SL)</option>
                <option>AC 3 Tier (3A)</option>
                <option>AC 2 Tier (2A)</option>
                <option>AC First (1A)</option>
              </select>
            </label>
            <label className="rail-field">
              <span>Quota</span>
              <select id="rail-quota" defaultValue="General">
                <option>General</option>
                <option>Tatkal</option>
                <option>Ladies</option>
                <option>Senior Citizen</option>
              </select>
            </label>
            <button
              id="rail-search"
              type="button"
              className="rail-go"
              onClick={() => {
                setSearched(true)
                setTrain(null)
                setPaid(false)
              }}
            >
              Search
            </button>
          </div>

          {searched ? (
            <div className="rail-results">
              <p className="rail-results-head">3 trains found · fares shown for one adult</p>
              {TRAINS.map((t) => (
                <div key={t.no} className={`rail-train${train === t.no ? ' is-on' : ''}`}>
                  <div className="rail-train-main">
                    <p className="rail-train-name">
                      {t.name} <span className="rail-no">{t.no}</span>
                    </p>
                    <p className="rail-days">Runs on: {t.days}</p>
                    <p className="rail-times">
                      <strong>{t.dep}</strong> → <strong>{t.arr}</strong> · {t.dur} · {t.cls}
                    </p>
                  </div>
                  <div className="rail-train-avail">
                    <span className={`rail-avail${t.avail.startsWith('AVAILABLE') ? ' is-free' : ''}`}>
                      {t.avail}
                    </span>
                    <span className="rail-fare">{t.fare}</span>
                    <button id={`rail-book-${t.no}`} type="button" className="rail-book" onClick={() => setTrain(t.no)}>
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rail-empty">Enter your journey and press Search.</p>
          )}

          {train ? (
            <div className="rail-pax">
              <p className="rail-pax-head">Passenger details · Train {train}</p>
              <div className="rail-pax-grid">
                <label className="rail-field">
                  <span>Name</span>
                  <input id="rail-pname" type="text" placeholder="As on ID" />
                </label>
                <label className="rail-field">
                  <span>Age</span>
                  <input id="rail-page" type="text" placeholder="28" />
                </label>
                <label className="rail-field">
                  <span>Gender</span>
                  <select id="rail-pgender" defaultValue="Male">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="rail-field">
                  <span>Berth preference</span>
                  <select id="rail-berth" defaultValue="No preference">
                    <option>No preference</option>
                    <option>Lower</option>
                    <option>Middle</option>
                    <option>Upper</option>
                    <option>Side lower</option>
                  </select>
                </label>
              </div>
              <div className="rail-pay-row">
                <button id="rail-pay" type="button" className="rail-go" onClick={() => setPaid(true)}>
                  Proceed to pay
                </button>
                <span className="rail-note" role="status" aria-live="polite">
                  {paid
                    ? 'Pressed — nothing was booked. This is a demo of the flow.'
                    : 'Nothing is booked and no payment is taken.'}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="rail-side">
          <div className="rail-promo">
            <p className="rail-promo-kicker">Travel Insurance</p>
            <p className="rail-promo-copy">Cover up to ₹10 lakh for ₹0.45 per passenger.</p>
          </div>
          <div className="rail-promo rail-promo--alt">
            <p className="rail-promo-kicker">IRCTC Tourism</p>
            <p className="rail-promo-copy">Bharat Gaurav · Ramayana Yatra · 17 nights</p>
          </div>
          <div className="rail-panel">
            <p className="rail-panel-head">Quick Links</p>
            <ul>
              <li>Cancel Ticket</li>
              <li>Refund Status</li>
              <li>Boarding Point Change</li>
              <li>Track Your Train</li>
            </ul>
          </div>
          <div className="rail-panel">
            <p className="rail-panel-head">Alerts</p>
            <p className="rail-alert">
              Booking for Tatkal opens at 10:00 AM for AC classes and 11:00 AM for non-AC classes,
              one day in advance excluding the date of journey.
            </p>
          </div>
        </aside>
      </div>

      <div className="rail-foot">
        <span>Terms · Privacy · Refund Rules · Contact Us · Sitemap</span>
        <span>Site best viewed in Internet Explorer 11+, Chrome 60+ at 1024 × 768 resolution</span>
      </div>
    </div>
  )
}

type Product = {
  id: number
  name: string
  price: number
  mrp: number
  category: string
  stock: boolean
  rating: number
  tag?: string
}

const PRODUCTS: Product[] = [
  { id: 1, name: 'Trail running shoes', price: 3200, mrp: 4999, category: 'Footwear', stock: true, rating: 4.4, tag: 'Bestseller' },
  { id: 2, name: 'Road running shoes', price: 4500, mrp: 6499, category: 'Footwear', stock: true, rating: 4.6 },
  { id: 3, name: 'Canvas sneakers', price: 1400, mrp: 1999, category: 'Footwear', stock: false, rating: 4.0 },
  { id: 4, name: 'Wireless earbuds', price: 2900, mrp: 4999, category: 'Electronics', stock: true, rating: 4.2, tag: 'Deal' },
  { id: 5, name: 'Bluetooth speaker', price: 4100, mrp: 5499, category: 'Electronics', stock: true, rating: 4.3 },
  { id: 6, name: 'Noise cancelling headphones', price: 9400, mrp: 12999, category: 'Electronics', stock: true, rating: 4.7, tag: 'Top rated' },
  { id: 7, name: 'Cast iron pan', price: 2200, mrp: 2999, category: 'Home', stock: true, rating: 4.5 },
  { id: 8, name: 'Cotton bedsheet set', price: 1800, mrp: 2499, category: 'Home', stock: true, rating: 4.1 },
  { id: 9, name: 'Wooden stacking blocks', price: 900, mrp: 1299, category: 'Toys', stock: true, rating: 4.8, tag: 'Ages 1+' },
  { id: 10, name: 'Wooden train set', price: 2600, mrp: 3499, category: 'Toys', stock: true, rating: 4.6 },
  { id: 11, name: 'Plastic ride-on car', price: 3400, mrp: 4499, category: 'Toys', stock: false, rating: 3.9 },
  { id: 12, name: 'Yoga mat', price: 1100, mrp: 1599, category: 'Fitness', stock: true, rating: 4.3 },
  { id: 13, name: 'Adjustable dumbbells', price: 7800, mrp: 9999, category: 'Fitness', stock: true, rating: 4.5 },
]

const BUDGETS: Record<string, number> = {
  'Under 1000': 1000,
  'Under 3000': 3000,
  'Under 5000': 5000,
  'Under 10000': 10000,
}

export function ShopSurface() {
  const [draft, setDraft] = useState({
    q: '',
    category: 'All categories',
    budget: 'Any price',
    inStock: false,
  })
  const [applied, setApplied] = useState(draft)
  const [cart, setCart] = useState<Product[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const shown = PRODUCTS.filter((p) => {
    if (applied.q && !p.name.toLowerCase().includes(applied.q.toLowerCase())) return false
    if (applied.category !== 'All categories' && p.category !== applied.category) return false
    const cap = BUDGETS[applied.budget]
    if (cap && p.price > cap) return false
    if (applied.inStock && !p.stock) return false
    return true
  })

  const total = cart.reduce((sum, p) => sum + p.price, 0)

  return (
    <div className="surface surface--shop">
      <div className="shop-strip">
        Free delivery over ₹499 · Easy 7-day returns · Pay on delivery available
      </div>

      <div className="shop-bar">
        <span className="shop-logo">bazaar</span>
        <input
          id="shop-search"
          type="text"
          placeholder="Search 2,400 products"
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
        />
        <button id="shop-cart" type="button" className="shop-cart" onClick={() => setCartOpen((v) => !v)}>
          Cart <span className="shop-count">{cart.length}</span>
        </button>
      </div>

      <div className="shop-catbar">
        {['Footwear', 'Electronics', 'Home', 'Toys', 'Fitness', 'Beauty', 'Grocery', 'Books'].map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>

      <div className="shop-hero">
        <div>
          <p className="shop-hero-kicker">Festive Days · ends tonight</p>
          <p className="shop-hero-title">Up to 60% off across categories</p>
        </div>
        <button id="shop-deal" type="button" className="shop-hero-btn">See all deals</button>
      </div>

      <div className="shop-main">
        <aside className="shop-filters">
          <p className="shop-filter-head">Filters</p>
          <label className="shop-filter">
            <span>Category</span>
            <select id="shop-category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              <option>All categories</option>
              <option>Footwear</option>
              <option>Electronics</option>
              <option>Home</option>
              <option>Toys</option>
              <option>Fitness</option>
            </select>
          </label>
          <label className="shop-filter">
            <span>Budget</span>
            <select id="shop-budget" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })}>
              <option>Any price</option>
              <option>Under 1000</option>
              <option>Under 3000</option>
              <option>Under 5000</option>
              <option>Under 10000</option>
            </select>
          </label>
          <label className="shop-check">
            <input
              id="shop-instock"
              type="checkbox"
              checked={draft.inStock}
              onChange={(e) => setDraft({ ...draft, inStock: e.target.checked })}
            />
            In stock only
          </label>
          <button id="shop-apply" type="button" className="shop-apply" onClick={() => setApplied(draft)}>
            Apply
          </button>
          <p className="shop-filter-note">{shown.length} of {PRODUCTS.length} shown</p>
        </aside>

        <div className="shop-right">
          {cartOpen ? (
            <div className="shop-cart-panel">
              <p className="shop-cart-head">Your cart</p>
              {cart.length === 0 ? (
                <p className="shop-empty">Nothing in it yet.</p>
              ) : (
                <>
                  {cart.map((p, i) => (
                    <p key={`${p.id}-${i}`} className="shop-cart-row">
                      {p.name} <span>₹{p.price.toLocaleString('en-IN')}</span>
                    </p>
                  ))}
                  <p className="shop-cart-total">
                    Total <span>₹{total.toLocaleString('en-IN')}</span>
                  </p>
                </>
              )}
            </div>
          ) : null}

          <div className="shop-grid">
            {shown.map((p) => (
              <div key={p.id} className="shop-item">
                <div className="shop-thumb" aria-hidden="true">
                  {p.tag ? <span className="shop-tag">{p.tag}</span> : null}
                </div>
                <p className="shop-item-name">{p.name}</p>
                <p className="shop-item-rating">
                  {'★'.repeat(Math.round(p.rating))}
                  <span className="shop-item-rating-num">{p.rating.toFixed(1)}</span>
                </p>
                <p className="shop-item-meta">
                  <strong>₹{p.price.toLocaleString('en-IN')}</strong>{' '}
                  <s>₹{p.mrp.toLocaleString('en-IN')}</s>
                  {p.stock ? '' : ' · out of stock'}
                </p>
                <button
                  id={`shop-add-${p.id}`}
                  type="button"
                  className="shop-add"
                  disabled={!p.stock}
                  onClick={() => {
                    setCart((c) => [...c, p])
                    setCartOpen(true)
                  }}
                >
                  {p.stock ? 'Add to cart' : 'Unavailable'}
                </button>
              </div>
            ))}
            {shown.length === 0 ? <p className="shop-empty">Nothing matches those filters.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
