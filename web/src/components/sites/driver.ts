// How the agent's hands find things on a page it was never given ids for.
//
// Real sites do not label their buttons for us. The railway search page has 168
// clickable things and five of them have an id; the shop has none at all and
// its class names are hashes. So the agent never names an element by id — it
// names it the way a person would, by what is written on it ("Book Now"), and
// when that is ambiguous, by what it sits inside ("within": "12951"). This file
// turns that description into an element, waits for it if the page is still
// loading, and operates it the way a hand would: custom dropdowns are opened
// and the option is picked, autocompletes are typed into and the suggestion is
// chosen, nothing is set behind the page's back.

export type WebAction = {
  action: 'focus' | 'fill_field' | 'click' | 'scroll_to'
  /** What it is called on screen: its label, its text, its placeholder. */
  target?: string
  /** Something written on the region it sits in — a card, a row, a dialog. */
  within?: string
  value?: string
  /** An exact CSS selector. Only for pages whose notes hand one out. */
  selector?: string
}

export type Outcome = 'ok' | 'error'

const CONTROLS = [
  'input:not([type=hidden])',
  'select',
  'textarea',
  '[role=combobox]',
  '[role=textbox]',
  '[contenteditable=true]',
].join(',')

const INTERACTIVE = [
  'a[href]',
  'button',
  'summary',
  'label',
  CONTROLS,
  '[role=button]',
  '[role=link]',
  '[role=tab]',
  '[role=option]',
  '[role=menuitem]',
  '[role=checkbox]',
  '[role=radio]',
  '[role=switch]',
].join(',')

/* What a person can point at when nothing clickable carries the words — a
   heading to scroll to, a row to highlight, a div some site made clickable. */
const TEXTY = 'h1,h2,h3,h4,h5,h6,p,li,tr,td,th,dt,dd,legend,caption,figcaption,strong,span,div'

const TYPE_MS = 55
const TYPE_BUDGET_MS = 1600
const FIND_MS = 4000
const OPTIONS_MS = 3000
const SETTLE_MS = 5000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function norm(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function textOf(el: Element): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

function isFormControl(
  el: Element,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  )
}

/** The element's accessible name, near enough: what a screen reader would say. */
export function nameOf(el: HTMLElement): string {
  const parts: string[] = []

  const aria = el.getAttribute('aria-label')
  if (aria) parts.push(aria)

  const by = el.getAttribute('aria-labelledby')
  if (by) {
    for (const id of by.split(/\s+/)) {
      const ref = el.ownerDocument.getElementById(id)
      if (ref) parts.push(textOf(ref))
    }
  }

  if (!parts.length) {
    if (isFormControl(el)) {
      for (const label of Array.from(el.labels ?? [])) parts.push(textOf(label))
      const ph = el.getAttribute('placeholder')
      if (ph) parts.push(ph)
    } else {
      parts.push(textOf(el))
    }
  }

  const title = el.getAttribute('title')
  if (title) parts.push(title)

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** How well a name answers to what the agent asked for. 0 is no match. */
export function score(name: string, target: string): number {
  const n = norm(name)
  const t = norm(target)
  if (!n || !t) return 0

  let s = 0
  if (n === t) s = 100
  else if (n.startsWith(`${t} `)) s = 85
  else if (` ${n} `.includes(` ${t} `)) s = 75
  else if (n.includes(t)) s = 55
  else {
    const want = t.split(' ')
    const have = new Set(n.split(' '))
    const hit = want.filter((w) => have.has(w)).length
    // "BTech" for "B.Tech", "Ecommerce" for "E-commerce": the model spells
    // things the way people say them, not the way the page punctuates them.
    const squash = (x: string) => x.replace(/ /g, '')
    if (hit === want.length) s = 50
    else if (squash(n).includes(squash(t))) s = 48
    else if (t.includes(n) && n.length >= 4) s = 35
    else if (hit / want.length >= 0.6) s = Math.round(30 * (hit / want.length))
    else {
      const loose = t.split(' ').filter((w) => squash(n).includes(w)).length
      if (loose / want.length >= 0.75) s = 32
    }
  }
  if (!s) return 0

  // A button that says exactly the thing beats a card that mentions it.
  return s - Math.min(15, n.length / 40)
}

function visible(el: HTMLElement): boolean {
  const check = (el as HTMLElement & { checkVisibility?: (o?: object) => boolean }).checkVisibility
  if (check && !check.call(el, { visibilityProperty: true })) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

function disabled(el: HTMLElement): boolean {
  return (
    (el as HTMLButtonElement).disabled === true ||
    el.getAttribute('aria-disabled') === 'true'
  )
}

/* A page with a modal open only lets you touch the modal. Real sites do this —
   the railway greets you with a language dialog — and an agent that clicks
   straight through it is doing something no person could. */
function scopeOf(stage: HTMLElement): HTMLElement {
  const dialogs = Array.from(
    stage.querySelectorAll<HTMLElement>('[role=dialog][aria-modal=true]'),
  ).filter(visible)
  return dialogs[dialogs.length - 1] ?? stage
}

/** Levels up to the nearest ancestor that mentions `within`. Infinity if none. */
function distance(
  el: HTMLElement,
  stage: HTMLElement,
  within: string,
  cache: Map<Element, string>,
): number {
  let d = 0
  for (let a = el.parentElement; a; a = a.parentElement, d++) {
    let text = cache.get(a)
    if (text === undefined) {
      text = norm(`${a.getAttribute('aria-label') ?? ''} ${a.textContent ?? ''}`)
      cache.set(a, text)
    }
    if (text.includes(within)) return d
    if (a === stage) break
  }
  return Infinity
}

type Kind = 'control' | 'click' | 'look'

function findOnce(stage: HTMLElement, a: WebAction, kind: Kind): HTMLElement | null {
  if (a.selector) {
    try {
      const el = stage.querySelector<HTMLElement>(a.selector)
      if (el && visible(el)) return el
    } catch {
      /* not a selector the browser can read — fall through to the name */
    }
  }
  if (!a.target) return null

  const scope = scopeOf(stage)
  const pool = Array.from(
    scope.querySelectorAll<HTMLElement>(kind === 'control' ? CONTROLS : INTERACTIVE),
  ).filter(visible)

  let found = pool
    .map((el) => ({ el, s: score(nameOf(el), a.target!) - (disabled(el) ? 20 : 0) }))
    .filter((c) => c.s >= 30)

  // Nothing clickable carries the words: look at plain text instead. Plenty of
  // sites make a div clickable, and a heading is a fine thing to scroll to.
  if (!found.length && kind !== 'control') {
    const t = norm(a.target)
    found = Array.from(scope.querySelectorAll<HTMLElement>(TEXTY))
      .filter((el) => visible(el) && norm(textOf(el)).includes(t))
      .map((el) => ({ el, s: 40 - Math.min(35, textOf(el).length / 20) }))
  }
  if (!found.length) return null

  if (a.within) {
    const w = norm(a.within)
    const cache = new Map<Element, string>()
    const ranked = found
      .map((c) => ({ ...c, d: distance(c.el, stage, w, cache) }))
      .filter((c) => c.d !== Infinity)
    if (ranked.length) {
      ranked.sort((x, y) => x.d - y.d || y.s - x.s)
      return ranked[0]!.el
    }
  }

  found.sort((x, y) => y.s - x.s)
  return found[0]!.el
}

async function locate(stage: HTMLElement, a: WebAction, kind: Kind): Promise<HTMLElement | null> {
  const deadline = performance.now() + FIND_MS
  for (;;) {
    const el = findOnce(stage, a, kind)
    if (el) return el
    if (performance.now() > deadline) return null
    await sleep(150)
  }
}

/** Wait for whatever the last action set loading to finish loading. */
async function settle(stage: HTMLElement) {
  await sleep(120)
  const deadline = performance.now() + SETTLE_MS
  while (stage.querySelector('[aria-busy="true"]') && performance.now() < deadline) {
    await sleep(120)
  }
}

function press(el: HTMLElement) {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  el.click()
}

/* React tracks an input's value through the prototype's setter, so assigning
   .value directly is invisible to it and the next render puts the old text
   back. Going through the native setter is what a keystroke does. */
function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.focus({ preventScroll: true })
  setValue(el, '')
  const per = Math.min(TYPE_MS, TYPE_BUDGET_MS / Math.max(1, value.length))
  let typed = ''
  for (const ch of value) {
    typed += ch
    setValue(el, typed)
    await sleep(per)
  }
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Pick an option from whatever list the control just opened. */
async function pick(stage: HTMLElement, owner: HTMLElement, value: string): Promise<Outcome> {
  const listId = owner.getAttribute('aria-controls')
  const deadline = performance.now() + OPTIONS_MS

  for (;;) {
    const root =
      (listId && stage.querySelector<HTMLElement>(`#${CSS.escape(listId)}`)) || scopeOf(stage)
    const options = Array.from(root.querySelectorAll<HTMLElement>('[role=option]')).filter(visible)
    const best = options
      .map((el) => ({ el, s: score(nameOf(el), value) }))
      .filter((c) => c.s >= 30)
      .sort((x, y) => y.s - x.s)[0]

    if (best) {
      best.el.classList.add('wa-hit')
      best.el.scrollIntoView({ block: 'nearest' })
      await sleep(260)
      press(best.el)
      best.el.classList.remove('wa-hit')
      return 'ok'
    }
    if (performance.now() > deadline) return 'error'
    await sleep(150)
  }
}

async function fill(stage: HTMLElement, el: HTMLElement, value: string): Promise<Outcome> {
  const combo =
    el.getAttribute('role') === 'combobox' || el.getAttribute('aria-haspopup') === 'listbox'

  if (el instanceof HTMLSelectElement) {
    const option = Array.from(el.options)
      .map((o) => ({ o, s: score(o.text, value) }))
      .filter((c) => c.s >= 30)
      .sort((x, y) => y.s - x.s)[0]?.o
    if (!option) return 'error'
    el.value = option.value
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return 'ok'
  }

  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    const want = !/^(false|no|off|unchecked|0)$/i.test(value.trim())
    if (el.checked !== want) press(el)
    return 'ok'
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    await typeInto(el, value)
    return combo ? pick(stage, el, value) : 'ok'
  }

  if (combo) {
    if (el.getAttribute('aria-expanded') !== 'true') press(el)
    return pick(stage, el, value)
  }

  return 'error'
}

/** Do one thing to the page. Resolves once the page has finished reacting. */
export async function perform(stage: HTMLElement, a: WebAction): Promise<Outcome> {
  const kind: Kind =
    a.action === 'fill_field' ? 'control' : a.action === 'click' ? 'click' : 'look'
  const el = await locate(stage, a, kind)
  if (!el) return 'error'

  el.classList.add('wa-hit')
  const done = async (outcome: Outcome, hold: number) => {
    await sleep(hold)
    el.classList.remove('wa-hit')
    if (outcome === 'ok') await settle(stage)
    return outcome
  }

  switch (a.action) {
    case 'fill_field': {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await sleep(250)
      return done(await fill(stage, el, a.value ?? ''), 300)
    }
    case 'click': {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await sleep(450)
      // A disabled button is pressed and nothing happens — which is what the
      // page does to a person, and the error tells the runtime so.
      if (disabled(el)) return done('error', 300)
      /* A section or menu heading that is already open. The agent cannot see
         that it is, and clicking it again would close what it is about to
         use; nothing it does ever needs a section shut, so leave it open. */
      if (el.getAttribute('aria-expanded') === 'true' && el.getAttribute('role') !== 'combobox') {
        return done('ok', 200)
      }
      press(el)
      return done('ok', 250)
    }
    case 'focus': {
      if (typeof el.focus === 'function') el.focus({ preventScroll: true })
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return done('ok', 800)
    }
    case 'scroll_to': {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return done('ok', 600)
    }
    default:
      return done('error', 200)
  }
}

/** A line for the narration strip, from the action as the model sent it. */
export function describe(a: WebAction): string {
  const what =
    a.target ||
    (a.selector || '')
      .replace(/^#(hp|uni|rail|shop|cr)-/, '')
      .replace(/[-_]/g, ' ')
      .trim() ||
    'the page'
  const where = a.within ? ` · ${a.within}` : ''
  switch (a.action) {
    case 'fill_field':
      return `Put “${a.value ?? ''}” in ${what}${where}`
    case 'click':
      return `Pressed ${what}${where}`
    case 'focus':
      return `Pointed at ${what}${where}`
    case 'scroll_to':
      return `Scrolled to ${what}${where}`
    default:
      return 'Did something unrecognised'
  }
}

/** What the page is made of, counted the way a browser would. Ids React
    generates for a dropdown's own list are not ids anyone planted. */
export function pageStats(root: HTMLElement): { elements: number; clickable: number; ids: number } {
  return {
    elements: root.getElementsByTagName('*').length,
    clickable: Array.from(root.querySelectorAll<HTMLElement>(INTERACTIVE)).filter(
      (el) => !(el instanceof HTMLLabelElement),
    ).length,
    ids: Array.from(root.querySelectorAll('[id]')).filter((el) => !/^[:«]/.test(el.id)).length,
  }
}
