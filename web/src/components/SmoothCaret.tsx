// Word-style smooth typing for every text field on the site: the native caret
// is hidden and a drawn one glides to each new position (typing, clicking,
// arrow keys) instead of jumping. It stays solid while you type and blinks
// when you stop. Selections, number fields and reduced-motion users keep the
// browser's own caret.
//
// The caret's position comes from a hidden mirror of the field (same font,
// padding, wrapping) with a marker at the caret: the usual way to find where a
// caret is in an <input> or <textarea>, which browsers don't expose.

import { useEffect } from 'react'

const TEXT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', ''])
const COPY = [
  'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily', 'fontFeatureSettings',
  'textAlign', 'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize',
] as const

type Field = HTMLInputElement | HTMLTextAreaElement

function isField(el: Element | null): el is Field {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly
  return el instanceof HTMLInputElement && TEXT_TYPES.has(el.type) && !el.readOnly
}

/** Caret position inside the field's border box, from a mirror element. */
function caretCoords(el: Field, mirror: HTMLDivElement, pos: number) {
  const cs = getComputedStyle(el)
  const area = el instanceof HTMLTextAreaElement
  for (const k of COPY) (mirror.style as unknown as Record<string, string>)[k] = cs[k] as string
  mirror.style.whiteSpace = area ? 'pre-wrap' : 'pre'
  mirror.style.overflowWrap = area ? 'break-word' : 'normal'
  if (!area) mirror.style.lineHeight = `${el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)}px`
  let text = el.value.slice(0, pos)
  if (el instanceof HTMLInputElement && el.type === 'password') text = '•'.repeat(text.length)
  mirror.textContent = text
  const mark = document.createElement('span')
  mark.textContent = el.value.slice(pos) || '.'
  mirror.appendChild(mark)
  const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25
  return {
    x: mark.offsetLeft + parseFloat(cs.borderLeftWidth) - el.scrollLeft,
    y: mark.offsetTop + parseFloat(cs.borderTopWidth) - el.scrollTop + (area ? 0 : (el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - lineH) / 2),
    h: Math.min(lineH, parseFloat(cs.fontSize) * 1.35),
  }
}

export function SmoothCaret() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const caret = document.createElement('div')
    caret.className = 'smooth-caret'
    caret.setAttribute('aria-hidden', 'true')
    const mirror = document.createElement('div')
    mirror.setAttribute('aria-hidden', 'true')
    Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', overflow: 'hidden' })
    document.body.append(caret, mirror)

    let field: Field | null = null
    let restore = ''
    let idle = 0
    let placed = false
    // Fields can move with no scroll or resize (layout animations, panels opening):
    // follow the field's box every frame while one is focused, and drop the
    // caret if the field leaves the page.
    let frame = 0
    let last = ''
    const watch = () => {
      if (!field) return
      if (!field.isConnected) { detach(); return }
      const r = field.getBoundingClientRect()
      const key = `${r.left}|${r.top}|${r.width}|${r.height}`
      if (key !== last) {
        last = key
        if (placed) { caret.classList.remove('is-gliding'); place(); caret.classList.add('is-gliding') }
      }
      frame = requestAnimationFrame(watch)
    }

    const place = () => {
      if (!field) return
      const s = field.selectionStart, e = field.selectionEnd
      if (s === null || s !== e) { caret.style.opacity = '0'; return }
      const r = field.getBoundingClientRect()
      const { x, y, h } = caretCoords(field, mirror, s)
      const cs = getComputedStyle(field)
      // Outside the visible box (scrolled away): hide rather than draw over other things.
      const inside = x >= 0 && x <= r.width && y + h > 0 && y < r.height
      caret.style.opacity = inside ? '1' : '0'
      caret.style.height = `${h}px`
      caret.style.background = restore || cs.color
      // The first placement in a field jumps; after that it glides.
      caret.classList.toggle('is-gliding', placed)
      caret.style.transform = `translate(${r.left + x}px, ${r.top + y}px)`
      placed = true
      // Solid while typing, blinking after a pause.
      caret.classList.remove('is-blinking')
      clearTimeout(idle)
      idle = window.setTimeout(() => caret.classList.add('is-blinking'), 500)
    }

    const attach = (el: Field) => {
      field = el
      placed = false
      const cs = getComputedStyle(el)
      restore = cs.caretColor !== 'auto' ? cs.caretColor : ''
      el.style.caretColor = 'transparent'
      caret.style.display = 'block'
      place()
      last = ''
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(watch)
    }
    const detach = () => {
      if (field) field.style.caretColor = restore
      field = null
      caret.style.display = 'none'
      clearTimeout(idle)
      cancelAnimationFrame(frame)
    }

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element
      if (isField(el)) attach(el)
      else if (field) detach()
    }
    const onFocusOut = (e: FocusEvent) => { if (e.target === field) detach() }
    // Selection and input events fire after the caret has moved, so place it straight away;
    // a key press is measured once the browser has applied it.
    const onAny = () => { if (field) place() }
    const onKey = () => { if (field) setTimeout(place, 0) }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('selectionchange', onAny)
    document.addEventListener('input', onAny, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('scroll', onAny, true)
    window.addEventListener('resize', onAny)
    if (isField(document.activeElement)) attach(document.activeElement)

    return () => {
      detach()
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('selectionchange', onAny)
      document.removeEventListener('input', onAny, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('scroll', onAny, true)
      window.removeEventListener('resize', onAny)
      caret.remove(); mirror.remove()
    }
  }, [])
  return null
}
