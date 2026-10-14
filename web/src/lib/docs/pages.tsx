// Every page of /docs, in sidebar order. Written against voxioagent 2.0.0 (its
// README and type definitions) and the Voxio services as they run today. When
// the SDK changes, this file is the one to update. The house style is at the
// top of src/components/docs/parts.tsx.
//
// The "On this page" outline, the .md pages and llms-full.txt are all derived
// from these bodies (src/lib/docs/markdown.ts), so there is nothing else to
// keep in step.

import type { ReactNode } from 'react'

import { AGENT_PAGES } from './agent-pages'
import { BeforeYouBegin, C, Code, DocLink, H2, H3, NextSteps, Note, Params, Replace, Steps, Table, Tabs } from '#/components/docs/parts'

export const SDK_VERSION = '2.0.0'
export const CDN = `https://cdn.jsdelivr.net/npm/voxioagent@${SDK_VERSION}/dist/voxio.js`

export type DocPage = {
  slug: string
  title: string
  group: string
  /** The page this one sits under in the sidebar (any depth). Children follow their parent in PAGES. */
  parent?: string
  /** One sentence: the lede, the meta description and the llms.txt entry. */
  summary: string
  body: () => ReactNode
}

const FLOW_KEY_HELP = <>your flow key, from the flow's <strong>Overview</strong> in the dashboard</>

const ERROR_CODES: [string, string, string][] = [
  ['mic-denied', 'The visitor refused microphone (or camera) access.', 'Ask them to allow it in the browser and start again.'],
  ['no-device', 'No microphone is connected, or another app is using it.', 'Ask them to check the device and try again.'],
  ['insecure-context', 'The page isn’t served over HTTPS.', 'Serve it over HTTPS. localhost works while you develop.'],
  ['unsupported', 'The browser has no WebRTC or media support.', 'Offer chat instead, or ask for a current browser.'],
  ['auth', 'The flow key was refused (HTTP 401 or 403).', 'Check the key in the dashboard. The SDK doesn’t retry this.'],
  ['rejected', 'The server refused the request for another reason (another 4xx).', 'Read the message and fix the request. The SDK doesn’t retry this.'],
  ['network', 'The voice server couldn’t be reached, or kept failing.', 'The SDK already retried 3 times. Ask the visitor to try again.'],
  ['connection-lost', 'A live call dropped and couldn’t be restored.', 'Start a new session.'],
]

const INSTALL_TABS = [
  { label: 'npm', lang: 'bash', code: 'npm install voxioagent' },
  { label: 'pnpm', lang: 'bash', code: 'pnpm add voxioagent' },
  { label: 'yarn', lang: 'bash', code: 'yarn add voxioagent' },
]

const SECRET_ENV_TABS = [
  { label: 'macOS / Linux', lang: 'bash', code: 'export VOXIO_SECRET_KEY="ACCOUNT_KEY"' },
  { label: 'Windows (PowerShell)', lang: 'powershell', code: '$env:VOXIO_SECRET_KEY = "ACCOUNT_KEY"' },
]

export const PAGES: DocPage[] = [
  // ================================================================ Get started
  {
    slug: 'introduction',
    title: 'Introduction',
    group: 'Get started',
    summary: 'Put a Voxio voice agent on your website, in your app or on the phone, and manage it from your own code.',
    body: () => (
      <>
        <p>
          Voxio runs voice agents. You design an agent in the dashboard: what it says, how it sounds and what it can do.
          The <C>voxioagent</C> package then puts it in front of people as a button on your site, a talking face, a chat
          window or a phone call.
        </p>

        <H2 id="what-you-can-build">What you can build</H2>
        <Table
          head={['To build', 'Use', 'Guide']}
          rows={[
            ['A "Talk to us" button on a website', <C>{'<voxio-voice-button>'}</C>, <DocLink to="voice-button">Voice button</DocLink>],
            ['A lip-synced face that talks', <C>{'<voxio-avatar>'}</C>, <DocLink to="avatar">Talking avatar</DocLink>],
            ['A chat window', <C>{'<voxio-chat>'}</C>, <DocLink to="chat">Chat</DocLink>],
            ['Your own call interface', <C>voxioagent/client</C>, <DocLink to="sessions">Headless sessions</DocLink>],
            ['An agent that fills in forms and clicks as it talks', 'Web actions', <DocLink to="web-actions">Web actions</DocLink>],
            ['Agents created and changed from your server', <C>voxioagent/server</C>, <DocLink to="flows">Flows</DocLink>],
            ['Calls to your customers’ phones', 'Calls API', <DocLink to="phone-calls">Phone calls</DocLink>],
          ]}
        />

        <H2 id="concepts">Concepts</H2>
        <H3 id="flow">Flow</H3>
        <p>
          A <strong>flow</strong> is one agent: its workflow (the conversation it follows), its voice (speech-to-text and
          text-to-speech), its behaviour settings, its face if it has one, its phone numbers and its webhook. Everything you
          put on a page talks to exactly one flow.
        </p>
        <H3 id="keys">Keys</H3>
        <p>
          Every flow has a <strong>flow key</strong>, which widgets and sessions use to reach it. Your account has an{' '}
          <strong>account key</strong>, which creates and changes flows and must stay on your server. For which key goes
          where, see <DocLink to="authentication">Keys and authentication</DocLink>.
        </p>
        <H3 id="session">Session</H3>
        <p>
          A <strong>session</strong> is one conversation: a browser call, a chat or a phone call. Each session has an id, a
          transcript, timings and, when recording is on, a recording.
        </p>

        <H2 id="the-package">The package</H2>
        <p>One npm package, <C>voxioagent</C>, has an entry point for each place your code runs:</p>
        <Table
          head={['Import', 'What it is', 'Runs in']}
          rows={[
            [<C>voxioagent/widget</C>, 'Ready-made web components: voice button, avatar, chat', 'Browser'],
            [<C>voxioagent/react</C>, <><C>useVoxioSession</C> and React components</>, 'Browser (React 18+)'],
            [<C>voxioagent/client</C>, 'Headless voice sessions over WebRTC, with typed events and web actions', 'Browser'],
            [<C>voxioagent/server</C>, 'Flows, sessions and usage', 'Node 18+ or edge'],
            [<C>voxioagent/voxio.js</C>, 'One file for a script tag, with no build step', 'Browser'],
          ]}
        />

        <NextSteps items={[
          { to: 'quickstart', label: 'Quickstart', what: 'put a working voice button on a page in five minutes.' },
          { to: 'authentication', label: 'Keys and authentication', what: 'learn which key goes where.' },
          { to: 'sessions', label: 'Headless sessions', what: 'build your own call interface.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'quickstart',
    title: 'Quickstart',
    group: 'Get started',
    summary: 'Create a flow and put a working voice button on a web page in five minutes.',
    body: () => (
      <>
        <p>
          This quickstart walks you through creating your first agent and talking to it from a web page. You'll create a
          flow in the dashboard, copy its key, and add a voice button to a page.
        </p>

        <BeforeYouBegin items={[
          <>A Voxio account. <a href="/signup">Sign up</a> if you don't have one.</>,
          <>A web page you can edit, served over HTTPS or from <C>localhost</C>.</>,
          'A microphone.',
        ]} />

        <H2 id="create-a-flow">Create a flow</H2>
        <Steps>
          <li>In the dashboard, go to <a href="/dashboard/flows"><strong>Flows</strong></a>.</li>
          <li>Click <strong>New flow</strong>.</li>
          <li>Pick a template, enter a name, and click <strong>Create flow</strong>.</li>
        </Steps>
        <p>The flow opens on its <strong>Overview</strong>.</p>

        <H2 id="copy-the-flow-key">Copy the flow key</H2>
        <p>
          On the flow's <strong>Overview</strong>, copy the <strong>API key</strong>. This is the flow key. It lets a page
          start conversations with this flow and nothing else, so it's safe to put in a web page.
        </p>

        <H2 id="add-the-voice-button">Add the voice button</H2>
        <p>Add the button to your page. Pick the setup that matches your project:</p>
        <Tabs group="setup" items={[
          {
            label: 'HTML', lang: 'html', title: 'index.html',
            code: `
<script src="${CDN}"
        data-flow-key="YOUR_FLOW_KEY"
        data-label="Talk to us"
        defer></script>`,
          },
          {
            label: 'JavaScript', lang: 'js', title: 'main.js',
            code: `
// npm install voxioagent
import { mountVoiceButton } from "voxioagent/widget";

mountVoiceButton({ flowKey: "YOUR_FLOW_KEY", label: "Talk to us" });`,
          },
          {
            label: 'React', lang: 'jsx', title: 'Help.jsx',
            code: `
// npm install voxioagent
import { VoxioVoiceButton } from "voxioagent/react";

export function Help() {
  return <VoxioVoiceButton flowKey="YOUR_FLOW_KEY" label="Talk to us" />;
}`,
          },
        ]} />
        <Replace items={[['YOUR_FLOW_KEY', 'the key you copied']]} />

        <H2 id="talk-to-your-agent">Talk to your agent</H2>
        <Steps>
          <li>Open the page in your browser.</li>
          <li>Click <strong>Talk to us</strong> in the bottom-right corner.</li>
          <li>Allow the microphone when the browser asks, and say hello.</li>
        </Steps>
        <p>The button changes to <strong>Listening</strong>, and the agent answers with the greeting from its workflow.</p>
        <Note kind="tip" title="No answer?">
          Voice needs HTTPS (or <C>localhost</C>) and microphone permission. To see why a call didn't start, listen for the{' '}
          <C>voxio-error</C> event. See <DocLink to="errors">Errors</DocLink>. To check the flow itself without any code,
          open its <strong>Test</strong> tab in the dashboard.
        </Note>

        <NextSteps items={[
          { to: 'voice-button', label: 'Voice button', what: 'change the button’s label, colours, position and behaviour.' },
          { to: 'avatar', label: 'Talking avatar', what: 'show the agent as a lip-synced face.' },
          { to: 'sessions', label: 'Headless sessions', what: 'build your own call interface.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'authentication',
    title: 'Keys and authentication',
    group: 'Get started',
    summary: 'Learn what your account key and your flow keys can do, and where each one is safe to use.',
    body: () => (
      <>
        <p>
          Voxio has two kinds of key. Flow keys are public: they go in web pages. The account key is secret: it stays on
          your server.
        </p>

        <H2 id="key-types">Key types</H2>
        <Table
          head={['Key', 'Where to find it', 'What it can do']}
          rows={[
            [<strong>Account key</strong>, <><a href="/dashboard/developers"><strong>Developers</strong></a> in the dashboard</>, 'Create, change and delete every flow on your account, and rotate their keys.'],
            [<strong>Flow key</strong>, <>The flow's <strong>Overview</strong></>, 'Start sessions with that one flow, and read its sessions and usage.'],
          ]}
        />

        <H2 id="use-a-flow-key-in-the-browser">Use a flow key in the browser</H2>
        <p>
          Widgets and browser sessions take the flow key as <C>flowKey</C>. Anyone who opens your page can read it, like a
          public API key for maps or analytics. It can only start conversations with that flow and read its sessions; it
          can't change the flow.
        </p>
        <p>Pass the flow key when you create a session:</p>
        <Code lang="js">{`
import { createSession } from "voxioagent/client";

const session = createSession({ flowKey: "YOUR_FLOW_KEY" });`}</Code>
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />

        <H2 id="keep-the-account-key-on-your-server">Keep the account key on your server</H2>
        <Note kind="warn" title="Never put your account key in a web page">
          Anyone can read what a page sends, and the account key controls every flow you own.
        </Note>
        <p>Store the account key in an environment variable:</p>
        <Tabs group="os" items={SECRET_ENV_TABS} />
        <Replace items={[['ACCOUNT_KEY', <>your account key, from <strong>Developers</strong></>]]} />
        <p>Then read it on your server when you create the client:</p>
        <Code lang="js" title="server.js">{`
import { Voxio } from "voxioagent/server";

const voxio = new Voxio({ secretKey: process.env.VOXIO_SECRET_KEY, environment: "gpu" });`}</Code>
        <p><C>voxioagent/server</C> refuses to run in a browser, so the account key can't end up in a page by accident.</p>

        <H2 id="rotate-a-key">Rotate a key</H2>
        <p>If a key leaks, replace it. The old key stops working at once, and calls already running carry on until they end.</p>
        <ul>
          <li>To rotate the account key, go to <strong>Developers</strong> and click <strong>Rotate</strong>.</li>
          <li>To rotate a flow key, open the flow's <strong>Overview</strong> and click <strong>Rotate</strong>.</li>
        </ul>
        <p>To rotate a flow key from your server, call <C>rotateKey</C>:</p>
        <Code lang="js">{`
const { flowKey: newKey } = await voxio.flows.rotateKey("OLD_FLOW_KEY");`}</Code>
        <Replace items={[['OLD_FLOW_KEY', 'the key to replace']]} />
        <p>Update every page and server that used the old key.</p>

        <H2 id="accounts">Accounts</H2>
        <p>
          Create accounts at <a href="/signup">voxio.in/signup</a> and sign in at <a href="/login">voxio.in/login</a>. Each
          account gets its account key when it's created, and flows you make in the dashboard are ready for the voice
          servers straight away. There's no API for creating accounts or signing in.
        </p>

        <NextSteps items={[
          { to: 'server', label: 'Server SDK', what: 'set up voxioagent/server with your account key.' },
          { to: 'environments', label: 'Servers and environments', what: 'choose which Voxio servers your code talks to.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'environments',
    title: 'Servers and environments',
    group: 'Get started',
    summary: 'Choose which Voxio servers your code talks to: the standard deployment or the GPU deployment.',
    body: () => (
      <>
        <p>
          Every entry point takes the same two options. <C>environment</C> picks the deployment for every service at once.{' '}
          <C>endpoints</C> overrides single services, and wins over <C>environment</C>.
        </p>

        <H2 id="environments">Environments</H2>
        <Table
          head={['Service', <><C>standard</C> (default)</>, <C>gpu</C>]}
          rows={[
            ['Voice', <C>https://voice.voxio.in</C>, <C>https://gpu.voice.voxio.in</C>],
            ['Chat', <C>https://chat.voxio.in</C>, <C>https://gpu.agent.voxio.in</C>],
            [<>Data (<C>voxioagent/server</C>)</>, 'None', <C>https://gpu.data.voxio.in</C>],
          ]}
        />
        <p>Use <C>gpu</C> for flows with a face and for <C>voxioagent/server</C>. Avatars render on the GPU servers, and the data service only runs there.</p>

        <H2 id="choose-an-environment">Choose an environment</H2>
        <p>Pass <C>environment</C> to any widget, session or server client:</p>
        <Code lang="js">{`
mountVoiceButton({ flowKey, environment: "gpu" });
createSession({ flowKey, environment: "gpu" });
new Voxio({ secretKey, environment: "gpu" });`}</Code>
        <p>With a script tag, add <C>data-environment="gpu"</C>.</p>

        <H2 id="override-one-service">Override one service</H2>
        <p>To move one service and leave the rest, pass <C>endpoints</C>. This chat runs on the standard server while everything else uses GPU:</p>
        <Code lang="js">{`
mountChat({ flowKey, environment: "gpu", endpoints: { chat: "https://chat.voxio.in" } });`}</Code>
        <p>With a script tag, use <C>data-voice-url</C> and <C>data-chat-url</C>.</p>
        <Note>
          Only <C>https://….voxio.in</C> origins are accepted, with no other domains, ports or paths. Anything else throws
          when the widget or session is created, so a typo shows up straight away rather than mid-call.
        </Note>

        <NextSteps items={[
          { to: 'avatar', label: 'Talking avatar', what: 'run a flow with a face on the GPU servers.' },
          { to: 'server', label: 'Server SDK', what: 'manage flows from your server.' },
        ]} />
      </>
    ),
  },

  // ================================================================ Add to your site
  // ================================================================ Build your agent (lib/docs/agent-pages.tsx)
  ...AGENT_PAGES,

  {
    slug: 'script-tag',
    title: 'Script tag',
    group: 'Add to your site',
    summary: 'Add an agent to any web page with one script tag and no build step.',
    body: () => (
      <>
        <p>The script tag loads the widgets from a CDN and mounts one, configured by its <C>data-</C> attributes.</p>

        <H2 id="add-the-script">Add the script</H2>
        <p>Paste the script before <C>{'</body>'}</C>:</p>
        <Code lang="html">{`
<script src="${CDN}"
        data-flow-key="YOUR_FLOW_KEY" data-label="Talk to us" defer></script>`}</Code>
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />
        <p>A voice button appears in the bottom-right corner of the page.</p>

        <H2 id="attributes">Attributes</H2>
        <Params items={[
          { name: 'data-flow-key', type: 'string', required: true, children: 'Your flow key.' },
          { name: 'data-widget', type: '"voice" | "avatar" | "chat"', children: <>Which widget to show. Default: <C>voice</C>.</> },
          { name: 'data-label', type: 'string', children: 'The text on the voice button.' },
          { name: 'data-title', type: 'string', children: 'The title over the avatar panel.' },
          { name: 'data-placement', type: 'string', children: <>Where the widget sits: <C>bottom-right</C> (default), <C>bottom-left</C>, <C>top-right</C>, <C>top-left</C>, <C>bottom-center</C> or <C>inline</C>.</> },
          { name: 'data-theme', type: '"light" | "dark" | "auto"', children: <>The colour scheme. Default: <C>auto</C>, which follows the visitor's system.</> },
          { name: 'data-color', type: 'CSS colour', children: 'Your brand colour, for buttons and highlights.' },
          { name: 'data-consent', type: 'string', children: 'A notice the visitor accepts before the microphone opens.' },
          { name: 'data-container', type: 'CSS selector', children: <>The element to put the widget in. Use it with <C>data-placement="inline"</C>.</> },
          { name: 'data-environment', type: '"standard" | "gpu"', children: <>The deployment. See <DocLink to="environments">Servers and environments</DocLink>.</> },
          { name: 'data-voice-url', type: 'URL', children: 'Overrides the voice server.' },
          { name: 'data-chat-url', type: 'URL', children: 'Overrides the chat server.' },
        ]} />

        <H2 id="pin-a-version">Pin a version</H2>
        <p>
          Keep the version in the URL (<C>voxioagent@{SDK_VERSION}</C>) so a new release never changes your page without you
          knowing. Without a version you always get the newest release.
        </p>

        <NextSteps items={[
          { to: 'customising', label: 'Customising widgets', what: 'change colours, placement, language and triggers.' },
          { to: 'voice-button', label: 'Voice button', what: 'mount the button from JavaScript and control it.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'voice-button',
    title: 'Voice button',
    group: 'Add to your site',
    summary: 'Add a floating or inline button that starts a voice call with your agent.',
    body: () => (
      <>
        <p>
          The voice button is a web component, <C>{'<voxio-voice-button>'}</C>. It opens the microphone, connects to your
          flow and shows the state of the call.
        </p>

        <H2 id="add-the-button">Add the button</H2>
        <p>Mount the button with your flow key:</p>
        <Tabs group="setup" items={[
          {
            label: 'HTML', lang: 'html',
            code: `
<script src="${CDN}"
        data-flow-key="YOUR_FLOW_KEY" data-label="Talk to us" defer></script>`,
          },
          {
            label: 'JavaScript', lang: 'js',
            code: `
import { mountVoiceButton } from "voxioagent/widget";

const button = mountVoiceButton({ flowKey: "YOUR_FLOW_KEY", label: "Talk to us" });`,
          },
          {
            label: 'React', lang: 'jsx',
            code: `
import { VoxioVoiceButton } from "voxioagent/react";

<VoxioVoiceButton flowKey="YOUR_FLOW_KEY" label="Talk to us" />`,
          },
        ]} />
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />

        <H2 id="options">Options</H2>
        <p>
          The button takes every <DocLink to="sessions" hash="options">session option</DocLink> (such as <C>flowKey</C>,{' '}
          <C>environment</C> and <C>customs</C>), every <DocLink to="customising">look and placement option</DocLink>, and
          these:
        </p>
        <Params items={[
          { name: 'label', type: 'string | false', children: <>The text next to the icon. <C>false</C> shows the icon alone.</> },
          { name: 'tooltip', type: 'string', children: 'Shown on hover.' },
          { name: 'shape', type: '"circle" | "rounded" | "square" | "pill"', children: 'The button’s shape.' },
          { name: 'size', type: 'number | string', children: 'The button’s size. Numbers are pixels.' },
          { name: 'mobileSize', type: 'number | string', children: 'The size on screens narrower than 640px.' },
          { name: 'hideLabelOnMobile', type: 'boolean', children: 'Shows the icon alone on narrow screens.' },
          { name: 'motion', type: '{ pulse?, glow? }', children: <>An idle pulse and a glow while the agent speaks. Both switch off under <C>prefers-reduced-motion</C>.</> },
          { name: 'showMute', type: 'boolean', children: 'Shows a mute button beside it during a call.' },
          { name: 'looks', type: 'Looks', children: <>What the button shows in each state. See <a href="#change-the-look-per-state">Change the look per state</a>.</> },
        ]} />

        <H2 id="change-the-look-per-state">Change the look per state</H2>
        <p>
          The button has a look for each state: <C>idle</C>, <C>connecting</C>, <C>listening</C>, <C>speaking</C>,{' '}
          <C>muted</C>, <C>error</C> and <C>ended</C>. A look is an image or GIF URL, an inline SVG, a built-in animation or
          your own renderer.
        </p>
        <p>Set a look for the states you want to change:</p>
        <Code lang="js">{`
mountVoiceButton({
  flowKey: "YOUR_FLOW_KEY",
  looks: {
    idle: "https://example.com/idle.png",
    connecting: { builtIn: "orb" },
    speaking: { builtIn: "wave" },     // built in: "orb", "wave", "mic"
    error: { svg: "<svg …>…</svg>" },
  },
});`}</Code>
        <p>States you leave out keep the default look.</p>

        <H2 id="control-the-button">Control the button</H2>
        <p>The element returned by <C>mountVoiceButton</C> has these methods:</p>
        <Table
          head={['Method', 'What it does']}
          rows={[
            [<C>start()</C>, 'Opens the microphone and connects. If you set consent, it asks first.'],
            [<C>stop()</C>, 'Ends the call.'],
            [<C>toggle()</C>, 'Starts or stops the call.'],
            [<C>mute(muted?)</C>, 'Mutes or unmutes the microphone.'],
            [<><C>open()</C> and <C>close()</C></>, 'Shows or hides the widget. Closing doesn’t end a call.'],
            [<C>attach(element)</C>, 'Makes another element start and stop the call when clicked. Returns a function that detaches it.'],
            [<C>destroy()</C>, 'Ends the call, releases the microphone and removes the widget.'],
          ]}
        />

        <H2 id="use-your-own-launcher">Use your own launcher</H2>
        <p>To start calls from a button that's already on your page, hide the widget and attach it:</p>
        <Code lang="js">{`
const button = mountVoiceButton({ flowKey: "YOUR_FLOW_KEY", hidden: true });
button.attach(document.querySelector("#help-cta"));`}</Code>
        <p>Clicking <C>#help-cta</C> now starts and ends the call.</p>

        <NextSteps items={[
          { to: 'customising', label: 'Customising widgets', what: 'match the button to your brand.' },
          { to: 'web-actions', label: 'Web actions', what: 'let the agent fill in forms on your page while it talks.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'avatar',
    title: 'Talking avatar',
    group: 'Add to your site',
    summary: 'Show your agent as a lip-synced face, in a ready-made panel or in your own layout.',
    body: () => (
      <>
        <p>A flow with a face can appear as a talking avatar. The face is lip-synced to the agent's voice on Voxio's GPU servers.</p>

        <BeforeYouBegin items={[
          <>A flow with a face. Set one on the flow's <strong>Avatar</strong> tab in the dashboard.</>,
          <><C>environment: "gpu"</C> in your code: faces are rendered on the GPU servers.</>,
        ]} />

        <H2 id="add-the-avatar-panel">Add the avatar panel</H2>
        <p>Mount the panel with your flow key and the GPU environment:</p>
        <Tabs group="setup" items={[
          {
            label: 'HTML', lang: 'html',
            code: `
<script src="${CDN}"
        data-flow-key="YOUR_FLOW_KEY"
        data-widget="avatar"
        data-environment="gpu"
        data-title="Ask Asha" defer></script>`,
          },
          {
            label: 'JavaScript', lang: 'js',
            code: `
import { mountAvatar } from "voxioagent/widget";

mountAvatar({
  flowKey: "YOUR_FLOW_KEY",
  environment: "gpu",
  title: "Ask Asha",
  poster: "https://example.com/asha.jpg",
});`,
          },
          {
            label: 'React', lang: 'jsx',
            code: `
import { VoxioAvatar } from "voxioagent/react";

<VoxioAvatar flowKey="YOUR_FLOW_KEY" environment="gpu" title="Ask Asha" />`,
          },
        ]} />
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />
        <p>A panel appears with the poster image. When the visitor starts the call, the face replaces it and talks.</p>

        <H2 id="options">Options</H2>
        <p>The panel takes the same session, look and placement options as the <DocLink to="voice-button">voice button</DocLink>, and these:</p>
        <Params items={[
          { name: 'size', type: 'number | string', children: 'The panel width. Numbers are pixels. Default: 240.' },
          { name: 'shape', type: '"card" | "circle"', children: <>Default: <C>card</C>.</> },
          { name: 'title', type: 'string', children: 'The title over the panel.' },
          { name: 'poster', type: 'URL', children: 'The image shown before the call starts.' },
          { name: 'pictureInPicture', type: 'boolean', children: 'Shows a picture-in-picture button where the browser supports it. Default: true.' },
          { name: 'showCamera', type: 'boolean', children: 'Shows the visitor’s own camera in a corner, and sends it to the agent. Default: false.' },
        ]} />

        <H2 id="show-the-face-in-your-own-layout">Show the face in your own layout</H2>
        <p>To place the face yourself, ask a session for video and put the stream in your own <C>{'<video>'}</C> element:</p>
        <Code lang="js">{`
import { createSession } from "voxioagent/client";

const session = createSession({
  flowKey: "YOUR_FLOW_KEY",
  environment: "gpu",
  media: { audio: true, video: true },
});

session.on("agentVideo", (stream) => {
  const video = document.querySelector("#face");
  video.srcObject = stream;
  video.play();
});

document.querySelector("#start").onclick = () => session.start();`}</Code>
        <p>The face appears in <C>#face</C> a moment after the call connects. These media options control what is sent and received:</p>
        <Params items={[
          { name: 'media.video', type: 'boolean', children: 'Receives the agent’s lip-synced face.' },
          { name: 'media.camera', type: 'boolean', children: 'Sends the visitor’s camera, for flows that can see.' },
        ]} />
        <p>While a call is live, <C>session.localStream</C> holds the visitor's own microphone and camera.</p>

        <H2 id="describe-the-participants">Describe the participants</H2>
        <p>
          To decide yourself who sees and hears whom, pass <C>participants</C>. The voice server receives it as given. A
          participant with a <C>video: true</C> connection to the <C>ai_participant</C> gets the avatar.
        </p>
        <p>This interview has the candidate and the interviewer seeing and hearing each other:</p>
        <Code lang="js">{`
createSession({
  flowKey: "YOUR_FLOW_KEY",
  environment: "gpu",
  participants: {
    ai_participant: "interviewer",
    participants: [
      { name: "candidate", connections: [{ name: "interviewer", audio: true, video: true }] },
      { name: "interviewer", connections: [{ name: "candidate", audio: true, video: true }] },
    ],
  },
});`}</Code>

        <NextSteps items={[
          { to: 'sessions', label: 'Headless sessions', what: 'see every session option and event.' },
          { to: 'environments', label: 'Servers and environments', what: 'learn what the GPU environment changes.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'chat',
    title: 'Chat',
    group: 'Add to your site',
    summary: 'Add a chat window with the same agent, for visitors who would rather type.',
    body: () => (
      <>
        <p>The chat window, <C>{'<voxio-chat>'}</C>, talks to the same flow as your voice widgets. It opens with the agent's greeting and keeps the conversation when the visitor reloads.</p>

        <H2 id="add-the-chat">Add the chat</H2>
        <p>Mount the chat with your flow key:</p>
        <Tabs group="setup" items={[
          {
            label: 'HTML', lang: 'html',
            code: `
<script src="${CDN}"
        data-flow-key="YOUR_FLOW_KEY" data-widget="chat" defer></script>`,
          },
          {
            label: 'JavaScript', lang: 'js',
            code: `
import { mountChat } from "voxioagent/widget";

const chat = mountChat({ flowKey: "YOUR_FLOW_KEY", config: { botName: "Asha" } });`,
          },
          {
            label: 'React', lang: 'jsx',
            code: `
import { VoxioChat } from "voxioagent/react";

<VoxioChat flowKey="YOUR_FLOW_KEY" config={{ botName: "Asha" }} />`,
          },
        ]} />
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />
        <p>A chat launcher appears in the corner. Opening it shows the agent's greeting.</p>

        <H2 id="options">Options</H2>
        <Params items={[
          { name: 'flowKey', type: 'string', required: true, children: 'Your flow key.' },
          { name: 'config', type: 'Partial<ChatbotConfig>', children: <>The look and text of the window, such as <C>botName</C>, <C>welcomeMessage</C>, <C>placeholder</C>, <C>primaryColor</C> and <C>chatWidth</C>.</> },
          { name: 'draggable', type: 'boolean', children: 'Lets the visitor drag the launcher. It snaps to an edge and remembers the spot.' },
          { name: 'environment', type: '"standard" | "gpu"', children: <>The deployment. See <DocLink to="environments">Servers and environments</DocLink>.</> },
          { name: 'debug', type: 'boolean', children: 'Prints diagnostics to the console.' },
        ]} />

        <H2 id="read-the-messages">Read the messages</H2>
        <p>To follow the conversation from your own code, subscribe to it:</p>
        <Code lang="js">{`
const off = chat.onMessage((message) => console.log(message));

chat.getMessages();   // everything so far
chat.sessionId;       // the conversation's session id
chat.destroy();       // ends the session and removes the chat`}</Code>
        <p>Call <C>off()</C> to stop listening.</p>

        <NextSteps items={[
          { to: 'customising', label: 'Customising widgets', what: 'match the chat to your brand.' },
          { to: 'webhooks', label: 'Webhooks', what: 'receive each conversation on your server.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'react',
    title: 'React',
    group: 'Add to your site',
    summary: 'Use the widgets as React components, or build your own interface with the useVoxioSession hook.',
    body: () => (
      <>
        <p><C>voxioagent/react</C> works with React 18 and later.</p>

        <H2 id="use-the-components">Use the components</H2>
        <p>
          Each widget is a component. Its props are the widget's options, plus <C>className</C>, <C>style</C>, <C>id</C>{' '}
          and three event props:
        </p>
        <Code lang="jsx">{`
import { VoxioVoiceButton } from "voxioagent/react";

<VoxioVoiceButton
  flowKey="YOUR_FLOW_KEY"
  label="Talk to us"
  onStateChange={(state, muted) => {}}
  onError={(error) => console.warn(error.code)}
  onEnded={({ reason, seconds, sessionId }) => {}}
  elementRef={(el) => el?.attach(document.querySelector("#cta"))}
/>`}</Code>
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />
        <p>
          <C>elementRef</C> gives you the underlying element, for methods such as <C>attach()</C> and <C>open()</C>. The
          other components are <C>VoxioAvatar</C> and <C>VoxioChat</C>.
        </p>

        <H2 id="build-your-own-interface">Build your own interface</H2>
        <p>The <C>useVoxioSession</C> hook gives you a session tied to the component's lifetime. This component shows the state, a level meter and the controls:</p>
        <Code lang="jsx" title="Call.jsx">{`
import { useVoxioSession } from "voxioagent/react";

export function Call() {
  const v = useVoxioSession({ flowKey: "YOUR_FLOW_KEY" });

  return (
    <div>
      <p>{v.state}</p>
      <meter value={v.level.agent} />
      {v.error && <p>{v.error.code}</p>}
      <button onClick={v.start} disabled={!v.session}>Start</button>
      <button onClick={() => v.mute(!v.muted)}>{v.muted ? "Unmute" : "Mute"}</button>
      <button onClick={v.stop}>End</button>
    </div>
  );
}`}</Code>
        <p>After you click <strong>Start</strong>, the state moves to <C>connecting</C>, then <C>listening</C>, and the meter moves when the agent speaks. The hook returns:</p>
        <Table
          head={['Field', 'What it is']}
          rows={[
            [<C>session</C>, <>The underlying <C>VoxioSession</C>, or <C>null</C> until the component mounts.</>],
            [<C>state</C>, <><C>idle</C>, <C>connecting</C>, <C>listening</C>, <C>speaking</C>, <C>ended</C> or <C>error</C>.</>],
            [<C>muted</C>, 'Whether the microphone is muted.'],
            [<C>error</C>, <>The last <C>VoxioError</C>, or <C>null</C>.</>],
            [<C>level</C>, <><C>{'{ user, agent }'}</C>, each from 0 to 1, updated about 20 times a second.</>],
            [<C>agentStream</C>, <>The avatar video, when <C>media.video</C> is on.</>],
            [<><C>start()</C> and <C>stop()</C></>, 'Start or end the call. Call start from a click or tap.'],
            [<C>mute(muted?)</C>, 'Mutes or unmutes the microphone.'],
          ]}
        />
        <Note title="Options are read once">
          The hook reads its options when the component mounts. To change them, remount the component, for example by
          giving it a new <C>key</C>.
        </Note>

        <H2 id="render-on-the-client">Render on the client</H2>
        <p>
          Sessions use browser APIs. With Next.js, Remix or TanStack Start, render these components on the client only, for
          example with <C>React.lazy</C> or a client-only boundary.
        </p>

        <NextSteps items={[
          { to: 'sessions', label: 'Headless sessions', what: 'see every session option and event.' },
          { to: 'errors', label: 'Errors', what: 'handle each error code.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'customising',
    title: 'Customising widgets',
    group: 'Add to your site',
    summary: 'Change the colours, placement, language, consent and triggers of any widget, and style it from your page.',
    body: () => (
      <>
        <p>These options work on the voice button and the avatar panel. Pass them to <C>mountVoiceButton</C>, <C>mountAvatar</C> or the React components.</p>

        <H2 id="set-the-theme-and-colours">Set the theme and colours</H2>
        <p>Pass a theme and your brand colours:</p>
        <Code lang="js">{`
mountVoiceButton({
  flowKey: "YOUR_FLOW_KEY",
  theme: "auto",          // "light", "dark" or "auto"
  colors: { primary: "#0f766e", onPrimary: "#fff", surface: "#111", text: "#eee", danger: "#e5484d" },
  radius: "14px",
  fontFamily: '"Figtree", -apple-system, "Segoe UI", sans-serif',
});`}</Code>
        <p>You can also set colours from your own CSS with <C>--voxio-primary</C>, <C>--voxio-surface</C>, <C>--voxio-text</C> and <C>--voxio-radius</C>.</p>

        <H2 id="place-the-widget">Place the widget</H2>
        <Params items={[
          { name: 'placement', type: 'Placement', children: <><C>bottom-right</C> (default), <C>bottom-left</C>, <C>top-right</C>, <C>top-left</C>, <C>bottom-center</C>, or <C>inline</C> to sit inside a container.</> },
          { name: 'offset', type: '{ x?, y? }', children: 'The distance from the edges. Numbers are pixels.' },
          { name: 'zIndex', type: 'number', children: 'The stacking order.' },
          { name: 'mobile', type: '{ placement?, offset? }', children: 'Overrides for screens narrower than 640px.' },
          { name: 'draggable', type: 'boolean | { snap?, remember? }', children: 'Lets visitors move it. It snaps to an edge and remembers the spot.' },
        ]} />

        <H2 id="control-when-it-appears">Control when it appears</H2>
        <Params items={[
          { name: 'consent', type: 'boolean | string', children: <>Asks before opening the microphone. <C>true</C> uses the default notice; a string is your own.</> },
          { name: 'showWhen', type: 'ShowWhen', children: <>Starts hidden and appears on a trigger, such as <C>{'{ afterSeconds: 10 }'}</C>, <C>{'{ scrollDepth: 0.5 }'}</C> or <C>{'{ urlMatch: "/pricing" }'}</C>.</> },
          { name: 'hidden', type: 'boolean', children: <>Starts hidden. Call <C>open()</C> to show it.</> },
          { name: 'session', type: 'VoxioSession', children: 'Shares one session between widgets, such as a button and an avatar on the same call.' },
        ]} />

        <H2 id="change-the-language-and-text">Change the language and text</H2>
        <p>Pick a built-in language, or override any text the widget shows:</p>
        <Code lang="js">{`
mountVoiceButton({ flowKey: "YOUR_FLOW_KEY", locale: "hi" });   // built in: "en", "hi"
mountVoiceButton({ flowKey: "YOUR_FLOW_KEY", strings: { start: "Speak to sales" } });`}</Code>

        <H2 id="style-it-from-your-page">Style it from your page</H2>
        <p>Widgets render in a shadow root, so your page's CSS doesn't reach inside. Style their named parts with <C>::part()</C>:</p>
        <Code lang="css">{`
voxio-voice-button::part(button) { box-shadow: 0 8px 30px rgb(0 0 0 / 0.4); }
voxio-voice-button::part(label)  { font-weight: 600; }
voxio-avatar::part(panel)        { border: 1px solid #333; }`}</Code>
        <p>For anything else, pass CSS as <C>customStyles</C>. It's added inside the shadow root.</p>

        <H2 id="listen-for-dom-events">Listen for DOM events</H2>
        <p>Every widget fires these events on its element:</p>
        <Table
          head={['Event', 'detail']}
          rows={[
            [<C>voxio-state</C>, <C>{'{ state, muted }'}</C>],
            [<C>voxio-error</C>, <>The <C>VoxioError</C></>],
            [<C>voxio-ended</C>, <C>{'{ reason, seconds, sessionId }'}</C>],
            [<C>voxio-web-action</C>, 'The web action the agent asked for'],
          ]}
        />
        <p>For example, to count finished calls in your analytics:</p>
        <Code lang="js">{`
document.querySelector("voxio-voice-button")
  .addEventListener("voxio-ended", (e) => analytics.track("voice_call", e.detail));`}</Code>

        <NextSteps items={[
          { to: 'web-actions', label: 'Web actions', what: 'let the agent act on your page.' },
          { to: 'errors', label: 'Errors', what: 'handle each error code.' },
        ]} />
      </>
    ),
  },

  // ================================================================ Build your own
  {
    slug: 'sessions',
    title: 'Headless sessions',
    group: 'Build your own',
    summary: 'Run a voice call with your agent and draw the interface yourself, from typed events.',
    body: () => (
      <>
        <p>
          <C>voxioagent/client</C> gives you the call with no interface of ours. It handles the microphone, the WebRTC
          connection, reconnects, audio levels and web actions, and tells you what happens through events.
        </p>

        <BeforeYouBegin items={[
          <>The package: <C>npm install voxioagent</C>.</>,
          'A flow key.',
          <>A page served over HTTPS or from <C>localhost</C>.</>,
        ]} />

        <H2 id="start-a-session">Start a session</H2>
        <p>Create a session, listen for its events, and start it from a click:</p>
        <Code lang="js" title="call.js">{`
import { createSession } from "voxioagent/client";

const session = createSession({ flowKey: "YOUR_FLOW_KEY" });

session.on("state", (state) => console.log("state:", state));
session.on("error", (error) => console.warn("error:", error.code));
session.on("ended", ({ reason, seconds }) => console.log("ended:", reason, seconds));

document.querySelector("#start").onclick = () => session.start();
document.querySelector("#end").onclick = () => session.stop();`}</Code>
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />
        <p>When you click <C>#start</C> and allow the microphone, the console shows:</p>
        <Code lang="text" title="Console">{`
state: connecting
state: listening
state: speaking`}</Code>
        <Note>
          Browsers only open the microphone from a click or a tap. Call <C>start()</C> inside the handler, not on page load.
        </Note>

        <H2 id="options">Options</H2>
        <Params items={[
          { name: 'flowKey', type: 'string', required: true, children: 'The flow to talk to.' },
          { name: 'environment', type: '"standard" | "gpu"', children: <>The deployment. See <DocLink to="environments">Servers and environments</DocLink>.</> },
          { name: 'endpoints', type: '{ voice? }', children: 'Overrides the voice server.' },
          { name: 'media', type: '{ audio?, video?, camera? }', children: <>Sends the microphone (default: true), receives the <DocLink to="avatar">avatar</DocLink>, sends the camera.</> },
          { name: 'customs', type: 'object', children: 'Overrides for this session only, such as workflow variables, voice and thresholds. They’re merged into the flow.' },
          { name: 'participants', type: 'ParticipantsGraph', children: <>Who sees and hears whom. See <DocLink to="avatar" hash="describe-the-participants">Describe the participants</DocLink>.</> },
          { name: 'recording', type: 'boolean', children: 'Records this session.' },
          { name: 'sessionId', type: 'string', children: 'Continues an existing conversation, such as a chat, instead of starting a new one.' },
          { name: 'webActions', type: 'boolean | WebActionOptions', children: <>The built-in web action runner. Default: on. See <DocLink to="web-actions">Web actions</DocLink>.</> },
          { name: 'maxRetries', type: 'number', children: 'Reconnect attempts after a failure. Default: 3.' },
          { name: 'retryDelayMs', type: 'number', children: 'The first retry delay, doubled on each attempt. Default: 1000.' },
          { name: 'microphone', type: 'string', children: <>A microphone <C>deviceId</C>.</> },
          { name: 'debug', type: 'boolean', children: 'Prints diagnostics. Otherwise the SDK writes nothing to the console.' },
        ]} />

        <H2 id="pass-values-to-the-workflow">Pass values to the workflow</H2>
        <p>To give the agent details it should know for this call, pass them in <C>customs</C>:</p>
        <Code lang="js">{`
createSession({
  flowKey: "YOUR_FLOW_KEY",
  customs: { variables: { customer_name: "Priya", order_id: "A-1042" } },
});`}</Code>
        <p>The workflow can use <C>customer_name</C> and <C>order_id</C>, so the agent can greet Priya by name and look up her order.</p>

        <H2 id="events">Events</H2>
        <p><C>session.on(event, listener)</C> returns a function that removes the listener.</p>
        <Table
          head={['Event', 'The listener gets', 'Fires when']}
          rows={[
            [<C>state</C>, <><C>idle</C>, <C>connecting</C>, <C>listening</C>, <C>speaking</C>, <C>ended</C> or <C>error</C></>, 'The call changes state.'],
            [<C>level</C>, <><C>{'{ user, agent }'}</C>, each 0 to 1</>, 'About 20 times a second during a call.'],
            [<C>agentAudio</C>, <C>MediaStream</C>, 'The agent’s voice arrives. It’s already playing.'],
            [<C>agentVideo</C>, <C>MediaStream</C>, 'The avatar video arrives.'],
            [<C>mute</C>, <C>boolean</C>, 'The microphone is muted or unmuted.'],
            [<C>webAction</C>, <C>(message, ack)</C>, <>The agent asks for a web action, when <C>webActions</C> is <C>false</C>.</>],
            [<C>webActionResult</C>, <C>(message, status)</C>, 'The built-in runner finishes an action.'],
            [<C>message</C>, 'any', 'The agent sends any other message.'],
            [<C>ended</C>, <C>{'{ reason, seconds, sessionId }'}</C>, <>The call ends. <C>reason</C> is <C>user</C> (you stopped it), <C>remote</C> (the agent hung up) or <C>error</C>.</>],
            [<C>error</C>, <C>VoxioError</C>, <>Something fails. See <DocLink to="errors">Errors</DocLink>.</>],
          ]}
        />

        <H2 id="methods-and-properties">Methods and properties</H2>
        <Table
          head={['Member', 'What it does']}
          rows={[
            [<C>start()</C>, 'Opens the microphone and connects. Call it from a click or tap.'],
            [<C>stop()</C>, 'Hangs up and releases the microphone. You can start the session again.'],
            [<C>mute(muted = true)</C>, 'Mutes or unmutes without dropping the call.'],
            [<C>setMicrophone(deviceId)</C>, 'Switches microphone during a call.'],
            [<C>destroy()</C>, 'Stops the session for good and removes every listener.'],
            [<C>state</C>, 'The current state.'],
            [<C>muted</C>, 'Whether the microphone is muted.'],
            [<C>sessionId</C>, 'The conversation’s id. Use it to look the session up later or match it to a webhook.'],
            [<C>localStream</C>, 'The visitor’s microphone, and camera if on, while a call is live.'],
          ]}
        />

        <H2 id="reconnects">Reconnects</H2>
        <p>
          The SDK retries a failed connection up to <C>maxRetries</C> times, doubling the wait each time. A call that drops is
          reconnected the same way, and a call that stays up for ten seconds resets the count. A refused key or any other
          4xx answer is never retried. When the agent ends the call, <C>ended</C> fires with <C>reason: "remote"</C>.
        </p>

        <NextSteps items={[
          { to: 'web-actions', label: 'Web actions', what: 'let the agent act on your page during the call.' },
          { to: 'errors', label: 'Errors', what: 'handle each error code.' },
          { to: 'sessions-usage', label: 'Sessions and usage', what: 'read the transcript after the call.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'web-actions',
    title: 'Web actions',
    group: 'Build your own',
    summary: 'Let the agent fill in forms, click buttons and scroll your page while it talks.',
    body: () => (
      <>
        <p>
          When the flow decides to act on the page, the agent sends a web action alongside its speech. The SDK finds the
          element by what it's called on screen (its label, text or placeholder), does what a person would, and tells the
          agent whether it worked. Each action runs in the pause after the words that go with it, so the page moves while
          the agent says what it's doing.
        </p>
        <p>Web actions are on in every voice session and widget unless you turn them off.</p>

        <H2 id="built-in-actions">Built-in actions</H2>
        <Table
          head={['Action', 'What it does']}
          rows={[
            [<C>click</C>, 'Clicks a button, link or control.'],
            [<C>fill_field</C>, 'Types a value into a field the way typing would, so React, Vue and plain forms all notice.'],
            [<C>focus</C>, 'Moves focus to an element.'],
            [<C>scroll_to</C>, 'Scrolls an element into view.'],
            [<C>highlight</C>, 'Draws attention to an element.'],
            [<C>navigate</C>, 'Opens a URL on an allowed origin.'],
          ]}
        />

        <H2 id="limit-where-actions-run">Limit where actions run</H2>
        <p>Keep actions inside your app and away from other sites:</p>
        <Code lang="js">{`
createSession({
  flowKey: "YOUR_FLOW_KEY",
  webActions: {
    root: () => document.querySelector("#app"),     // where to look (default: the whole page)
    allowedOrigins: ["https://shop.example.com"],   // where navigate may go (default: this origin)
    timing: "after-speech",                         // or "immediate"
  },
});`}</Code>

        <H2 id="add-your-own-actions">Add your own actions</H2>
        <p>
          To replace a built-in action or add a new one, give a handler for its name. Return <C>"ok"</C> or{' '}
          <C>"error"</C>, and the agent hears which:
        </p>
        <Code lang="js">{`
createSession({
  flowKey: "YOUR_FLOW_KEY",
  webActions: {
    handlers: {
      add_to_cart: async (action) => ((await addToCart(action.value)) ? "ok" : "error"),
    },
  },
});`}</Code>
        <p>
          An action carries <C>action</C> (its name) and, as needed, <C>target</C>, <C>within</C>, <C>value</C>,{' '}
          <C>selector</C>, <C>url</C> and <C>timeout</C>.
        </p>

        <H2 id="handle-actions-yourself">Handle actions yourself</H2>
        <p>To run every action with your own code, turn the runner off and answer each one:</p>
        <Code lang="js">{`
const session = createSession({ flowKey: "YOUR_FLOW_KEY", webActions: false });

session.on("webAction", async (message, ack) => {
  const ok = await myRouter.handle(message.action);
  ack(ok ? "ok" : "error");
});`}</Code>
        <Note kind="warn">Always call <C>ack</C>. Without it, the agent waits for the action's timeout before it carries on.</Note>

        <NextSteps items={[
          { to: 'sessions', label: 'Headless sessions', what: 'see every session option and event.' },
          { to: 'flows', label: 'Flows', what: 'manage the workflow that sends the actions.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'errors',
    title: 'Errors',
    group: 'Build your own',
    summary: 'Find out what each error means in a browser session and on your server, and what to tell the visitor.',
    body: () => (
      <>
        <p>Browser sessions report problems as a <C>VoxioError</C>. The server SDK throws a <C>VoxioServerError</C>. Both carry a <C>code</C> you can switch on.</p>

        <H2 id="catch-browser-errors">Catch browser errors</H2>
        <p>Listen for <C>error</C> on the session:</p>
        <Code lang="js">{`
session.on("error", (error) => {
  // error.code, error.message, and error.status for HTTP failures
  if (error.code === "mic-denied") showMicHelp();
});`}</Code>
        <p>Widgets fire the same error as a <C>voxio-error</C> DOM event, and React components call <C>onError</C>.</p>

        <H2 id="browser-error-codes">Browser error codes</H2>
        <Table head={['Code', 'Meaning', 'What to do']} rows={ERROR_CODES.map(([c, m, d]) => [<C>{c}</C>, m, d])} />

        <H2 id="catch-server-errors">Catch server errors</H2>
        <p>Wrap server calls and check the code:</p>
        <Code lang="js">{`
import { VoxioServerError } from "voxioagent/server";

try {
  await voxio.flows.update(flowKey, { name: "Support" });
} catch (e) {
  if (e instanceof VoxioServerError && e.code === "not-found") {
    // the flow key is wrong or the flow was deleted
  } else {
    throw e;
  }
}`}</Code>
        <p>The error's message is the service's own, with its request id when there is one. Quote the request id if you contact support.</p>

        <H2 id="server-error-codes">Server error codes</H2>
        <Table
          head={['Code', 'HTTP status']}
          rows={[
            [<C>invalid-request</C>, '400 or 422'],
            [<C>unauthorized</C>, '401: the key was refused'],
            [<C>forbidden</C>, '403'],
            [<C>not-found</C>, '404'],
            [<C>rate-limited</C>, '429'],
            [<C>server-error</C>, '5xx'],
            [<C>network</C>, 'None: the service couldn’t be reached'],
          ]}
        />

        <NextSteps items={[
          { to: 'sessions', label: 'Headless sessions', what: 'see how reconnects and retries work.' },
          { to: 'server', label: 'Server SDK', what: 'set timeouts and retries for server calls.' },
        ]} />
      </>
    ),
  },

  // ================================================================ Server
  {
    slug: 'server',
    title: 'Server SDK',
    group: 'Server',
    summary: 'Set up voxioagent/server to manage flows and read sessions from your own backend.',
    body: () => (
      <>
        <p><C>voxioagent/server</C> manages your flows and reads their sessions and usage. It runs on Node 18 or later, or any edge runtime with <C>fetch</C>.</p>

        <BeforeYouBegin items={[
          <>Your account key, from <a href="/dashboard/developers"><strong>Developers</strong></a> in the dashboard.</>,
          'Node 18 or later.',
        ]} />

        <H2 id="install-the-package">Install the package</H2>
        <Tabs group="pm" items={INSTALL_TABS} />

        <H2 id="store-your-account-key">Store your account key</H2>
        <p>Keep the account key out of your code. Set it as an environment variable:</p>
        <Tabs group="os" items={SECRET_ENV_TABS} />
        <Replace items={[['ACCOUNT_KEY', 'your account key']]} />

        <H2 id="create-a-client">Create a client</H2>
        <p>Create the client with the key from the environment:</p>
        <Code lang="js" title="voxio.js">{`
import { Voxio } from "voxioagent/server";

export const voxio = new Voxio({ secretKey: process.env.VOXIO_SECRET_KEY, environment: "gpu" });`}</Code>
        <p>To check it works, read one of your flows:</p>
        <Code lang="js">{`
const flow = await voxio.flows.get("YOUR_FLOW_KEY", { keys: ["flow_name"] });
console.log(flow.flow_name);   // → Support`}</Code>
        <Replace items={[['YOUR_FLOW_KEY', FLOW_KEY_HELP]]} />
        <p>If you only read one flow's sessions and usage, its flow key is enough: <C>{'new Voxio({ flowKey, environment: "gpu" })'}</C>.</p>
        <Note kind="warn">
          Keep <C>secretKey</C> on your server. The client refuses to run in a browser unless you pass{' '}
          <C>dangerouslyAllowBrowser: true</C>, which you shouldn't.
        </Note>

        <H2 id="options">Options</H2>
        <Params items={[
          { name: 'secretKey', type: 'string', children: 'Your account key. Needed to create, change, delete or rotate flows.' },
          { name: 'flowKey', type: 'string', children: 'A default flow key for reading sessions and usage.' },
          { name: 'environment', type: '"standard" | "gpu"', children: <>Use <C>gpu</C>: the data service runs there.</> },
          { name: 'endpoints', type: '{ data? }', children: 'Overrides the data service.' },
          { name: 'timeoutMs', type: 'number', children: 'The timeout for each request. Default: 15000.' },
          { name: 'maxRetries', type: 'number', children: 'Retries for reads that fail with 429 or 5xx. Default: 2. Writes are never retried.' },
          { name: 'fetch', type: 'typeof fetch', children: 'Your own fetch, for tests or proxies.' },
        ]} />

        <NextSteps items={[
          { to: 'flows', label: 'Flows', what: 'create, change and delete flows.' },
          { to: 'sessions-usage', label: 'Sessions and usage', what: 'read transcripts and usage.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'flows',
    parent: 'server',
    title: 'Flows',
    group: 'Server',
    summary: 'Create, read, update and delete your flows from code, and rotate their keys.',
    body: () => (
      <>
        <p>Flows you create here are the same as flows made in the dashboard: they appear there, and the dashboard creates its flows the same way.</p>

        <BeforeYouBegin items={[
          <>A server client made with your account key. See <DocLink to="server">Server SDK</DocLink>.</>,
        ]} />

        <H2 id="create-a-flow">Create a flow</H2>
        <p>Create a flow with a name and a workflow:</p>
        <Code lang="js">{`
const { flowKey } = await voxio.flows.create({
  name: "Support",
  workflow: { start_node: "greet", nodes: { greet: { /* … */ } } },
  webhookUrl: "https://example.com/voxio",
  stt: { service: "deepgram", model: "nova-3" },
  tts: { service: "elevenlabs", voice: "VOICE_ID" },
  runtime: { "warmup-agent": true },
});

console.log(flowKey);   // → vk_…`}</Code>
        <Replace items={[['VOICE_ID', 'the voice to use, from your text-to-speech provider']]} />
        <p>The new flow's key comes back as <C>flowKey</C>.</p>
        <Note kind="tip" title="Start from the dashboard">
          The easiest way to get a workflow is to build it in the dashboard's <strong>Workflow</strong> editor and read it
          back with <C>flows.get</C>.
        </Note>

        <H2 id="flow-settings">Flow settings</H2>
        <Params items={[
          { name: 'name', type: 'string', required: true, children: 'The name shown in the dashboard. Required when you create a flow.' },
          { name: 'workflow', type: '{ start_node, nodes }', children: <>The conversation graph. <C>start_node</C> must be one of the <C>nodes</C>.</> },
          { name: 'webhookUrl', type: 'URL', children: <>Where session events are posted. See <DocLink to="webhooks">Webhooks</DocLink>. When you create a flow, it needs a <C>workflow</C> too.</> },
          { name: 'stt', type: '{ service, … }', children: 'The speech-to-text provider and its settings.' },
          { name: 'tts', type: '{ service, … }', children: 'The text-to-speech provider and its settings.' },
          { name: 'faces', type: 'array', children: <>The avatar's expressions. See <DocLink to="avatar">Talking avatar</DocLink>.</> },
          { name: 'transitions', type: 'array', children: 'The transitions between expressions.' },
          { name: 'processType', type: 'string', children: 'How the flow processes speech.' },
          { name: 'vision', type: 'object', children: 'Camera understanding, for flows that can see.' },
          { name: 'runningVision', type: 'object', children: 'Continuous camera understanding during a call.' },
          { name: 'runtime', type: 'object', children: 'Any other flow setting, stored as given.' },
        ]} />

        <H2 id="read-a-flow">Read a flow</H2>
        <p>Read the whole flow, or only the fields you need:</p>
        <Code lang="js">{`
const flow = await voxio.flows.get(flowKey);
const some = await voxio.flows.get(flowKey, { keys: ["flow_name", "agent_id"] });`}</Code>

        <H2 id="update-a-flow">Update a flow</H2>
        <p>Pass only the fields to change:</p>
        <Code lang="js">{`
await voxio.flows.update(flowKey, {
  name: "Support (EN)",
  tts: { service: "deepgram", voice: "aura-2" },
});`}</Code>
        <p>
          Other fields keep their values. If you update <C>faces</C> without <C>transitions</C>, or the other way round, the
          one you leave out is kept. The next session uses the new settings; sessions already running aren't affected.
        </p>

        <H2 id="rotate-the-key">Rotate the key</H2>
        <p>Replace the flow's key:</p>
        <Code lang="js">{`
const { flowKey: newKey } = await voxio.flows.rotateKey(flowKey);`}</Code>
        <p>The old key stops working at once. Phone numbers and sessions stay with the flow.</p>

        <H2 id="delete-a-flow">Delete a flow</H2>
        <p>Delete the flow and see what went with it:</p>
        <Code lang="js">{`
const { sessionsDeleted, numbersDetached } = await voxio.flows.delete(flowKey);`}</Code>
        <Note kind="warn" title="Deleting is permanent">
          The flow's sessions go with it, and so do its agent, speech and voice settings unless another flow shares them.
          Phone numbers stay on your account, detached from any flow. <C>delete</C> always needs the key passed explicitly
          and is never retried.
        </Note>

        <NextSteps items={[
          { to: 'webhooks', label: 'Webhooks', what: 'receive each conversation on your server.' },
          { to: 'sessions-usage', label: 'Sessions and usage', what: 'read transcripts and usage for a flow.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'sessions-usage',
    parent: 'server',
    title: 'Sessions and usage',
    group: 'Server',
    summary: 'Read a conversation’s transcript, recording and timings, and a flow’s usage over time.',
    body: () => (
      <>
        <p>Reading needs only the flow key. Pass it on each call, or set it as the client's default <C>flowKey</C>.</p>

        <H2 id="read-a-session">Read a session</H2>
        <p>Read one session by its id:</p>
        <Code lang="js">{`
const record = await voxio.sessions.get("SESSION_ID", { flowKey: "YOUR_FLOW_KEY" });

record.transcription;        // → [{ role: "user", content: "Hi" }, …]
record.recordingUrl;         // when recording was on
record.startTime;            // ISO 8601
record.totalConnectedTime;   // seconds`}</Code>
        <Replace items={[
          ['SESSION_ID', <>the session's id. It's on the browser session (<C>session.sessionId</C>), in the <C>ended</C> event and in every <DocLink to="webhooks">webhook</DocLink></>],
          ['YOUR_FLOW_KEY', 'the key of the flow the session belongs to'],
        ]} />

        <H2 id="read-usage">Read usage</H2>
        <p>Read a flow's totals for a period, broken down by hour, day, week or month:</p>
        <Code lang="js">{`
const usage = await voxio.sessions.usage({
  flowKey: "YOUR_FLOW_KEY",
  from: "2026-10-01",
  to: "2026-10-31",
  bucket: "day",
});

usage.totals.sessions;                // → 412
usage.totals["connected-minutes"];    // → 1873
usage.buckets;                        // one entry per day, with the same fields`}</Code>
        <p>Each total and each bucket has these fields:</p>
        <Table
          head={['Field', 'What it counts']}
          rows={[
            [<C>sessions</C>, 'Sessions.'],
            [<><C>connected-seconds</C>, <C>connected-minutes</C></>, 'Time on the line.'],
            [<><C>ai-seconds</C>, <C>human-seconds</C></>, 'Time each side spent talking.'],
            [<><C>ai-tokens</C>, <C>human-tokens</C>, <C>total-tokens</C></>, 'Tokens on each side.'],
            [<><C>time-ratio</C>, <C>token-ratio</C></>, <>Agent divided by human, or <C>null</C>.</>],
          ]}
        />

        <NextSteps items={[
          { to: 'webhooks', label: 'Webhooks', what: 'get each session as it happens instead of reading it later.' },
          { to: 'server', label: 'Server SDK', what: 'set a default flow key on the client.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'webhooks',
    parent: 'server',
    title: 'Webhooks',
    group: 'Server',
    summary: 'Receive each conversation on your server as it happens.',
    body: () => (
      <>
        <p>A flow with a webhook URL posts JSON to it while each session runs and once when it ends.</p>

        <BeforeYouBegin items={['A public HTTPS endpoint on your server that accepts POST requests.']} />

        <H2 id="set-the-webhook-url">Set the webhook URL</H2>
        <p>Open the flow's <strong>Webhook</strong> tab in the dashboard and enter your URL. To set it from your server instead, update the flow:</p>
        <Code lang="js">{`
await voxio.flows.update(flowKey, { webhookUrl: "https://example.com/voxio" });`}</Code>

        <H2 id="receive-the-events">Receive the events</H2>
        <p>Accept the POST, answer straight away, and do slow work afterwards. This Express handler saves the transcript when a session finishes:</p>
        <Code lang="js" title="server.js">{`
app.post("/voxio", express.json({ limit: "2mb" }), (req, res) => {
  const { status, session_id } = req.body;

  if (status === "finished") {
    const history = req.body["session-data"]?.state?.conversation_history ?? [];
    saveTranscript(session_id, history);
  }

  res.sendStatus(200);
});`}</Code>
        <p>Use <C>session_id</C> to tie each webhook to the browser session or call that produced it.</p>

        <H2 id="payload">Payload</H2>
        <p>Every post has this shape:</p>
        <Code lang="json">{`
{
  "status": "finished",
  "session_id": "8b1f…",
  "session-data": {
    "state": {
      "conversation_history": [
        { "role": "user", "content": "Hi" },
        { "role": "assistant", "content": "Hello! How can I help?" }
      ]
    }
  },
  "responses": [
    { "node": "reply", "out": { "speak": "…", "hangup": false } }
  ]
}`}</Code>
        <p>
          <C>responses</C> holds what each workflow step produced on that turn. Every key your workflow outputs arrives
          there, not only <C>speak</C>, so you can send structured data such as a score, a booking or a lead straight to your
          server.
        </p>

        <H2 id="statuses">Statuses</H2>
        <Table
          head={[<C>status</C>, 'Sent']}
          rows={[
            [<C>started</C>, 'When the session begins.'],
            [<C>running</C>, 'After each turn, with that turn’s responses.'],
            [<C>finished</C>, 'Once, at the end, with the full conversation history.'],
          ]}
        />

        <NextSteps items={[
          { to: 'sessions-usage', label: 'Sessions and usage', what: 'read a session again later.' },
          { to: 'flows', label: 'Flows', what: 'make the workflow output the data you need.' },
        ]} />
      </>
    ),
  },
  {
    slug: 'phone-calls',
    parent: 'server',
    title: 'Phone calls',
    group: 'Server',
    summary: 'Have your agent call a phone number now or at a set time, and answer calls to your numbers.',
    body: () => (
      <>
        <p>Phone calls aren't in the SDK yet. Call these REST endpoints from your server, with your account key and the flow's key in the headers.</p>

        <BeforeYouBegin items={[
          <>A phone number attached to the flow, on its <strong>Numbers</strong> tab in the dashboard.</>,
          <>Your account key and the flow key, as <C>VOXIO_SECRET_KEY</C> and <C>VOXIO_FLOW_KEY</C> environment variables.</>,
        ]} />

        <H2 id="call-a-number-now">Call a number now</H2>
        <p>Post the two numbers to start the call:</p>
        <Code lang="bash">{`
curl -X POST https://call.voxio.in/plivo/outbound \\
  -H "user_api_key: $VOXIO_SECRET_KEY" \\
  -H "flow_api_key: $VOXIO_FLOW_KEY" \\
  -H "content-type: application/json" \\
  -d '{
        "from-number": "FROM_NUMBER",
        "to-number": "TO_NUMBER",
        "customs": { "variables": { "customer_name": "Priya" } }
      }'`}</Code>
        <Replace items={[
          ['FROM_NUMBER', <>one of your numbers in E.164 format, such as <C>+91XXXXXXXXXX</C></>],
          ['TO_NUMBER', <>the number to call, in E.164 format, such as <C>+91XXXXXXXXXX</C></>],
        ]} />
        <p>The phone rings within a few seconds, and the agent speaks when it's answered. The request body takes:</p>
        <Params items={[
          { name: 'from-number', type: 'E.164', required: true, children: 'One of your numbers.' },
          { name: 'to-number', type: 'E.164', required: true, children: 'The number to call, with its country code.' },
          { name: 'session_id', type: 'string', children: 'Your own id for the call. It comes back in the call’s webhooks.' },
          { name: 'customs', type: 'object', children: <>Overrides for this call, as for <DocLink to="sessions" hash="pass-values-to-the-workflow">browser sessions</DocLink>.</> },
        ]} />

        <H2 id="schedule-a-call">Schedule a call</H2>
        <p>To call later, post to the schedule endpoint with a time:</p>
        <Code lang="bash">{`
curl -X POST https://call.voxio.in/plivo/outbound/schedule \\
  -H "user_api_key: $VOXIO_SECRET_KEY" \\
  -H "flow_api_key: $VOXIO_FLOW_KEY" \\
  -H "content-type: application/json" \\
  -d '{ "from-number": "FROM_NUMBER", "to-number": "TO_NUMBER",
        "datetimezone": "01102026 1430 IST" }'`}</Code>
        <p><C>datetimezone</C> is <C>DDMMYYYY HHMM ZONE</C>. This example calls at 2:30 PM IST on 1 October 2026.</p>

        <H2 id="answer-incoming-calls">Answer incoming calls</H2>
        <p>
          A call to one of your numbers is answered by the flow the number is attached to. Each call is a session, with
          webhooks like any other.
        </p>

        <NextSteps items={[
          { to: 'webhooks', label: 'Webhooks', what: 'get each call’s transcript on your server.' },
          { to: 'sessions', label: 'Headless sessions', what: 'see what you can put in customs.', hash: 'pass-values-to-the-workflow' },
        ]} />
      </>
    ),
  },
]

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug)

/** The sidebar: pages grouped in order of first appearance. */
export const GROUPS: { title: string; pages: DocPage[] }[] = PAGES.reduce<{ title: string; pages: DocPage[] }[]>((out, p) => {
  const g = out.find((x) => x.title === p.group)
  if (g) g.pages.push(p)
  else out.push({ title: p.group, pages: [p] })
  return out
}, [])
