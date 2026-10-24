// Conversation moves: small sets of steps, already named and connected, that the
// editor adds in one go (mindsets/voxio-users.md, Workflow editor). They are built
// the way the templates are (templates.ts), so the engine runs them the same.

import type { IconName } from '#/components/dashboard/Icon'

/** One step of a move. `key` is local to the move; the editor turns `name` into a unique step id. */
export type MoveStep = { key: string; name: string; type: string; params: Record<string, unknown> }
/** A line inside a move. `to: LISTEN` means the Listen step the move follows (the conversation loops back to it). */
export type MoveEdge = { from: string; to: string; handle?: string }
export type Move = {
  id: string
  label: string
  blurb: string
  icon: IconName
  color: string
  steps: MoveStep[]
  edges: MoveEdge[]
  /** Where the next step goes on from, for chaining moves. Defaults to the last step. */
  exit?: string
  /** Needs a Listen before it; one is added first when there is none. */
  needsListen?: boolean
}

export const LISTEN = '@listen'

const say = (speak: string, extra: Record<string, unknown> = {}) => ({ out_dict: { speak, ...extra }, interruption_type: 'no', interruption_metadata: {} })
// Passes the AI's answers on: `speak` is spoken, `hangup` ends the call once it is.
const passOn = (variables: string[], interruption_type = 'no') => ({ variables, interruption_type, interruption_metadata: {} })
const listen = { input_variables: { user_input: 'str' } }
// Shows the caller's words in the transcript.
const showWords = passOn(['user_input'])
const ai = (system_prompt: string) => ({
  input_variables: { user_input: { type: 'str', description: 'What the caller said.' } },
  prompt_template: 'base_llm',
  system_prompt,
  service: 'groq',
  model: 'openai/gpt-oss-120b',
  history_key: 'conversation_history',
  interruption_type: 'full',
  interruption_metadata: {},
  llm_return_type: {
    speak: { type: 'str', description: 'What to say to the caller.' },
    hangup: { type: 'bool', description: 'True once the conversation is over.' },
  },
})

/** The Listen + "show the caller's words" pair every turn starts with. */
export const LISTEN_STEPS: MoveStep[] = [
  { key: 'listen', name: 'listen', type: 'input', params: listen },
  { key: 'words', name: 'caller_words', type: 'out', params: showWords },
]

export const MOVES: Move[] = [
  {
    id: 'greeting', label: 'Greeting', blurb: 'Says hello, then waits for the caller to answer.', icon: 'voice', color: '#5ee6c8',
    steps: [{ key: 'hi', name: 'greeting', type: 'out', params: say('Hi! Thanks for calling. How can I help?') }, ...LISTEN_STEPS],
    edges: [{ from: 'hi', to: 'listen' }, { from: 'listen', to: 'words' }],
    exit: 'listen',
  },
  {
    id: 'ask', label: 'Ask a question', blurb: 'Asks something, then waits for the answer.', icon: 'phone', color: '#7aa9ff',
    steps: [{ key: 'q', name: 'question', type: 'out', params: say('') }, ...LISTEN_STEPS.map((s) => ({ ...s, name: s.key === 'listen' ? 'answer' : s.name }))],
    edges: [{ from: 'q', to: 'listen' }, { from: 'listen', to: 'words' }],
    exit: 'listen',
  },
  {
    id: 'converse', label: 'AI conversation', blurb: 'The AI answers out loud, then listens again. Goes after a Listen.', icon: 'bolt', color: '#c79bff',
    needsListen: true,
    steps: [
      { key: 'ai', name: 'ai_answers', type: 'llm-streaming', params: ai('You are a friendly, concise voice assistant. Keep replies to one or two sentences.') },
      { key: 'reply', name: 'reply', type: 'out', params: passOn(['speak', 'hangup']) },
    ],
    edges: [{ from: 'ai', to: 'reply' }, { from: 'ai', to: LISTEN }],
    exit: 'ai',
  },
  {
    id: 'ends', label: 'AI decides when to end', blurb: 'The AI talks until the conversation is over, then says goodbye and hangs up.', icon: 'check', color: '#e0a3ff',
    needsListen: true,
    steps: [
      { key: 'ai', name: 'ai_thinks', type: 'llm', params: ai('Have a short, friendly conversation. Set hangup to true once it is over.') },
      { key: 'reply', name: 'reply', type: 'out', params: passOn(['speak'], 'full') },
      { key: 'done', name: 'is_it_over?', type: 'conditional', params: { input_variables: { hangup: 'bool' }, mappings: { true: '', false: '' } } },
      { key: 'bye', name: 'goodbye', type: 'out', params: say('Thanks for your time. Goodbye!', { hangup: true }) },
    ],
    edges: [{ from: 'ai', to: 'reply' }, { from: 'ai', to: 'done' }, { from: 'done', to: 'bye', handle: 'm:true' }, { from: 'done', to: LISTEN, handle: 'm:false' }],
    exit: 'bye',
  },
  {
    id: 'goodbye', label: 'Goodbye and hang up', blurb: 'Says goodbye and ends the call.', icon: 'close', color: '#5ee6c8',
    steps: [{ key: 'bye', name: 'goodbye', type: 'out', params: say('Thanks for calling. Goodbye!', { hangup: true }) }],
    edges: [],
  },
  {
    id: 'moment', label: 'One moment…', blurb: 'Fills a silence while a slow step works.', icon: 'list', color: '#8fd3ff',
    steps: [{ key: 'f', name: 'one_moment', type: 'random-speak-out', params: { phrases: ['One moment…', 'Let me check that.'], variance: 1.0 } }],
    edges: [],
  },
]

/** An AI that thinks silently is never added alone: the Say that speaks its reply comes with it. */
export const SILENT_AI: Move = {
  id: 'silent', label: 'AI thinks (silent)', blurb: '', icon: 'check', color: '#e0a3ff',
  steps: [
    { key: 'ai', name: 'ai_thinks', type: 'llm', params: ai('') },
    { key: 'reply', name: 'reply', type: 'out', params: passOn(['speak', 'hangup'], 'full') },
  ],
  edges: [{ from: 'ai', to: 'reply' }],
  exit: 'ai',
}

export const moveById = (id: string) => MOVES.find((m) => m.id === id) ?? (id === SILENT_AI.id ? SILENT_AI : undefined)

/** What usually comes after a step, first in "Add next step". `loop`: a line back to the Listen before it. */
export function suggestionsAfter(type: string, branchPath: boolean): ({ kind: 'move'; id: string } | { kind: 'step'; type: string } | { kind: 'loop' })[] {
  if (branchPath) return [{ kind: 'move', id: 'goodbye' }, { kind: 'loop' }]
  switch (type) {
    case 'out': return [{ kind: 'step', type: 'input' }, { kind: 'move', id: 'goodbye' }]
    case 'input': return [{ kind: 'move', id: 'converse' }, { kind: 'move', id: 'ends' }]
    case 'llm-streaming': return [{ kind: 'loop' }]
    case 'llm': return [{ kind: 'step', type: 'conditional' }]
    case 'random-speak-out': return [{ kind: 'move', id: 'converse' }]
    default: return []
  }
}
