// The graphs for the website-navigation demos on /webnav.

import type { SurfaceId } from '#/lib/surfaces'
import { buildVoiceCustoms } from './roleplays/shared'

import { md, render } from './prompts/render'
import craftRules from './prompts/webnav/craft.md?raw'
import clinicPage from './prompts/webnav/clinic.md?raw'
import universityPage from './prompts/webnav/university.md?raw'
import railPage from './prompts/webnav/rail.md?raw'
import shopPage from './prompts/webnav/shop.md?raw'

const MARKER = '<|web_action|>'

const CRAFT = render(md(craftRules), { MARKER })

type PageSpec = { greeting: string; page: string }

const PAGES: Record<SurfaceId, PageSpec> = {
  clinic: {
    greeting: 'Civil Hospital appointments. Who is the appointment for?',
    page: render(md(clinicPage), { MARKER }),
  },

  university: {
    greeting: 'Meridian Institute helpdesk, Meera speaking. How can I help?',
    page: render(md(universityPage), { MARKER }),
  },

  rail: {
    greeting: 'Namaste, railway booking helpdesk. Where would you like to travel?',
    page: render(md(railPage), { MARKER }),
  },

  shop: {
    greeting: 'Hi, bazaar here. What are you after?',
    page: render(md(shopPage), { MARKER }),
  },
}

export function buildWebActionCustoms(surface: SurfaceId) {
  const spec = PAGES[surface]

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
              out_dict: { speak: spec.greeting },
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
              system_prompt: `${spec.page}

${CRAFT}

THE SHAPE OF A REPLY, so the markers and the speech line up:
{
  "speak": "Fees sit under academics rather than admissions, sir. ${MARKER} And fee payment is the third one here. ${MARKER} Sixty two thousand for the semester, and the window shuts on the eighteenth.",
  "actions": [
    {"action": "click", "selector": "#uni-tab-academics"},
    {"action": "click", "selector": "#uni-ac-fees"}
  ]
}`,
              service: 'groq',
              model: 'openai/gpt-oss-120b',
              history_key: 'conversation_history',
              llm_return_type: {
                speak: {
                  type: 'str',
                  description: `The spoken reply, with ${MARKER} markers where the screen should change.`,
                },
                actions: {
                  type: 'list',
                  description: `One action dict per ${MARKER} marker in speak, in order.`,
                },
              },
            },
            next: 'response',
          },
          response: {
            type: 'out',
            parameters: {
              variables: ['speak', 'actions'],
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
          actions: { type: 'list', default: [] },
          node_type: { type: 'str' },
        },
        start_node: 'greeting',
      },
      'webhook-url': '',
    },
    ...buildVoiceCustoms({ preFire: false }),
  }
}
