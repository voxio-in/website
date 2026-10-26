// The dashboard-first pages of /docs: the no-code quickstart, the concepts and
// dashboard map, testing, phone numbers, reading sessions, vision, and the help
// pages. They describe the dashboard as it is (src/routes/dashboard.*), so when
// a screen's labels change, update the page that names them here.

import { BeforeYouBegin, C, DocLink, H2, H3, NextSteps, Note, Steps, Table } from '#/components/docs/parts'
import { LIVE_DAYS } from '#/lib/dashboard/flowStatus'
import type { DocPage } from './pages'

// ------------------------------------------------------------------ Get started

export const QUICKSTART_PHONE: DocPage = {
    slug: 'quickstart-phone',
    title: 'Quickstart: phone agent',
    group: 'Get started',
    summary: 'Build an agent in the dashboard and talk to it on your phone. No code needed.',
    body: () => (
      <>
        <p>
          This quickstart is all in the dashboard. You'll create an agent from a template, check that it can hear and speak,
          test it, and give it a phone number so people can call it.
        </p>

        <BeforeYouBegin items={[
          <>A Voxio account. <a href="/signup">Sign up</a> if you don't have one.</>,
          'A phone, or a computer with a microphone.',
        ]} />

        <H2 id="create-your-agent">Create your agent</H2>
        <p>In Voxio an agent is called a <strong>flow</strong>.</p>
        <Steps>
          <li>In the dashboard, open <a href="/dashboard/flows"><strong>Flows</strong></a> and click <strong>New flow</strong>.</li>
          <li>Pick the template closest to what you want, such as a receptionist or a support line.</li>
          <li>Give it a name you'll recognise, and click <strong>Create flow</strong>.</li>
        </Steps>
        <p>The flow opens on its <strong>Overview</strong>. The menu on the left lists everything you can set up for it.</p>

        <H2 id="check-it-can-hear-and-speak">Check it can hear and speak</H2>
        <p>
          Open the <strong>Voice</strong> tab. <strong>Listening</strong> is how the agent turns the caller's speech into
          words. <strong>Speaking</strong> is the voice it answers with. Templates fill both in. To change them, pick the
          language your callers speak, preview a few voices, and save.
        </p>
        <p>Not sure which to choose? See <DocLink to="voice" hash="pick-a-setup">Pick a setup</DocLink>.</p>

        <H2 id="change-what-it-says">Change what it says</H2>
        <p>
          Open the <strong>Workflow</strong> tab. This is the conversation the agent follows, drawn as connected steps.
          Click a step to edit it. Most agents only need you to change the instructions in the <strong>AI answers (out loud)</strong>{' '}
          step, for example your business name, opening hours and what to do when someone wants a person.
        </p>
        <p>To understand the editor, read <DocLink to="workflows">Workflows</DocLink>.</p>

        <H2 id="test-it">Test it</H2>
        <Steps>
          <li>Open the <strong>Test</strong> tab.</li>
          <li>Click <strong>Start talking</strong> to talk in the browser, or <strong>Start chatting</strong> to type. (<strong>Call me</strong> works once the flow has a phone number, below.)</li>
          <li>Allow the microphone if the browser asks, and say hello.</li>
        </Steps>
        <p>The agent answers with the greeting from its workflow. If something is missing, the Test tab says what and links to the place to fix it.</p>

        <H2 id="give-it-a-phone-number">Give it a phone number</H2>
        <Steps>
          <li>Open <strong>Numbers &amp; calls</strong>.</li>
          <li>Under <strong>Attach a number</strong>, choose one of your numbers and click <strong>Attach</strong>.</li>
          <li>Call the number from any phone. The agent picks up.</li>
        </Steps>
        <Note kind="tip" title="No numbers in the list?">
          Numbers are added to your account by the Voxio team. Ask them and the number appears here.
        </Note>
        <p>
          To have the agent call someone, fill in <strong>Place a call</strong> on the same tab and click{' '}
          <strong>Call now</strong>, or choose <strong>Schedule</strong> to pick a time.
        </p>

        <H2 id="see-what-happened">See what happened</H2>
        <p>Every call shows up on the dashboard's <strong>Home</strong> under <strong>Recent sessions</strong>, with its transcript and recording.</p>

        <NextSteps items={[
          { to: 'workflows', label: 'Workflows', what: 'make the agent do more: ask questions, branch, look things up, end the call.' },
          { to: 'phone-numbers', label: 'Phone numbers and calls', what: 'inbound numbers, outbound and scheduled calls.' },
          { to: 'quickstart', label: 'Quickstart: website', what: 'put the same agent on your website.' },
        ]} />
      </>
    ),
}

export const CONCEPTS_PAGE: DocPage = {
    slug: 'concepts',
    title: 'Concepts and dashboard map',
    group: 'Get started',
    summary: 'The few words Voxio uses (flow, workflow, step, session, key) and where each thing lives in the dashboard.',
    body: () => (
      <>
        <p>Read this once and the rest of the docs will make sense. Every term here is used the same way everywhere.</p>

        <H2 id="how-a-voice-agent-works">How a voice agent works</H2>
        <p>Each time the caller speaks, three things happen in under a second or two:</p>
        <Table head={['Stage', 'What it does', 'Where you set it']} rows={[
          [<strong>Listening</strong>, 'Speech-to-text turns the caller’s voice into words.', <><strong>Voice</strong> tab. See <DocLink to="voice-listening">Listening</DocLink>.</>],
          [<strong>Thinking</strong>, 'The workflow decides what to do, usually by asking an AI model for a reply.', <><strong>Workflow</strong> tab. See <DocLink to="workflows">Workflows</DocLink>.</>],
          [<strong>Speaking</strong>, 'Text-to-speech says the reply in the voice you chose.', <><strong>Voice</strong> tab. See <DocLink to="voice-speaking">Speaking</DocLink>.</>],
        ]} />
        <p>
          Around those three, <strong>turn-taking</strong> decides when the caller has finished, what happens if they talk
          over the agent and what to do when nobody speaks. You set it on the <strong>Behaviour</strong> tab. See{' '}
          <DocLink to="turn-taking">Turn-taking</DocLink>.
        </p>

        <H2 id="glossary">Glossary</H2>
        <Table head={['Term', 'Meaning']} rows={[
          [<strong>Flow</strong>, 'One agent: its workflow, voice, behaviour, face, phone numbers and webhook. Other products call this an assistant or agent.'],
          [<strong>Workflow</strong>, 'The conversation a flow follows, drawn as steps joined by arrows.'],
          [<strong>Step</strong>, <>One box in the workflow: say something, ask the AI, wait for an answer, look something up, end the call. See <DocLink to="steps">Workflow steps</DocLink>.</>],
          [<strong>Session</strong>, 'One conversation: a phone call, a web call, a video call or a chat. It has a transcript and, when recording is on, a recording.'],
          [<strong>Flow key</strong>, <>Lets a web page or app talk to one flow. Safe to put in a page. See <DocLink to="authentication">Keys</DocLink>.</>],
          [<strong>Account key</strong>, 'Creates and changes every flow on your account. Secret: only on your server.'],
          [<strong>Listening (STT)</strong>, 'Speech-to-text: hearing the caller.'],
          [<strong>Speaking (TTS)</strong>, 'Text-to-speech: the agent’s voice.'],
          [<strong>Voice setup</strong>, <>A saved listening or speaking setup on the <strong>Voices</strong> page, reusable across flows.</>],
          [<strong>Avatar</strong>, 'A face that lip-syncs to the agent’s voice in video calls and on your site.'],
          [<strong>Web actions</strong>, 'The agent filling in forms and clicking on your page while it talks.'],
          [<strong>Webhook</strong>, 'A message Voxio sends to your server when a call starts, ends or the agent replies.'],
        ]} />

        <H2 id="flow-status">Flow status</H2>
        <p>The Flows list shows where each flow is, and a button for the next thing to do:</p>
        <Table head={['Status', 'Means', 'Next step']} rows={[
          [<strong>Not tried</strong>, 'Nobody has tested it yet.', <DocLink to="testing">Test it</DocLink>],
          [<strong>Tested</strong>, 'You’ve tested it, but no real person has used it.', <DocLink to="phone-numbers">Connect a number</DocLink>],
          [<strong>Live</strong>, `Real sessions in the last ${LIVE_DAYS} days.`, 'Test changes before you save them.'],
          [<strong>Quiet</strong>, `Has had real sessions, but none in the last ${LIVE_DAYS} days.`, <DocLink to="session-history">Read the last session</DocLink>],
        ]} />

        <H2 id="dashboard-map">Dashboard map</H2>
        <H3 id="main-menu">Main menu</H3>
        <Table head={['Page', 'What it’s for', 'Docs']} rows={[
          [<strong>Home</strong>, 'Recent sessions across all your flows, with transcripts and recordings.', <DocLink to="session-history">Sessions and history</DocLink>],
          [<strong>Flows</strong>, 'All your agents, their status, and New flow.', <DocLink to="quickstart-phone">Quickstart</DocLink>],
          [<strong>Voices</strong>, 'Saved listening and speaking setups, used by any flow.', <DocLink to="voice">Voice</DocLink>],
          [<strong>Avatars</strong>, 'Faces you’ve uploaded.', <DocLink to="avatar-setup">Avatar setup</DocLink>],
          [<strong>Developers</strong>, 'Your account key and the SDK.', <DocLink to="authentication">Keys</DocLink>],
        ]} />
        <H3 id="inside-a-flow">Inside a flow</H3>
        <Table head={['Tab', 'What it’s for', 'Docs']} rows={[
          [<strong>Overview</strong>, 'Status, the next step, the flow key, duplicate and export.', <DocLink to="authentication">Keys</DocLink>],
          [<strong>Test</strong>, 'Talk, chat or get a call from the flow.', <DocLink to="testing">Testing</DocLink>],
          [<strong>Workflow</strong>, 'The conversation, as steps.', <DocLink to="workflows">Workflows</DocLink>],
          [<strong>Voice</strong>, 'Listening and speaking.', <DocLink to="voice">Voice</DocLink>],
          [<strong>Behaviour</strong>, 'When it answers, interruptions and silence.', <DocLink to="turn-taking">Turn-taking</DocLink>],
          [<strong>Avatar</strong>, 'The face, its looks and lip-sync.', <DocLink to="avatar-setup">Avatar setup</DocLink>],
          [<strong>Vision</strong>, 'Let the agent see the caller’s camera.', <DocLink to="vision">Vision</DocLink>],
          [<strong>Numbers &amp; calls</strong>, 'Phone numbers it answers, and calls it makes.', <DocLink to="phone-numbers">Phone numbers</DocLink>],
          [<strong>Webhook</strong>, 'Events sent to your server.', <DocLink to="webhooks">Webhooks</DocLink>],
        ]} />

        <NextSteps items={[
          { to: 'quickstart-phone', label: 'Quickstart: phone agent', what: 'build and call your first agent without code.' },
          { to: 'workflows', label: 'Workflows', what: 'how the conversation is built.' },
        ]} />
      </>
    ),
}

// ------------------------------------------------------------------ Build: vision

export const VISION_PAGE: DocPage = {
  slug: 'vision',
  title: 'Vision',
  group: 'Build your agent',
  summary: 'Let the agent see the caller’s camera during video calls and use what it sees in the conversation.',
  body: () => (
    <>
      <p>
        With vision on, the agent gets a running description of what the caller's camera shows, so it can answer
        "what is this?" or notice who it's talking to. It works in video calls, such as a <DocLink to="avatar">talking
        avatar</DocLink> with the camera on.
      </p>

      <H2 id="turn-on-vision">Turn on vision</H2>
      <Steps>
        <li>Open the flow's <strong>Vision</strong> tab.</li>
        <li>Turn on <strong>See the caller’s camera</strong>.</li>
        <li>Write <strong>What to look for</strong>, for example "Read any product label you can see" or "Describe the room briefly".</li>
        <li>Click <strong>Save</strong>.</li>
      </Steps>

      <H2 id="settings">Settings</H2>
      <Table head={['Setting', 'What it does']} rows={[
        [<strong>Provider</strong>, 'Google AI Studio or Google Vertex AI.'],
        [<strong>Model</strong>, 'Gemini 3.1 Flash Lite (fastest, the default) or Gemini 2.5 Flash.'],
        [<strong>Looks at</strong>, 'Camera frames (recommended), video and audio, or audio only.'],
        [<strong>Frames per second</strong>, 'How often a frame is looked at, from 0.2 to 5. 1 is plenty for most uses; more costs more and adds little.'],
        [<strong>What to look for</strong>, 'Instructions for the vision model. Keep them short and specific.'],
      ]} />
      <Note>Vision only sees what the caller shares. Browser calls ask for camera permission; voice-only and phone calls have no camera.</Note>

      <NextSteps items={[
        { to: 'avatar', label: 'Talking avatar', what: 'put a video agent on your site.' },
        { to: 'testing', label: 'Testing', what: 'try it before you go live.' },
      ]} />
    </>
  ),
}

// ------------------------------------------------------------------ Test and go live

export const LAUNCH_PAGES: DocPage[] = [
  {
    slug: 'testing',
    title: 'Testing',
    group: 'Test and go live',
    summary: 'Try a flow for real from the Test tab: talk in the browser, chat with it, or have it call your phone.',
    body: () => (
      <>
        <p>
          Test every change before real callers hear it. Tests run on the same servers as real calls, so what you hear is
          what callers get. Tests don't count as real sessions, so they don't make a flow <strong>Live</strong>.
        </p>

        <H2 id="three-ways-to-test">Three ways to test</H2>
        <Table head={['Tile', 'Button', 'Use it to']} rows={[
          [<strong>Talk in the browser</strong>, <strong>Start talking</strong>, 'Speak with your microphone, like a web call. The quickest check.'],
          [<strong>Chat with it</strong>, <strong>Start chatting</strong>, 'Type to it. Good for checking the workflow’s logic fast, without voice.'],
          [<strong>Call my phone</strong>, <strong>Call me</strong>, 'Get a real phone call from the flow’s number, to hear it as callers will.'],
        ]} />
        <p>If a tile can't be used yet, it says why underneath:</p>
        <Table head={['It says', 'Fix']} rows={[
          ['Attach a number first', <><strong>Call me</strong> rings from the flow's own number. Attach one on <DocLink to="phone-numbers">Numbers &amp; calls</DocLink>.</>],
          ['Build the workflow first', <>Add steps on <strong>Workflow</strong>.</>],
          ['Not on the voice servers yet', 'The flow hasn’t reached the voice servers. Wait a moment and reload; if it stays, contact the Voxio team.'],
          ['Coming soon', 'Phone tests aren’t switched on for your account yet. Test in the browser instead.'],
        ]} />

        <H2 id="finish-setting-it-up-first">"Finish setting it up first"</H2>
        <p>The Test tab checks the flow before you start, and lists what's missing with a button to fix each:</p>
        <Table head={['Message', 'Fix']} rows={[
          ['Listening isn’t set up', <>Choose a speech-to-text setup on <strong>Voice</strong>.</>],
          ['Speaking isn’t set up', <>Choose a voice on <strong>Voice</strong>.</>],
          ['The workflow is empty', <>Add steps on <strong>Workflow</strong>, or start again from a template.</>],
        ]} />

        <H2 id="try-a-change-for-one-test">Try a change for one test</H2>
        <p>
          <strong>Settings for this test</strong> lets you try another voice or listening setup for a single test without
          saving it to the flow. When you like it, set it on the <strong>Voice</strong> tab.
        </p>

        <H2 id="see-what-was-sent">See what was sent</H2>
        <p>
          The test dialog can also show, as code, everything sent and received during the test. Use it to see which step
          ran, what the AI decided and why a branch was taken.
        </p>

        <H2 id="testing-checklist">Testing checklist</H2>
        <ul>
          <li>Say the greeting's question back in an unexpected way ("hmm, maybe?").</li>
          <li>Interrupt it mid-sentence. See <DocLink to="turn-taking-interruptions">Interruptions</DocLink>.</li>
          <li>Go quiet for ten seconds. See <DocLink to="turn-taking-quiet">When the caller goes quiet</DocLink>.</li>
          <li>Say your product names and a phone number. If it mishears, add <DocLink to="voice-listening" hash="tips">boost words</DocLink>.</li>
          <li>Ask for something it shouldn't do, and check it ends or hands over politely.</li>
        </ul>

        <NextSteps items={[
          { to: 'phone-numbers', label: 'Phone numbers and calls', what: 'put a tested flow on a phone number.' },
          { to: 'quickstart', label: 'Quickstart: website', what: 'put it on your website.' },
          { to: 'troubleshooting', label: 'Troubleshooting', what: 'fixes for the common problems.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'phone-numbers',
    title: 'Phone numbers and calls',
    group: 'Test and go live',
    summary: 'Have a flow answer a phone number, and make or schedule calls from it, all in the dashboard.',
    body: () => (
      <>
        <p>
          Everything here is on the flow's <strong>Numbers &amp; calls</strong> tab. To do the same from your server, see{' '}
          <DocLink to="phone-calls">Phone calls API</DocLink>.
        </p>

        <H2 id="answer-calls-on-a-number">Answer calls on a number</H2>
        <Steps>
          <li>Open the flow's <strong>Numbers &amp; calls</strong> tab.</li>
          <li>Under <strong>Attach a number</strong>, choose a number. The list shows which flow each one is on, or <strong>Free</strong>.</li>
          <li>Click <strong>Attach</strong>.</li>
        </Steps>
        <p>The number appears under <strong>Phone numbers</strong>, and calls to it are answered by this flow straight away.</p>
        <Note kind="warn">A number answers with one flow at a time. Attaching a number that's on another flow moves it, and that flow stops answering it.</Note>
        <p>To stop a flow answering a number, click the <strong>×</strong> beside it. The number stays on your account.</p>

        <H2 id="get-a-number">Get a number</H2>
        <p>Numbers are added to your account by the Voxio team. Ask them, and the number appears in <strong>Attach a number</strong> on every flow.</p>

        <H2 id="make-a-call">Make a call</H2>
        <Steps>
          <li>Under <strong>Place a call</strong>, enter the number in <strong>Call</strong> with its country code, for example <C>+91 98765 43210</C>.</li>
          <li>In <strong>From</strong>, keep <strong>Default number</strong> or pick one of the flow's numbers. This is the number the person sees.</li>
          <li>Click <strong>Call now</strong>.</li>
        </Steps>

        <H2 id="schedule-a-call">Schedule a call</H2>
        <Steps>
          <li>Under <strong>When</strong>, choose <strong>Schedule</strong>.</li>
          <li>Pick the date and time, and the time zone (IST by default).</li>
          <li>Click <strong>Schedule call</strong>.</li>
        </Steps>

        <H2 id="after-the-call">After the call</H2>
        <p>Calls appear on <strong>Home</strong> under <strong>Recent sessions</strong>. To get them on your own server as they happen, set up a <DocLink to="webhooks">webhook</DocLink>.</p>

        <NextSteps items={[
          { to: 'session-history', label: 'Sessions and history', what: 'read transcripts and play recordings.' },
          { to: 'phone-calls', label: 'Phone calls API', what: 'place calls from your own code.' },
        ]} />
      </>
    ),
  },
]

// ------------------------------------------------------------------ Monitor

export const MONITOR_PAGES: DocPage[] = [
  {
    slug: 'session-history',
    title: 'Sessions and history',
    group: 'Monitor',
    summary: 'Find any call or chat, read its transcript, play its recording, and see which flows are working.',
    body: () => (
      <>
        <p>
          Every conversation is a session: a phone call, web call, video call or chat. Sessions from every flow appear on
          the dashboard's <strong>Home</strong> under <strong>Recent sessions</strong>.
        </p>

        <H2 id="find-a-session">Find a session</H2>
        <p>Narrow the list with the two filters above it:</p>
        <Table head={['Filter', 'Choices']} rows={[
          ['Channel', 'All channels, Phone calls, Web calls, Video calls, Chats'],
          ['Status', 'All statuses, Completed, Not completed'],
        ]} />

        <H2 id="read-a-session">Read a session</H2>
        <p>Open a session to see the whole conversation, turn by turn.</p>
        <ul>
          <li><strong>Transcript:</strong> who said what. Use the copy button to paste it elsewhere.</li>
          <li><strong>Recording:</strong> press play to hear the call, when recording is on.</li>
          <li><strong>How it ended:</strong> whether the call completed. Older sessions may not have recorded this.</li>
        </ul>

        <H2 id="see-how-each-flow-is-doing">See how each flow is doing</H2>
        <p>
          The <strong>Flows</strong> list shows each flow's status (Not tried, Tested, Live or Quiet) with its next step,
          and can be sorted by <strong>Most sessions</strong> or <strong>Most minutes</strong>. Filter it by connection to
          find flows that aren't on a number or website yet. Status is explained in{' '}
          <DocLink to="concepts" hash="flow-status">Flow status</DocLink>.
        </p>

        <H2 id="get-sessions-in-your-own-systems">Get sessions in your own systems</H2>
        <ul>
          <li>As they happen: <DocLink to="webhooks">Webhooks</DocLink> send call started, every reply and call ended to your server.</li>
          <li>On demand: the <DocLink to="sessions-usage">Sessions and usage API</DocLink> lists sessions, transcripts and minutes.</li>
        </ul>

        <NextSteps items={[
          { to: 'webhooks', label: 'Webhooks', what: 'get every call on your server.' },
          { to: 'troubleshooting', label: 'Troubleshooting', what: 'fix what you spot in transcripts.' },
        ]} />
      </>
    ),
  },
]

// ------------------------------------------------------------------ Help

export const HELP_PAGES: DocPage[] = [
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    group: 'Help',
    summary: 'Find your problem and the fix: no answer, mishearing, talking over people, silence, avatars and keys.',
    body: () => (
      <>
        <p>Find what you're seeing. Each fix links to the page with the details.</p>

        <H2 id="calls-and-connection">Calls and connection</H2>
        <Table head={['Problem', 'Likely cause', 'Fix']} rows={[
          ['The button does nothing on my site', 'No microphone permission, or the page isn’t on HTTPS.', <>Serve over HTTPS (localhost is fine), allow the mic, and listen for <C>voxio-error</C>. See <DocLink to="errors">Errors</DocLink>.</>],
          ['“The flow key was refused”', 'Wrong or rotated key.', <>Copy the key again from the flow's <strong>Overview</strong>. See <DocLink to="authentication">Keys</DocLink>.</>],
          ['A test tile is greyed out', 'Something isn’t set up yet.', <>The tile says what. See <DocLink to="testing" hash="finish-setting-it-up-first">Testing</DocLink>.</>],
          ['Calling the number doesn’t reach this flow', 'The number is on another flow.', <>Attach it on <strong>Numbers &amp; calls</strong>. See <DocLink to="phone-numbers">Phone numbers</DocLink>.</>],
          ['The face doesn’t appear', 'The page isn’t using the GPU servers.', <>Add <C>environment: "gpu"</C>. See <DocLink to="environments">Servers and environments</DocLink>.</>],
        ]} />

        <H2 id="conversation">Conversation</H2>
        <Table head={['Problem', 'Likely cause', 'Fix']} rows={[
          ['It mishears names or products', 'Listening doesn’t know the words.', <>Add them as boost words and set the right language. See <DocLink to="voice-listening">Listening</DocLink>.</>],
          ['It answers in the wrong language', 'Listening or speaking language is wrong.', <>Match both to your callers. See <DocLink to="voice" hash="pick-a-setup">Pick a setup</DocLink>.</>],
          ['It talks over the caller, or cuts in too early', 'Answers too quickly.', <>Choose a slower setting on <strong>Behaviour</strong>. See <DocLink to="turn-taking">Turn-taking</DocLink>.</>],
          ['It stops when the caller says “ok”', 'Every sound interrupts it.', <>Change the interruption type. See <DocLink to="turn-taking-interruptions">Interruptions</DocLink>.</>],
          ['Long silence, or it hangs up on quiet callers', 'Silence settings.', <>See <DocLink to="turn-taking-quiet">When the caller goes quiet</DocLink>.</>],
          ['It reads “[laughs]” out loud', 'Emotion is on with a voice that doesn’t support it.', <>Use ElevenLabs v3, or turn emotion off. See <DocLink to="voice-emotion">Emotion</DocLink>.</>],
          ['It goes off script or makes things up', 'Instructions are too loose.', <>Tighten the step's instructions and use decided fields. See <DocLink to="steps-ai-settings">AI settings</DocLink>.</>],
          ['There’s a delay before it speaks', 'Slow model or a thinking step before speaking.', <>Use AI answers for replies. See <DocLink to="steps" hash="choosing">Choosing between the AI steps</DocLink>.</>],
        ]} />

        <H2 id="still-stuck">Still stuck?</H2>
        <p>Open the session on <strong>Home</strong> and read the transcript; it usually shows where things went wrong. Then contact the Voxio team with the session and what you expected.</p>

        <NextSteps items={[
          { to: 'faq', label: 'FAQ', what: 'short answers to common questions.' },
          { to: 'testing', label: 'Testing', what: 'check a fix before callers hear it.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'faq',
    title: 'FAQ',
    group: 'Help',
    summary: 'Short answers to the questions people ask most about Voxio.',
    body: () => (
      <>
        <H2 id="do-i-need-to-code">Do I need to write code?</H2>
        <p>No. You can build, test and put an agent on a phone number from the dashboard. Code is only needed to put it on your website (one line for the <DocLink to="script-tag">script tag</DocLink>) or to manage flows from your own server. Start with <DocLink to="quickstart-phone">Quickstart: phone agent</DocLink>.</p>

        <H2 id="flow-or-agent">Is a flow the same as an agent?</H2>
        <p>Yes. A flow is one agent with everything it needs. See <DocLink to="concepts">Concepts</DocLink>.</p>

        <H2 id="which-languages">Which languages can it speak?</H2>
        <p>English, Hindi, mixed Hindi-English and other Indian languages, among others; it depends on the listening and speaking providers you pick. See <DocLink to="voice" hash="pick-a-setup">Pick a setup</DocLink>.</p>

        <H2 id="how-do-i-get-a-number">How do I get a phone number?</H2>
        <p>Ask the Voxio team. Once it's on your account you can attach it to any flow. See <DocLink to="phone-numbers">Phone numbers and calls</DocLink>.</p>

        <H2 id="can-it-call-people">Can it call people as well as answer?</H2>
        <p>Yes, now or at a scheduled time, from <strong>Numbers &amp; calls</strong> or the <DocLink to="phone-calls">Phone calls API</DocLink>.</p>

        <H2 id="is-the-key-safe">Is it safe to put the key in my web page?</H2>
        <p>The flow key, yes: it can only start conversations with that flow. Never the account key. See <DocLink to="authentication">Keys and authentication</DocLink>.</p>

        <H2 id="can-it-look-things-up">Can it look things up or use my systems?</H2>
        <p>Yes. Workflow steps can call your API, look things up and save what the caller said. See <DocLink to="steps">Workflow steps</DocLink> and <DocLink to="workflows-patterns">Patterns</DocLink>.</p>

        <H2 id="where-are-recordings">Where do I find transcripts and recordings?</H2>
        <p>On <strong>Home</strong>, under <strong>Recent sessions</strong>. See <DocLink to="session-history">Sessions and history</DocLink>.</p>

        <H2 id="can-it-have-a-face">Can it have a face?</H2>
        <p>Yes: upload a face and turn on the avatar. See <DocLink to="avatar-setup">Avatar setup</DocLink> and <DocLink to="avatar">Talking avatar</DocLink>.</p>

        <NextSteps items={[
          { to: 'troubleshooting', label: 'Troubleshooting', what: 'fixes for specific problems.' },
        ]} />
      </>
    ),
  },
]
