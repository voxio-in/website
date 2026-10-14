// A flow's `participants` graph. The voice server turns the avatar on when a
// person's connection to the AI participant asks for video (only that edge is
// read today; see voicebot's _lipsync_from_participants).

import type { ParticipantsGraph } from 'voxioagent/client'

export function facesOn(g: ParticipantsGraph | null | undefined): boolean {
  if (!g?.participants) return false
  return g.participants.some((p) => p.name !== g.ai_participant && p.connections.some((c) => c.name === g.ai_participant && c.video))
}

/** Sets video on every person's link to the AI, keeping the rest of a saved graph as it is. */
export function withFace(g: ParticipantsGraph | null | undefined, on: boolean): ParticipantsGraph {
  const base: ParticipantsGraph = g?.participants?.length ? g : {
    ai_participant: 'ai',
    participants: [
      { name: 'user', connections: [{ name: 'ai', audio: true, video: false }] },
      { name: 'ai', connections: [{ name: 'user', audio: true, video: false }] },
    ],
  }
  return {
    ...base,
    participants: base.participants.map((p) => p.name === base.ai_participant ? p : {
      ...p,
      connections: p.connections.map((c) => (c.name === base.ai_participant ? { ...c, video: on } : c)),
    }),
  }
}
