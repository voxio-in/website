// The care record the navigator drives on /webnav. The other four sites live
// in components/sites, rebuilt from the real ones.

import { useState } from 'react'

/* ---------- 介護記録 — a Japanese care-record system ----------

   Built for a different argument than the other four. Those show an agent
   getting a visitor through a page written badly. This one shows an agent
   doing the writing: a care worker who speaks no written Japanese says what
   happened, in their own language, and the incident report comes out in the
   Japanese the facility is legally required to file.

   So everything about this surface is deliberately Japanese-only. The labels,
   the dropdown values, the required-field warning, the twenty-four hour rule
   in the banner. It is not hard because it is badly designed — it is a
   perfectly reasonable form. It is hard because of who has to fill it in. */

const CARE_RESIDENTS = [
  { id: 'cr-r-1', name: '田中 宏', kana: 'タナカ ヒロシ', room: '302', level: '要介護2' },
  { id: 'cr-r-2', name: '佐藤 きよ', kana: 'サトウ キヨ', room: '305', level: '要介護3' },
  { id: 'cr-r-3', name: '鈴木 正雄', kana: 'スズキ マサオ', room: '311', level: '要介護1' },
  { id: 'cr-r-4', name: '山本 ハル', kana: 'ヤマモト ハル', room: '318', level: '要介護4' },
]

const CARE_TABS = [
  { id: 'cr-t-meal', label: '食事' },
  { id: 'cr-t-toilet', label: '排泄' },
  { id: 'cr-t-bath', label: '入浴' },
  { id: 'cr-t-vital', label: 'バイタル' },
  { id: 'cr-t-incident', label: '事故・ヒヤリハット' },
]

const CARE_PLACES = ['居室', '廊下', '浴室', '食堂', 'トイレ', 'その他']
const CARE_TYPES = ['転倒', '転落', '誤薬', '誤嚥', '無断外出', 'その他']
const CARE_INJURY = ['なし', '擦過傷', '打撲', '出血', '骨折疑い']

const CARE_EMPTY = {
  datetime: '',
  place: '',
  type: '',
  injury: '',
  bp: '',
  temp: '',
  pulse: '',
  detail: '',
  action: '',
  notify: false,
}

export function CareSurface() {
  const [tab, setTab] = useState('cr-t-incident')
  const [resident, setResident] = useState<string | null>(null)
  const [f, setF] = useState(CARE_EMPTY)
  const [sent, setSent] = useState(false)

  const chosen = CARE_RESIDENTS.find((r) => r.id === resident)
  const set = (k: keyof typeof CARE_EMPTY, v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="surface surface--care">
      <div className="cr-top">
        <span className="cr-mark" aria-hidden="true">介</span>
        <div>
          <p className="cr-name">かわぐち介護記録システム</p>
          <p className="cr-sub">特別養護老人ホーム 川口 · 3F 東ユニット</p>
        </div>
        <div className="cr-who">
          <span>ログイン中</span>
          <strong>介護職員</strong>
        </div>
      </div>

      <div className="cr-tabs">
        {CARE_TABS.map((t) => (
          <button
            key={t.id}
            id={t.id}
            type="button"
            className={tab === t.id ? 'is-on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="cr-notice">
        <strong>【重要】</strong>
        事故報告は発生から<strong>24時間以内</strong>に登録してください。記録は日本語で、敬体（です・ます）で入力すること。未入力項目があると登録できません。
      </div>

      <div className="cr-body">
        <aside className="cr-side">
          <p className="cr-step">1. 利用者選択</p>
          <div className="cr-residents">
            {CARE_RESIDENTS.map((r) => (
              <button
                key={r.id}
                id={r.id}
                type="button"
                className={`cr-resident${resident === r.id ? ' is-on' : ''}`}
                onClick={() => setResident(r.id)}
              >
                <span className="cr-resident-name">{r.name}</span>
                <span className="cr-resident-meta">
                  {r.kana} · {r.room}号室 · {r.level}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="cr-main">
          {!chosen ? (
            <p className="cr-empty">左の一覧から利用者を選択してください。</p>
          ) : sent ? (
            <div className="cr-done">
              <p className="cr-done-head">登録が完了しました</p>
              <p className="cr-done-body">
                {chosen.name} 様の事故報告書を受け付けました。受付番号 JK-2026-0412。
                管理者と看護師に通知されました。
              </p>
              <p className="cr-done-en">
                Filed. Nine fields, in Japanese, from what you said out loud.
              </p>
            </div>
          ) : (
            <>
              <p className="cr-step">
                2. 事故報告書 — {chosen.name} 様（{chosen.room}号室）
              </p>

              <div className="cr-grid">
                <label className="cr-field">
                  <span>発生日時 <em>必須</em></span>
                  <input
                    id="cr-datetime"
                    type="text"
                    placeholder="2026/02/26 19:40"
                    value={f.datetime}
                    onChange={(e) => set('datetime', e.target.value)}
                  />
                </label>

                <label className="cr-field">
                  <span>発生場所 <em>必須</em></span>
                  <select
                    id="cr-place"
                    value={f.place}
                    onChange={(e) => set('place', e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {CARE_PLACES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>

                <label className="cr-field">
                  <span>事故種別 <em>必須</em></span>
                  <select
                    id="cr-type"
                    value={f.type}
                    onChange={(e) => set('type', e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {CARE_TYPES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>

                <label className="cr-field">
                  <span>負傷の有無 <em>必須</em></span>
                  <select
                    id="cr-injury"
                    value={f.injury}
                    onChange={(e) => set('injury', e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {CARE_INJURY.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="cr-sub-step">バイタル（事故後測定）</p>
              <div className="cr-grid cr-grid--three">
                <label className="cr-field">
                  <span>血圧</span>
                  <input
                    id="cr-bp"
                    type="text"
                    placeholder="138/82"
                    value={f.bp}
                    onChange={(e) => set('bp', e.target.value)}
                  />
                </label>
                <label className="cr-field">
                  <span>体温</span>
                  <input
                    id="cr-temp"
                    type="text"
                    placeholder="36.4"
                    value={f.temp}
                    onChange={(e) => set('temp', e.target.value)}
                  />
                </label>
                <label className="cr-field">
                  <span>脈拍</span>
                  <input
                    id="cr-pulse"
                    type="text"
                    placeholder="72"
                    value={f.pulse}
                    onChange={(e) => set('pulse', e.target.value)}
                  />
                </label>
              </div>

              <label className="cr-field cr-field--wide">
                <span>発生状況 <em>必須</em></span>
                <textarea
                  id="cr-detail"
                  rows={3}
                  placeholder="いつ、どこで、どのような状況で発生したかを具体的に記入してください。"
                  value={f.detail}
                  onChange={(e) => set('detail', e.target.value)}
                />
              </label>

              <label className="cr-field cr-field--wide">
                <span>対応内容 <em>必須</em></span>
                <textarea
                  id="cr-action"
                  rows={2}
                  placeholder="発見後の対応、報告先、経過観察の内容。"
                  value={f.action}
                  onChange={(e) => set('action', e.target.value)}
                />
              </label>

              <label className="cr-check">
                <input
                  id="cr-notify"
                  type="checkbox"
                  checked={f.notify}
                  onChange={(e) => set('notify', e.target.checked)}
                />
                <span>ご家族への連絡済み</span>
              </label>

              <div className="cr-actions">
                <button id="cr-submit" type="button" onClick={() => setSent(true)}>
                  登録する
                </button>
                <button id="cr-draft" type="button" className="cr-ghost">
                  一時保存
                </button>
                <span className="cr-warn">未入力の必須項目があります</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="cr-foot">
        本システムの記録は介護保険法に基づく法定記録です · お問い合わせ 内線 214
      </div>
    </div>
  )
}
