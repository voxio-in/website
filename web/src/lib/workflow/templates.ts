// Starting points for a new workflow, built on the flows in production
// (jl-customs.json, nsdc-customs.json) and on how the engine runs each step
// (vx-backend-monorepo/agent/.../nodes):
//   - `out` speaks: its `out_dict` as written, plus each name in `variables` read from state.
//   - `llm-streaming` speaks as it generates, so it can't branch on what it returned.
//   - `llm` only writes its `llm_return_type` fields into state and says nothing:
//     an `out` step must follow to speak `speak`. It is the one to use when a
//     `conditional` has to branch on a field (e.g. `hangup`).
//   - after replying, the flow goes back to `ask_for_input` for the next turn.
//   - `start_node` and `variables` are required; `variables` declares the state and its defaults.

import type { Workflow } from './convert'
import { specFor } from './registry'

const say = (speak: string, extra: Record<string, unknown> = {}) => ({ out_dict: { speak, ...extra }, interruption_type: 'no', interruption_metadata: {} })

const listen = (next: string | string[]) => ({ type: 'input', parameters: { input_variables: { user_input: 'str' } }, next })
// Shows the caller's words in the transcript.
const transcription = (next?: string) => ({
  type: 'out', parameters: { variables: ['user_input'], interruption_type: 'no', interruption_metadata: {} }, ...(next ? { next } : {}),
})

const replyFields = {
  speak: { type: 'str', description: 'What to say to the caller.' },
  hangup: { type: 'bool', description: 'True once the conversation is over.' },
}

const llm = (system_prompt: string, extra: Record<string, unknown> = {}) => ({
  input_variables: { user_input: { type: 'str', description: 'What the caller said.' } },
  prompt_template: 'base_llm',
  system_prompt,
  service: 'groq',
  model: 'openai/gpt-oss-120b',
  history_key: 'conversation_history',
  interruption_type: 'full',
  interruption_metadata: {},
  llm_return_type: replyFields,
  ...extra,
})

// Sends the reply's fields on: `hangup` ends the call once the line is spoken.
const response = (variables: string[], interruption_type = 'no') => ({ type: 'out', parameters: { variables, interruption_type, interruption_metadata: {} } })

const variables = (extra: Record<string, unknown> = {}) => ({
  user_input: { type: 'str' },
  conversation_history: { type: 'list', default: [] },
  speak: { type: 'str' },
  hangup: { type: 'bool', default: false },
  node_type: { type: 'str' },
  ...extra,
})

export type Template = { id: string; name: string; blurb: string; workflow: Workflow }

// Names and blurbs say what the agent does, in plain words: most people picking one aren't technical
// (mindsets/voxio-users.md). The first is the default.
export const TEMPLATES: Template[] = [
  {
    id: 'simple',
    name: 'Simple conversation',
    blurb: 'Greets the person, listens and answers.',
    workflow: {
      start_node: 'greeting',
      variables: variables(),
      nodes: {
        greeting: { type: 'out', parameters: say('Hi! How can I help you today?'), next: 'ask_for_input' },
        ask_for_input: listen(['llm', 'transcription']),
        transcription: transcription(),
        llm: { type: 'llm-streaming', parameters: llm('You are a friendly, concise voice assistant. Keep replies to one or two sentences.'), next: ['response', 'ask_for_input'] },
        response: response(['speak', 'hangup']),
      },
    },
  },
  {
    id: 'ack',
    name: 'Fast reply',
    blurb: 'Says “one moment” at once while it works out the full answer.',
    workflow: {
      start_node: 'greeting',
      variables: variables({ conversation_history_ack: { type: 'list', default: [] } }),
      nodes: {
        greeting: { type: 'out', parameters: say('Hello, thanks for calling. How can I help?'), next: 'ask_for_input' },
        ask_for_input: listen(['ack', 'llm', 'transcription']),
        transcription: transcription(),
        ack: {
          type: 'llm-streaming',
          parameters: llm("Respond with ONLY 2-3 words like 'Okay', 'Got it', 'Sure'.", {
            model: 'openai/gpt-oss-20b', history_key: 'conversation_history_ack', stream_timeout: 0.5, interruption_type: 'no',
          }),
        },
        llm: { type: 'llm-streaming', parameters: llm('You are a helpful support agent. Be brief and accurate.'), next: ['response', 'ask_for_input'] },
        response: response(['speak', 'hangup']),
      },
    },
  },
  {
    id: 'hangup',
    name: 'Ends the call itself',
    blurb: 'Knows when the conversation is over and says goodbye.',
    workflow: {
      start_node: 'greeting',
      variables: variables(),
      nodes: {
        greeting: { type: 'out', parameters: say('Hi, this is a quick survey call. Do you have a minute?'), next: 'ask_for_input' },
        ask_for_input: listen('transcription'),
        transcription: transcription('llm'),
        // A plain `llm`, so `hangup` lands in state for the branch; `response` speaks the reply.
        llm: { type: 'llm', parameters: llm('Ask three short survey questions, one at a time. Set hangup to true once all three are answered.'), next: ['response', 'done?'] },
        response: response(['speak'], 'full'),
        'done?': {
          type: 'conditional',
          parameters: { input_variables: { hangup: {} }, mappings: { true: 'goodbye', false: 'ask_for_input', default: 'ask_for_input' } },
        },
        goodbye: { type: 'out', parameters: say('Thanks for your time, goodbye!', { hangup: true }) },
      },
    },
  },
  {
    id: 'rag',
    name: 'Answers from your documents',
    blurb: 'Looks up your knowledge base before it answers.',
    workflow: {
      start_node: 'greeting',
      variables: variables({ context: { type: 'str', default: '' } }),
      nodes: {
        greeting: { type: 'out', parameters: say('Hi, ask me anything about our products.'), next: 'ask_for_input' },
        ask_for_input: listen(['lookup', 'transcription']),
        transcription: transcription(),
        lookup: { type: 'rag', parameters: { input_variables: { user_input: 'str' }, output_variables: ['context'], collection_name: '', top_k: 5, entities: ['text'] }, next: 'llm' },
        llm: {
          type: 'llm-streaming',
          parameters: llm('Answer only from the context. If it is not there, say you will pass it on.', {
            input_variables: {
              user_input: { type: 'str', description: 'What the caller said.' },
              context: { type: 'str', description: 'Retrieved passages.' },
            },
          }),
          next: ['response', 'ask_for_input'],
        },
        response: response(['speak', 'hangup']),
      },
    },
  },
  {
    // The receptionist job most voice agents start as: works without any integration.
    id: 'message',
    name: 'Takes a message',
    blurb: 'Asks for a name, number and reason, then reads it back.',
    workflow: {
      start_node: 'greeting',
      variables: variables(),
      nodes: {
        greeting: { type: 'out', parameters: say('Hello, sorry we missed you. Can I take a message?'), next: 'ask_for_input' },
        ask_for_input: listen(['llm', 'transcription']),
        transcription: transcription(),
        llm: {
          type: 'llm-streaming',
          parameters: llm('You take messages. Ask for the caller’s name, a number to call back and the reason, one at a time. Then read all three back, thank them and say someone will call back soon. Keep each reply short.'),
          next: ['response', 'ask_for_input'],
        },
        response: response(['speak', 'hangup']),
      },
    },
  },
  {
    id: 'blank',
    name: 'Blank',
    blurb: 'Start empty and add every step yourself.',
    workflow: { variables: variables(), nodes: {} },
  },
]

/** Templates people can pick: none that uses a step the editor hides (Look up knowledge, for now), or it couldn't be saved. */
export const OFFERED_TEMPLATES = TEMPLATES.filter((t) => Object.values(t.workflow.nodes ?? {}).every((n) => !specFor(String((n as { type?: unknown }).type)).hidden))
