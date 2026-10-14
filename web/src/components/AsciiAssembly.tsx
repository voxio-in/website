// "VoxioAgents" in ASCII, kept in one piece by a little agent. Modelled on the
// jules.google hero (HeroLogo): the word is a grid of characters; every 700 ms
// one pops out of its slot (leaving a ".") and drifts off in colour, and an "@"
// walks the grid one cell at a time to the nearest loose character, picks it
// up, carries it back to the exact slot it came from and puts it down.
//
// The logo is rasterised from real text at runtime (dense cells → M W N K X,
// edges → x l c, slivers → : ; , . ') so it fits any panel without hand-drawn art.
// It pauses off screen and in background tabs, and stands still for people who
// ask for reduced motion.

import { useEffect, useRef } from 'react'

type Palette = { logo: string; empty: string; robot: string; pieces: string[] }

const VOXIO: Palette = {
  logo: '#6fe0c9',
  empty: 'rgba(94, 230, 200, 0.28)',
  robot: '#fffbeb',
  pieces: ['#5ee6c8', '#7aa9ff', '#ffc670', '#ff8fa3'],
}

// The Jules timings, per 60 fps frame.
const EJECT_EVERY_MS = 700
const SPEED = 3
const DAMPING = 0.98
const ROBOT_STEP_FRAMES = 4
const PICK_FRAMES = 8
const PLACE_FRAMES = 8
const MAX_LOOSE = 30
const FRAME_MS = 1000 / 60

type Slot = { ch: string; c: number; r: number; empty: boolean; awaited: boolean }
type Piece = { ch: string; slot: Slot; x: number; y: number; vx: number; vy: number; claimed: boolean; color: string }
type Robot = {
  c: number; r: number
  state: 'idle' | 'toPiece' | 'atPiece' | 'toSlot' | 'atSlot'
  piece: Piece | null; carrying: Piece | null
  move: number; wait: number
}

const hash = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const pick = (s: string, r: number, c: number) => s[Math.floor(hash(r, c) * s.length)]

/** Which character a cell becomes, from how much of it the glyph covers and where. */
function charFor(cover: number, centroidY: number, r: number, c: number): string {
  if (cover > 0.82) return pick('MWN', r, c)
  if (cover > 0.66) return pick('KX0', r, c)
  if (cover > 0.5) return pick('Oxd', r, c)
  if (cover > 0.36) return pick('lco', r, c)
  if (centroidY < 0.36) return pick("'`", r, c)
  if (centroidY > 0.64) return pick('.,', r, c)
  return pick(':;', r, c)
}

/** Lays `lines` out as ASCII art over a cols × rows grid, centred; returns the filled cells. */
function rasterise(lines: string[], cols: number, rows: number, fontFamily: string): Slot[] {
  const SX = 6, SY = 12 // samples per cell; a cell is about twice as tall as wide
  const targetCols = Math.max(10, Math.floor(cols * 0.84))
  const targetRows = Math.max(4, Math.floor(rows * 0.62))
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = `800 100px ${fontFamily}`
  // Capitals use the whole height, and a little air between them keeps them apart at this resolution.
  probe.letterSpacing = '8px'
  const widest = Math.max(...lines.map((l) => probe.measureText(l).width))
  const lineGap = 0.08
  const byWidth = (targetCols * SX) / widest * 100
  const byHeight = (targetRows * SY) / (lines.length * (1 + lineGap)) / 0.74 // cap height of a bold sans
  const fontPx = Math.max(8, Math.min(byWidth, byHeight))

  const W = cols * SX, H = rows * SY
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const g = cv.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `800 ${fontPx}px ${fontFamily}`
  g.letterSpacing = `${fontPx * 0.08}px`
  const lineH = fontPx * 0.74 * (1 + lineGap)
  const top = H / 2 - (lineH * lines.length) / 2
  lines.forEach((l, i) => g.fillText(l, W / 2, top + lineH * (i + 0.5)))

  const px = g.getImageData(0, 0, W, H).data
  const slots: Slot[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0, ySum = 0
      for (let y = 0; y < SY; y++) {
        for (let x = 0; x < SX; x++) {
          const a = px[((r * SY + y) * W + (c * SX + x)) * 4 + 3] / 255
          sum += a; ySum += a * y
        }
      }
      const cover = sum / (SX * SY)
      // Faint edge cells blur the letter shapes; leave them out.
      if (cover < 0.2) continue
      slots.push({ ch: charFor(cover, ySum / sum / SY, r, c), c, r, empty: false, awaited: false })
    }
  }
  return slots
}

export function AsciiAssembly({ lines = ['VOXIO', 'AGENTS'], caption, palette = VOXIO, fontSize = 10, className }: {
  lines?: string[]
  caption?: string
  palette?: Palette
  /** Character size in CSS px; the grid fills the box. */
  fontSize?: number
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = box.current, cv = canvas.current
    if (!wrap || !cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mono = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace'
    const sans = getComputedStyle(wrap).fontFamily || 'Inter, system-ui, sans-serif'

    let cw = 0, chh = 0, cols = 0, rows = 0
    let slots: Slot[] = []
    let loose: Piece[] = []
    const robot: Robot = { c: 0, r: 0, state: 'idle', piece: null, carrying: null, move: 0, wait: 0 }
    let sinceEject = 0, acc = 0, last = performance.now()
    let raf = 0, visible = true

    const eject = (s: Slot) => {
      if (s.empty || s.awaited || loose.length >= MAX_LOOSE) return
      s.empty = true
      const a = Math.random() * Math.PI * 2
      const v = SPEED * (0.7 + Math.random() * 0.6)
      loose.push({
        ch: s.ch, slot: s, x: (s.c + 0.5) * cw, y: (s.r + 0.5) * chh, vx: Math.cos(a) * v, vy: Math.sin(a) * v, claimed: false,
        color: palette.pieces[Math.floor(Math.random() * palette.pieces.length)],
      })
    }

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = wrap.clientWidth, h = wrap.clientHeight
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
      cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `700 ${fontSize}px ${mono}`
      cw = ctx.measureText('M').width
      chh = fontSize * 1.2
      cols = Math.max(1, Math.floor(w / cw)); rows = Math.max(1, Math.floor(h / chh))
      // A wide, short box reads better as one line ("VoxioAgents").
      slots = rasterise(cols / rows > 5 ? [lines.join(' ')] : lines, cols, rows, sans)
      loose = []
      Object.assign(robot, { state: 'idle', piece: null, carrying: null, move: 0, wait: 0 })
      robot.c = Math.floor(cols / 2); robot.r = Math.min(rows - 1, Math.floor(rows * 0.85))
      if (!still) {
        const pool = [...slots]
        for (let i = 0; i < Math.min(15, Math.floor(slots.length / 8)) && pool.length; i++) eject(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
      }
    }

    // One cell towards (c, r): rows first when they're the longer way, like the original.
    const stepTo = (c: number, r: number) => {
      const dc = c - robot.c, dr = r - robot.r
      if (!dc && !dr) return true
      if (Math.abs(dr) >= Math.abs(dc)) robot.r += Math.sign(dr)
      else robot.c += Math.sign(dc)
      robot.move = ROBOT_STEP_FRAMES
      return false
    }
    const cellOf = (p: Piece) => ({ c: Math.max(0, Math.min(cols - 1, Math.floor(p.x / cw))), r: Math.max(0, Math.min(rows - 1, Math.floor(p.y / chh))) })

    const frame = (dt: number) => {
      // Something pops out every so often.
      sinceEject += dt
      if (sinceEject >= EJECT_EVERY_MS) {
        sinceEject -= EJECT_EVERY_MS
        const full = slots.filter((s) => !s.empty)
        if (full.length) eject(full[Math.floor(Math.random() * full.length)])
      }
      // Loose pieces drift, slow down, and stay on the canvas.
      for (const p of loose) {
        p.x += p.vx; p.y += p.vy
        p.vx *= DAMPING; p.vy *= DAMPING
        if (p.x < cw / 2 || p.x > cols * cw - cw / 2) { p.vx = -p.vx; p.x = Math.max(cw / 2, Math.min(cols * cw - cw / 2, p.x)) }
        if (p.y < chh / 2 || p.y > rows * chh - chh / 2) { p.vy = -p.vy; p.y = Math.max(chh / 2, Math.min(rows * chh - chh / 2, p.y)) }
      }
      // The agent.
      robot.move = Math.max(0, robot.move - 1)
      robot.wait = Math.max(0, robot.wait - 1)
      switch (robot.state) {
        case 'idle': {
          let best: Piece | null = null, d = Infinity
          for (const p of loose) {
            if (p.claimed) continue
            const { c, r } = cellOf(p)
            const dd = (c - robot.c) ** 2 + (r - robot.r) ** 2
            if (dd < d) { d = dd; best = p }
          }
          if (best) { best.claimed = true; robot.piece = best; robot.state = 'toPiece' }
          break
        }
        case 'toPiece': {
          const p = robot.piece!
          const { c, r } = cellOf(p)
          if (c === robot.c && r === robot.r) { robot.state = 'atPiece'; robot.wait = PICK_FRAMES }
          else if (!robot.move) stepTo(c, r)
          break
        }
        case 'atPiece':
          if (!robot.wait) {
            const p = robot.piece!
            loose = loose.filter((x) => x !== p)
            p.slot.awaited = true
            robot.carrying = p; robot.piece = null; robot.state = 'toSlot'
          }
          break
        case 'toSlot': {
          const s = robot.carrying!.slot
          if (s.c === robot.c && s.r === robot.r) { robot.state = 'atSlot'; robot.wait = PLACE_FRAMES }
          else if (!robot.move) stepTo(s.c, s.r)
          break
        }
        case 'atSlot':
          if (!robot.wait) {
            const s = robot.carrying!.slot
            s.empty = false; s.awaited = false
            robot.carrying = null; robot.state = 'idle'
          }
          break
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.font = `700 ${fontSize}px ${mono}`
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      for (const s of slots) {
        if (robot.state !== 'idle' && robot.c === s.c && robot.r === s.r) continue
        ctx.fillStyle = s.empty ? palette.empty : palette.logo
        ctx.fillText(s.empty ? '.' : s.ch, s.c * cw, s.r * chh)
      }
      for (const p of loose) {
        const { c, r } = cellOf(p)
        ctx.fillStyle = p.color
        ctx.fillText(p.ch, c * cw, r * chh)
      }
      // The agent, with what it's carrying just above it.
      ctx.save()
      ctx.shadowColor = palette.robot
      ctx.shadowBlur = 10
      ctx.fillStyle = palette.robot
      ctx.fillText('@', robot.c * cw, robot.r * chh)
      ctx.restore()
      if (robot.carrying) {
        ctx.fillStyle = robot.carrying.color
        ctx.fillText(robot.carrying.ch, robot.c * cw, (robot.r - 0.7) * chh)
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(250, now - last)
      last = now
      acc += dt
      while (acc >= FRAME_MS) { frame(FRAME_MS); acc -= FRAME_MS }
      draw()
      raf = requestAnimationFrame(loop)
    }
    const run = () => {
      cancelAnimationFrame(raf)
      if (still || !visible || document.hidden) { draw(); return }
      last = performance.now(); acc = 0
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => { layout(); run() })
    ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; run() })
    io.observe(wrap)
    const onVis = () => run()
    document.addEventListener('visibilitychange', onVis)
    // The art needs the page font; redo it once fonts are in.
    document.fonts?.ready.then(() => { layout(); run() }).catch(() => {})

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [lines.join('\n'), palette, fontSize]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className={`ascii-asm${className ? ` ${className}` : ''}`} aria-hidden={!caption}>
      <canvas ref={canvas} className="ascii-asm-canvas" />
      {caption && <p className="ascii-asm-caption">{caption}</p>}
    </div>
  )
}
