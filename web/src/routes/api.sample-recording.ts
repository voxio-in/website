// GET /api/sample-recording?seed=… — a short generated WAV standing in for a
// call recording on the dashboard's sample sessions (real sessions carry the
// carrier's recording URL). Alternating low/high "voices" with pauses, so the
// player has something that sounds like turns.

import { createFileRoute } from '@tanstack/react-router'

const RATE = 8000

function wav(seed: number): ArrayBuffer {
  const seconds = 10 + (seed % 8)
  const n = RATE * seconds
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    const turn = Math.floor(t / 1.6)
    const inTurn = t % 1.6
    const speaking = inTurn < 1.25
    const base = turn % 2 ? 210 : 130
    // A syllable-rate envelope makes it read as speech rather than a tone.
    const env = speaking ? Math.pow(Math.sin(Math.PI * ((inTurn * 4.5) % 1)), 2) * Math.min(1, inTurn * 8, (1.25 - inTurn) * 8) : 0
    const f = base * (1 + 0.08 * Math.sin(2 * Math.PI * 3 * t + seed))
    const s = env * (0.5 * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) + 0.12 * Math.sin(6 * Math.PI * f * t))
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s * 0.6)) * 32767, true)
  }
  return buf
}

export const Route = createFileRoute('/api/sample-recording')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const seed = Number(new URL(request.url).searchParams.get('seed')) || 1
        return new Response(wav(Math.abs(seed) % 1000), {
          headers: { 'content-type': 'audio/wav', 'cache-control': 'public, max-age=86400' },
        })
      },
    },
  },
})
