// The call graph for a browser demo — the WebRTC side of the house.

import type { AccentId } from '#/lib/accents'
import type { DemoId } from '#/lib/demos'
import { demoById } from '#/lib/demos'
import { buildCherylCustoms } from './roleplays/cherylCustoms'
import { buildJeremyCustoms } from './roleplays/jeremyCustoms'
import { buildMuthuCustoms } from './roleplays/muthuCustoms'
import { buildVoiceCustoms, setRoleplayWebhook } from './roleplays/shared'
import { buildTanCustoms } from './roleplays/tanCustoms'
import { buildVpsCustoms } from './roleplays/vpsCustoms'
import type { SurfaceId } from '#/lib/surfaces'
import { buildWebActionCustoms } from './webActionCustoms'

const ROLEPLAYS: Partial<
  Record<DemoId, (userName: string, accent?: AccentId) => unknown>
> = {
  mm: buildMuthuCustoms,
  tn: buildTanCustoms,
  pr: buildCherylCustoms,
  vps: buildVpsCustoms,
  jl: buildJeremyCustoms,
}

export function buildRoomCustoms(
  id: DemoId,
  webhookUrl: string,
  accent?: AccentId,
) {
  const demo = demoById(id)

  if (id.startsWith('wa-')) {
    return buildWebActionCustoms(id.slice(3) as SurfaceId, accent)
  }

  const roleplay = ROLEPLAYS[id]
  if (roleplay) {
    setRoleplayWebhook(webhookUrl)
    return roleplay('you', accent)
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
    ...buildVoiceCustoms({ accent }),
  }
}
