// The "Build your agent" pages of /docs, as a tree (DocPage.parent): workflows,
// each step, the AI settings they share, voice (one page per provider),
// turn-taking and the avatar.
//
// Behaviour is described from the engine itself (vx-backend-monorepo/agent/
// src/agent/routers/agents: workflow.py and nodes/**, and services/general/
// interruption_manager/im_.py). The setting tables are read from the
// registries the dashboard editors use (lib/workflow/registry,
// lib/dashboard/providers, lib/dashboard/knobs), so they stay in step.

import type { ReactNode } from 'react'

import { BeforeYouBegin, C, Code, DocLink, H2, H3, NextSteps, Note, Params, Steps, Table } from '#/components/docs/parts'
import { INTERRUPT_OPTIONS, MODELS, NODE_SPECS, PROVIDERS, SPECIAL_OUTPUTS, specFor, type Field } from '#/lib/workflow/registry'
import { STT_PROVIDERS, TTS_PROVIDERS, type Provider, type ProviderField } from '#/lib/dashboard/providers'
import { KNOBS, type Knob } from '#/lib/dashboard/knobs'
import type { DocPage } from './pages'

// ------------------------------------------------------------------ helpers

const FIELD_TYPE: Record<Field['kind'], string> = {
  text: 'string', number: 'number', bool: 'boolean', select: 'string', prompt: 'string', model: 'string', kv: 'object',
  list: 'string[]', schema: '{ name: { type, description } }', typemap: '{ name: type }', mappings: '{ value: step | step[] }',
  knowledge: 'string', json: 'object', speak: 'string', interrupt: 'string', seconds: 'number (seconds)', vars: 'string[]',
  decideon: '{ name: type }', listen: '{ name: type }', hangup: 'out_dict.hangup: boolean', percent: 'number (0 to 1)', saymode: 'out_dict.speak or variables', aihangup: 'string[]',
  decides: '{ speak, hangup }', canend: '{ hangup }', memory: 'string',
}

const fmt = (v: unknown) => (v === undefined ? '—' : typeof v === 'string' ? `"${v}"` : JSON.stringify(v))

const optionList = (o?: { value: string; label: string }[]) =>
  o?.length ? <> One of: {o.map((x, i) => <span key={x.value}>{i ? ', ' : ''}<C>{x.value}</C> ({x.label})</span>)}.</> : null

/** The editor's settings for a step, as a parameter list. Extra (engine-only) parameters can be appended. */
function stepParams(type: string, extra: { name: string; type: string; children: ReactNode }[] = []) {
  const spec = specFor(type)
  const seen = new Set<string>()
  const fromEditor = spec.fields.filter((f) => f.kind !== 'speak' && !seen.has(f.key) && seen.add(f.key)).map((f) => ({
    name: f.key,
    type: FIELD_TYPE[f.kind],
    children: <>
      In the editor: <strong>{f.label}</strong>{f.advanced ? ' (More tab)' : ''}. {f.help ?? ''}
      {f.requires && <> Only used when <C>{f.requires}</C> is on.</>}
      {f.kind !== 'model' && optionList(f.options)}
      {spec.defaults[f.key] !== undefined && f.kind !== 'schema' && f.kind !== 'kv' && <> Default: <C>{fmt(spec.defaults[f.key])}</C>.</>}
    </>,
  }))
  return [...fromEditor, ...extra]
}

const INTERRUPT_EXTRA = [
  { name: 'interruption_type', type: 'string', children: <>What happens if the caller talks while this is being said. See <DocLink to="turn-taking-interruptions">Interruptions</DocLink>. Default <C>"full"</C>.</> },
  { name: 'interruption_metadata', type: 'object', children: <>Numbers for the timed and length-based interruption types: <C>duration</C> (seconds), <C>length</C> (words), <C>ignore-words</C>.</> },
]

function providerParams(p: Provider) {
  const seen = new Set<string>()
  return p.fields.filter((f) => !seen.has(f.key) && seen.add(f.key)).map((f: ProviderField) => ({
    name: f.key,
    type: f.kind === 'tags' ? 'string[]' : f.kind === 'slider' || f.kind === 'number' ? `number${f.unit ? ` (${f.unit})` : ''}` : f.kind === 'bool' ? 'boolean' : 'string',
    children: <>
      <strong>{f.label}</strong>{f.basic ? '' : ' (under More settings)'}. {f.help ?? ''}
      {f.min !== undefined && f.max !== undefined && <> From {f.min} to {f.max}.</>}
      {f.default !== undefined && <> Default: <C>{fmt(f.default)}</C>.</>}
      {f.when && <> Only applies to some models.</>}
    </>,
  }))
}

/** A provider's choices (models, voices, languages) as tables, with the notes the dashboard shows. */
function providerOptions(p: Provider) {
  const seen = new Set<string>()
  return p.fields.filter((f) => f.options && f.options.length > 1).map((f) => {
    const id = `${f.key}-${seen.has(f.key) ? 2 : 1}`
    seen.add(f.key)
    return (
      <div key={id}>
        <H3 id={`choices-${id}`}>{f.label} choices{f.when ? ' (for some models)' : ''}</H3>
        <Table head={['Value', 'Name', 'Notes']} rows={f.options!.map((o) => [<C>{o.value}</C>, o.label, [o.hint, o.info].filter(Boolean).join('. ')])} />
      </div>
    )
  })
}

function knobParams(group: Knob['group']) {
  return KNOBS.filter((k) => k.group === group).map((k) => ({
    name: k.key,
    type: k.kind === 'object' ? 'object' : k.kind === 'slider' || k.kind === 'number' ? `number${k.unit ? ` (${k.unit})` : ''}` : k.kind === 'bool' ? 'boolean' : 'string',
    children: <>
      <strong>{k.label}</strong>. {k.help ?? ''}
      {k.surface === 'web' && ' Web sessions only.'}
      {k.requires && <> Only used when <C>{k.requires}</C> is on.</>}
      {k.min !== undefined && k.max !== undefined && <> From {k.min} to {k.max}.</>}
      {k.options && <> One of: {k.options.map((o, i) => <span key={o.value}>{i ? ', ' : ''}<C>{o.value}</C> ({k.optionInfo?.[o.value] ?? o.label})</span>)}.</>}
      {k.fields && <> Fields: {k.fields.map((f, i) => <span key={f.key}>{i ? ', ' : ''}<C>{f.key}</C> ({f.label}{f.unit ? `, ${f.unit}` : ''})</span>)}.</>}
      {' '}Default: <C>{fmt(k.default)}</C>.
    </>,
  }))
}

const RUNTIME_CODE = (fields: string) => `
await voxio.flows.update(flowKey, {
  runtime: {
${fields}
  },
});`

// ------------------------------------------------------------------ workflows

const LOOP = `{
  "start_node": "greeting",
  "variables": {
    "user_input": { "type": "str" },
    "conversation_history": { "type": "list", "default": [] },
    "speak": { "type": "str" },
    "hangup": { "type": "bool", "default": false }
  },
  "nodes": {
    "greeting": {
      "type": "out",
      "parameters": { "out_dict": { "speak": "Hi! How can I help you today?" }, "interruption_type": "no" },
      "next": "ask_for_input"
    },
    "ask_for_input": {
      "type": "input",
      "parameters": { "input_variables": { "user_input": "str" } },
      "next": "think"
    },
    "think": {
      "type": "llm",
      "parameters": {
        "system_prompt": "You are the receptionist at Sunrise Dental. Keep replies to one or two sentences.",
        "service": "groq",
        "model": "openai/gpt-oss-120b",
        "input_variables": { "user_input": { "type": "str", "description": "What the caller said." } },
        "llm_return_type": {
          "speak": { "type": "str", "description": "What to say to the caller." },
          "hangup": { "type": "bool", "description": "True once the conversation is over." }
        },
        "history_key": "conversation_history"
      },
      "next": "reply"
    },
    "reply": {
      "type": "out",
      "parameters": { "variables": ["speak", "hangup"] },
      "next": "ask_for_input"
    }
  }
}`

const workflowPages: DocPage[] = [
  {
    slug: 'workflows',
    title: 'Workflows',
    group: 'Build your agent',
    summary: 'A workflow is the script your agent follows on every call: the steps, the order they run in, and the values they pass along.',
    body: () => (
      <>
        <p>
          Every flow has one workflow. You build it on the flow's <strong>Workflow</strong> tab by dragging steps onto a
          canvas and joining them, or you write it as JSON. Both are the same thing: the editor reads and writes the JSON,
          and the engine runs the JSON.
        </p>

        <H2 id="the-pieces">The pieces</H2>
        <Table head={['Piece', 'What it is']} rows={[
          [<strong>Step</strong>, <>One thing the agent does: speak, listen, think with an AI, or choose a path. See <DocLink to="steps">Steps</DocLink>.</>],
          [<strong>Line</strong>, <>Where to go after a step. In JSON it's the step's <C>next</C>, or a Branch's <C>mappings</C>.</>],
          [<strong>Start step</strong>, <>Where every call begins (<C>start_node</C>). Usually a greeting.</>],
          [<strong>Values</strong>, <>Named values the steps share during a call, such as <C>user_input</C> (what the caller said) and <C>speak</C> (what to say). See <DocLink to="workflows-values">Values and state</DocLink>.</>],
        ]} />

        <H2 id="smallest-useful-workflow">The smallest useful workflow</H2>
        <p>Greet, then loop: listen, think, reply, listen again. If the AI decides the call is over, it sets <C>hangup</C> and the call ends after the reply is spoken:</p>
        <Code lang="json" title="workflow.json">{LOOP}</Code>

        <H2 id="in-this-section">In this section</H2>
        <Table head={['Page', 'Read it to']} rows={[
          [<DocLink to="workflows-running">How a call runs</DocLink>, 'understand the order steps run in, side by side steps, and waiting for the caller.'],
          [<DocLink to="workflows-values">Values and state</DocLink>, 'pass information between steps and to your webhook.'],
          [<DocLink to="workflows-patterns">Patterns</DocLink>, 'copy proven shapes: instant acknowledgement, branching, ending the call.'],
          [<DocLink to="workflows-share">Import, export and code</DocLink>, 'move workflows between flows and accounts, or manage them from your server.'],
        ]} />

        <NextSteps items={[
          { to: 'workflows-running', label: 'How a call runs', what: 'the rules the engine follows.' },
          { to: 'steps', label: 'Steps', what: 'every kind of step.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'workflows-running',
    title: 'How a call runs',
    group: 'Build your agent',
    parent: 'workflows',
    summary: 'The rules the engine follows: where it starts, what runs next, what runs side by side, and how it waits for the caller.',
    body: () => (
      <>
        <H2 id="one-step-at-a-time">From step to step</H2>
        <Steps>
          <li>A call starts at <C>start_node</C>.</li>
          <li>When a step finishes, every step in its <C>next</C> starts. <C>next</C> can be one name or a list.</li>
          <li>A Branch picks its own next step from <C>mappings</C> instead. If no path matches, it falls back to a <C>default</C> path, then to its <C>next</C>.</li>
          <li>A step with no <C>next</C> (and no matching path) ends that line of work. When nothing is left running, the agent waits for the caller.</li>
        </Steps>

        <H2 id="side-by-side">Steps side by side</H2>
        <p>
          When <C>next</C> lists several steps, they all start at once. This is how you show the caller's words in the
          transcript while the AI thinks, or play a quick acknowledgement while a slower model works:
        </p>
        <Code lang="json">{`
"ask_for_input": {
  "type": "input",
  "parameters": { "input_variables": { "user_input": "str" } },
  "next": ["ack", "main_reply", "transcription"]
}`}</Code>
        <p>
          When two or more <strong>AI answers</strong> steps run side by side, the one that starts speaking first is heard
          first. The others are held, then played in the order they started. Give a held step a <C>stream_timeout</C>
          (seconds) and it's dropped if it's still waiting after that long, so a stale answer is never spoken.
        </p>

        <H2 id="waiting-for-the-caller">Waiting for the caller</H2>
        <p>
          A <strong>Listen</strong> step pauses its line of the workflow until the caller has finished speaking. The words
          are saved (normally as <C>user_input</C>) and the workflow carries on from the Listen step's <C>next</C>. Every turn
          of a conversation is one pass from Listen round to Listen again.
        </p>
        <Note kind="tip">How quickly the caller counts as “finished” is set on the flow, not the step. See <DocLink to="turn-taking">Turn-taking</DocLink>.</Note>

        <H2 id="when-a-step-fails">When a step fails</H2>
        <p>
          If an AI provider fails or times out, the engine retries once on the next provider (see{' '}
          <DocLink to="steps-ai-settings" hash="models-and-failover">Models and failover</DocLink>). If that fails too, the
          agent says its fallback line. Any other failing step is skipped and logged; the rest of the workflow keeps going.
        </p>

        <NextSteps items={[
          { to: 'workflows-values', label: 'Values and state', what: 'what steps read and write.' },
          { to: 'workflows-patterns', label: 'Patterns', what: 'shapes that work well.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'workflows-values',
    title: 'Values and state',
    group: 'Build your agent',
    parent: 'workflows',
    summary: 'How steps share information during a call, which values do something on their own, and what reaches your webhook.',
    body: () => (
      <>
        <p>
          Each call has its own <em>state</em>: a set of named values. Steps read from it and write to it. Declare every
          value in the workflow's <C>variables</C> with a type and, if it needs one, a starting value:
        </p>
        <Code lang="json">{`
"variables": {
  "user_input": { "type": "str" },
  "conversation_history": { "type": "list", "default": [] },
  "hangup": { "type": "bool", "default": false },
  "outcome": { "type": "str" }
}`}</Code>
        <p>Types are <C>str</C>, <C>int</C>, <C>float</C>, <C>bool</C>, <C>list</C> and <C>dict</C>.</p>

        <H2 id="who-writes-what">Who writes what</H2>
        <Table head={['Step', 'Writes', 'Reads']} rows={[
          ['Listen', <>What the caller said, under each name in its <C>input_variables</C></>, '—'],
          ['AI thinks', <>Every field it returns (its <C>llm_return_type</C>), and its memory under <C>history_key</C></>, <>Its <C>input_variables</C>, and its memory</>],
          ['AI answers', <>Only its memory under <C>history_key</C>. The reply itself is spoken, not saved.</>, <>Its <C>input_variables</C>, and its memory</>],
          ['Say', '—', <>The names in its <C>variables</C></>],
          ['Branch', '—', <>The first name in its <C>input_variables</C></>],
        ]} />
        <Note kind="warn">Only an <strong>AI thinks</strong> saves its fields. To branch on something the AI decided, use AI thinks, not AI answers.</Note>

        <H2 id="values-that-act">Values that do something</H2>
        <p>When a Say step sends these, or an AI answers step returns them, the pipeline acts on them:</p>
        <Table head={['Value', 'What happens']} rows={[
          ...Object.entries(SPECIAL_OUTPUTS).map(([k, v]) => [<C>{k}</C>, `${v.label}: ${v.note}.`]),
          [<C>interruption_type</C>, <>Sets how this one message can be interrupted. See <DocLink to="turn-taking-interruptions">Interruptions</DocLink>.</>],
        ]} />
        <p>Every other value a Say step sends is passed on with the turn: it shows as a data line in the Test panel and session replays, and reaches your <DocLink to="webhooks">webhook</DocLink>.</p>

        <NextSteps items={[
          { to: 'workflows-patterns', label: 'Patterns', what: 'put values to work.' },
          { to: 'steps-ai-decision', label: 'AI thinks', what: 'decide fields with an AI.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'workflows-patterns',
    title: 'Patterns',
    group: 'Build your agent',
    parent: 'workflows',
    summary: 'Workflow shapes that work well in production, with the JSON for each.',
    body: () => (
      <>
        <H2 id="fast-chat">Fast, natural chat</H2>
        <p>Listen → <strong>AI answers</strong> → back to Listen. The AI speaks as it writes, so the caller hears the first words soonest. The AI can still end the call by returning <C>hangup</C>.</p>
        <Code lang="json">{`
"ask_for_input": { "type": "input", "parameters": { "input_variables": { "user_input": "str" } }, "next": "chat" },
"chat": {
  "type": "llm-streaming",
  "parameters": { "system_prompt": "…", "service": "groq", "model": "openai/gpt-oss-120b", "history_key": "conversation_history" },
  "next": "ask_for_input"
}`}</Code>

        <H2 id="instant-acknowledgement">Instant acknowledgement</H2>
        <p>
          Run a tiny model and the main model side by side. The tiny one says “Sure, one moment” almost at once; the main
          answer follows. Give each its own <C>history_key</C> so they don't mix memories, and a <C>stream_timeout</C> on
          the main one so a very late answer is dropped. The <strong>Quick ack + main LLM</strong> template builds this.
        </p>
        <Code lang="json">{`
"ask_for_input": { "type": "input", "parameters": { "input_variables": { "user_input": "str" } }, "next": ["ack", "main"] },
"ack":  { "type": "llm-streaming", "parameters": { "model": "openai/gpt-oss-20b",  "history_key": "conversation_history_ack", "system_prompt": "Reply with a two to four word acknowledgement only." } },
"main": { "type": "llm-streaming", "parameters": { "model": "openai/gpt-oss-120b", "history_key": "conversation_history", "stream_timeout": 8, "system_prompt": "…" }, "next": "ask_for_input" }`}</Code>

        <H2 id="decide-then-branch">Decide, then branch</H2>
        <p>An <strong>AI thinks</strong> fills in fields; a <strong>Say</strong> speaks the reply; a <strong>Branch</strong> picks the path from a field.</p>
        <Code lang="json">{`
"decide": {
  "type": "llm",
  "parameters": {
    "system_prompt": "Work out what the caller wants.",
    "llm_return_type": {
      "speak":  { "type": "str", "description": "What to say." },
      "intent": { "type": "str", "description": "book, cancel or other" }
    }
  },
  "next": "say_it"
},
"say_it": { "type": "out", "parameters": { "variables": ["speak"] }, "next": "route" },
"route": {
  "type": "conditional",
  "parameters": {
    "input_variables": { "intent": "str" },
    "mappings": { "book": "booking", "cancel": "cancelling", "default": "ask_for_input" }
  }
}`}</Code>

        <H2 id="end-the-call">End the call</H2>
        <p>Send <C>hangup: true</C> with the last line. The line is spoken first, then the call ends:</p>
        <Code lang="json">{`
"goodbye": { "type": "out", "parameters": { "out_dict": { "speak": "Thanks for calling. Goodbye!", "hangup": true } } }`}</Code>
        <p>To let the AI decide, include <C>hangup</C> in its decided fields and pass it on with <C>{'"variables": ["speak", "hangup"]'}</C>.</p>

        <H2 id="show-what-the-caller-said">Show what the caller said</H2>
        <p>A Say step with only <C>{'"variables": ["user_input"]'}</C>, run beside the AI step, puts the caller's words in the transcript without speaking them back. The templates call it <C>transcription</C>.</p>

        <NextSteps items={[
          { to: 'workflows-share', label: 'Import, export and code', what: 'reuse a workflow elsewhere.' },
          { to: 'steps', label: 'Steps', what: 'every setting of every step.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'workflows-share',
    title: 'Import, export and code',
    group: 'Build your agent',
    parent: 'workflows',
    summary: 'Copy or download a workflow as JSON, start a flow from one, or manage workflows from your own server.',
    body: () => (
      <>
        <H2 id="export">Export</H2>
        <p>
          In the workflow editor, on a flow's overview, or on a row of the <strong>Flows</strong> table, choose
          <strong> Export</strong>. You can copy the JSON or download it as <C>{'<flow name>.json'}</C>. The file also keeps
          the canvas layout (step positions and line bends) under <C>ui</C>; the engine ignores it.
        </p>

        <H2 id="import">Import</H2>
        <Steps>
          <li>In the workflow editor choose <strong>Import</strong> to replace the canvas, or on <strong>Flows</strong> choose <strong>Import</strong> (or the <strong>Import JSON</strong> tile in <strong>New flow</strong>) to start a new flow from it.</li>
          <li>Paste the JSON, or upload a <C>.json</C> file (drop it on the box or click to choose).</li>
          <li>Choose <strong>Import</strong>. In the editor nothing is saved until you press <strong>Save</strong>, and Undo brings back what was there.</li>
        </Steps>
        <p>Import accepts a bare workflow, or a whole flow document with the workflow inside it.</p>

        <H2 id="from-code">From code</H2>
        <p>Read a flow's workflow, change it, and save it back with the server SDK:</p>
        <Code lang="js">{`
const flow = await voxio.flows.get(flowKey);
const workflow = flow.agent.workflow;

workflow.nodes.greeting.parameters.out_dict.speak = "Hello from Sunrise Dental!";

await voxio.flows.update(flowKey, { workflow });`}</Code>
        <Note kind="tip">The next session uses the new workflow. Calls already running keep the old one.</Note>

        <NextSteps items={[
          { to: 'flows', label: 'Flows', what: 'every flow setting you can send from code.' },
        ]} />
      </>
    ),
  },
]

// ------------------------------------------------------------------ steps

type StepDoc = { type: string; slug: string; how: ReactNode; extra?: { name: string; type: string; children: ReactNode }[]; examples: { title: string; text: string; json: string }[]; tips?: ReactNode }

const STEP_DOCS: StepDoc[] = [
  {
    type: 'out', slug: 'steps-say',
    how: (
      <Steps>
        <li>Starts from <C>out_dict</C> exactly as written: usually <C>speak</C>, and sometimes <C>hangup</C> or your own keys.</li>
        <li>Adds each value named in <C>variables</C> from the call's state. Names with no value yet are left out.</li>
        <li>Sends the result to the caller. <C>speak</C> is spoken, <C>hangup: true</C> ends the call once it's said, and anything else travels with the turn to your webhook.</li>
      </Steps>
    ),
    extra: [
      { name: 'out_dict.speak', type: 'string', children: <>In the editor: <strong>What to say</strong>. Spoken exactly as written. Leave it out to say nothing of your own.</> },
      ...INTERRUPT_EXTRA.slice(1),
      { name: 'remove', type: 'boolean', children: <>Clean the <C>variables</C> before sending. With <C>remove_tts</C>, strips emotion cues such as <C>[laughs]</C> (for example, to show them in a transcript). Default <C>false</C>.</> },
      { name: 'remove_tts', type: 'boolean', children: <>Strip voice cues when <C>remove</C> is on. Default <C>false</C>.</> },
      { name: 'remove_tts_name', type: 'string', children: <>Which cue style to strip. Default <C>"eleven_v3"</C>.</> },
    ],
    examples: [
      { title: 'A fixed line', text: 'A greeting that can’t be talked over:', json: `{ "type": "out", "parameters": { "out_dict": { "speak": "Hi! Thanks for calling Sunrise Dental." }, "interruption_type": "no" }, "next": "ask_for_input" }` },
      { title: 'Speak what the AI decided', text: 'After an AI thinks step, speak its reply and pass on its hang-up decision:', json: `{ "type": "out", "parameters": { "variables": ["speak", "hangup"] }, "next": "ask_for_input" }` },
      { title: 'Send data without speaking', text: 'Record an outcome for your webhook, silently:', json: `{ "type": "out", "parameters": { "out_dict": { "stage": "booking_confirmed" }, "variables": ["outcome"] } }` },
    ],
  },
  {
    type: 'input', slug: 'steps-listen',
    how: (
      <Steps>
        <li>Pauses this line of the workflow until the caller finishes speaking.</li>
        <li>Saves their words under each name in <C>input_variables</C>, normally <C>user_input</C>. Values from the last turn are cleared first, so a step after Listen never reads an old answer.</li>
        <li>Carries on with its <C>next</C>.</li>
      </Steps>
    ),
    examples: [
      { title: 'The usual Listen', text: 'Listen, then think and show the words in the transcript at the same time:', json: `{ "type": "input", "parameters": { "input_variables": { "user_input": "str" } }, "next": ["think", "transcription"] }` },
    ],
    tips: <p>Most workflows have one Listen step that every turn comes back to. When the caller counts as “finished” is set on the flow: see <DocLink to="turn-taking">Turn-taking</DocLink>.</p>,
  },
  {
    type: 'random-speak-out', slug: 'steps-filler',
    how: (
      <Steps>
        <li>Rolls a chance from <C>variance</C>: at <C>1</C> it always speaks, at <C>0.5</C> about half the time, at <C>0</C> never.</li>
        <li>If it speaks, picks one of <C>phrases</C> at random and says it.</li>
      </Steps>
    ),
    examples: [
      { title: 'Cover a slow lookup', text: 'Start it beside a slow step so the caller hears something straight away:', json: `{ "type": "random-speak-out", "parameters": { "phrases": ["One moment…", "Let me check that.", "Sure, just a second."], "variance": 0.8 } }` },
    ],
    tips: <p>Start a Filler side by side with the slow step (list both in the previous step's <C>next</C>), not before it, or the caller waits for the filler too.</p>,
  },
  {
    type: 'llm-streaming', slug: 'steps-ai-reply',
    how: (
      <Steps>
        <li>Builds the AI's instructions from the <DocLink to="steps-ai-settings" hash="prompt-templates">prompt template</DocLink>, your <C>system_prompt</C>, and the shape of the reply.</li>
        <li>Adds this turn's input (each name in <C>input_variables</C> with its value) to the step's memory (<C>history_key</C>).</li>
        <li>Streams the reply. The pipeline speaks <C>speak</C> as the words arrive, ends the call after speaking if the reply sets <C>hangup</C>, and uses <C>interruption_type</C> if the reply includes one.</li>
        <li>Saves the exchange to memory. The reply's fields are <strong>not</strong> saved to the call's state.</li>
      </Steps>
    ),
    extra: [
      ...INTERRUPT_EXTRA,
      { name: 'interruption_type_key', type: 'string', children: <>Read the interruption type from this value in the state instead, so an earlier step can decide it.</> },
      { name: 'interruption_metadata_key', type: 'string', children: <>The same, for the interruption numbers.</> },
      { name: 'prompt_template', type: 'string', children: <>Built-in instructions to start from. See <DocLink to="steps-ai-settings" hash="prompt-templates">Prompt templates</DocLink>. Default <C>"base_llm"</C>.</> },
      { name: 'summariser_config', type: 'object', children: <>Tune <C>summariser</C>. See <DocLink to="steps-ai-settings" hash="memory">Memory</DocLink>.</> },
    ],
    examples: [
      { title: 'A chatty receptionist', text: 'The usual conversational step:', json: `{ "type": "llm-streaming", "parameters": { "system_prompt": "You are the receptionist at Sunrise Dental. Be warm and brief.", "service": "groq", "model": "openai/gpt-oss-120b", "input_variables": { "user_input": { "type": "str", "description": "What the caller said." } }, "llm_return_type": { "speak": { "type": "str", "description": "What to say." }, "hangup": { "type": "bool", "description": "True to end the call." } }, "history_key": "conversation_history" }, "next": "ask_for_input" }` },
    ],
    tips: <Note kind="warn">Because nothing it returns is saved to state, a Branch can't act on an AI answers step. Use <DocLink to="steps-ai-decision">AI thinks</DocLink> when the next step depends on what the AI decided.</Note>,
  },
  {
    type: 'llm', slug: 'steps-ai-decision',
    how: (
      <Steps>
        <li>Builds the instructions the same way as AI answers, plus emotion cues if <C>emotion</C> is on.</li>
        <li>Asks the AI for a JSON answer with the fields in <C>llm_return_type</C>, and waits for the whole answer.</li>
        <li>Saves every returned field to the call's state (a plain-text answer is saved as <C>llm_response</C>), and the exchange to memory.</li>
        <li>Says nothing. Follow it with a <DocLink to="steps-say">Say</DocLink> that speaks <C>speak</C>, and a <DocLink to="steps-branch">Branch</DocLink> if the call should go different ways.</li>
      </Steps>
    ),
    extra: [
      { name: 'prompt_template', type: 'string', children: <>Built-in instructions to start from. See <DocLink to="steps-ai-settings" hash="prompt-templates">Prompt templates</DocLink>. Default <C>"base_llm"</C>.</> },
      { name: 'summariser_config', type: 'object', children: <>Tune <C>summariser</C>. See <DocLink to="steps-ai-settings" hash="memory">Memory</DocLink>.</> },
    ],
    examples: [
      { title: 'Qualify a lead', text: 'Decide a reply, whether to hang up, and an outcome for your dashboard:', json: `{ "type": "llm", "parameters": { "system_prompt": "Find out if the caller wants a demo this week.", "service": "groq", "model": "openai/gpt-oss-120b", "llm_return_type": { "speak": { "type": "str", "description": "What to say." }, "hangup": { "type": "bool", "description": "True once done." }, "outcome": { "type": "str", "description": "demo_booked, later or not_interested" } }, "history_key": "conversation_history" }, "next": "reply" }` },
    ],
    tips: <p>It waits for the full answer before anything is said, so it's slower to the first word than AI answers step. Use it where you need the fields; use AI answers for plain chat.</p>,
  },
  {
    type: 'conditional', slug: 'steps-branch',
    how: (
      <Steps>
        <li>Reads the first value named in <C>input_variables</C> from the call's state.</li>
        <li>Compares it, as lower-case text with spaces trimmed, to each key in <C>mappings</C>. A yes/no value reads as <C>"true"</C> or <C>"false"</C>.</li>
        <li>Goes to the matching path's step (or steps, if the path is a list).</li>
        <li>If nothing matches it takes the <C>default</C> path. With no default it follows its <C>next</C>, and with neither it stops there.</li>
      </Steps>
    ),
    examples: [
      { title: 'Yes or no', text: 'End the call or keep listening:', json: `{ "type": "conditional", "parameters": { "input_variables": { "hangup": "bool" }, "mappings": { "true": "goodbye", "false": "ask_for_input" } } }` },
      { title: 'Several answers and a default', text: 'Route by intent:', json: `{ "type": "conditional", "parameters": { "input_variables": { "intent": "str" }, "mappings": { "book": "booking", "cancel": ["cancel_reply", "notify"], "default": "ask_for_input" } } }` },
    ],
    tips: <p>In the editor each path is a dot on the card; drag from it to the step it leads to. Paths show the step they go to.</p>,
  },
  {
    type: 'llm_webnavigation', slug: 'steps-guide-on-website',
    how: (
      <Steps>
        <li>Works like AI thinks, with the <C>web_navigation</C> prompt template.</li>
        <li>Returns <C>speak</C> and a list of <C>actions</C> (scroll, click, fill in). Markers in <C>speak</C> say when each action happens, so the page moves as the agent talks about it.</li>
      </Steps>
    ),
    examples: [],
    tips: <p>See <DocLink to="web-actions">Web actions</DocLink> for what the page needs.</p>,
  },
]

const stepPages: DocPage[] = [
  {
    slug: 'steps',
    title: 'Workflow steps',
    group: 'Build your agent',
    summary: 'The building blocks of a workflow: what each kind of step does and when to use it.',
    body: () => (
      <>
        <p>Each step has a <C>type</C>, its settings in <C>parameters</C>, and where to go next in <C>next</C>. Pick a step to see exactly what it does and every setting it takes.</p>
        <Table head={['Step', 'type', 'Use it to']} rows={STEP_DOCS.map((d) => {
          const s = specFor(d.type)
          return [<DocLink to={d.slug}>{s.label}</DocLink>, <C>{s.type}</C>, `${s.blurb}${s.unsupported ? ` (${s.unsupported})` : ''}`]
        })} />

        <H2 id="choosing">Choosing between the AI steps</H2>
        <Table head={['', 'AI answers', 'AI thinks']} rows={[
          ['Speaks', 'Yes, as it writes', 'No: follow it with Say'],
          ['First word', 'Fastest', 'After the whole answer'],
          ['Saves its fields for later steps', 'No', 'Yes'],
          ['Can end the call', <>Yes, with <C>hangup</C></>, <>Yes, via a Say that passes <C>hangup</C></>],
          ['Emotion cues', 'No', 'Yes'],
          ['Use for', 'Conversation', 'Decisions, data, branching'],
        ]} />
        <p>Both share the settings on <DocLink to="steps-ai-settings">AI settings</DocLink>: instructions, models, memory and decided fields.</p>

        <NextSteps items={[
          { to: 'steps-say', label: 'Say', what: 'the step that speaks.' },
          { to: 'steps-ai-settings', label: 'AI settings', what: 'models, memory and decided fields.' },
        ]} />
      </>
    ),
  },
  ...STEP_DOCS.map((d): DocPage => {
    const s = specFor(d.type)
    return {
      slug: d.slug,
      title: s.label,
      group: 'Build your agent',
      parent: 'steps',
      summary: s.blurb,
      body: () => (
        <>
          <p>Type: <C>{s.type}</C>.</p>
          {s.unsupported && <Note kind="warn">{s.unsupported}</Note>}
          <H2 id="what-it-does">What it does</H2>
          {d.how}
          {d.tips}
          <H2 id="settings">Settings</H2>
          <p>Everything goes in the step's <C>parameters</C>. In the editor, click the step to open its settings.</p>
          <Params items={stepParams(d.type, d.extra)} />
          {d.examples.length > 0 && <H2 id="examples">Examples</H2>}
          {d.examples.map((e) => (
            <div key={e.title}>
              <H3 id={e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>{e.title}</H3>
              <p>{e.text}</p>
              <Code lang="json">{JSON.stringify(JSON.parse(e.json), null, 2)}</Code>
            </div>
          ))}
          <NextSteps items={[
            { to: 'steps', label: 'Steps', what: 'all the other steps.' },
            { to: 'workflows-patterns', label: 'Patterns', what: 'see it in a full workflow.' },
          ]} />
        </>
      ),
    }
  }),
  {
    slug: 'steps-ai-settings',
    title: 'AI settings',
    group: 'Build your agent',
    parent: 'steps',
    summary: 'Settings shared by the AI steps: instructions, prompt templates, models and failover, what it reads and decides, memory and emotion.',
    body: () => (
      <>
        <H2 id="instructions">Instructions</H2>
        <p>
          <C>system_prompt</C> tells the AI who it is, what to do and how to talk. Write it as you'd brief a new
          colleague: the business, the goal of the call, what to collect, what never to say. Keep spoken style in mind:
          short sentences, no lists or markdown.
        </p>

        <H2 id="prompt-templates">Prompt templates</H2>
        <p><C>prompt_template</C> adds built-in guidance before your instructions. Join several with <C>+</C>, for example <C>"base_llm+zero_echoing"</C>.</p>
        <Table head={['Template', 'Adds']} rows={[
          [<C>base_llm</C>, 'General voice-agent behaviour. The default.'],
          [<C>hinglish_llm</C>, 'Natural Hinglish (Hindi–English mixing) for Indian callers.'],
          [<C>sales</C>, 'How to sell: discovery, objections, next steps.'],
          [<C>slot_filling</C>, 'Collecting a set of details naturally, one at a time.'],
          [<C>zero_echoing</C>, 'Stops the agent repeating the caller back (“So you want…”).'],
          [<C>web_navigation</C>, 'Used by Guide on website.'],
        ]} />

        <H2 id="models-and-failover">Models and failover</H2>
        <p>Set <C>service</C> and <C>model</C> together (the editor's <strong>Model</strong> picker does both):</p>
        <Table head={['service', 'model', 'Notes']} rows={PROVIDERS.flatMap((p) => (MODELS[p.value] ?? []).map((m) => [
          <>{p.label} (<C>{p.value}</C>)</>, <C>{m.value}</C>, `${m.label}${m.hint ? ` · ${m.hint}` : ''}. ${m.info ?? ''}`,
        ]))} />
        <p>
          If the provider fails, or takes longer than 20 seconds (10 seconds to the first word when streaming), the turn is
          retried once on the next provider in the configured fallback order, with that provider's default model. Once an
          AI answers has started speaking it isn't switched mid-sentence. If both fail, the agent says its fallback line.
        </p>

        <H2 id="what-it-reads">What it reads</H2>
        <p>
          <C>input_variables</C> lists the values the AI is given each turn, each with a description. They're sent as
          lines of <C>name : value</C>. Usually just <C>user_input</C>; add others (a looked-up booking, the caller's
          name) to give it more to go on.
        </p>

        <H2 id="what-it-decides">What it decides</H2>
        <p>
          <C>llm_return_type</C> is the shape of the AI's answer: each field with a type and a description the AI reads.
          <C> speak</C> is what's said and <C>hangup</C> ends the call. Add your own and describe the allowed values
          clearly; an AI thinks step saves them for Branch, Say and your webhook.
        </p>
        <Code lang="json">{`
"llm_return_type": {
  "speak":   { "type": "str",  "description": "What to say to the caller." },
  "hangup":  { "type": "bool", "description": "True once the conversation is over." },
  "outcome": { "type": "str",  "description": "One of: booked, callback, not_interested" }
}`}</Code>

        <H2 id="memory">Memory</H2>
        <p>
          Each AI step remembers the conversation under <C>history_key</C>. Steps with the same key share one memory;
          give a step its own key to keep it separate (for example, a quick acknowledgement model).
        </p>
        <p>
          <C>summariser</C> (on unless you turn it off) keeps long calls fast: once the memory passes a few turns or about
          1,000 words, older turns are folded into a short summary that keeps names, numbers and decisions. Tune it with
          <C> summariser_config</C>:
        </p>
        <Params items={[
          { name: 'max-turns', type: 'number', children: <>Summarise after this many turns. Default <C>2</C>.</> },
          { name: 'max-len', type: 'number', children: <>Or after this many words. Default <C>1000</C>.</> },
          { name: 'leave-last', type: 'number', children: <>Recent turns kept word for word. Default <C>1</C>.</> },
          { name: 'service / model', type: 'string', children: <>The model that summarises. Default Groq <C>openai/gpt-oss-20b</C>.</> },
          { name: 'prompt', type: 'string', children: 'Your own summarising instructions.' },
        ]} />

        <H2 id="emotion">Emotion</H2>
        <p>
          On an AI thinks step, <C>emotion: true</C> teaches the AI to add voice cues such as <C>[laughs]</C> or
          <C> [whispers]</C> in <C>speak</C>. <C>emotion_tts</C> picks the cue style; <C>eleven_v3</C> matches the ElevenLabs
          v3 voice model, which performs them. With any other voice the cues would be read out, so leave it off. See{' '}
          <DocLink to="voice-emotion">Emotion</DocLink>.
        </p>

        <NextSteps items={[
          { to: 'steps-ai-reply', label: 'AI answers', what: 'the streaming AI step.' },
          { to: 'steps-ai-decision', label: 'AI thinks', what: 'the deciding AI step.' },
        ]} />
      </>
    ),
  },
]

// ------------------------------------------------------------------ voice

const sttSlug = (p: Provider) => `voice-listening-${p.service.replace(/-streaming$/, '')}`
const ttsSlug = (p: Provider) => `voice-speaking-${p.service}`

const providerPage = (p: Provider, kind: 'stt' | 'tts', parent: string, slug: string): DocPage => ({
  slug,
  title: p.label,
  group: 'Build your agent',
  parent,
  summary: `${p.blurb}. Every ${kind === 'stt' ? 'listening' : 'speaking'} setting for ${p.label}, and how to set it.`,
  body: () => (
    <>
      <p>Service: <C>{p.service}</C>. A new setup starts from:</p>
      <Code lang="json">{JSON.stringify({ service: p.service, ...p.defaults }, null, 2)}</Code>

      <H2 id="set-it">Set it</H2>
      <p>On the flow's <strong>Voice</strong> tab, choose <strong>{kind === 'stt' ? 'Listening' : 'Speaking'}</strong>, then <strong>{p.label}</strong>. Or from code:</p>
      <Code lang="js">{`
await voxio.flows.update(flowKey, {
  ${kind}: ${JSON.stringify({ service: p.service, ...p.defaults })},
});`}</Code>

      <H2 id="settings">Settings</H2>
      <p>Settings marked “under More settings” are behind <strong>More settings</strong> in the dashboard.</p>
      <Params items={providerParams(p)} />

      {providerOptions(p).length > 0 && <H2 id="choices">Choices</H2>}
      {providerOptions(p)}

      <NextSteps items={[
        { to: parent, label: kind === 'stt' ? 'Listening' : 'Speaking', what: 'compare the other providers.' },
        { to: 'turn-taking', label: 'Turn-taking', what: 'when the agent answers.' },
      ]} />
    </>
  ),
})

const voicePages: DocPage[] = [
  {
    slug: 'voice',
    title: 'Voice',
    group: 'Build your agent',
    summary: 'How the agent hears the caller (speech-to-text) and how it sounds (text-to-speech).',
    body: () => (
      <>
        <p>
          A flow has one listening setup, <C>stt</C>, and one speaking setup, <C>tts</C>. Each is a <C>service</C> plus that
          provider's settings. Change them on the flow's <strong>Voice</strong> tab, save setups to reuse on
          <strong> Voices</strong>, or try a change for a single call from <strong>Settings for this test</strong> on the
          Test tab.
        </p>
        <Code lang="js">{`
await voxio.flows.update(flowKey, {
  stt: { service: "deepgram-streaming", model: "nova-3", language: "en-IN", keyterm: ["Voxio"] },
  tts: { service: "sarvam", model: "bulbul:v3", voice: "simran", language: "en-IN", pace: 1.05 },
});`}</Code>

        <H2 id="pick-a-setup">Pick a setup</H2>
        <Table head={['Callers speak', 'Listening', 'Speaking']} rows={[
          ['English, Indian English', 'Deepgram Nova 3', 'Deepgram Aura or Sarvam Bulbul v3 (en-IN)'],
          ['Hindi and English mixed', 'Soniox', 'Sarvam Bulbul v3'],
          ['Other Indian languages', 'Sarvam Saaras', 'Sarvam Bulbul v3'],
          ['A specific brand voice', 'Any', 'ElevenLabs or Resemble with your cloned voice'],
        ]} />

        <H2 id="in-this-section">In this section</H2>
        <Table head={['Page', 'Covers']} rows={[
          [<DocLink to="voice-listening">Listening</DocLink>, STT_PROVIDERS.map((p) => p.label).join(', ')],
          [<DocLink to="voice-speaking">Speaking</DocLink>, TTS_PROVIDERS.map((p) => p.label).join(', ')],
          [<DocLink to="voice-emotion">Emotion</DocLink>, 'Laughs, whispers and tone with ElevenLabs v3.'],
        ]} />

        <H2 id="flow-extras">Flow-wide extras</H2>
        <p>These sit on the flow (Behaviour tab), not inside <C>stt</C> or <C>tts</C>. From code, send them in <C>runtime</C>:</p>
        <Params items={[...knobParams('Listening'), ...knobParams('Speaking')]} />

        <NextSteps items={[
          { to: 'voice-listening', label: 'Listening', what: 'speech-to-text providers.' },
          { to: 'voice-speaking', label: 'Speaking', what: 'text-to-speech providers.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'voice-listening',
    title: 'Listening',
    group: 'Build your agent',
    parent: 'voice',
    summary: 'Speech-to-text: the providers that turn the caller’s voice into words, and how to choose one.',
    body: () => (
      <>
        <Table head={['Provider', 'service', 'Best for']} rows={STT_PROVIDERS.map((p) => [<DocLink to={sttSlug(p)}>{p.label}</DocLink>, <C>{p.service}</C>, p.blurb])} />
        <H2 id="tips">Getting it right</H2>
        <p>Add product names, people and jargon to <strong>Boost words</strong> (<C>keyterm</C>); it's the biggest single fix for mishearing. Set the language callers actually speak rather than leaving it general.</p>
        <NextSteps items={STT_PROVIDERS.map((p) => ({ to: sttSlug(p), label: p.label, what: p.blurb.toLowerCase() + '.' }))} />
      </>
    ),
  },
  ...STT_PROVIDERS.map((p) => providerPage(p, 'stt', 'voice-listening', sttSlug(p))),
  {
    slug: 'voice-speaking',
    title: 'Speaking',
    group: 'Build your agent',
    parent: 'voice',
    summary: 'Text-to-speech: the voices your agent can speak with, and how to choose one.',
    body: () => (
      <>
        <Table head={['Provider', 'service', 'Best for']} rows={TTS_PROVIDERS.map((p) => [<DocLink to={ttsSlug(p)}>{p.label}</DocLink>, <C>{p.service}</C>, p.blurb])} />
        <H2 id="tips">Getting it right</H2>
        <p>For live calls pick a low-latency model (Deepgram Aura, Sarvam Bulbul, ElevenLabs Flash). Preview voices on <strong>Voices</strong> before you choose, and try speed between 1.0 and 1.1: slightly brisk sounds more natural on the phone.</p>
        <NextSteps items={TTS_PROVIDERS.map((p) => ({ to: ttsSlug(p), label: p.label, what: p.blurb.toLowerCase() + '.' }))} />
      </>
    ),
  },
  ...TTS_PROVIDERS.map((p) => providerPage(p, 'tts', 'voice-speaking', ttsSlug(p))),
  {
    slug: 'voice-emotion',
    title: 'Emotion',
    group: 'Build your agent',
    parent: 'voice',
    summary: 'Let the agent laugh, whisper or sound excited where it fits, with ElevenLabs v3.',
    body: () => (
      <>
        <Steps>
          <li>On <strong>Voice</strong>, set speaking to <strong>ElevenLabs</strong> with the <C>eleven_v3</C> model.</li>
          <li>On the AI thinks step that writes the reply, turn on <strong>Add emotion</strong> (<C>emotion: true</C>) and keep <strong>Emotion style</strong> on ElevenLabs v3 (<C>emotion_tts: "eleven_v3"</C>).</li>
          <li>Speak its <C>speak</C> with a Say step as usual. The cues are performed, not read.</li>
        </Steps>
        <Code lang="json">{`
"think": {
  "type": "llm",
  "parameters": { "system_prompt": "…", "emotion": true, "emotion_tts": "eleven_v3", "llm_return_type": { "speak": { "type": "str", "description": "What to say." } } },
  "next": "reply"
}`}</Code>
        <Note kind="warn">Other voices read cues like <C>[laughs]</C> out loud. Only turn emotion on with ElevenLabs v3. AI answers steps don't add cues.</Note>
        <p>To show a reply without its cues (for example in a transcript), send it through a Say step with <C>remove: true</C> and <C>remove_tts: true</C>.</p>
        <NextSteps items={[{ to: 'voice-speaking-elevenlabs', label: 'ElevenLabs', what: 'all ElevenLabs settings.' }]} />
      </>
    ),
  },
]

// ------------------------------------------------------------------ turn-taking

const turnPages: DocPage[] = [
  {
    slug: 'turn-taking',
    title: 'Turn-taking',
    group: 'Build your agent',
    summary: 'When the agent decides the caller has finished, how quickly it answers, and how it handles being talked over.',
    body: () => (
      <>
        <p>
          Good turn-taking is most of what makes an agent feel human: not cutting people off, not leaving long silences,
          and stopping when interrupted. These settings live on the flow's <strong>Behaviour</strong> tab; from code, send
          them in <C>runtime</C>. They apply from the next session.
        </p>
        <Code lang="js">{RUNTIME_CODE(`    "process-type": "speech-native",
    "pre-fire": true,`)}</Code>

        <H2 id="engine">Conversation engine</H2>
        <Params items={knobParams('Pipeline')} />

        <H2 id="when-the-agent-replies">When the agent replies</H2>
        <Params items={knobParams('Turn-taking')} />

        <H2 id="tuning">Tuning</H2>
        <Table head={['If callers say…', 'Try']} rows={[
          ['“It keeps cutting me off”', <>Use <C>"process-type": "stt-native"</C>, which waits for the finished words, and turn <C>pre-fire</C> off. On Deepgram Flux, raise <C>eot-threshold</C>.</>],
          ['“There’s a long pause before it answers”', <>Use <C>"process-type": "speech-native"</C>, turn on <C>warmup-agent</C> and <C>first-chunk-fast</C>, then <C>pre-fire</C>.</>],
          ['“It stops talking when I say hmm”', <>Add the filler words to <C>ignore-words</C> on the speaking steps. See <DocLink to="turn-taking-interruptions">Interruptions</DocLink>.</>],
          ['“It reacts to noise”', <>Raise <C>vad-threshold</C> (web) or <C>voice-isolation</C>.</>],
        ]} />

        <NextSteps items={[
          { to: 'turn-taking-interruptions', label: 'Interruptions', what: 'what happens when the caller talks over the agent.' },
          { to: 'turn-taking-quiet', label: 'When the caller goes quiet', what: 'nudges.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'turn-taking-interruptions',
    title: 'Interruptions',
    group: 'Build your agent',
    parent: 'turn-taking',
    summary: 'Choose, per speaking step, whether the caller can cut the agent off, and when.',
    body: () => (
      <>
        <p>
          Every step that speaks (Say, AI answers) has its own <C>interruption_type</C>, so a disclaimer can be protected
          while normal chat stays interruptible. An AI answers can also choose it per reply by returning
          <C> interruption_type</C>.
        </p>

        <H2 id="types">Types</H2>
        <Table head={['interruption_type', 'Behaviour']} rows={INTERRUPT_OPTIONS.map((o) => [<C>{o.value}</C>, <><strong>{o.label}</strong>. {o.info}</>])} />

        <H2 id="metadata">The numbers</H2>
        <Params items={[
          { name: 'duration', type: 'number (seconds)', children: <>For <C>duration</C> and <C>inverse_duration</C>: the cut-off, counted from when the agent starts speaking.</> },
          { name: 'length', type: 'number (words)', children: <>For <C>word_length</C> and <C>inverse_word_length</C>: replies shorter (or longer) than this many words can be interrupted.</> },
          { name: 'ignore-words', type: 'string[]', children: <>Words that never count as interrupting, such as <C>hmm</C>, <C>okay</C>, <C>haan</C>. A space-separated string works too.</> },
        ]} />
        <p>Once the agent has finished speaking, the caller can always talk; these rules only apply while it's speaking.</p>

        <H2 id="example">Example</H2>
        <p>Protect the first three seconds of a reply, and ignore back-channel words:</p>
        <Code lang="json">{`
"parameters": {
  "out_dict": { "speak": "This call may be recorded for quality and training." },
  "interruption_type": "inverse_duration",
  "interruption_metadata": { "duration": 3, "ignore-words": ["hmm", "okay", "haan"] }
}`}</Code>

        <NextSteps items={[{ to: 'turn-taking', label: 'Turn-taking', what: 'reply timing.' }]} />
      </>
    ),
  },
  {
    slug: 'turn-taking-quiet',
    title: 'When the caller goes quiet',
    group: 'Build your agent',
    parent: 'turn-taking',
    summary: 'Nudge the caller when they stop talking, and decide how often.',
    body: () => (
      <>
        <Params items={knobParams('Inactivity')} />
        <Code lang="js">{RUNTIME_CODE(`    "inactivity": true,
    "inactivity-metadata": { "message": "Are you still there?", "time-period": 8, "max-times": 2, "interruption-type": "full" },`)}</Code>
        <Note kind="tip"><C>time-period</C> is in seconds. Keep it above a few seconds: people pause to think, look things up or read a number.</Note>
        <NextSteps items={[{ to: 'turn-taking', label: 'Turn-taking', what: 'reply timing.' }]} />
      </>
    ),
  },
]

// ------------------------------------------------------------------ avatar

const avatarPages: DocPage[] = [
  {
    slug: 'avatar-setup',
    title: 'Avatar setup',
    group: 'Build your agent',
    summary: 'Give a flow a talking face: upload faces, choose expressions and transitions, and pick lip-sync settings.',
    body: () => (
      <>
        <p>This page sets up the face in the dashboard. To show it on your website, see <DocLink to="avatar">Talking avatar</DocLink>.</p>
        <BeforeYouBegin items={[
          'A flow with a working voice.',
          'A short, front-facing, well-lit clip or photo of the face for each expression (neutral at least).',
        ]} />
        <Steps>
          <li>Upload faces on <strong>Avatars</strong>. Each is prepared once for lip-sync.</li>
          <li>On the flow's <strong>Avatar</strong> tab, add expressions from your faces and say when each is used.</li>
          <li>Optionally add transitions between expressions.</li>
          <li>Test it on the Test tab with a face layout, then embed it with <DocLink to="avatar">{'<voxio-avatar>'}</DocLink>.</li>
        </Steps>
        <NextSteps items={[
          { to: 'avatar-setup-faces', label: 'Faces and expressions', what: 'what to upload and how expressions switch.' },
          { to: 'avatar-setup-lipsync', label: 'Lip-sync', what: 'model and quality.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'avatar-setup-faces',
    title: 'Faces and expressions',
    group: 'Build your agent',
    parent: 'avatar-setup',
    summary: 'Expressions, when the agent uses each, and transitions between them.',
    body: () => (
      <>
        <H2 id="expressions">Expressions</H2>
        <p>A flow's avatar is a set of expressions, each one of your faces with a name and a sentence saying when to use it. The agent picks the expression that fits the moment and lip-syncs whatever it says.</p>
        <Params items={[
          { name: 'faces[].uuid', type: 'string', required: true, children: 'The face, from Avatars.' },
          { name: 'faces[].label', type: 'string', required: true, children: <>The expression's name, e.g. <C>neutral</C>, <C>happy</C>, <C>thinking</C>.</> },
          { name: 'faces[].usage', type: 'string', children: 'When to use it, in plain words.' },
        ]} />

        <H2 id="transitions">Transitions</H2>
        <p>A transition is a short clip played when moving from one expression to another. Without one, the switch is a quick cut.</p>
        <Params items={[
          { name: 'transitions[].from', type: 'string', required: true, children: 'The expression label it leaves.' },
          { name: 'transitions[].to', type: 'string', required: true, children: 'The expression label it arrives at.' },
          { name: 'transitions[].uuid', type: 'string', required: true, children: 'The clip, from Avatars.' },
          { name: 'transitions[].label', type: 'string', children: 'A name for it.' },
        ]} />

        <H2 id="from-code">From code</H2>
        <Code lang="js">{`
await voxio.flows.update(flowKey, {
  faces: [
    { uuid: "FACE_NEUTRAL", label: "neutral", usage: "Default while listening and explaining." },
    { uuid: "FACE_HAPPY",   label: "happy",   usage: "Greetings and good news." },
  ],
  transitions: [
    { from: "neutral", to: "happy", uuid: "CLIP_SMILE", label: "smile" },
  ],
});`}</Code>
        <p>If you update <C>faces</C> without <C>transitions</C> (or the other way round), the one you leave out is kept.</p>

        <H2 id="good-faces">Good source faces</H2>
        <p>Face the camera, mouth closed and relaxed, even light, plain background, no hands near the face. A few seconds of gentle movement looks more alive than a still photo.</p>

        <NextSteps items={[{ to: 'avatar-setup-lipsync', label: 'Lip-sync', what: 'make the mouth match.' }]} />
      </>
    ),
  },
  {
    slug: 'avatar-setup-lipsync',
    title: 'Lip-sync',
    group: 'Build your agent',
    parent: 'avatar-setup',
    summary: 'The lip-sync model and quality used to animate the face.',
    body: () => (
      <>
        <Params items={knobParams('Avatar')} />
        <Note kind="warn">The lip-sync model must match the one the faces were prepared with, or the mouth won't line up.</Note>
        <Code lang="js">{RUNTIME_CODE(`    "lipsync-model": "wav2lip",
    "lipsync-quality": "high",`)}</Code>
        <NextSteps items={[{ to: 'avatar', label: 'Talking avatar', what: 'put it on your site.' }]} />
      </>
    ),
  },
]

export const AGENT_PAGES: DocPage[] = [...workflowPages, ...stepPages, ...voicePages, ...turnPages, ...avatarPages]

// Steps the editor offers but this file doesn't document yet show up here in development.
if (import.meta.env?.DEV) {
  const missing = NODE_SPECS.filter((s) => !s.hidden && !STEP_DOCS.some((d) => d.type === s.type)).map((s) => s.type)
  if (missing.length) console.warn(`[docs] Steps without a docs page: ${missing.join(', ')}`)
}
