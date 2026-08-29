// The call graph for a browser demo — the WebRTC side of the house.

import type { DemoId } from '#/lib/demos'
import { demoById } from '#/lib/demos'
import { buildCherylCustoms } from './roleplays/cherylCustoms'
import { buildMuthuCustoms } from './roleplays/muthuCustoms'
import { setRoleplayWebhook } from './roleplays/shared'
import { buildVpsCustoms } from './roleplays/vpsCustoms'
import type { SurfaceId } from '#/lib/surfaces'
import { buildWebActionCustoms } from './webActionCustoms'

const ROLEPLAYS: Partial<Record<DemoId, (userName: string) => unknown>> = {
  mm: buildMuthuCustoms,
  pr: buildCherylCustoms,
  vps: buildVpsCustoms,
}

/** TTS, STT, pre-fire and inactivity — the keys the voice backend expects. */
function voiceSettings() {
  return {
    tts_id: { service: 'deepgram', model: 'aura-2-thalia-en' },
    stt_id: {
      service: 'deepgram-streaming',
      'model-name': 'nova-3',
      language: 'en-IN',
    },
    'grain-voice': false,
    'grain-level': 0,
    'pre-fire': true,
    'pre-fire-config': { min: 5, max: 5000, current: 10 },
    inactivity: true,
    'inactivity-metadata': {
      'time-period': 1000,
      'max-times': 3,
      'inactivity-type': 'static',
      message:
        'Are you still there? No rush — take your time and answer whenever you are ready.',
      'interruption-type': 'full',
      'interruption-metadata': {},
    },
  }
}

export function buildRoomCustoms(id: DemoId, webhookUrl: string) {
  const demo = demoById(id)

  if (id.startsWith('wa-')) {
    return buildWebActionCustoms(id.slice(3) as SurfaceId)
  }

  const roleplay = ROLEPLAYS[id]
  if (roleplay) {
    setRoleplayWebhook(webhookUrl)
    return roleplay('you')
  }

  return {
    'warmup-agent': true,
    'process-type': 'speech-native',
    'streaming-grace-ms': 2500,
    agent_id: {
      workflow: {
        nodes: {
          greeting: {
            type: 'out',
            parameters: {
              out_dict: { speak: demo.greeting },
              interruption_type: 'no',
              interruption_metadata: {},
            },
            next: 'ask_for_input',
          },
          ask_for_input: {
            type: 'input',
            parameters: { input_variables: { user_input: 'str' } },
            next: 'transcription',
          },
          transcription: {
            type: 'out',
            parameters: {
              variables: ['user_input'],
              interruption_type: 'no',
              interruption_metadata: {},
            },
            next: 'llm',
          },
          llm: {
            type: 'llm',
            parameters: {
              input_variables: {
                user_input: { type: 'str', description: 'What the user just said.' },
              },
              prompt_template: 'base_llm',
              system_prompt: demo.systemPrompt,
              service: 'groq',
              model: 'openai/gpt-oss-120b',
              history_key: 'conversation_history',
              llm_return_type: {
                speak: {
                  type: 'str',
                  description: "The agent's spoken reply.",
                },
              },
            },
            next: 'response',
          },
          response: {
            type: 'out',
            parameters: {
              variables: ['speak'],
              interruption_type: 'full',
              interruption_metadata: {},
            },
            next: 'ask_for_input',
          },
        },
        variables: {
          user_input: { type: 'str' },
          conversation_history: { type: 'list', default: [] },
          speak: { type: 'str' },
          node_type: { type: 'str' },
        },
        start_node: 'greeting',
      },
      'webhook-url': webhookUrl,
    },
    ...voiceSettings(),
  }
}
