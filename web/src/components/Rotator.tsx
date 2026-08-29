// The hero badge's line, in five languages, one every three seconds.

import { useEffect, useRef, useState } from 'react'

export type Line = { lang: string; text: string }

export const VOICE_LINES: Line[] = [
  { lang: 'en', text: "Conversational voice, everywhere it's needed" },
  { lang: 'hi', text: 'बातचीत करती आवाज़, जहाँ भी ज़रूरत हो' },
  { lang: 'zh', text: '对话式语音，随处随时可用' },
  { lang: 'ms', text: 'Suara perbualan, di mana sahaja ia diperlukan' },
  { lang: 'es', text: 'Voz conversacional, allí donde se necesite' },
]

export const CALLING_LINES: Line[] = [
  { lang: 'en', text: 'Voice agents on real phone lines' },
  { lang: 'hi', text: 'असली फ़ोन लाइनों पर आवाज़ एजेंट' },
  { lang: 'zh', text: '真实电话线路上的语音座席' },
  { lang: 'ms', text: 'Ejen suara di talian telefon sebenar' },
  { lang: 'es', text: 'Agentes de voz en líneas telefónicas reales' },
]

export const AVATAR_LINES: Line[] = [
  { lang: 'en', text: 'A face that holds its character' },
  { lang: 'hi', text: 'एक चेहरा जो अपना किरदार निभाता है' },
  { lang: 'zh', text: '一张不会松懈的面孔' },
  { lang: 'ms', text: 'Wajah yang tidak melepaskan wataknya' },
  { lang: 'es', text: 'Un rostro que no rompe el personaje' },
]

export const WEBNAV_LINES: Line[] = [
  { lang: 'en', text: 'An agent that drives the page' },
  { lang: 'hi', text: 'एक एजेंट जो पेज ख़ुद चलाता है' },
  { lang: 'zh', text: '一个会自己操作页面的座席' },
  { lang: 'ms', text: 'Ejen yang memandu halaman itu sendiri' },
  { lang: 'es', text: 'Un agente que maneja la página' },
]

const EVERY_MS = 2500

export default function Rotator({ lines = VOICE_LINES }: { lines?: Line[] }) {
  const [i, setI] = useState(0)
  const boxRef = useRef<HTMLSpanElement>(null)
  const lineRefs = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    if (lines.length < 2) return
    const id = setInterval(() => setI((n) => (n + 1) % lines.length), EVERY_MS)
    return () => clearInterval(id)
  }, [lines.length])

  useEffect(() => {
    const box = boxRef.current
    const line = lineRefs.current[i]
    if (!box || !line) return

    const size = () => {
      const w = Math.max(line.scrollWidth, line.getBoundingClientRect().width)
      if (w > 0) box.style.width = `${Math.ceil(w) + 1}px`
    }
    size()

    document.fonts?.ready.then(size).catch(() => {})
    window.addEventListener('resize', size, { passive: true })
    return () => window.removeEventListener('resize', size)
  }, [i])

  return (
    <span className="rotator" ref={boxRef} aria-live="off">
      {lines.map((line, j) => {
        const state =
          j === i
            ? 'is-active'
            : j === (i - 1 + lines.length) % lines.length
              ? 'is-out'
              : 'is-next'
        return (
          <span
            key={line.lang}
            ref={(el) => {
              lineRefs.current[j] = el
            }}
            className={`rotator-line ${state}`}
            lang={line.lang}
            aria-hidden={j === i ? undefined : true}
          >
            {line.text}
          </span>
        )
      })}
    </span>
  )
}
