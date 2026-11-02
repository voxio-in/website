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
  /** Developer mode's out_dict: speak and hangup as their own controls, any other pairs below. */
  | 'outdict'
  /** Developer mode's interruption_metadata: the keys the chosen interruption_type reads. */
  | 'interruptmeta'
  /** Developer mode's Listen input_variables, by where each value comes from. */
  | 'listenvars'
  /** Developer mode's llm_return_type: each field the AI fills, with its type and description. */
  | 'returntype'
  /** Developer mode's summariser_config: when and how older turns are summarised. */
  | 'summarycfg'
  /** Developer mode's Branch: the one value it decides on. */
  | 'branchon'
  /** Developer mode's Branch mappings: each value and where it leads. */
  | 'branchmaps'
  /** One name, from the values earlier steps produce (only the first name of the key is read). */
  | 'onevar'
  /** One name the step writes its result to (only the first is used). */
  | 'onename'
  /** Which stored fields of each passage come back (rag entities). */
  | 'entities'

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
  /** Developer mode: the engine's raw keys, grouped. Keys in no group show under "Other". */
  dev?: DevGroup[]
  /** Keys kept for the engine's own use that the dashboard never shows, not even in developer mode. */
  internal?: string[]
}

/**
 * One engine parameter as developer mode shows it: labelled by its real key, edited with a normal
 * control (`kind`, as in Field). `owns` lists other keys the same control writes
 * (interruption_type with interruption_metadata); `requires` shows it only while that switch is on.
 */
export type DevKey = {
  key: string; default: unknown; kind: FieldKind; owns?: string[]; requires?: string; help?: string
  /** Presets for a free string, shown as a combo box. */
  options?: string[]
  /** A fixed set to pick one from, shown as a dropdown whose hover note is each option's `info`. */
  choices?: { value: string; label: string; info?: string }[]
}
/** A heading of raw keys in developer mode, optionally with sub-groups. */
export type DevGroup = {
  id: string; title: string; keys: DevKey[]; groups?: DevGroup[]; help?: string
  /** Shown as one combination: its keys side by side in one row. */
  join?: boolean
  /**
   * The group is this key's control, not an expander: a switch (remove) or a dropdown
   * (interruption_type). Only once it turns something on does it become an expander
   * for the rest of the group.
   */
  lead?: string
}

/** Every key a developer-mode layout lists, sub-groups included. */
export const devKeysOf = (groups: DevGroup[]): string[] => groups.flatMap((g) => [...g.keys.flatMap((k) => [k.key, ...(k.owns ?? [])]), ...devKeysOf(g.groups ?? [])])

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

/** The rag node's: `kb` is the knowledge base id (voxioagent 2.2). */
const kbLookup: Field[] = [
  { key: 'kb', label: 'Knowledge base', kind: 'knowledge', help: 'Which knowledge base to search. Add PDFs to it on the Knowledge page. Saving connects it to this flow.' },
  { key: 'top_k', label: 'How many passages', kind: 'number', help: 'How many of the closest passages the next AI step gets. 3 to 5 suits most answers.' },
  { key: 'input_variables', label: 'Search using', kind: 'onevar', advanced: true, help: 'What to search for, usually what the caller said. Only the first value is used.' },
  { key: 'output_variables', label: 'Save results as', kind: 'onename', advanced: true, help: 'The name the next AI step reads the passages by. Add it to that step\'s input.' },
]

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

// Developer mode for the AI steps (agent/.../parameters/llm_/llm_.py, nodes/llm_/*.py,
// summariser_.py). Defaults are LLMParameters'.
const INTERRUPT_CHOICES = INTERRUPT_OPTIONS.map((o) => ({ value: o.value, label: o.value, info: `${o.label}. ${o.info}` }))
const aiModel: DevGroup = { id: 'model', title: 'model', join: true, help: 'Which provider runs the AI (service) and which of its models.', keys: [
  { key: 'service', default: 'groq', kind: 'select', choices: PROVIDERS.map((p) => ({ value: p.value, label: p.value, info: `${p.label}. ${p.hint ?? ''}` })) },
  { key: 'model', default: undefined, kind: 'model' },
] }
// service | model sit in main as one combination, not a group of their own.
const aiMain = (streaming: boolean): DevGroup => ({ id: 'main', title: 'main', groups: [aiModel], keys: [
  { key: 'system_prompt', default: '', kind: 'prompt', help: 'The instructions, placed after prompt_template in the system message.' },
  { key: 'prompt_template', default: 'base_llm', kind: 'select', help: 'Base prompts put before system_prompt (agent/assets/prompts/base). Join several with +, e.g. base_llm+zero_echoing.',
    options: ['base_llm', 'hinglish_llm', 'sales', 'slot_filling', 'zero_echoing', 'web_navigation'] },
  { key: 'input_variables', default: {}, kind: 'schema', help: 'Values from the state sent to the AI each turn, one "name : value" line each.' },
  { key: 'llm_return_type', default: {}, kind: 'returntype', help: streaming
    ? 'Fields the AI fills each turn. speak is streamed to the caller; the rest go to your webhook and later steps.'
    : 'Fields the AI fills each turn, written into the state for later steps (a Say speaks speak).' },
  ...(streaming ? [{ key: 'stream_timeout', default: undefined, kind: 'seconds' as const, help: 'When another AI step starts from the same step: if this one has not finished in this many seconds, the other is used.' }] : []),
] })
const aiMemory: DevGroup = { id: 'memory', title: 'memory', keys: [
  { key: 'history_key', default: '', kind: 'memory', help: 'The state key that holds this step\'s conversation. AI steps with the same history_key share one conversation.' },
] }
const aiSummariser: DevGroup = { id: 'summariser', title: 'summariser', lead: 'summariser', keys: [
  { key: 'summariser', default: true, kind: 'bool', help: 'Summarises older turns of this conversation once it gets long, so replies stay quick.' },
  { key: 'summariser_config', default: {}, kind: 'summarycfg', requires: 'summariser', help: 'When it summarises and with what. Unset keys use the summariser\'s defaults.' },
] }
const aiInterruption: DevGroup = { id: 'interruption', title: 'interruption', lead: 'interruption_type', keys: [
  { key: 'interruption_type', default: 'full', kind: 'select', help: 'What happens when the caller talks over this reply.', choices: INTERRUPT_CHOICES },
  { key: 'interruption_metadata', default: {}, kind: 'interruptmeta', help: 'The settings the chosen interruption_type reads.' },
] }
const aiEmotion: DevGroup = { id: 'emotion', title: 'emotion', lead: 'emotion', keys: [
  { key: 'emotion', default: false, kind: 'bool', help: 'Adds the voice-cue prompt so the reply carries cues like [laughs] for the voice to perform.' },
  { key: 'emotion_tts', default: 'eleven_v3', kind: 'select', requires: 'emotion', options: ['eleven_v3', 'soniox_rt_v2'], help: 'Which cue style (agent/assets/prompts/tagging).' },
] }

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
    // Defaults are OutputParameters' (agent/.../parameters/output_/parameters_.py).
    dev: [
      { id: 'main', title: 'main', keys: [
        { key: 'out_dict', default: {}, kind: 'outdict', help: 'A fixed object sent every time this step runs.' },
        { key: 'variables', default: [], kind: 'vars', help: 'Values from earlier steps added to the output. They replace the same key in out_dict.' },
        { key: 'flags', default: 'DOTALL', kind: 'select', options: ['DOTALL'], help: 'Regex flags used by the remove settings. The engine supports DOTALL only.' },
        { key: 'input_variables', default: {}, kind: 'schema', help: 'Accepted, not used by this step.' },
      ] },
      // services/general/interruption_manager/im_.py: the type decides; metadata holds what that type reads.
      { id: 'interruption', title: 'interruption', lead: 'interruption_type', keys: [
        { key: 'interruption_type', default: 'full', kind: 'select', help: 'What happens when the caller talks over the agent.',
          choices: INTERRUPT_OPTIONS.map((o) => ({ value: o.value, label: o.value, info: `${o.label}. ${o.info}` })) },
        { key: 'interruption_metadata', default: {}, kind: 'interruptmeta', help: 'The settings the chosen interruption_type reads: duration, length and ignore-words.' },
      ] },
      { id: 'remove', title: 'remove', lead: 'remove', keys: [{ key: 'remove', default: false, kind: 'bool', help: 'Cleans text values taken from variables (never out_dict). Turn it on to use remove_stt and remove_tts.' }], groups: [
        { id: 'remove_stt', title: 'remove_stt', join: true, help: 'Strips speaker labels like <speaker_1> from what the caller said, using the preset in remove_stt_name.', keys: [
          { key: 'remove_stt', default: false, kind: 'bool', requires: 'remove' },
          // agent/assets/regex/removals/stt_/
          { key: 'remove_stt_name', default: 'soniox/speakers/speaker-label', kind: 'select', options: ['soniox/speakers/speaker-label'], requires: 'remove_stt', help: 'Which removal preset to apply.' },
        ] },
        { id: 'remove_tts', title: 'remove_tts', join: true, help: 'Strips voice cues like [laughs] from the text, using the preset in remove_tts_name.', keys: [
          { key: 'remove_tts', default: false, kind: 'bool', requires: 'remove' },
          // agent/assets/regex/removals/tts_/
          { key: 'remove_tts_name', default: 'eleven_v3', kind: 'select', options: ['eleven_v3', 'elevenlabs-multilingual-v3', 'soniox_rt_v2'], requires: 'remove_tts', help: 'Which removal preset to apply.' },
        ] },
      ] },
    ],
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
    // agent/.../nodes/input_/node_.py: waits until every listed name has a fresh value this turn,
    // and pauses on the first one that is missing.
    dev: [
      { id: 'main', title: 'main', keys: [
        { key: 'input_variables', default: {}, kind: 'listenvars',
          help: 'What this step waits for. It carries on only when every name here has a fresh value this turn; until then the call pauses on the first one missing.' },
      ] },
    ],
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
    dev: [aiMain(true), aiInterruption, aiMemory, aiSummariser],
    summary: (p) => (String(p.system_prompt ?? '').trim() ? `${modelName(p)} · ${clip(p.system_prompt, 52)}` : `${modelName(p)} · no instructions yet`),
  },
  {
    type: 'llm', label: 'AI thinks (silent)', base: 'ai_thinks', group: 'AI', icon: 'check', color: '#e0a3ff', hue: 285, glyph: '✧',
    blurb: 'The AI decides things (a reply, “end the call”…) without speaking. Comes with a Say that speaks its reply.',
    out: 'single',
    fields: [...brain, decides, ...emotion, ...memory],
    defaults: aiDefaults,
    dev: [aiMain(false), aiEmotion, aiMemory, aiSummariser],
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
    // agent/.../nodes/conditional_/node_.py: reads the first input_variables name, trims and
    // lowercases its value, and takes the mapping whose key matches; else `default`; else `next`.
    dev: [{ id: 'main', title: 'main', keys: [
      { key: 'input_variables', default: {}, kind: 'branchon', help: 'The value it decides on. Only the first name counts; its value is compared trimmed and in lowercase.' },
      { key: 'mappings', default: {}, kind: 'branchmaps', help: 'One path per value. Keys are matched without regard to case; a key named default catches the rest. Lines on the canvas say where each path leads.' },
    ] }],
    summary: (p) => {
      const v = Object.keys((p.input_variables as object) ?? {})[0]
      return v ? `Checks ${friendlyVar(v).toLowerCase()}` : 'Choose what to check'
    },
  },
  {
    type: 'rag', label: 'Look up knowledge', group: 'Knowledge', icon: 'book', color: '#6fe3a1', hue: 145, glyph: '▤',
    blurb: 'Searches your documents or website and hands what it finds to the next AI step.',
    out: 'single',
    fields: kbLookup,
    defaults: { input_variables: { user_input: 'str' }, output_variables: ['context'], top_k: 5, entities: ['text'] },
    // collection_name (resolved from kb at session start) and url (the retrieval service) are internal.
    internal: ['collection_name', 'url'],
    // agent/.../nodes/rag: searches with the first input_variables value, keeps the `entities` fields
    // of each hit, and writes {rag_context: "…"} to the first output_variables name.
    dev: [
      { id: 'main', title: 'main', keys: [
        { key: 'kb', default: undefined, kind: 'knowledge', help: 'The knowledge base to search. It must be connected to this flow; saving does that.' },
        { key: 'input_variables', default: {}, kind: 'onevar', help: 'The search query: the first name here, usually user_input.' },
        { key: 'output_variables', default: [], kind: 'onename', help: 'Where the result goes, as {rag_context: "passage\\n\\npassage…"}. Default rag_context.' },
      ] },
      { id: 'retrieval', title: 'retrieval', keys: [
        { key: 'top_k', default: undefined, kind: 'number', help: 'How many passages come back. Unset uses the search service\'s default.' },
        { key: 'entities', default: ['text'], kind: 'entities', help: 'Which stored fields of each passage are kept. text is the passage itself.' },
        { key: 'filter_', default: undefined, kind: 'select', options: ['document_name == ""'], help: 'A Milvus filter expression that narrows the search, e.g. document_name == "faq.pdf".' },
        { key: 'timeout', default: undefined, kind: 'seconds', help: 'Seconds to wait for the search, up to 30. On a timeout the step passes no passages on.' },
      ] },
    ],
    summary: (p) => (p.kb ? `Searches ${knowledgeName(String(p.kb))}` : 'Pick a knowledge base'),
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
