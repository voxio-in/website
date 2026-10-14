import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import CodeBlock from '#/components/CodeBlock'
import { CopyRow } from '#/components/ui/copy-row'
import { Card, Notice, Page } from '#/components/dashboard/ui'
import { SDK_VERSION } from '#/lib/docs/pages'
import { fmtDate, unwire } from '#/lib/dashboard/client'
import type { Account } from '#/lib/dashboard/types'
import { accountOp, getAccount } from '#/server/dashboard/api'
import KeyChip from '#/components/dashboard/KeyChip'

export const Route = createFileRoute('/dashboard/developers')({
  staleTime: 30_000,
  pendingMs: 800,
  loader: async () => unwire<Account & { liveUserKey: boolean }>(await getAccount()),
  component: Developers,
})

// Step 1 is always the install; step 2 is whichever way of building the reader picks.
// The real voxioagent API; each option links to its full guide in /docs.
const INSTALL: { label: string; code: string }[] = [
  { label: 'npm', code: 'npm install voxioagent' },
  { label: 'pnpm', code: 'pnpm add voxioagent' },
  { label: 'yarn', code: 'yarn add voxioagent' },
]
const SCRIPT_TAG = `<script src="https://cdn.jsdelivr.net/npm/voxioagent@${SDK_VERSION}/dist/voxio.js"
        data-flow-key="YOUR_FLOW_KEY" data-label="Talk to us" defer></script>`

const OPTIONS = ['Voice button', 'Headless session', 'Server', 'Webhooks', 'Phone calls'] as const
type Option = (typeof OPTIONS)[number]

const CODE: Record<Option, { file: string; lang: string; code: string; doc: string }> = {
  'Voice button': {
    file: 'main.js',
    lang: 'js',
    doc: 'voice-button',
    code: `import { mountVoiceButton } from "voxioagent/widget";

// The flow key is on the flow's Overview.
mountVoiceButton({ flowKey: "YOUR_FLOW_KEY", label: "Talk to us" });`,
  },
  'Headless session': {
    file: 'call.js',
    lang: 'js',
    doc: 'sessions',
    code: `import { createSession } from "voxioagent/client";

const session = createSession({ flowKey: "YOUR_FLOW_KEY" });

session.on("state", (state) => console.log(state));   // connecting → listening → speaking
session.on("error", (error) => console.warn(error.code));
session.on("ended", ({ seconds, sessionId }) => {});

document.querySelector("#start").onclick = () => session.start();`,
  },
  Server: {
    file: 'server.js',
    lang: 'js',
    doc: 'flows',
    code: `import { Voxio } from "voxioagent/server";

// Your account key, from an environment variable. Server only.
const voxio = new Voxio({ secretKey: process.env.VOXIO_SECRET_KEY, environment: "gpu" });

const { flowKey } = await voxio.flows.create({ name: "Support", workflow });
await voxio.flows.update(flowKey, { name: "Support (EN)" });
const record = await voxio.sessions.get(sessionId, { flowKey });`,
  },
  Webhooks: {
    file: 'payload.json',
    lang: 'json',
    doc: 'webhooks',
    code: `{
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
  "responses": [{ "node": "reply", "out": { "speak": "…", "hangup": false } }]
}`,
  },
  'Phone calls': {
    file: 'terminal',
    lang: 'bash',
    doc: 'phone-calls',
    code: `curl -X POST https://call.voxio.in/plivo/outbound \
  -H "user_api_key: $VOXIO_SECRET_KEY" \
  -H "flow_api_key: $VOXIO_FLOW_KEY" \
  -H "content-type: application/json" \
  -d '{ "from-number": "$FROM_NUMBER", "to-number": "$TO_NUMBER" }'`,
  },
}

function Developers() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const [option, setOption] = useState<Option>('Voice button')
  const [err, setErr] = useState<string | null>(null)
  if (!res.ok) return <Page title="Developers"><Notice kind="err">{res.reason}</Notice></Page>
  const a = res.data

  const rotate = async () => {
    const r = unwire(await accountOp({ data: { op: JSON.stringify({ op: 'key.rotate' }) } }))
    if (!r.ok) setErr(r.reason)
    else router.invalidate()
  }

  const pick = CODE[option]

  return (
    <Page title="Developers">
      {err && <Notice kind="err">{err}</Notice>}
      <Card title="Account API key">
        <KeyChip value={a.apiKey} label="Account key" onRotate={rotate} />
        {a.apiKeyRotatedAt && <p className="db-fhelp">Last rotated {fmtDate(a.apiKeyRotatedAt)}</p>}
      </Card>

      <Card title="SDK">
        <div className="db-dev-step">
          <span className="db-dev-num">1</span>
          <h3 className="db-dev-h">Install</h3>
        </div>
        {INSTALL.map((i) => <CopyRow key={i.label} label={i.label} value={i.code} />)}
        <CopyRow value={SCRIPT_TAG} />

        <div className="db-dev-step">
          <span className="db-dev-num">2</span>
          <h3 className="db-dev-h">Choose what to build</h3>
        </div>
        <CodeBlock
          className="db-dev-code"
          tabs={OPTIONS.map((o) => ({ label: o, code: CODE[o].code, language: CODE[o].lang }))}
          active={OPTIONS.indexOf(option)}
          onTabChange={(i) => setOption(OPTIONS[i]!)}
        />
        <a className="db-btn db-primary" href={`/docs/${pick.doc}`} target="_blank" rel="noreferrer">Read the full guide</a>
      </Card>
    </Page>
  )
}
