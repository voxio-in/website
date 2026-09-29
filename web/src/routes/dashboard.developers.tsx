import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { Card, Copy, Mock, Notice, Page } from '#/components/dashboard/ui'
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

const SECTIONS = ['Install', 'Browser session', 'Web actions', 'Outbound call', 'Webhooks', 'REST reference'] as const

const CODE: Record<(typeof SECTIONS)[number], string> = {
  Install: `npm install @voxio/sdk`,
  'Browser session': `import { Voxio } from '@voxio/sdk'

// On your server: exchange your user key for a short-lived session token.
const token = await Voxio.server({ apiKey: process.env.VOXIO_API_KEY })
  .sessions.create({ flow: process.env.VOXIO_FLOW_KEY, customs: { 'vad-threshold': 0.6 } })

// In the browser:
const session = await Voxio.connect({ token, audio: true, video: false })
session.on('transcript', (t) => console.log(t.role, t.text))
session.on('ended', () => console.log('done'))
await session.hangup()`,
  'Web actions': `session.on('web_action', async ({ id, action }) => {
  switch (action.type) {
    case 'navigate':  await router.push(action.url); break
    case 'highlight': document.querySelector(action.selector)?.classList.add('vx-glow'); break
  }
  session.ack(id)   // the agent keeps talking once you ack
})`,
  'Outbound call': `curl -X POST https://call.voxio.in/plivo/outbound \\
  -H "user_api_key: $VOXIO_API_KEY" \\
  -H "flow_api_key: $VOXIO_FLOW_KEY" \\
  -H "content-type: application/json" \\
  -d '{ "from-number": "+918045678901", "to-number": "+919812345678",
        "customs": { "inactivity": false } }'

# Schedule instead: POST /plivo/outbound/schedule with
#   "datetimezone": "01102026 1430 IST"`,
  Webhooks: `// POST from Voxio to your webhook URL
{
  "status": "finished",            // started | running | finished
  "session_id": "8b1f…",
  "session-data": { "state": { "conversation_history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ] } },
  "responses": [ { "node": "reply", "out": { "speak": "…", "hangup": false } } ]
}
// Every key your workflow emits (not only "speak") arrives here.`,
  'REST reference': `GET  /flow?keys=all          header api_key: <flow key>        read a flow
PUT  /flow                   headers user_api_key, api_key     update workflow, stt, tts, faces, kbs, vision
POST /tts                    header api_key                    create a voice config
POST /number                 header flow_api_key               attach a number (+E164)
PUT  /number                 user_api_key, old/new_flow_api_key move a number
GET  /session?session-id=…                                     one session with transcript
POST /plivo/outbound         user_api_key, flow_api_key        call now
POST /plivo/outbound/schedule                                  call later`,
}

function Developers() {
  const res = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>('Install')
  const [err, setErr] = useState<string | null>(null)
  if (!res.ok) return <Page title="Developers"><Notice kind="err">{res.reason}</Notice></Page>
  const a = res.data

  const rotate = async () => {
    const r = unwire(await accountOp({ data: { op: JSON.stringify({ op: 'key.rotate' }) } }))
    if (!r.ok) setErr(r.reason)
    else router.invalidate()
  }

  return (
    <Page title="Developers" sub="Your account key and how to build on Voxio.">
      {err && <Notice kind="err">{err}</Notice>}
      <Card title={<>Account API key <Mock why={a.liveUserKey ? 'This server calls the backend with VOXIO_USER_API_KEY from .env; the key shown here is a mock until accounts can sign in and see their own key.' : 'Mock key — there is no account sign-in yet.'} /></>}
        help="Authenticates your server with Voxio. Every flow also has its own key, under the flow’s Overview.">
        <KeyChip value={a.apiKey} label="Account key" onRotate={rotate} />
        {a.apiKeyRotatedAt && <p className="db-fhelp">Last rotated {fmtDate(a.apiKeyRotatedAt)}</p>}
      </Card>

      <Card title="SDK" help={<>The JavaScript SDK is in progress <Mock why="The @voxio/sdk package doesn't exist yet; these snippets describe the planned API. REST and webhook shapes are the real ones." />.</>}>
        <div className="db-seg db-seg-wrap">{SECTIONS.map((s) => <button key={s} className={tab === s ? 'is-on' : ''} onClick={() => setTab(s)}>{s}</button>)}</div>
        <div className="db-codewrap">
          <pre className="db-code">{CODE[tab]}</pre>
          <Copy text={CODE[tab]} />
        </div>
      </Card>
    </Page>
  )
}
