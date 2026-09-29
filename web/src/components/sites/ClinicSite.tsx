// The hospital appointment portal, rebuilt from the national one.
//
// The real thing is a seven-step wizard that starts with a map of India: pick a
// state, find one hospital among ninety-odd in Delhi (two of them named almost
// exactly like yours), choose the mode and the appointment type, pick a
// department from a list written for doctors, find a day on a calendar where
// the nearest date is always full, then prove who you are with a code sent to
// a phone. Everything is here, in that order, because that order is the
// reason people ring the desk.

import { useMemo, useState } from 'react'

import { Alert, Busy, Dropdown, LinkColumns, useBusy } from '#/components/sites/kit'
import {
  dayLabel,
  dayState,
  DEPARTMENTS,
  HOSPITALS,
  STATES,
  WALK_IN_ONLY,
} from '#/lib/sites/clinic'
import { hash, startOfDay } from '#/lib/sites/util'

type Step = 'home' | 'state' | 'hospital' | 'mode' | 'type' | 'dept' | 'date' | 'login' | 'details' | 'slip'

const STEPS: { key: Step[]; label: string }[] = [
  { key: ['state', 'hospital'], label: 'Select State/Hospital' },
  { key: ['mode'], label: 'Select Mode of Appointment' },
  { key: ['type'], label: 'Select Appointment Type' },
  { key: ['dept'], label: 'Select Department' },
  { key: ['date'], label: 'Select Date of Appointment' },
  { key: ['login', 'details'], label: 'Register/Login' },
  { key: ['slip'], label: 'Get Confirmation SMS' },
]

const FOOTER = [
  { head: 'Useful Links', links: ['Health Portal', 'Digital Health Mission', 'Health Department', 'Citizen Services', 'Open Data', 'Public Grievances'] },
  { head: 'Help', links: ['FAQs', 'User Manual', 'Feedback', 'Contact Us', 'List of Nodal Officers', 'Participating Hospitals'] },
  { head: 'Policies', links: ['Website Policies', 'Privacy Policy', 'Terms & Conditions', 'Accessibility Statement', 'Hyperlink Policy', 'Copyright Policy'] },
  { head: 'Services', links: ['Book Appointment', 'Lab Reports', 'Blood Availability', 'Online Payment', 'e-OPD Card', 'Teleconsultation'] },
]

const DISTRICTS = ['Central', 'East', 'New Delhi', 'North', 'North East', 'North West', 'Shahdara', 'South', 'South East', 'South West', 'West']

export function ClinicSite() {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [step, setStep] = useState<Step>('home')
  const [tab, setTab] = useState<'STATE' | 'AIIMS' | 'DEFENCE(AFMS)'>('STATE')
  const [state, setState] = useState('')
  const [hq, setHq] = useState('')
  const [hospital, setHospital] = useState('')
  const [mode, setMode] = useState('')
  const [type, setType] = useState('')
  const [dept, setDept] = useState('')
  const [deptError, setDeptError] = useState('')
  const [offset, setOffset] = useState<number | null>(null)
  const [slot, setSlot] = useState('')
  const [week, setWeek] = useState(0)
  const [mobile, setMobile] = useState('')
  const [otpSent, setOtpSent] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [d, setD] = useState({ name: '', gender: '', age: '', abha: '', district: '', address: '', complaint: '', agree: false })
  const [errors, setErrors] = useState<string[]>([])
  const [busy, run] = useBusy()

  const go = (next: Step, ms = 700) => run(ms, () => setStep(next))

  const hospitals = (HOSPITALS[state] ?? []).filter((h) => !hq || h.toLowerCase().includes(hq.toLowerCase()))
  const days = dept ? Array.from({ length: 14 }, (_, i) => dayState(dept, today, week * 14 + i + 1)) : []
  const chosenDay = offset !== null && dept ? dayState(dept, today, offset) : null

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setOtpError('Please enter a valid 10 digit mobile number.')
      return
    }
    setOtpError('')
    run(900, () => setOtpSent(String(100000 + (hash(mobile + Date.now()) % 900000))))
  }

  const verify = () => {
    if (otp !== otpSent) {
      setOtpError('Invalid OTP. Please try again.')
      return
    }
    setOtpError('')
    go('details', 800)
  }

  const book = () => {
    const errs: string[] = []
    if (d.name.trim().length < 3) errs.push('Patient Name is required.')
    if (!d.gender) errs.push('Please select Gender.')
    const age = Number(d.age)
    if (!d.age || !Number.isInteger(age) || age < 0 || age > 120) errs.push('Please enter a valid Age.')
    if (d.abha && !/^\d{2}-?\d{4}-?\d{4}-?\d{4}$/.test(d.abha.trim())) errs.push('ABHA Number must be 14 digits (XX-XXXX-XXXX-XXXX).')
    if (!d.district) errs.push('Please select District.')
    if (!d.agree) errs.push('Please accept the declaration to proceed.')
    setErrors(errs)
    if (!errs.length) go('slip', 1100)
  }

  const inWizard = step !== 'home'
  const stepIndex = STEPS.findIndex((s) => s.key.includes(step))

  return (
    <div className="surface site-ors">
      <div className="ors-strip">
        <span className="ors-plus" aria-hidden="true">+</span>
        <span className="ors-red">MEDICAL CARE</span>
        <span>A DIGITAL INDIA INITIATIVE</span>
        <span className="ors-strip-r">
          {['Download the app from playstore', 'FAQs', 'Feedback', 'Contact', 'Whats New', 'List of Nodal Officers'].map((l) => (
            <a key={l} href="#" onClick={(e) => e.preventDefault()}>{l}</a>
          ))}
          <Dropdown label="Language" value="English" options={['English', 'हिन्दी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'मराठी']} onChange={() => {}} className="ors-lang" />
        </span>
      </div>

      <header className="ors-head">
        <span className="ors-logo">eOPD</span>
        <span className="ors-name">Online OPD Registration</span>
        <nav className="ors-nav">
          <a href="#" aria-label="Home" onClick={(e) => { e.preventDefault(); setStep('home') }}>⌂</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Dashboard</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Create ABHA(Health ID)</a>
          <button type="button" className="ors-cta">Register/Login</button>
        </nav>
      </header>

      <p className="ors-banner">Online OPD Registration is a public initiative to provide online access to government hospital services for patients, integrated with the national health ID.</p>

      {/* ---------- home ---------- */}
      {step === 'home' ? (
        <>
          <section className="ors-hero">
            <div>
              <p className="ors-hero-t">Now getting an OPD appointment, lab reports and blood availability in any government hospital has become online and easy.</p>
              <button type="button" className="ors-cta">Register/Login</button>
            </div>
            <ol className="ors-hero-steps" aria-hidden="true">
              <li>Verify Using Mobile Number</li><li>Select Hospital &amp; Department</li><li>Check Availability</li>
              <li>Select Date &amp; Book Appointment</li><li>Aadhaar Verification (Optional)</li><li>Get Confirmation SMS</li>
            </ol>
          </section>
          <div className="ors-actions">
            <button type="button" className="ors-big ors-big--a" onClick={() => go('state', 600)}>Book Appointment</button>
            <button type="button" className="ors-big ors-big--b">Book Teleconsultation Appointment</button>
            <button type="button" className="ors-big ors-big--c">Scan and Share</button>
          </div>
          <h2 className="ors-h2">Other Facilities</h2>
          <div className="ors-facilities">
            {['e-OPD Card', 'Payments', 'Lab Report', 'Blood Availability', 'Appointment Status', 'Cancel Appointment', 'Hospital Directory', 'Grievance'].map((x) => (
              <a key={x} href="#" className="ors-fac" onClick={(e) => e.preventDefault()}><span aria-hidden="true" />{x}</a>
            ))}
          </div>
          <h2 className="ors-h2">Integrated with ABHA (Health ID)</h2>
          <p className="ors-copy">ABHA (earlier known as Health ID) is an acronym for Ayushman Bharat Health Account. Using ABHA is the first step towards creating safer and efficient digital health records for you and your family. It enables your interaction with participating healthcare providers, and allows you to receive your digital lab reports, prescriptions and diagnosis seamlessly from verified healthcare professionals and health service providers.</p>
          <div className="ors-stats">
            {[['1,21,480,337', 'Appointments Booked'], ['1,024', 'Hospitals Onboarded'], ['36', 'States / UTs'], ['38,902', 'Departments']].map(([n, l]) => (
              <div key={l}><strong>{n}</strong><span>{l}</span></div>
            ))}
          </div>
        </>
      ) : null}

      {/* ---------- the wizard ---------- */}
      {inWizard ? (
        <div className="ors-wizard">
          <aside className="ors-steps" aria-label="Appointment steps">
            <p className="ors-steps-h">Need an appointment?</p>
            <p className="ors-steps-s">Follow the simple steps below and get your appointment fixed online!</p>
            <ol>
              {STEPS.map((s, i) => (
                <li key={s.label} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-on' : ''}>{s.label}</li>
              ))}
            </ol>
            {hospital ? (
              <dl className="ors-summary">
                <dt>Hospital</dt><dd>{hospital}</dd>
                {mode ? <><dt>Mode</dt><dd>{mode}</dd></> : null}
                {type ? <><dt>Type</dt><dd>{type}</dd></> : null}
                {dept && step !== 'dept' ? <><dt>Department</dt><dd>{dept}</dd></> : null}
                {chosenDay && slot ? <><dt>Slot</dt><dd>{dayLabel(chosenDay.date)}, {slot}</dd></> : null}
              </dl>
            ) : null}
          </aside>

          <main className="ors-panel">
            {step === 'state' ? (
              <>
                <div className="ors-tabs" role="tablist" aria-label="Hospital type">
                  {(['STATE', 'AIIMS', 'DEFENCE(AFMS)'] as const).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>
                  ))}
                </div>
                {tab === 'STATE' ? (
                  <div className="ors-states">
                    {STATES.map((s) => (
                      <button key={s} type="button" onClick={() => { setState(s); setHq(''); go('hospital', 800) }}>{s}</button>
                    ))}
                  </div>
                ) : (
                  <div className="ors-states">
                    {(tab === 'AIIMS'
                      ? ['AIIMS New Delhi', 'AIIMS Bhopal', 'AIIMS Bhubaneswar', 'AIIMS Jodhpur', 'AIIMS Patna', 'AIIMS Raipur', 'AIIMS Rishikesh', 'AIIMS Nagpur', 'AIIMS Mangalagiri', 'AIIMS Gorakhpur', 'AIIMS Bathinda', 'AIIMS Deoghar']
                      : ['Army Hospital (R&R)', 'Base Hospital Delhi Cantt', 'Command Hospital (WC)', 'INHS Asvini', 'Air Force Central Medical Establishment']
                    ).map((h) => (
                      <button key={h} type="button" onClick={() => { setHospital(h); go('mode') }}>{h}</button>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {step === 'hospital' ? (
              <>
                <p className="ors-back"><a href="#" onClick={(e) => { e.preventDefault(); setStep('state') }}>‹ Change State</a> · {state}</p>
                <h3>Select Hospital</h3>
                <input type="text" className="ors-input" aria-label="Type Hospital Name" placeholder="Type Hospital Name" value={hq} onChange={(e) => setHq(e.target.value)} />
                <p className="ors-count">{hospitals.length} hospitals</p>
                <ul className="ors-hlist">
                  {hospitals.map((h) => (
                    <li key={h}><button type="button" onClick={() => { setHospital(h); go('mode') }}>{h}</button></li>
                  ))}
                </ul>
              </>
            ) : null}

            {step === 'mode' ? (
              <>
                <h3>Select Mode of Appointment</h3>
                <div className="ors-cards">
                  {['Physical Appointment (Visit Hospital)', 'Teleconsultation (Video Call)'].map((m) => (
                    <button key={m} type="button" onClick={() => { setMode(m); go('type', 500) }}>{m}</button>
                  ))}
                </div>
                <p className="ors-note">Teleconsultation is available only for follow-up patients in select departments.</p>
              </>
            ) : null}

            {step === 'type' ? (
              <>
                <h3>Select Appointment Type</h3>
                <div className="ors-cards">
                  {['New Appointment', 'Follow-up (Old UHID / Referral)'].map((t) => (
                    <button key={t} type="button" onClick={() => { setType(t); go('dept', 500) }}>{t}</button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 'dept' ? (
              <>
                <h3>Select Department</h3>
                <p className="ors-note">{hospital} · {DEPARTMENTS.length} departments</p>
                <Dropdown
                  label="Department"
                  placeholder="Select Department"
                  value={dept}
                  options={DEPARTMENTS}
                  searchable
                  onChange={(v) => { setDept(v); setDeptError(''); setOffset(null); setSlot(''); setWeek(0) }}
                />
                {deptError ? <Alert>{deptError}</Alert> : null}
                <button
                  type="button"
                  className="ors-go"
                  onClick={() => {
                    if (!dept) return setDeptError('Please select a department.')
                    if (dept === WALK_IN_ONLY) return setDeptError('Emergency services do not require an appointment. Please report directly to the Casualty, Gate No. 2 — open 24×7.')
                    go('date', 900)
                  }}
                >
                  Proceed
                </button>
              </>
            ) : null}

            {step === 'date' ? (
              <>
                <p className="ors-back"><a href="#" onClick={(e) => { e.preventDefault(); setStep('dept') }}>‹ Change Department</a> · {dept}</p>
                <h3>Select Date of Appointment</h3>
                <div className="ors-legend"><span className="is-open">Available</span><span className="is-full">Full</span><span className="is-closed">OPD not scheduled / Holiday</span></div>
                <div className="ors-weeknav">
                  <button type="button" disabled={week === 0} onClick={() => setWeek(0)}>‹ Previous</button>
                  <button type="button" disabled={week === 1} onClick={() => setWeek(1)}>Next ›</button>
                </div>
                <div className="ors-cal" role="grid" aria-label="Appointment dates">
                  {days.map((s) => {
                    const free = s.slots.reduce((n, x) => n + x.left, 0)
                    const cls = !s.open ? 'is-closed' : free === 0 ? 'is-full' : 'is-open'
                    const off = Math.round((+s.date - +today) / 86400000)
                    return (
                      <button
                        key={off}
                        type="button"
                        role="gridcell"
                        aria-label={`${dayLabel(s.date)} ${!s.open ? 'OPD not scheduled' : free === 0 ? 'Full' : `${free} slots available`}`}
                        disabled={!s.open || free === 0}
                        className={`${cls}${offset === off ? ' is-on' : ''}`}
                        onClick={() => { setOffset(off); setSlot('') }}
                      >
                        <span>{dayLabel(s.date)}</span>
                        <small>{!s.open ? '—' : free === 0 ? 'Full' : `${free} left`}</small>
                      </button>
                    )
                  })}
                </div>
                {chosenDay ? (
                  <div className="ors-slots" role="radiogroup" aria-label="Time slot">
                    <p>Slots on {dayLabel(chosenDay.date)}</p>
                    {chosenDay.slots.map((x) => (
                      <label key={x.window} className={x.left ? '' : 'is-full'}>
                        <input type="radio" name="ors-slot" disabled={!x.left} checked={slot === x.window} onChange={() => setSlot(x.window)} />
                        {x.window} <small>{x.left ? `${x.left} available` : 'Full'}</small>
                      </label>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="ors-go" disabled={!slot} onClick={() => go('login', 700)}>Proceed</button>
              </>
            ) : null}

            {step === 'login' ? (
              <>
                <h3>Register/Login</h3>
                <p className="ors-note">An OTP will be sent to the patient&rsquo;s mobile number for verification.</p>
                <div className="ors-row">
                  <input type="text" className="ors-input" aria-label="Mobile Number" placeholder="Enter Mobile Number" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} />
                  <button type="button" className="ors-go" onClick={sendOtp}>{otpSent ? 'Resend OTP' : 'Get OTP'}</button>
                </div>
                {otpSent ? (
                  <div className="ors-row">
                    <input type="text" className="ors-input" aria-label="Enter OTP" placeholder="Enter 6 digit OTP" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                    <button type="button" className="ors-go" onClick={verify}>Verify OTP</button>
                  </div>
                ) : null}
                {otpError ? <Alert>{otpError}</Alert> : null}
              </>
            ) : null}

            {step === 'details' ? (
              <>
                <h3>Patient Details</h3>
                <div className="ors-form">
                  <label>Patient Name*<input type="text" aria-label="Patient Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
                  <div role="radiogroup" aria-label="Gender" className="ors-radios">
                    <span>Gender*</span>
                    {['Male', 'Female', 'Transgender'].map((g) => (
                      <label key={g}><input type="radio" name="ors-g" checked={d.gender === g} onChange={() => setD({ ...d, gender: g })} /> {g}</label>
                    ))}
                  </div>
                  <label>Age (Years)*<input type="text" aria-label="Age (Years)" inputMode="numeric" value={d.age} onChange={(e) => setD({ ...d, age: e.target.value.replace(/\D/g, '') })} /></label>
                  <label>Mobile Number<input type="text" aria-label="Registered Mobile" value={mobile} disabled /></label>
                  <label>ABHA Number (Optional)<input type="text" aria-label="ABHA Number" placeholder="XX-XXXX-XXXX-XXXX" value={d.abha} onChange={(e) => setD({ ...d, abha: e.target.value })} /></label>
                  <div className="ors-field"><span>State*</span><Dropdown label="State" value={state || 'Delhi'} options={STATES} onChange={() => {}} /></div>
                  <div className="ors-field"><span>District*</span><Dropdown label="District" placeholder="Select District" value={d.district} options={DISTRICTS} onChange={(v) => setD({ ...d, district: v })} /></div>
                  <label>Address<input type="text" aria-label="Address" value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} /></label>
                  <label className="ors-wide">Chief Complaint (Optional)<textarea aria-label="Chief Complaint" rows={2} value={d.complaint} onChange={(e) => setD({ ...d, complaint: e.target.value })} /></label>
                  <label className="ors-wide ors-agree"><input type="checkbox" checked={d.agree} onChange={(e) => setD({ ...d, agree: e.target.checked })} /> I hereby declare that the information provided is true and I consent to share it with the hospital for the purpose of this appointment.</label>
                </div>
                {errors.length ? <Alert>{errors.map((e) => <p key={e}>{e}</p>)}</Alert> : null}
                <button type="button" className="ors-go" onClick={book}>Book Appointment</button>
              </>
            ) : null}

            {step === 'slip' && chosenDay ? (
              <div className="ors-slip">
                <h3>Appointment Slip</h3>
                <dl>
                  <dt>Patient</dt><dd>{d.name}, {d.age} / {d.gender}</dd>
                  <dt>Hospital</dt><dd>{hospital}</dd>
                  <dt>Department</dt><dd>{dept}</dd>
                  <dt>Date &amp; Time</dt><dd>{dayLabel(chosenDay.date)}, {slot}</dd>
                  <dt>Appointment No.</dt><dd>OPD/{chosenDay.date.getFullYear()}/{String(hash(d.name + slot) % 1000000).padStart(6, '0')}</dd>
                </dl>
                <p className="ors-note">Report to the Registration Counter (Counter 4) with a valid photo ID at least 30 minutes before the slot. Online appointments not confirmed at the counter are released.</p>
                <Alert tone="info">Nothing was sent anywhere — this is a demo of the flow, and no SMS goes out.</Alert>
              </div>
            ) : null}
          </main>
        </div>
      ) : null}

      <footer className="ors-foot">
        <LinkColumns columns={FOOTER} />
        <p>A rebuilt specimen of a government appointment portal for a demo — not a real health service. Nothing here is sent anywhere. · Visitors: 18,40,22,196</p>
      </footer>

      {busy ? <Busy label="Loading…" /> : null}

      {otpSent && step === 'login' ? (
        <div className="ors-sms" role="status" aria-live="polite">
          <strong>SMS · +91 {mobile.slice(0, 2)}••••{mobile.slice(-4)}</strong>
          {otpSent} is your OTP for OPD appointment booking. Do not share it with anyone. (Demo SMS — shown on screen only.)
        </div>
      ) : null}
    </div>
  )
}
