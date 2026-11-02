// A fill-in document from Ask Voxio (draft_kb_doc): the questions callers ask, with a box
// for each answer. "Save as PDF" opens the browser's print dialog on a clean page (the
// browser's own fonts handle Hindi and every other script); the user then uploads that
// PDF on the Knowledge page. Answers are kept in this browser while they type.

import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'

export type DraftDoc = { title: string; items: { question: string; hint: string }[] }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export default function DraftDocCard({ doc }: { doc: DraftDoc }) {
  const router = useRouter()
  const key = `vx-draftdoc:${doc.title}:${doc.items.map((i) => i.question).join('|').length}`
  const [answers, setAnswers] = useState<string[]>(() => doc.items.map(() => ''))
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? 'null'); if (Array.isArray(saved)) setAnswers(doc.items.map((_, n) => String(saved[n] ?? ''))) } catch { /* storage off */ }
  }, [key])
  const set = (n: number, v: string) => setAnswers((a) => {
    const next = a.map((x, k) => (k === n ? v : x))
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* storage off */ }
    return next
  })
  const filled = answers.filter((a) => a.trim()).length

  const savePdf = () => {
    const rows = doc.items.map((it, n) => answers[n].trim()
      ? `<section><h2>${esc(it.question)}</h2><p>${esc(answers[n].trim()).replace(/\n/g, '<br>')}</p></section>` : '').join('')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
      body{font:15px/1.6 system-ui,"Noto Sans","Noto Sans Devanagari",sans-serif;margin:40px;color:#111}
      h1{font-size:22px;margin:0 0 24px}h2{font-size:16px;margin:20px 0 4px}p{margin:0}
      @media print{body{margin:0}}</style></head><body><h1>${esc(doc.title)}</h1>${rows}
      <script>window.onload=()=>{window.print()}<\/script></body></html>`)
    w.document.close()
  }

  return (
    <div className="as-doc">
      <div className="as-doc-head"><FileTextIcon size={16} /> <strong>{doc.title}</strong> <span className="as-doc-count">{filled} of {doc.items.length} answered</span></div>
      {doc.items.map((it, n) => (
        <label key={n} className="as-doc-item">
          <span className="as-doc-q">{it.question}</span>
          <textarea rows={2} value={answers[n]} placeholder={it.hint || 'The answer the agent should give'} onChange={(e) => set(n, e.target.value)} />
        </label>
      ))}
      <div className="as-doc-foot">
        <button type="button" className="db-btn db-primary db-btn-sm" disabled={!filled} onClick={savePdf}>Save as PDF</button>
        <button type="button" className="db-btn db-btn-sm" onClick={() => router.navigate({ to: '/dashboard/knowledge' })}>Open Knowledge to upload</button>
      </div>
      <p className="as-doc-note">Only answered questions go into the PDF. In the print window choose “Save as PDF”, then upload it to a knowledge base.</p>
    </div>
  )
}
