// Every workflow step the agent engine accepts, declared once. The step
// picker, the canvas card, the settings form, the defaults and validation all
// read this. Parameter names and defaults mirror
// agent/src/agent/routers/agents/parameters/**; labels are for people.

import type { IconName } from '#/components/dashboard/Icon'

export type FieldKind =
  | 'text'
  | 'number'
  | 'bool'
  | 'select'
  | 'prompt'
  | 'model'
  | 'kv'
  | 'list'
  | 'schema'
  | 'typemap'
  | 'mappings'
  | 'knowledge'
  | 'json'
  /** The `speak` entry of out_dict, as one big text box. */
  | 'speak'
  /** interruption_type + its settings (seconds, words, ignored words). */
  | 'interrupt'
  /** A number of seconds. */
  | 'seconds'
  /** Pick values produced by earlier steps. */
  | 'vars'
  /** The one value a branch decides on. */
  | 'decideon'
  /** What a Listen step saves the caller's answer as. */
  | 'listen'
  /** Say's "Hang up after saying this": out_dict.hangup. */
  | 'hangup'
  /** A 0–1 chance shown as a percentage. */
  | 'percent'
  /** Say: "These words | What the AI decided". */
  | 'saymode'
  /** Say speaking the AI's reply: also hang up when the AI says so (variables has hangup). */
  | 'aihangup'
  /** AI thinks: what it decides each turn, as switches (llm_return_type speak / hangup). */
  | 'decides'
  /** AI answers: may end the call (llm_return_type hangup). */
  | 'canend'
  /** Which conversation memory it shares (history_key), from the ones in the workflow. */
  | 'memory'

export type Field = {
  key: string
  label: string
  kind: FieldKind
  help?: string
  options?: { value: string; label: string; hint?: string; info?: string }[]
  advanced?: boolean
  placeholder?: string
  /** Only shown while this other (yes/no) setting is on. */
  requires?: string
  /** Groups fields under a heading in the settings panel. */
  section?: 'output' | 'memory' | 'timing'
  /** Shown only when this holds for the step's settings. */
  when?: (p: Record<string, unknown>) => boolean
  /** Shown only when another AI step starts from the same step (they race). */
  racing?: boolean
  /** Works only with this voice service; otherwise the panel says why. */
  tts?: string
}

/** A Say that speaks an AI's reply instead of its own words. */
export const speaksAi = (p: Record<string, unknown>) =>
  Array.isArray(p.variables) && p.variables.includes('speak') && !String((p.out_dict as { speak?: unknown } | undefined)?.speak ?? '').trim()

export type OutMode = 'single' | 'mappings' | 'none'

export type NodeGroup = 'Conversation' | 'AI' | 'Logic' | 'Knowledge' | 'Shopify'

export type NodeSpec = {
  type: string
  label: string
  /** The start of new step ids of this kind ("say", "listen"…); the label otherwise. */
  base?: string
  group: NodeGroup
  icon: IconName
  /** Accent colour for the card and picker tile. */
  color: string
  /** Kept for the minimap and older callers. */
  hue: number
  glyph: string
  blurb: string
  out: OutMode
  fields: Field[]
  defaults: Record<string, unknown>
  /** Shown when a step has nothing to set on its main tab. */
  setupNote?: string
  /** One plain sentence about what this step will do, for the canvas card. */
  summary: (p: Record<string, unknown>) => string
  aliases?: string[]
  /** Accepted by the parameter classes but not yet by the engine's node factory. */
  unsupported?: string
  /** Not offered in the picker (still renders if a workflow has one). */
  hidden?: boolean
}

export const PROVIDERS = [
  { value: 'groq', label: 'Groq', hint: 'Fastest' },
  { value: 'openrouter', label: 'OpenRouter', hint: 'Most models' },
  { value: 'sarvam', label: 'Sarvam', hint: 'Indian languages' },
]

export const MODELS: Record<string, { value: string; label: string; hint?: string; info?: string }[]> = {
  groq: [
    { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', hint: 'Smartest', info: 'Best at following long instructions. A little slower.' },
    { value: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', hint: 'Quick', info: 'Very fast. Great for short acknowledgements like “Got it”.' },
  ],
  openrouter: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', hint: 'Fast', info: 'Quick and good at many languages.' },
    { value: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', hint: 'Careful', info: 'Very good at nuance and following rules. Slower to start.' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 mini', hint: 'Balanced', info: 'Solid reasoning at a good speed.' },
  ],
  sarvam: [{ value: 'sarvam-m', label: 'Sarvam M', info: 'Tuned for Indian languages and Hinglish.' }],
}

// The six interruption behaviours the pipeline implements
// (services/general/interruption_manager/im_.py). "Words" counts the words in the
// agent's own reply; "seconds" is how long the agent has been speaking.
export const INTERRUPT_OPTIONS = [
  { value: 'full', label: 'Stop and listen', hint: 'Recommended', info: 'The agent stops as soon as the caller starts talking.' },
  { value: 'no', label: 'Always finish', info: 'The agent never stops mid-reply. Good for legal lines and key details.' },
  { value: 'duration', label: 'Only at the start', info: 'The caller can cut in during the first few seconds; after that the agent finishes.' },
  { value: 'inverse_duration', label: 'Only after a few seconds', info: 'The opening of every reply is protected; after that the caller can cut in.' },
  { value: 'word_length', label: 'Only on short replies', info: 'Short replies can be interrupted; longer ones are always finished.' },
  { value: 'inverse_word_length', label: 'Only on long replies', info: 'Short replies are always finished; the caller can cut into longer ones.' },
]

const interrupt: Field = { key: 'interruption_type', label: 'If the caller interrupts', kind: 'interrupt', help: 'What happens when the caller talks over the agent.' }

/** Outputs the pipeline understands on its own, shown by what they do rather than their key. */
export const SPECIAL_OUTPUTS: Record<string, { label: string; note: string }> = {
  speak: { label: 'Spoken reply', note: 'What the caller hears' },
  hangup: { label: 'End the call', note: 'Hangs up when this is yes' },
  actions: { label: 'Website actions', note: 'Moves the caller’s web page' },
}

/** How a value reads to a person: special outputs by name, the rest in words. */
export const friendlyVar = (k: string) => SPECIAL_OUTPUTS[k]?.label ?? ({ user_input: 'What the caller said', context: 'Looked-up info' } as Record<string, string>)[k] ?? prettyName(k)

const EMOTION_STYLES = [{ value: 'eleven_v3', label: 'ElevenLabs v3', info: 'Adds cues like [laughs] or [whispers] that ElevenLabs v3 voices perform.' }]

const brain: Field[] = [
  { key: 'system_prompt', label: 'Instructions', kind: 'prompt', help: 'Who the agent is, what to do and how to talk.', placeholder: 'You are a friendly receptionist for…' },
  { key: 'model', label: 'Model', kind: 'model', help: 'Which AI writes the reply. The provider comes with it.' },
  { key: 'llm_return_type', label: 'Everything it decides', kind: 'schema', advanced: true, section: 'output', help: 'Every field the AI fills in each turn, by name. The spoken reply is what the caller hears; the rest goes to your webhook and later steps.' },
]
const decides: Field = { key: 'llm_return_type', label: 'It decides', kind: 'decides', help: 'What this AI works out each turn. Later steps speak it or branch on it.' }
const canEnd: Field = { key: 'llm_return_type', label: 'Can end the call', kind: 'canend', help: 'Lets the AI hang up once the conversation is over.' }
const memory: Field[] = [
  { key: 'input_variables', label: 'What it reads', kind: 'schema', advanced: true, section: 'memory', help: 'Information from earlier steps the AI can use.' },
  { key: 'history_key', label: 'Shares memory with', kind: 'memory', advanced: true, section: 'memory', help: 'AI steps that share a memory remember the same conversation.' },
  { key: 'summariser', label: 'Summarise long calls', kind: 'bool', advanced: true, section: 'memory', help: 'Keeps long conversations quick by summarising older turns.' },
]
const emotion: Field[] = [
  { key: 'emotion', label: 'Add emotion', kind: 'bool', tts: 'elevenlabs', help: 'Lets the voice sound happy, calm or excited where it fits.' },
  { key: 'emotion_tts', label: 'Emotion style', kind: 'select', options: EMOTION_STYLES, requires: 'emotion', help: 'Which voice understands the emotion cues.' },
]

const aiDefaults = {
  system_prompt: '',
  service: 'groq',
  model: 'openai/gpt-oss-120b',
  prompt_template: 'base_llm',
  input_variables: { user_input: { type: 'str', description: 'What the caller said.' } },
  llm_return_type: {
    speak: { type: 'str', description: 'What to say to the caller.' },
    hangup: { type: 'bool', description: 'True to end the call.' },
  },
  history_key: 'conversation_history',
  interruption_type: 'full',
  interruption_metadata: {},
}

const lookup: Field[] = [
  { key: 'collection_name', label: 'Knowledge base', kind: 'knowledge', help: 'Where to look.' },
  { key: 'input_variables', label: 'Search using', kind: 'schema', advanced: true, help: 'What to search for — usually what the caller said.' },
  { key: 'output_variables', label: 'Save results as', kind: 'list', advanced: true, help: 'The AI step after this one reads the results by this name.' },
]

/** Knowledge base names by id, filled in by the editor so cards can show names. */
const KB_NAMES = new Map<string, string>()
export const setKnowledgeNames = (list: { value: string; label: string }[]) => { KB_NAMES.clear(); for (const k of list) KB_NAMES.set(k.value, k.label) }
const knowledgeName = (id: string) => KB_NAMES.get(id) ?? id

const clip = (s: unknown, n = 70) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
const modelName = (p: Record<string, unknown>) => MODELS[String(p.service)]?.find((m) => m.value === p.model)?.label ?? String(p.model ?? 'AI')

export const NODE_SPECS: NodeSpec[] = [
  {
    type: 'out', label: 'Say', base: 'say', group: 'Conversation', icon: 'voice', color: '#5ee6c8', hue: 165, glyph: '❝',
    blurb: 'Speaks a line you write: greetings, confirmations, goodbyes. Can also speak the reply of an AI that thinks silently.',
    out: 'single',
    fields: [
      { key: 'out_dict', label: 'Say', kind: 'saymode', help: 'Your own words, or the reply an AI step before it decided.' },
      { key: 'out_dict', label: 'What to say', kind: 'speak', placeholder: 'Hi! Thanks for calling…', when: (p) => !speaksAi(p) },
      { key: 'out_dict', label: 'Hang up after saying this', kind: 'hangup', help: 'Ends the call once this line is spoken, as a goodbye does.', when: (p) => !speaksAi(p) },
      { key: 'variables', label: 'Hang up when the AI says so', kind: 'aihangup', help: 'Ends the call after this reply when the AI decided the conversation is over.', when: speaksAi },
      interrupt,
      { key: 'out_dict', label: 'Also send', kind: 'kv', advanced: true, help: 'Extra details sent to your webhook, not spoken.' },
      { key: 'variables', label: 'Pass along', kind: 'vars', advanced: true, help: 'Values from earlier steps to send with it.' },
      { key: 'remove', label: 'Tidy values before sending', kind: 'bool', advanced: true, help: 'Removes tags from the values passed along.' },
      { key: 'remove_stt', label: 'Remove speaker labels', kind: 'bool', advanced: true, requires: 'remove', help: 'Drops labels like <speaker_1> from what the caller said.' },
    ],
    defaults: { out_dict: { speak: '' }, interruption_type: 'no', interruption_metadata: {} },
    summary: (p) => {
      const speak = (p.out_dict as Record<string, unknown> | undefined)?.speak
      if (typeof speak === 'string' && speak.trim()) return `“${clip(speak)}”`
      if (Array.isArray(p.variables) && p.variables.includes('speak')) return 'Speaks the AI’s reply'
      const vars = Array.isArray(p.variables) ? p.variables : []
      return vars.length ? `Sends ${vars.join(', ')} (silently)` : 'Nothing to say yet'
    },
  },
  {
    type: 'input', label: 'Listen', base: 'listen', group: 'Conversation', icon: 'phone', color: '#7aa9ff', hue: 215, glyph: '◉',
    blurb: 'Waits until the caller finishes talking, then saves their words for the next step.',
    out: 'single',
    setupNote: 'Waits for the caller to finish, then passes their words on. Nothing to set here. What it does when the caller goes quiet is on the Behaviour tab.',
    fields: [{ key: 'input_variables', label: 'Save what they say as', kind: 'listen', advanced: true, help: 'The name later steps use to read the caller’s answer. Almost always “What the caller said”.' }],
    defaults: { input_variables: { user_input: 'str' } },
    summary: (p) => {
      const names = Object.keys((p.input_variables as object) ?? {})
      return names.length ? `Waits for the caller · saves ${names.map((n) => friendlyVar(n).toLowerCase()).join(', ')}` : 'Waits for the caller to speak'
    },
  },
  {
    type: 'random-speak-out', label: 'Filler', base: 'filler', group: 'Conversation', icon: 'list', color: '#8fd3ff', hue: 200, glyph: '≈',
    blurb: 'Plays a short “one moment…” so the caller isn’t left in silence while a slow step works.',
    out: 'single',
    fields: [
      { key: 'phrases', label: 'Phrases', kind: 'list', help: 'One is picked at random each time. It only helps when it runs beside a slow step: connect it from the same Listen as that step, so they start together.' },
      { key: 'variance', label: 'How often it speaks', kind: 'percent', advanced: true, help: 'At 100% it says a phrase every time; at 50%, about every other time.' },
    ],
    defaults: { phrases: ['One moment…', 'Let me check that.'], variance: 1.0 },
    summary: (p) => {
      const ph = Array.isArray(p.phrases) ? p.phrases : []
      return ph.length ? `“${clip(ph[0], 40)}”${ph.length > 1 ? ` + ${ph.length - 1} more` : ''}` : 'No phrases yet'
    },
  },
  {
    type: 'llm-streaming', label: 'AI answers (out loud)', base: 'ai_answers', group: 'AI', icon: 'bolt', color: '#c79bff', hue: 270, glyph: '✦',
    blurb: 'The AI answers out loud, word by word, so the caller hears it sooner. Best for normal chat.',
    out: 'single',
    fields: [...brain, canEnd, interrupt, ...memory,
      { key: 'stream_timeout', label: 'Give up after', kind: 'seconds', advanced: true, section: 'timing', racing: true, help: 'Another AI starts from the same step. If this one takes longer than this, the other is heard.' }],
    defaults: aiDefaults,
    summary: (p) => (String(p.system_prompt ?? '').trim() ? `${modelName(p)} · ${clip(p.system_prompt, 52)}` : `${modelName(p)} · no instructions yet`),
  },
  {
    type: 'llm', label: 'AI thinks (silent)', base: 'ai_thinks', group: 'AI', icon: 'check', color: '#e0a3ff', hue: 285, glyph: '✧',
    blurb: 'The AI decides things (a reply, “end the call”…) without speaking. Comes with a Say that speaks its reply.',
    out: 'single',
    fields: [...brain, decides, ...emotion, ...memory],
    defaults: aiDefaults,
    summary: (p) => (String(p.system_prompt ?? '').trim() ? `${modelName(p)} · ${clip(p.system_prompt, 52)}` : `${modelName(p)} · no instructions yet`),
  },
  {
    type: 'llm_webnavigation', label: 'Guide on website', group: 'AI', icon: 'cursor', color: '#ff9ecb', hue: 320, glyph: '⌖',
    blurb: 'Talks the caller through your website while scrolling and clicking it for them.',
    out: 'single',
    fields: [...brain.filter((f) => f.key !== 'llm_return_type'), ...emotion, ...memory],
    defaults: { ...aiDefaults, prompt_template: 'web_navigation', llm_return_type: undefined },
    summary: (p) => `${modelName(p)} · drives the page`,
    unsupported: 'This step can’t run on calls yet. Remove it, or use AI answers instead.',
  },
  {
    type: 'conditional', label: 'Branch', base: 'branch', group: 'Logic', icon: 'flows', color: '#ffc670', hue: 38, glyph: '⑂',
    blurb: 'Sends the call down a different path based on a value, like the AI’s yes or no on ending the call.',
    out: 'mappings',
    fields: [
      { key: 'input_variables', label: 'Decide on', kind: 'decideon', help: 'Something an earlier step decided, like End the call.' },
      { key: 'mappings', label: 'Paths', kind: 'mappings', help: 'One path per answer. Connect each path to the step it leads to.' },
    ],
    defaults: { input_variables: { hangup: 'bool' }, mappings: { true: '', false: '' } },
    summary: (p) => {
      const v = Object.keys((p.input_variables as object) ?? {})[0]
      return v ? `Checks ${friendlyVar(v).toLowerCase()}` : 'Choose what to check'
    },
  },
  {
    type: 'rag', label: 'Look up knowledge', group: 'Knowledge', icon: 'book', color: '#6fe3a1', hue: 145, glyph: '▤',
    blurb: 'Searches your documents or website and hands what it finds to the next AI step.',
    // Knowledge is hidden for now: not offered for new steps, existing ones still open.
    hidden: true,
    out: 'single',
    fields: lookup,
    defaults: { input_variables: { user_input: 'str' }, output_variables: ['context'], top_k: 5, entities: ['text'] },
    summary: (p) => (p.collection_name ? `Searches ${knowledgeName(String(p.collection_name))}` : 'Pick a knowledge base'),
  },
  {
    type: 'rag_shopify', label: 'Search catalog', group: 'Shopify', icon: 'search', color: '#9be15d', hue: 95, glyph: '⛁',
    blurb: 'Searches your Shopify products so the next AI step can answer about them.',
    out: 'single',
    fields: [
      ...lookup,
      ...brain,
    ],
    defaults: { ...aiDefaults, top_k: 5, entities: ['text'], context_key: 'shopify_context' },
    summary: (p) => (p.collection_name ? `Searches ${p.collection_name}` : 'Pick a catalog'),
    hidden: true,
  },
  {
    type: 'llm_shopify', label: 'Product reply', group: 'Shopify', icon: 'plug', color: '#b6e36b', hue: 80, glyph: '⛃',
    blurb: 'Answer with product cards.',
    out: 'single',
    aliases: ['shopify_llm'],
    fields: [
      ...brain, ...memory,
      { key: 'layout_type', label: 'Layout', kind: 'select', options: [{ value: 'horizontal', label: 'Side by side' }, { value: 'vertical', label: 'Stacked' }] },
    ],
    defaults: { ...aiDefaults, card_type: 'modern_minimalistic', layout_type: 'horizontal' },
    summary: (p) => `${modelName(p)} · product cards`,
    hidden: true,
  },
]

const BY_TYPE = new Map<string, NodeSpec>()
for (const s of NODE_SPECS) {
  BY_TYPE.set(s.type, s)
  for (const a of s.aliases ?? []) BY_TYPE.set(a, s)
}

/** The spec for a type string, or a generic one so unknown types still render and round-trip. */
export function specFor(type: string): NodeSpec {
  return (
    BY_TYPE.get(type) ?? {
      type, label: type, group: 'Logic', icon: 'sliders', color: '#9aa5a8', hue: 0, glyph: '?',
      blurb: 'A custom step.',
      out: 'single', fields: [], defaults: {},
      summary: () => 'Custom step',
      unsupported: `“${type}” isn’t a step this editor knows.`,
    }
  )
}

export const GROUPS: NodeGroup[] = ['Conversation', 'AI', 'Logic', 'Knowledge', 'Shopify']

/** "ask_for_input" → "Ask for input". Step names stay as they are; this is only how they read. */
export const prettyName = (id: string) => {
  const s = id.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : id
}
