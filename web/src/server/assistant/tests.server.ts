// Ask Voxio's test tool: puts a test of a flow into the chat. The test itself runs
// in the panel with the Test tab's own components (ChatTest / BrowserTest, the
// Voxio SDK and widget), started by the user; the model only says which flow and how.

import type { AuthUser } from '#/server/session.server'
import { db, withDb } from '#/server/db'
import { findFlow, findVoices, type ToolDef } from './tools.server'
import SAMPLES from '#/lib/dashboard/voice-samples.json'
import { providerFor } from '#/lib/dashboard/providers'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export type TestHow = 'chat' | 'voice'
export type VoiceSample = { label: string; url: string; changes: { area: 'speaking'; key: string; value: unknown }[] }

/** A voice we have a recorded sample of (no credits spent): Deepgram models and Sarvam voices. */
function sampled(service: string, voice: string) {
  return ((SAMPLES as Record<string, string[]>)[service] ?? []).includes(voice)
    ? `/api/voice-sample?service=${encodeURIComponent(service)}&voice=${encodeURIComponent(voice)}` : undefined
}

export const TEST_TOOLS: ToolDef[] = [
  {
    name: 'test_flow',
    description: 'Put a test of a flow in the chat for the user to run themselves: "chat" (typing to it) or "voice" (talking with their microphone). Use chat unless they ask to talk or hear it. You don’t see the conversation.',
    input: {
      type: 'object', required: ['flow'],
      properties: {
        flow: { type: 'string', description: 'Flow name or key, as the user said it; no need to look it up first' },
        how: { type: 'string', enum: ['chat', 'voice'] },
      },
    },
    label: (i) => `Set up a ${str(i.how) === 'voice' ? 'voice' : 'chat'} test of ${str(i.flow)}`,
    run: async (me: AuthUser, i) => {
      const f = await findFlow(me, i.flow)
      const row = await withDb(() => db.flow.findUnique({ where: { id: f.id }, select: { agent: { select: { workflow: true } } } }))
      const steps = Object.keys(((row?.agent?.workflow as { nodes?: object } | null)?.nodes) ?? {}).length
      if (!steps) throw new Error(`“${f.flowName}” has an empty workflow, so there is nothing to test yet. Tell the user to build the workflow first.`)
      const how: TestHow = str(i.how) === 'voice' ? 'voice' : 'chat'
      return { test: { flow: f.apiKey, name: f.flowName, how } }
    },
  },
  {
    name: 'voice_compare',
    description: 'Put up to 4 speaking voices side by side in the chat so the user can listen and choose (recorded samples, no cost). Either want (e.g. "Hindi female": matching voices are found for you) or voices [{service, voice}]. Only voices with a recorded sample can be played (Deepgram and Sarvam); each comes with the edit_settings changes to pick it.',
    input: { type: 'object', properties: { want: { type: 'string' }, voices: { type: 'array', maxItems: 4, items: { type: 'object', required: ['service', 'voice'], properties: { service: { type: 'string' }, voice: { type: 'string' } } } } } },
    label: (i) => `Set up voices to compare${str(i.want) ? ` (${str(i.want)})` : ''}`,
    run: async (_me, i) => {
      const out: VoiceSample[] = []
      if (Array.isArray(i.voices) && i.voices.length) {
        for (const v of i.voices as { service: string; voice: string }[]) {
          const p = providerFor('tts', str(v.service))
          if (!p) throw new Error(`Unknown speaking provider “${str(v.service)}”.`)
          const url = sampled(p.service, str(v.voice))
          if (!url) throw new Error(`No recorded sample for ${p.label} “${str(v.voice)}”. Samples exist for Deepgram and Sarvam voices; voice_options lists them.`)
          out.push({ label: `${str(v.voice)} (${p.label})`, url, changes: [{ area: 'speaking', key: 'service', value: p.service }, { area: 'speaking', key: p.service === 'deepgram' ? 'model' : 'voice', value: str(v.voice) }] })
        }
      } else if (str(i.want)) {
        for (const v of findVoices(str(i.want))) {
          const pick = v.changes.find((c) => c.key === 'model' || c.key === 'voice')
          const service = String(v.changes.find((c) => c.key === 'service')?.value ?? '')
          const url = pick ? sampled(service, String(pick.value)) : undefined
          if (url && out.length < 4) out.push({ label: v.voice, url, changes: v.changes })
        }
        if (!out.length) throw new Error('None of the matching voices has a recorded sample (only Deepgram and Sarvam do). Describe them in words instead.')
      } else throw new Error('Give want or voices.')
      return { voices: out.slice(0, 4) }
    },
  },
]
