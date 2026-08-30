// The counter beside the face: what he has put down, how he is taking it, and
// where the trainee stands.
//
// This is the half of these demos that a transcript cannot carry. The voice is
// the product on the phone; here the product is that the model is choosing a
// face and choosing to hand something over, turn by turn, and neither of those
// is visible unless the page draws them.

import { useEffect, useState } from 'react'

import {
  SCENE_PROPS,
  SCORE_LABEL,
  moodLine,
  parseScore,
  type MoodRegister,
  type MoodTone,
} from '#/lib/sceneProps'

export type Scene = {
  /** Action keys in the order they fired, deduplicated. */
  props: string[]
  /** The face he is wearing now, as the model labelled it. */
  frame: string | null
  /** Running score, STATUS_VALUE form. Only cheryl and vps send one. */
  score: string | null
  /** Bumped whenever the frame changed, so the banner can re-announce. */
  shift: { id: number; tone: MoodTone } | null
}

export const EMPTY_SCENE: Scene = { props: [], frame: null, score: null, shift: null }

/** How long a mood banner stays up before fading itself out. */
const MOOD_MS = 6000

export default function ScenePanel({
  scene,
  name,
  showMood,
  moodRegister = 'anger',
  formDone,
  onFormDone,
}: {
  scene: Scene
  /** Who he is, for the banner copy. */
  name: string
  /** `mood` demos only — see toneOf in sceneProps. */
  showMood: boolean
  /** How this character's displeasure reads. See moodLine. */
  moodRegister?: MoodRegister
  formDone: boolean
  onFormDone: () => void
}) {
  const [shift, setShift] = useState<Scene['shift']>(null)

  useEffect(() => {
    if (!showMood || !scene.shift) return
    setShift(scene.shift)
    const t = setTimeout(() => setShift(null), MOOD_MS)
    return () => clearTimeout(t)
  }, [scene.shift, showMood])

  const score = scene.score ? parseScore(scene.score) : null
  const props = scene.props
    .map((key) => ({ key, prop: SCENE_PROPS[key] }))
    .filter((e): e is { key: string; prop: NonNullable<typeof e.prop> } => !!e.prop)

  if (!props.length && !score && !shift) return null

  return (
    <aside className="scene" aria-live="polite">
      {shift && (
        <div className={`scene-mood scene-mood--${shift.tone}`} key={shift.id}>
          <span className="scene-mood-dot" />
          {moodLine(shift.tone, name, moodRegister)}
        </div>
      )}

      {score && (
        <div className={`scene-score scene-score--${score.status}`}>
          <span className="scene-score-label">How it is going</span>
          <span className="scene-score-value">
            {score.value}
            <span className="scene-score-of">/10</span>
          </span>
          <span className="scene-score-status">{SCORE_LABEL[score.status]}</span>
        </div>
      )}

      {props.map(({ key, prop }) => (
        <figure className="prop" key={key}>
          <figcaption className="prop-cap">{prop.label}</figcaption>

          {prop.kind === 'receipt' && <Receipt />}
          {prop.kind === 'bills' && <BillStack />}
          {prop.kind === 'aid-letter' && <AidLetter />}
          {prop.kind === 'mp-letter' && <MpLetter />}
          {prop.kind === 'referral' && <ReferralSlip />}
          {prop.kind === 'meal-record' && <MealRecord />}
          {prop.kind === 'med-calendar' && <MedCalendar />}
          {prop.kind === 'care-plan' && <CarePlan />}
          {prop.kind === 'call-log' && <CallLog />}
          {prop.kind === 'recording' && <Recording />}
          {prop.kind === 'report' && <LabReport />}
          {prop.kind === 'image' && (
            <img className="prop-img" src={prop.src} alt={prop.label} loading="lazy" />
          )}
          {prop.kind === 'form' && (
            <EscalationForm done={formDone} onDone={onFormDone} />
          )}

          {prop.note && <p className="prop-note">{prop.note}</p>}
        </figure>
      ))}
    </aside>
  )
}

/* Drawn, not photographed: the line item is the shirt he is arguing about, so
   the receipt is evidence rather than decoration. */
function Receipt() {
  return (
    <div className="receipt">
      <div className="receipt-head">
        <strong>STORE RECEIPT</strong>
        <span>Order #4821</span>
      </div>
      <div className="receipt-rows">
        <div>
          <span>Polo T-Shirt (M)</span>
          <span>$49.99</span>
        </div>
        <div>
          <span>Qty</span>
          <span>1</span>
        </div>
      </div>
      <div className="receipt-rows receipt-rows--total">
        <div>
          <span>Subtotal</span>
          <span>$49.99</span>
        </div>
        <div>
          <span>Tax</span>
          <span>$4.50</span>
        </div>
        <div className="receipt-total">
          <span>Total</span>
          <span>$54.49</span>
        </div>
      </div>
      <div className="receipt-foot">
        <span>Paid: VISA •••• 3721</span>
        <span>14 Jul 2026 · 3:42 PM</span>
      </div>
    </div>
  )
}

/* The one number that matters is out of range and he has been carrying it
   around for three months without doing anything about it. A stock photo of a
   clipboard cannot say that; a rendered sheet with an H beside the HbA1c can. */
function LabReport() {
  return (
    <div className="report">
      <div className="report-head">
        <strong>PATHOLOGY REPORT</strong>
        <span>Collected 14 Apr 2026</span>
      </div>
      <div className="report-rows">
        <div>
          <span>HbA1c</span>
          <span className="report-high">9.4 % H</span>
        </div>
        <div>
          <span>Fasting glucose</span>
          <span className="report-high">186 mg/dL H</span>
        </div>
        <div>
          <span>Creatinine</span>
          <span>1.1 mg/dL</span>
        </div>
      </div>
      <div className="report-foot">Ref: HbA1c 4.0 – 5.6 %</div>
    </div>
  )
}

function Recording() {
  return (
    <div className="rec">
      <div className="rec-head">
        <span className="rec-dot" />
        REC
      </div>
      <div className="rec-bars">
        {/* Fixed heights, not random ones: a bar pattern that reshuffles on
            every render reads as a broken widget rather than as a level. */}
        {[9, 15, 11, 18, 13, 20, 12, 16, 10, 17, 14, 8].map((h, i) => (
          <span key={i} style={{ height: `${h}px`, animationDelay: `${i * 0.09}s` }} />
        ))}
      </div>
      <p className="rec-note">
        This call may be recorded for quality and training purposes.
      </p>
    </div>
  )
}

function EscalationForm({ done, onDone }: { done: boolean; onDone: () => void }) {
  if (done) {
    return <p className="prop-done">Form logged. Now tell him you have raised it.</p>
  }
  return (
    <form
      className="prop-form"
      onSubmit={(e) => {
        e.preventDefault()
        onDone()
      }}
    >
      <label>
        Reference
        <input defaultValue="SR-4821" readOnly />
      </label>
      <label>
        Reason
        <input defaultValue="Manufacturing defect — button" readOnly />
      </label>
      <button type="submit">Raise it</button>
    </form>
  )
}


/* ---------- mm: what Mr Muthu brought in a folder ----------

   The persona has him showing a stack of bills on almost every turn. Said
   aloud that is a claim; drawn, with the overdue column adding up to more than
   the assistance does, it is the thing he is actually right about. That is what
   makes the officer's job hard rather than merely unpleasant, and it is exactly
   the half a transcript throws away. */

const MUTHU_BILLS = [
  { who: 'Singapore General Hospital', what: 'Ward 8 · mother', amt: '412.60', late: '41d' },
  { who: 'SP Services', what: 'Utilities · Jan', amt: '186.20', late: '12d' },
  { who: 'Guardian Pharmacy', what: 'Repeat medication', amt: '204.85', late: '' },
  { who: 'Town Council', what: 'S&CC arrears', amt: '97.00', late: '68d' },
]

function BillStack() {
  return (
    <div className="bills">
      <div className="bills-head">
        <strong>OUTSTANDING</strong>
        <span>4 notices</span>
      </div>
      <div className="bills-rows">
        {MUTHU_BILLS.map((b) => (
          <div key={b.who}>
            <span className="bills-who">
              {b.who}
              <em>{b.what}</em>
            </span>
            <span className="bills-amt">
              ${b.amt}
              <em className={b.late ? 'is-late' : ''}>
                {b.late ? `OVERDUE ${b.late}` : 'DUE'}
              </em>
            </span>
          </div>
        ))}
      </div>
      <div className="bills-total">
        <span>This month</span>
        <span>$900.65</span>
      </div>
      <p className="bills-foot">Against nine hundred dollars of assistance.</p>
    </div>
  )
}

function AidLetter() {
  return (
    <div className="letter">
      <div className="letter-head">
        <span className="letter-crest" aria-hidden="true" />
        <div>
          <strong>Social Service Office</strong>
          <span>Notice of Assistance · Ref SSO/2026/11408</span>
        </div>
      </div>
      <p className="letter-body">
        Your application for short-to-medium term assistance has been
        <strong> approved</strong> at the following rate:
      </p>
      <div className="letter-figure">
        <span>$900</span>
        <em>per month · 6 months · review at month 3</em>
      </div>
      <p className="letter-foot">
        Household of four. Caregiving grant assessed separately.
      </p>
    </div>
  )
}

function MpLetter() {
  return (
    <div className="letter letter--mp">
      <div className="letter-head">
        <span className="letter-crest letter-crest--mp" aria-hidden="true" />
        <div>
          <strong>Meet-the-People Session</strong>
          <span>Constituency office · appeal letter</span>
        </div>
      </div>
      <p className="letter-body">
        Writing on behalf of the resident regarding the quantum of assistance
        granted, and requesting that the case be <strong>reviewed again</strong>.
      </p>
      <div className="letter-stamp">3rd appeal</div>
      <p className="letter-foot">
        He has been higher than you already. Twice before this.
      </p>
    </div>
  )
}

function ReferralSlip() {
  return (
    <div className="referral">
      <div className="referral-head">
        <strong>REFERRAL</strong>
        <span>Employment Support</span>
      </div>
      <div className="referral-rows">
        <div>
          <span>Programme</span>
          <span>Career coaching · 4 sessions</span>
        </div>
        <div>
          <span>First appointment</span>
          <span>To be scheduled</span>
        </div>
        <div>
          <span>Cash value</span>
          <span className="referral-nil">Nil</span>
        </div>
      </div>
      <div className="referral-sign">
        <span>Client signature</span>
        <em>unsigned</em>
      </div>
    </div>
  )
}

/* ---------- tn: what Tan-san produces instead of complaining ----------

   Every one of these is bilingual on purpose. A Japanese carer reads the
   Japanese; a foreign carer — the person this training exists for — reads the
   English. That gap is the product, so the paperwork shows it. */

const MEAL_DAYS = [
  { d: '2/24', m: ['完食', '半分', '残'] },
  { d: '2/25', m: ['半分', '残', '残'] },
  { d: '2/26', m: ['残', '残', '残'] },
]

function MealRecord() {
  return (
    <div className="jp-doc">
      <div className="jp-doc-head">
        <strong>食事記録</strong>
        <span>Meal record · 3F 東</span>
      </div>
      <table className="jp-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>朝</th>
            <th>昼</th>
            <th>夕</th>
          </tr>
        </thead>
        <tbody>
          {MEAL_DAYS.map((r) => (
            <tr key={r.d}>
              <td>{r.d}</td>
              {r.m.map((v, i) => (
                <td
                  key={i}
                  className={v === '残' ? 'is-bad' : v === '半分' ? 'is-warn' : ''}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="jp-doc-foot">
        完食 ate all · 半分 half · <span className="is-bad">残 left it</span>
      </p>
    </div>
  )
}

/* Evenings missed, mornings taken — the pattern the night shift never sees and
   the day shift assumes is fine. */
const MED_DAYS = ['月', '火', '水', '木', '金', '土', '日']
const MED_EVENING = [true, false, false, true, false, false, true]

function MedCalendar() {
  return (
    <div className="jp-doc">
      <div className="jp-doc-head">
        <strong>お薬カレンダー</strong>
        <span>Medicine calendar · this week</span>
      </div>
      <div className="jp-cal">
        {MED_DAYS.map((d, i) => (
          <div key={d} className="jp-cal-col">
            <span className="jp-cal-day">{d}</span>
            <span className="jp-cal-cell is-taken" />
            <span className={`jp-cal-cell${MED_EVENING[i] ? ' is-taken' : ' is-left'}`} />
          </div>
        ))}
      </div>
      <p className="jp-doc-foot">
        朝 morning, taken ·{' '}
        <span className="is-bad">夕 evening, four still in the pocket</span>
      </p>
    </div>
  )
}

function CarePlan() {
  return (
    <div className="jp-doc">
      <div className="jp-doc-head">
        <strong>ケアプラン</strong>
        <span>Care plan · 要介護2</span>
      </div>
      <div className="jp-rows">
        <div>
          <span>入浴</span>
          <span>Bathing · assisted, Tue &amp; Fri</span>
        </div>
        <div>
          <span>機能訓練</span>
          <span>Exercise · daily, 10:00</span>
        </div>
        <div>
          <span>外出</span>
          <span className="is-bad">Outings · suspended</span>
        </div>
      </div>
      <div className="jp-sign">
        <span>同意者 · agreed by</span>
        <em>長女 (eldest daughter)</em>
      </div>
      <p className="jp-doc-foot">His own signature block is empty.</p>
    </div>
  )
}

const CALL_TIMES = ['01:12', '01:40', '02:05', '02:31', '03:18', '04:02']

function CallLog() {
  return (
    <div className="jp-doc">
      <div className="jp-doc-head">
        <strong>ナースコール履歴</strong>
        <span>Call history · 2月3日</span>
      </div>
      <div className="jp-log">
        {CALL_TIMES.map((t) => (
          <div key={t}>
            <span>{t}</span>
            <span>ナースコール</span>
            <span>対応済 · answered</span>
          </div>
        ))}
      </div>
      <p className="jp-doc-foot is-bad">
        Then nothing for three weeks. He stopped pressing it.
      </p>
    </div>
  )
}
