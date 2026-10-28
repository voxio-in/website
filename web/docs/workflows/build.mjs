import fs from 'node:fs'
const prompt = fs.readFileSync('subodh-prompt.md', 'utf8').trim()
const base = ['yes','yeah','okay','ok','mm-hmm','uh-huh','right','i see','got it','sure','alright','all right','mhm','haan','han','ji','haan ji','ji haan','accha','achha','acha','theek hai','thik hai','hmm','ji sir','ji ma\'am','ok sir','okay sir','sahi','sahi hai','bilkul']
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const ignore = [...new Set(base.flatMap((w) => [w, cap(w)].flatMap((x) => [x, x + '.', x + ','])))].concat(['हाँ', 'हाँ जी', 'जी', 'अच्छा', 'ठीक है', 'हम्म'])
const wf = {
  variables: {
    user_input: { type: 'str' },
    speak: { type: 'str' },
    hangup: { type: 'bool', default: false },
    conversation_history: { type: 'list', default: [] },
    conversation_history_prev: { type: 'list', default: [] },
  },
  start_node: 'greeting',
  nodes: {
    greeting: {
      type: 'out',
      parameters: {
        out_dict: { speak: 'Namaste! Subodh Public School, Rambagh, admissions office se main Priya bol rahi hoon. Bataiye, main aapki kya madad kar sakti hoon?' },
        interruption_type: 'no', interruption_metadata: {},
      },
      next: 'ask_for_input',
    },
    ask_for_input: {
      type: 'input',
      parameters: { input_variables: { user_input: 'str' } },
      next: ['prev_llm', 'llm', 'transcription'],
    },
    transcription: {
      type: 'out',
      parameters: { variables: ['user_input'], interruption_type: 'no', interruption_metadata: {} },
    },
    prev_llm: {
      type: 'llm-streaming',
      parameters: {
        model: 'openai/gpt-oss-20b', service: 'groq',
        history_key: 'conversation_history_prev', stream_timeout: 0.5, prompt_template: 'base_llm',
        system_prompt: "You are a quick acknowledgment voice on a school admissions phone line. Reply with ONLY one to three words that acknowledge what the parent just said, in the parent's own language: 'Ji', 'Achha ji', 'Theek hai', 'Bilkul' for Hindi or Hinglish, 'Sure', 'Of course', 'I see' for English. Never answer the question. Never use digits.",
        input_variables: { user_input: { type: 'str', description: 'What the parent just said.' } },
        llm_return_type: {
          speak: { type: 'str', description: "One to three word acknowledgment in the parent's language." },
          hangup: { type: 'bool', description: 'Always false.' },
        },
        interruption_type: 'no', interruption_metadata: {},
      },
    },
    llm: {
      type: 'llm-streaming',
      parameters: {
        model: 'google/gemini-3.1-flash-lite', service: 'openrouter',
        history_key: 'conversation_history', prompt_template: 'base_llm',
        system_prompt: prompt,
        input_variables: { user_input: { type: 'str', description: 'What the parent just said.' } },
        llm_return_type: {
          speak: { type: 'str', description: "Priya's spoken reply, in the parent's language (Hinglish in Roman script by default, or English). One or two short sentences, numbers as words, no special characters, and it continues naturally after the quick acknowledgment." },
          hangup: { type: 'bool', description: 'True only when the parent has clearly said they are done and this reply is the warm goodbye. Otherwise false.' },
        },
        interruption_type: 'full',
        interruption_metadata: { 'min-interruption-delay': 15, 'min-interruption-debounce': 2, 'ignore-words': ignore },
      },
      next: ['response', 'ask_for_input'],
    },
    response: {
      type: 'out',
      parameters: { variables: ['speak', 'hangup'], interruption_type: 'no', interruption_metadata: {} },
    },
  },
  ui: {
    positions: {
      greeting: { x: -311, y: 162 }, ask_for_input: { x: 171, y: 181 },
      transcription: { x: 848, y: 40 }, prev_llm: { x: 848, y: 250 },
      llm: { x: 848, y: 462 }, response: { x: 1252, y: 462 },
    },
    edgeStyle: 'step',
  },
}
fs.writeFileSync('subodh-public-school.json', JSON.stringify(wf, null, 2) + '\n')
console.log('ok', fs.statSync('subodh-public-school.json').size, 'bytes,', ignore.length, 'ignore words')
