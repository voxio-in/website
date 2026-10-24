# Test screen redesign (parked)

Built on 2026-10-25, then reverted the same day: testers are using the current Test screen, so it stays as it is for now. Everything needed to bring the redesign back is below: the design, what changed, and the exact code.

## How to bring it back

1. Save the patch in "Code: the diff" to a file, e.g. `test-redesign.patch`, and run `git apply --ignore-whitespace test-redesign.patch` from the repo root (`D:/vx/website`; paths start with `web/`). `--ignore-whitespace` is needed because the source files use CRLF and this doc uses LF. It was taken against the working tree of 2026-10-25; if the files have moved on, apply it with `git apply --3way` or by hand.
2. Create `src/components/dashboard/test/RunOptions.tsx` from "Code: RunOptions.tsx".
3. Append "Code: new CSS" to the end of `src/styles/dashboard-m3.css`.
4. Move the "Design" section back into `mindsets/voxio-users.md`.
5. Run `npx tsc --noEmit` and `npx vite build`, and log it in `changes.md`.

## Design

### Test: what each role needs (2026-10-25)

The question every visitor brings to Test: **"Does it sound right and say the right things, and what do I fix?"**

| Role | Comes to | Needs | Gets it from |
|---|---|---|---|
| Programme owner | Hear it, then fix a word or two | One click to start; to know if a face will show; a verdict at the end | Start card, **Show the face**, **How did it go?** with Change the workflow / Change the voice |
| Older or non-technical owner | Not get stuck | One button, plain words, the microphone hint, no jargon | One filled Start; "For this run" in plain words |
| Developer | See what went over the wire; try a setting | The message log; every setting | **Messages** in the dialog's header; **All settings** under For this run |
| Reviewer | Rarely here | The session afterwards | **View in sessions** on the end card |

**The start card says what the run will be** before it starts: "A video call with its face" or "A voice call in your browser", which voice it speaks with, and whether it sees the camera. **Show the face** (when the Avatar tab has one) and **Let it see my camera** (when the flow has vision) are switches for this run only.

**One filled button, bottom right:** Start talking, or Start video call. Chat instead and Call my phone are joined to its left, quieter. If only chat can run, Start chatting becomes the filled one. Whatever can't run says why under the buttons; phone without a number links to Numbers & calls.

**One click starts it.** The dialog opens on "Connecting…", not on a second Start button.

**For this run: three things, in plain words.** Voice, the language it listens for, and how fast it talks, read from the flow's own providers, plus saved voices. Nothing is saved. Every other setting is under **All settings**, one level deeper.

**During the call: two layouts.** "With transcript" (the default: face or voice beside the words) and "Face only" / "Voice only" / "Both faces". Mute, volume and End. The message log is behind **Messages**.

**At the end: How did it go?** The verdict first ("Nobody picked up", "The agent didn't answer", or "How did it go?"), the last four lines, what the agent noted (scores, feedback), then **Change the workflow**, **Change the voice** and **Talk again** (filled), with View in sessions and Copy transcript as links. Hanging up yourself is a normal end, not a failure.

## What changed

**What changed**
- **Title:** "Test", not the flow's long name in quotes. Dialog titles say what the call is ("Video call with your agent").
- **Start card instead of three tiles.** It says what this run will be: "A video call with its face" or "A voice call in your browser", the voice it speaks with, and whether it sees your camera. For imported flows, it adds that the test runs the flow as saved here.
  - **Show the face** (when the Avatar tab has one) and **Let it see my camera** (when the flow has vision) are switches for this run, visible before you start. Before, the face followed the Avatar tab with no sign of it, and the camera switch only appeared inside the dialog.
  - One filled **Start talking** / **Start video call** bottom right; **Chat instead** and **Call my phone** joined to its left. If only chat can run, **Start chatting** is the filled one. Whatever can't run says why under the buttons; phone without a number links to Numbers & calls.
- **One click starts it.** The browser and chat tests start as the dialog opens (`autoStart`); the dialog no longer opens on a second Start button. A failed start offers Try again in place.
- **For this run:** Voice (the provider's voices and saved voices), Listens for (the listening language) and Talks at (speed), read from the flow's own providers (`RunOptions.tsx`). **All settings** opens the full panel under it. **Use the flow's own** puts everything back. Nothing is saved.
- **Messages:** a button in the dialog's header shows what was sent and received. The log was built but could never be opened (`showCode` had no setter).
- **Layouts during a call:** two per kind of call, "With transcript" first (the default) and "Voice only", "Face only" or "Both faces". The floating window, its drag and resize, and the 3 to 5 layout choices are gone. Picks are stored under a new key, so old ones don't carry over.
- **How did it go?** replaces "3:12 · 8 turns":
  - the verdict first: "How did it go?", "The agent didn't answer", "Nobody picked up", "The line was busy", "It didn't go through" (hanging up yourself is a normal end);
  - the last four lines, and what the agent noted (its data lines: scores, feedback);
  - **Change the workflow**, **Change the voice** and **Talk again** (filled); View in sessions and Copy transcript as links.
- **Chat:** a chat where the agent never answered is saved as failed, not completed. Its start error no longer blames the workflow alone.
- **Type:** chat words 18px; who-said-it, data lines, timer, layout buttons, Mute/End, Send, microphone hint, video labels and settings notes 16px (they were 12.5–15px).
- Removed the CSS for the tiles, the morphing buttons, the floating window and the old result row.

**Why**
The face was decided on another tab and never shown, three equal tiles stood for one decision, Start needed two clicks, the settings panel repeated the Voice and Behaviour tabs, the message log couldn't be opened, and a test ended with a duration instead of whether it worked. See "Test" in `mindsets/voxio-users.md`.

**State now**
Typechecks and builds. Not looked at in a browser.
- Auto-start waits for the SDK's session and its `idle` state; `useVoxioSession` starts in `idle` (checked in `voxioagent/dist/react.esm.js`).
- In development, React's double-run of effects may open and close a chat once before the real one; production runs it once.
- "Talks at" and "Voice" appear only for providers with those fields (Deepgram, Sarvam, ElevenLabs speed). Pasted voice IDs (ElevenLabs, Google, Resemble) are changed under All settings.

**Files**
src/routes/dashboard.flows.$flowId.test.tsx, src/components/dashboard/test/RunOptions.tsx (new), src/components/dashboard/test/BrowserTest.tsx, src/components/dashboard/test/ChatTest.tsx, src/components/dashboard/test/LivePanel.tsx, src/styles/dashboard-m3.css, src/styles/dashboard-pages.css, mindsets/voxio-users.md

## Code: the diff

Covers `src/routes/dashboard.flows.$flowId.test.tsx`, `src/components/dashboard/test/BrowserTest.tsx`, `ChatTest.tsx`, `LivePanel.tsx`, `src/styles/dashboard-pages.css`, and the Test-only hunks of `src/styles/dashboard-m3.css` (removed rules for the tiles, the floating window and the old result row).

```diff
diff --git a/web/src/components/dashboard/test/BrowserTest.tsx b/web/src/components/dashboard/test/BrowserTest.tsx
index 5e55363..b64ff8a 100644
--- a/web/src/components/dashboard/test/BrowserTest.tsx
+++ b/web/src/components/dashboard/test/BrowserTest.tsx
@@ -55,8 +55,10 @@ function extraOf(out: unknown): Record<string, unknown> | null {
   return Object.keys(rest).length ? rest : null
 }
 
-export default function BrowserTest({ flowKey, setup, video, camera, customs, participants, log, onLive, onDone }: {
+export default function BrowserTest({ flowKey, setup, video, camera, customs, participants, autoStart, log, onLive, onDone }: {
   flowKey: string
+  /** Start as soon as the session is ready: the page's Start button was the one click. */
+  autoStart?: boolean
   setup: TestSetup
   /** Show the agent's avatar. */
   video: boolean
@@ -113,6 +115,13 @@ export default function BrowserTest({ flowKey, setup, video, camera, customs, pa
 
   const live = v.state === 'connecting' || v.state === 'listening' || v.state === 'speaking'
   useEffect(() => onLive(live), [live, onLive])
+  const begin = () => { log('out', 'start session', { ...options, flowKey }); void v.start() }
+  const fired = useRef(false)
+  useEffect(() => {
+    if (!autoStart || fired.current || !v.session || v.state !== 'idle') return
+    fired.current = true
+    begin()
+  }, [autoStart, v.session, v.state]) // eslint-disable-line react-hooks/exhaustive-deps
 
   // The timer starts when the call is up, not when the button is pressed.
   const [startedAt, setStartedAt] = useState<number | null>(null)
@@ -248,10 +257,10 @@ export default function BrowserTest({ flowKey, setup, video, camera, customs, pa
   return (
     <>
       <div className="db-test-go">
-        {!live && (
-          <button className="db-btn db-primary db-btn-icon db-btn-lg" disabled={!v.session}
-            onClick={() => { log('out', 'start session', { ...options, flowKey }); void v.start() }}>
-            <Icon name="voice" size={18} />{v.state === 'ended' || v.state === 'error' ? 'Talk again' : 'Start talking'}
+        {/* Started from the page; again from the end card. Only a failed start offers its own retry here. */}
+        {!live && (!autoStart || (v.state === 'error' && !lines.length)) && (
+          <button className="db-btn db-primary db-btn-icon db-btn-lg" disabled={!v.session} onClick={begin}>
+            <Icon name="voice" size={18} />{v.state === 'error' ? 'Try again' : 'Start talking'}
           </button>
         )}
         {err && <span className="db-err-text">{err}</span>}
diff --git a/web/src/components/dashboard/test/ChatTest.tsx b/web/src/components/dashboard/test/ChatTest.tsx
index 675c6a1..0f98d74 100644
--- a/web/src/components/dashboard/test/ChatTest.tsx
+++ b/web/src/components/dashboard/test/ChatTest.tsx
@@ -15,8 +15,10 @@ export type ChatResult = { sessionId: string; type: 'chat'; startTime: string; s
 
 const LABELS = { listening: 'Your turn', thinking: 'Thinking…', speaking: 'Replying…' }
 
-export default function ChatTest({ flowKey, chatUrl, log, onLive, onDone }: {
+export default function ChatTest({ flowKey, chatUrl, autoStart, log, onLive, onDone }: {
   flowKey: string
+  /** Open the chat at once: the page's button was the one click. */
+  autoStart?: boolean
   chatUrl: string
   /** Records what is sent and received, for the code view. */
   log: WireLog
@@ -54,13 +56,20 @@ export default function ChatTest({ flowKey, chatUrl, log, onLive, onDone }: {
     if (!(await l.connect(null))) {
       setPhase('idle')
       logic.current = null
-      setErr('Couldn’t start a chat with this flow. Check that its workflow is set up, then try again.')
+      setErr('The chat server didn’t open a chat for this flow. It may be busy, or the workflow may need a first step. Try again.')
       return
     }
     setStartedAt(Date.now())
     setPhase('open')
   }
 
+  const fired = useRef(false)
+  useEffect(() => {
+    if (!autoStart || fired.current) return
+    fired.current = true
+    void start()
+  }, [autoStart]) // eslint-disable-line react-hooks/exhaustive-deps
+
   const send = (text: string) => {
     const l = logic.current
     if (!l || reply !== 'none') return false
@@ -96,7 +105,8 @@ export default function ChatTest({ flowKey, chatUrl, log, onLive, onDone }: {
       type: 'chat',
       startTime: new Date(startedAt ?? Date.now()).toISOString(),
       seconds,
-      status: 'completed',
+      // A chat where the agent never answered didn't work, however long it was open.
+      status: linesRef.current.some((x) => x.role === 'agent' && x.text.trim()) ? 'completed' : 'failed',
       transcript: linesRef.current.filter((x) => x.final && x.text.trim()).map((x) => ({ role: x.role === 'agent' ? 'assistant' : 'user', content: x.text })),
     })
   }
@@ -106,9 +116,9 @@ export default function ChatTest({ flowKey, chatUrl, log, onLive, onDone }: {
   return (
     <>
       <div className="db-test-go">
-        {!open && (
+        {!open && (!autoStart || (phase === 'idle' && !!err)) && (
           <button className="db-btn db-primary db-btn-icon db-btn-lg" onClick={() => void start()}>
-            <Icon name="list" size={18} />{phase === 'ended' ? 'Chat again' : 'Start chatting'}
+            <Icon name="list" size={18} />{err ? 'Try again' : 'Start chatting'}
           </button>
         )}
         {err && <span className="db-err-text">{err}</span>}
diff --git a/web/src/components/dashboard/test/LivePanel.tsx b/web/src/components/dashboard/test/LivePanel.tsx
index 43409b5..783c21a 100644
--- a/web/src/components/dashboard/test/LivePanel.tsx
+++ b/web/src/components/dashboard/test/LivePanel.tsx
@@ -3,13 +3,13 @@
 // While a call connects, everything sits centred: the orb, the state and a
 // hint to allow the microphone. Once connected the orb glides into the bar and
 // the agent's face fades in (or the chat slides in), as one Motion layout
-// animation. Next to the agent's controls a layout picker offers a few kinds
-// of arrangement, which the tester then shapes by hand:
-//   voice only  → Voice · Voice + chat · Chat
-//   agent face  → Side by side · Floating face · Face only · Chat only
-//   both faces  → Side by side · Floating me · Only them · Only me · Them + chat
+// animation. Next to the agent's controls, two layouts per kind of call; the
+// first is the default, and keeps what is being tested (the face, the voice)
+// beside the transcript:
+//   voice only  → With transcript · Voice only
+//   agent face  → With transcript · Face only
+//   both faces  → With transcript · Both faces
 // Side by side: drag the divider to resize, ⇄ (or double-click) swaps sides.
-// Floating: drag the window anywhere, drag its corner to resize.
 // Switching layouts always animates. Presentational only — no SDK import.
 
 import { SendHorizontal } from 'lucide-react'
@@ -53,16 +53,16 @@ const LABEL: Record<LiveState, string> = {
 
 type Layout = { id: string; label: string }
 const LAYOUTS = {
-  voice: [{ id: 'orb', label: 'Voice' }, { id: 'side', label: 'Voice + chat' }, { id: 'chat', label: 'Chat' }],
-  face: [{ id: 'side', label: 'Side by side' }, { id: 'float', label: 'Floating face' }, { id: 'face', label: 'Face only' }, { id: 'chat', label: 'Chat only' }],
-  duo: [{ id: 'side', label: 'Side by side' }, { id: 'float', label: 'Floating me' }, { id: 'them', label: 'Only them' }, { id: 'me', label: 'Only me' }, { id: 'chat', label: 'Them + chat' }],
+  voice: [{ id: 'side', label: 'With transcript' }, { id: 'orb', label: 'Voice only' }],
+  face: [{ id: 'side', label: 'With transcript' }, { id: 'face', label: 'Face only' }],
+  duo: [{ id: 'chat', label: 'With transcript' }, { id: 'side', label: 'Both faces' }],
 } satisfies Record<string, Layout[]>
 type Mode = keyof typeof LAYOUTS
-// The layout a call opens in until the tester picks another. A face call starts as a floating face.
-const DEFAULT_LAYOUT: Partial<Record<Mode, string>> = { face: 'float' }
+// Picks are kept per kind of call; v3 drops the older, longer lists' picks.
+const LAYOUT_KEY = 'vx-test-layout-v3'
 
-type Arrange = { ratio: number; swap: boolean; fx: number; fy: number; fw: number }
-const ARRANGE: Arrange = { ratio: 0.45, swap: false, fx: -1, fy: 12, fw: 200 }
+type Arrange = { ratio: number; swap: boolean }
+const ARRANGE: Arrange = { ratio: 0.5, swap: false }
 
 const SPRING = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 } as const
 const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
@@ -114,14 +114,14 @@ export default function LivePanel({
 
   // Which arrangements fit this call, and the chosen one (kept per kind of call).
   const mode: Mode | null = !voice ? null : agentStream && selfStream ? 'duo' : agentStream ? 'face' : 'voice'
-  const [picked, setPicked] = useState<Record<string, string>>(() => stored('vx-test-layout-v2', {}))
+  const [picked, setPicked] = useState<Record<string, string>>(() => stored(LAYOUT_KEY, {}))
   const options = mode ? LAYOUTS[mode] : []
-  const layout = mode ? (options.find((o) => o.id === (picked[mode] ?? DEFAULT_LAYOUT[mode])) ?? options[0]).id : 'chat'
+  const layout = mode ? (options.find((o) => o.id === picked[mode]) ?? options[0]).id : 'chat'
   const pick = (id: string) => {
     if (!mode) return
     const next = { ...picked, [mode]: id }
     setPicked(next)
-    keep('vx-test-layout-v2', next)
+    keep(LAYOUT_KEY, next)
   }
   const [arr, setArr] = useState<Arrange>(() => stored('vx-test-arrange', ARRANGE))
   const arrange = (p: Partial<Arrange>) => setArr((a) => { const next = { ...a, ...p }; keep('vx-test-arrange', next); return next })
@@ -213,19 +213,15 @@ export default function LivePanel({
   // What goes where, for this kind of call and layout.
   let main: React.ReactNode = chat
   let second: React.ReactNode = null
-  let how: 'one' | 'side' | 'float' = 'one'
+  let how: 'one' | 'side' = 'one'
   if (mode === 'voice') {
     if (layout === 'orb') main = voicePane
-    else if (layout === 'side') { main = voicePane; second = chat; how = 'side' }
+    else { main = voicePane; second = chat; how = 'side' }
   } else if (mode === 'face') {
-    if (layout === 'side') { main = them; second = chat; how = 'side' }
-    else if (layout === 'float') { main = chat; second = agentStream ? <Feed key="them" who="them" stream={agentStream} still /> : null; how = 'float' }
-    else if (layout === 'face') main = them
+    if (layout === 'face') main = them
+    else { main = them; second = chat; how = 'side' }
   } else if (mode === 'duo') {
     if (layout === 'side') { main = them; second = me; how = 'side' }
-    else if (layout === 'float') { main = them; second = selfStream ? <Feed key="me" who="me" stream={selfStream} still /> : null; how = 'float' }
-    else if (layout === 'them') main = them
-    else if (layout === 'me') main = me
     else { main = them; second = chat; how = 'side' }
   }
 
@@ -239,13 +235,6 @@ export default function LivePanel({
         <AnimatePresence mode="popLayout">{b}</AnimatePresence>
       </div>
     )
-  } else if (how === 'float') {
-    stage = (
-      <>
-        <AnimatePresence mode="popLayout">{main}</AnimatePresence>
-        <Floating stage={stageRef} x={arr.fx} y={arr.fy} w={arr.fw} onMove={(fx, fy) => arrange({ fx, fy })} onSize={(fw) => arrange({ fw })}>{second}</Floating>
-      </>
-    )
   } else stage = <AnimatePresence mode="popLayout">{main}</AnimatePresence>
 
   return (
@@ -342,48 +331,12 @@ function Divider({ stage, onRatio, onSwap }: { stage: React.RefObject<HTMLDivEle
   )
 }
 
-/** A window over the main view: drag it anywhere inside, drag its corner to resize. */
-function Floating({ stage, x, y, w, onMove, onSize, children }: {
-  stage: React.RefObject<HTMLDivElement | null>; x: number; y: number; w: number
-  onMove: (x: number, y: number) => void; onSize: (w: number) => void; children: React.ReactNode
-}) {
-  const start = useRef<{ px: number; py: number; x: number; y: number; w: number; mode: 'move' | 'size' } | null>(null)
-  const self = useRef<HTMLDivElement>(null)
-  const [, redraw] = useState(0)
-  // The stage's width is known after the first paint; place the window then.
-  useEffect(() => { redraw(1) }, [])
-  const width = stage.current?.getBoundingClientRect().width ?? 0
-  // x < 0 means "not placed yet": start in the top-right corner.
-  const left = x < 0 ? Math.max(0, width - w - 12) : Math.min(x, Math.max(0, width - w))
-  const down = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
-    e.stopPropagation()
-    e.currentTarget.setPointerCapture(e.pointerId)
-    start.current = { px: e.clientX, py: e.clientY, x: left, y, w, mode }
-  }
-  const moveTo = (e: React.PointerEvent) => {
-    const s = start.current, r = stage.current?.getBoundingClientRect()
-    if (!s || !r) return
-    if (s.mode === 'size') onSize(Math.min(r.width * 0.7, Math.max(120, s.w + (e.clientX - s.px))))
-    // Anywhere inside the stage, down to its bottom edge (less the window's own height).
-    else onMove(Math.min(r.width - s.w, Math.max(0, s.x + e.clientX - s.px)), Math.min(r.height - (self.current?.offsetHeight ?? 60), Math.max(0, s.y + e.clientY - s.py)))
-  }
-  const up = () => { start.current = null }
-  return (
-    <div ref={self} className="db-live-float" style={{ left, top: y, width: w }} aria-label="Agent video, drag to move"
-      onPointerDown={down('move')} onPointerMove={moveTo} onPointerUp={up}>
-      {children}
-      <span className="db-live-float-size" title="Drag to resize" onPointerDown={down('size')} onPointerMove={moveTo} onPointerUp={up} />
-    </div>
-  )
-}
-
 /** A video feed that fades in and keeps its place in layout animations. */
-// `still`: no layout animation (inside the floating window it must move with the frame, not spring after it).
-function Feed({ who, stream, still }: { who: 'them' | 'me'; stream: MediaStream; still?: boolean }) {
+function Feed({ who, stream }: { who: 'them' | 'me'; stream: MediaStream }) {
   const ref = useRef<HTMLVideoElement>(null)
   useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
   return (
-    <motion.div layoutId={still ? undefined : `feed-${who}`} className={`db-live-feed is-${who}`}
+    <motion.div layoutId={`feed-${who}`} className={`db-live-feed is-${who}`}
       initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={SPRING}>
       <video ref={ref} autoPlay playsInline muted={who === 'me'} />
       <span className="db-live-feedtag">{who === 'me' ? 'You' : 'Agent'}</span>
diff --git a/web/src/routes/dashboard.flows.$flowId.test.tsx b/web/src/routes/dashboard.flows.$flowId.test.tsx
index baabce4..0f98456 100644
--- a/web/src/routes/dashboard.flows.$flowId.test.tsx
+++ b/web/src/routes/dashboard.flows.$flowId.test.tsx
@@ -1,24 +1,26 @@
-// The Test tab: try the flow for real — by voice in the browser, by chat, or
-// on your phone — through the Voxio SDK. Three tiles, one button each; the
-// test itself runs in a large dialog that can also show, as code, everything
-// sent and received. See docs/FLOW_TEST_PLAN.md.
+// The Test tab: try the flow for real through the Voxio SDK (mindsets/voxio-users.md, Test).
+// One start card says what this run will be (face or voice only, which voice, which
+// language) and starts it in one click; chat and phone are the quieter choices. The
+// test runs in a large dialog that can also show every message sent and received, and
+// ends on "How did it go?". See docs/FLOW_TEST_PLAN.md.
 
 import { Link, createFileRoute } from '@tanstack/react-router'
-import { AnimatePresence, motion } from 'motion/react'
-import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
+import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
 
-import Icon, { type IconName } from '#/components/dashboard/Icon'
+import Icon from '#/components/dashboard/Icon'
 import type { BrowserResult } from '#/components/dashboard/test/BrowserTest'
 import type { ParticipantsGraph } from 'voxioagent/client'
 import { facesOn } from '#/lib/dashboard/participants'
 import type { ChatResult } from '#/components/dashboard/test/ChatTest'
 import PhoneTest, { type PhoneResult } from '#/components/dashboard/test/PhoneTest'
+import RunOptions from '#/components/dashboard/test/RunOptions'
 import WirePanel from '#/components/dashboard/test/WirePanel'
 import TestSettings, { changedCount, type TestOverrides } from '#/components/dashboard/test/TestSettings'
 import { useWire } from '#/components/dashboard/test/wire'
 import { Dialog, Loading, Notice, Toggle, useFlow } from '#/components/dashboard/ui'
-import { NAME_MAX, clipName, fmtDur, unwire } from '#/lib/dashboard/client'
+import { fmtDur, unwire } from '#/lib/dashboard/client'
 import { KNOBS } from '#/lib/dashboard/knobs'
+import { describe } from '#/lib/dashboard/providers'
 import { rememberTestSession } from '#/lib/dashboard/testSessions'
 import type { Account, TestSetup } from '#/lib/dashboard/types'
 import { getAccount, getTestSetup, saveTestSession } from '#/server/dashboard/api'
@@ -50,7 +52,7 @@ const isSet = (p: unknown) => (typeof p === 'string' ? !!p : !!(p && typeof p ==
 
 type Gap = { key: 'stt' | 'tts' | 'agent'; title: string; text: string; page: 'voice' | 'workflow'; action: string }
 
-const TITLES: Record<Kind, string> = { browser: 'Talk to', chat: 'Chat with', phone: 'Call me from' }
+const kindOf = (r: Result): Kind => (r.type === 'chat' ? 'chat' : r.type === 'phone' ? 'phone' : 'browser')
 
 function TestTab() {
   const { setup: setupRes, acct } = Route.useLoaderData()
@@ -60,23 +62,24 @@ function TestTab() {
   const avatars = acct.ok ? acct.data.avatars : []
 
   const hasVision = !!(flow.running_vision_id || flow.vision_id)
-  // The avatar follows the flow's own setting on the Avatar tab.
-  const avatar = facesOn(flow.participants as ParticipantsGraph | null | undefined)
+  // The face is on when the Avatar tab turned it on; this run can leave it off.
+  const hasFace = facesOn(flow.participants as ParticipantsGraph | null | undefined)
+  const [showFace, setShowFace] = useState(true)
+  const video = hasFace && showFace
   const [camera, setCamera] = useState(false)
   const [open, setOpen] = useState<Kind | null>(null)
+  // Each start is a fresh session: the counter remounts the test.
+  const [run, setRun] = useState(0)
   const [live, setLive] = useState(false)
-  // The dialog opens small and grows once a test starts (or the code view opens), then stays big.
-  const [started, setStarted] = useState(false)
-  useEffect(() => { if (live) setStarted(true) }, [live])
-  const [showCode] = useState(false)
+  const [showCode, setShowCode] = useState(false)
   const wire = useWire()
   const wireNow = useRef(wire.entries)
   wireNow.current = wire.entries
   const [result, setResult] = useState<Result | null>(null)
   const [copied, setCopied] = useState(false)
 
-  // "Settings for this test": never saved to the flow; kept while the page is open.
-  const [tsetOpen, setTsetOpen] = useState(false)
+  // "For this run": never saved to the flow; kept while the page is open.
+  const [allSettings, setAllSettings] = useState(false)
   const [over, setOver] = useState<TestOverrides>({ knobs: {} })
   const face = avatars.find((a) => a.uuid === flow.faces.expressions[0]?.uuid)
   const lipsync = LIPSYNC[face?.detector ?? 's3fd']
@@ -96,28 +99,25 @@ function TestTab() {
       }
       for (const k of KNOBS) if (flow[k.key] !== undefined && flow[k.key] !== null) c[k.key] = flow[k.key]
     }
-    // "Settings for this test" go on top, for this test only.
+    // "For this run" goes on top, for this test only.
     if (over.tts) c.tts_id = over.tts
     if (over.stt) c.stt_id = over.stt
     Object.assign(c, over.knobs)
-    if (avatar && changedCount(over)) c['lipsync-model'] = lipsync.value
+    if (video && changedCount(over)) c['lipsync-model'] = lipsync.value
     return Object.keys(c).length ? c : undefined
-  }, [setup?.imported, flow, over, avatar, lipsync.value])
+  }, [setup?.imported, flow, over, video, lipsync.value])
 
-  // What the flow is missing. A voice picked under "Try different settings" fills that gap.
+  // What the flow is missing. A voice picked for this run fills that gap.
   const gaps: Gap[] = []
   if (!isSet(flow.stt) && !customs?.stt_id) gaps.push({ key: 'stt', title: 'Listening isn’t set up', text: 'The agent can’t hear callers without a speech-to-text setup.', page: 'voice', action: 'Set up listening' })
   if (!isSet(flow.tts) && !customs?.tts_id) gaps.push({ key: 'tts', title: 'Speaking isn’t set up', text: 'The agent can’t talk without a voice.', page: 'voice', action: 'Choose a voice' })
   if (!Object.keys(flow.workflow?.nodes ?? {}).length) gaps.push({ key: 'agent', title: 'The workflow is empty', text: 'The agent has nothing to say or do yet.', page: 'workflow', action: 'Build the workflow' })
   const voiceReady = !gaps.length
   const chatReady = !gaps.some((g) => g.key === 'agent')
-  // Only a missing voice can be patched from the dialog; an empty workflow can't.
-  const voiceFixable = chatReady
 
-  // The browser session is built once per set of options; they only change while idle.
   // Who sees and hears whom, from the Participants tab; the SDK's default when none are saved.
   const participants = (flow.participants as ParticipantsGraph | null | undefined) ?? undefined
-  const sessionKey = `${flow.key}|${avatar}|${camera}|${JSON.stringify(customs ?? {})}|${JSON.stringify(participants ?? null)}`
+  const sessionKey = `${flow.key}|${video}|${camera}|${JSON.stringify(customs ?? {})}|${JSON.stringify(participants ?? null)}|${run}`
 
   const onDone = useCallback(async (r: BrowserResult | PhoneResult | ChatResult) => {
     rememberTestSession(r.sessionId)
@@ -131,15 +131,14 @@ function TestTab() {
   const openTest = (k: Kind) => {
     wire.clear()
     setResult(null)
-    setStarted(false)
+    setRun((n) => n + 1)
     setOpen(k)
   }
   const close = useCallback(() => { setOpen(null); setLive(false) }, [])
 
-  const turns = result ? result.transcript.filter((t) => t.role === 'user').length : 0
   const copyTranscript = () => {
     if (!result) return
-    const text = result.transcript.map((t) => `${t.role === 'user' ? 'You' : 'Agent'}: ${t.content}`).join('\n')
+    const text = result.transcript.filter((t) => !t.data).map((t) => `${t.role === 'user' ? 'You' : 'Agent'}: ${t.content}`).join('\n')
     navigator.clipboard?.writeText(text)
     setCopied(true)
     setTimeout(() => setCopied(false), 1200)
@@ -154,69 +153,39 @@ function TestTab() {
     )
   }
 
-  const off = (why: string | false) => (why ? why : null)
-  const tiles: { kind: Kind; icon: IconName; title: string; text: string; button: string; blocked: string | null }[] = [
-    {
-      kind: 'browser', icon: 'voice', title: 'Talk in the browser', text: 'Speak to it with your microphone, like a web call.', button: 'Start talking',
-      blocked: off(!setup.testable ? 'Not on the voice servers yet' : !voiceFixable ? 'Build the workflow first' : false),
-    },
-    {
-      kind: 'chat', icon: 'list', title: 'Chat with it', text: 'Type to it, like a chat window on your site.', button: 'Start chatting',
-      blocked: off(!setup.testable ? 'Not on the voice servers yet' : !setup.chatUrl ? 'No chat server is configured' : !chatReady ? 'Build the workflow first' : false),
-    },
-    {
-      kind: 'phone', icon: 'phone', title: 'Call my phone', text: 'It rings you from this flow’s number.', button: 'Call me',
-      blocked: off(!setup.testable ? 'Not on the voice servers yet' : !setup.phone ? 'Coming soon' : !flow.numbers.length ? 'Attach a number first' : !voiceFixable ? 'Build the workflow first' : false),
-    },
-  ]
-  // One filled button: the first test that can run.
-  const lead = tiles.find((t) => !t.blocked)?.kind
-
-  const gapList = (compact = false) => (
-    <ul className={`db-testgaps-list${compact ? ' is-compact' : ''}`}>
+  // Why each way can't run, in words; null when it can.
+  const why: Record<Kind, string | null> = {
+    browser: !setup.testable ? 'Not on the voice servers yet.' : !chatReady ? 'Build the workflow first.' : !voiceReady ? 'Finish the voice setup above, or pick a voice for this run.' : null,
+    chat: !setup.testable ? 'Not on the voice servers yet.' : !setup.chatUrl ? 'No chat server is set up.' : !chatReady ? 'Build the workflow first.' : null,
+    phone: !setup.testable ? 'Not on the voice servers yet.' : !setup.phone ? 'Phone tests are coming soon.' : !flow.numbers.length ? 'no number' : !voiceReady ? 'Finish the voice setup above.' : null,
+  }
+  // One filled button: talking, unless only chat can run.
+  const lead: Kind | null = !why.browser ? 'browser' : !why.chat ? 'chat' : null
+
+  const gapList = () => (
+    <ul className="db-testgaps-list">
       {gaps.map((g) => (
         <li key={g.key}>
-          <Icon name={g.key === 'agent' ? 'flows' : 'voice'} size={18} />
+          <Icon name={g.key === 'agent' ? 'flows' : 'voice'} size={20} />
           <span><b>{g.title}</b><span className="db-muted">{g.text}</span></span>
           <Link to={`/dashboard/flows/$flowId/${g.page}` as '/dashboard/flows/$flowId'} params={{ flowId: flow.key }} className="db-btn db-btn-icon">
-            {g.action}<Icon name="back" size={15} className="db-flip" />
+            {g.action}<Icon name="back" size={16} className="db-flip" />
           </Link>
         </li>
       ))}
     </ul>
   )
 
-  const settingsButton = (
-    <button type="button" className={`db-btn db-btn-icon db-tset-open${changedCount(over) ? ' is-on' : ''}`} onClick={() => setTsetOpen(!tsetOpen)} aria-expanded={tsetOpen}>
-      <Icon name="sliders" size={18} />Settings for this test{changedCount(over) > 0 && <span className="db-tset-n">{changedCount(over)} changed</span>}
-    </button>
-  )
-  const resultCard = result && !live && (
-    <section className="db-testresult">
-      <Icon name="check" size={18} />
-      <span><b>{fmtDur(result.seconds)}</b> · {turns} turn{turns === 1 ? '' : 's'}</span>
-      {result.note && <span className="db-muted">{result.note}</span>}
-      <span className="db-testresult-actions db-btngroup" role="group">
-        <Link to="/dashboard/flows/$flowId" params={{ flowId: flow.key }} search={{ session: result.sessionId }} className="db-gbtn">
-          <Icon name="list" size={18} />View in sessions
-        </Link>
-        {result.transcript.length > 0 && (
-          <button className="db-gbtn" onClick={copyTranscript}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy transcript'}</button>
-        )}
-      </span>
-    </section>
-  )
+  const voiceLine = describe((over.tts ?? flow.tts) as Parameters<typeof describe>[0])
+  const changed = changedCount(over)
 
-  // Voice needs listening and speaking; the dialog can patch those for one test.
-  const voiceBlocked = open !== 'chat' && !voiceReady
+  const endCard = result && !live && (
+    <EndCard result={result} flowKey={flow.key} copied={copied} onCopy={copyTranscript} onAgain={() => openTest(kindOf(result))} />
+  )
 
   return (
     <div className="db-page db-test">
-      <header className="db-pagehead">
-        <div>
-          <h1 className="db-h1 db-flowname" title={flow.flow_name.length > NAME_MAX ? flow.flow_name : undefined}>Test “{clipName(flow.flow_name)}”</h1>
-        </div>
-      </header>
+      <header className="db-pagehead"><div><h1 className="db-h1">Test</h1></div></header>
 
       {!setup.testable && <Notice>{setup.reason}</Notice>}
 
@@ -224,80 +193,146 @@ function TestTab() {
         <section className="db-setcard db-testgaps">
           <h2 className="db-h2">Finish setting it up first</h2>
           <p className="db-muted">
-            {chatReady ? 'Voice tests need these. You can still test it by chat.' : 'This flow can’t be tested until these are done.'}
-            {gaps.some((g) => g.key === 'stt' || g.key === 'tts') && ' For one test, you can also pick a saved voice under “Try different settings” in the test.'}
+            {chatReady ? 'Voice tests need these. You can still chat with it.' : 'It can’t be tested until these are done.'}
+            {gaps.some((g) => g.key === 'stt' || g.key === 'tts') && ' Or pick a voice for one run under “For this run”.'}
           </p>
           {gapList()}
         </section>
       )}
 
-      {/* The three ways to test, as one connected group: each stays its own card. */}
-      <div className="db-testtiles" role="group" aria-label="Ways to test">
-        {tiles.map((t) => (
-          <div key={t.kind} className={`db-testtile${t.blocked ? ' is-off' : ''}`}>
-            <span className="db-testtile-icon"><Icon name={t.icon} size={26} /></span>
-            <h2 className="db-h2">{t.title}</h2>
-            <p className="db-muted">{t.text}</p>
-            {/* The button grows into the test's dialog and shrinks back on close
-                (Dialog's layoutId). While the dialog is open, a hidden copy keeps the tile's size. */}
-            {open === t.kind ? (
-              <span className="db-btn db-btn-lg db-morph-ghost" aria-hidden="true"><Icon name={t.icon} size={18} />{t.button}</span>
-            ) : (
-              <motion.span layoutId={`test-${t.kind}`} className="db-morph-from" style={{ borderRadius: 12 }}>
-                <button className={`db-btn db-btn-icon db-btn-lg${t.kind === lead ? ' db-primary' : ''}`} disabled={!!t.blocked} onClick={() => openTest(t.kind)}>
-                  <Icon name={t.icon} size={18} />{t.button}
-                </button>
-              </motion.span>
-            )}
-            {t.blocked && <span className="db-testtile-why">{t.blocked}</span>}
+      {/* What this run will be, then the one way to start it. */}
+      <section className="db-setcard db-teststart" aria-label="Start a test">
+        <div className="db-teststart-what">
+          <span className="db-teststart-icon"><Icon name={video ? 'avatar' : 'voice'} size={28} /></span>
+          <span>
+            <b>{video ? 'A video call with its face' : 'A voice call in your browser'}</b>
+            <span className="db-muted">{flow.tts ? `Speaks with ${voiceLine}` : 'No voice chosen yet'}{camera ? '. It can see your camera.' : '.'}</span>
+            {setup.imported && <span className="db-muted">Runs the flow as it is saved here.</span>}
+          </span>
+        </div>
+
+        {(hasFace || hasVision) && (
+          <div className="db-testopts">
+            {hasFace && <label className="db-testopt"><Toggle on={showFace} onChange={setShowFace} /><span>Show the face</span></label>}
+            {hasVision && <label className="db-testopt"><Toggle on={camera} onChange={setCamera} /><span>Let it see my camera</span></label>}
           </div>
-        ))}
-      </div>
+        )}
+
+        <div className="db-teststart-run">
+          <span className="db-runopts-title">For this run</span>
+          <RunOptions flow={flow} voices={voices} value={over} onChange={setOver} />
+          <span className="db-runopts-more">
+            <button type="button" className={`db-btn db-btn-icon${allSettings ? ' is-on' : ''}`} aria-expanded={allSettings} onClick={() => setAllSettings(!allSettings)}>
+              <Icon name="sliders" size={18} />All settings{changed > 0 && <span className="db-tset-n">{changed} changed</span>}
+            </button>
+            {changed > 0 && <button type="button" className="db-btn" onClick={() => setOver({ knobs: {} })}>Use the flow’s own</button>}
+          </span>
+        </div>
+        {allSettings && <TestSettings flow={flow} voices={voices} value={over} onChange={setOver} locked={false} onClose={() => setAllSettings(false)} />}
+
+        <div className="db-teststart-go">
+          <span className="db-btngroup" role="group" aria-label="Other ways to test">
+            <button type="button" className={`db-gbtn${lead === 'chat' ? ' is-lead' : ''}`} disabled={!!why.chat} onClick={() => openTest('chat')}>
+              <Icon name="list" size={18} />{lead === 'chat' ? 'Start chatting' : 'Chat instead'}
+            </button>
+            <button type="button" className="db-gbtn" disabled={!!why.phone} onClick={() => openTest('phone')}><Icon name="phone" size={18} />Call my phone</button>
+          </span>
+          {lead !== 'chat' && (
+            <button type="button" className="db-btn db-primary db-btn-icon db-btn-lg db-teststart-main" disabled={!!why.browser} onClick={() => openTest('browser')}>
+              <Icon name={video ? 'avatar' : 'voice'} size={20} />{video ? 'Start video call' : 'Start talking'}
+            </button>
+          )}
+        </div>
+        {/* Each way that can't run says why, where its button is. */}
+        <div className="db-teststart-why">
+          {why.browser && <span>Talking: {why.browser}</span>}
+          {why.chat && setup.testable && <span>Chat: {why.chat}</span>}
+          {why.phone === 'no number' ? (
+            <span>To call your phone, <Link to="/dashboard/flows/$flowId/numbers" params={{ flowId: flow.key }} className="db-textlink">attach a number</Link> first.</span>
+          ) : why.phone && setup.testable && <span>Phone: {why.phone}</span>}
+        </div>
+      </section>
 
-      {result && !open && resultCard}
+      {result && !open && endCard}
 
-      <AnimatePresence>
       {open && setup.flowKey && (
-        <Dialog key={open} layoutId={`test-${open}`} big={started || showCode || tsetOpen} title={`${TITLES[open]} “${clipName(flow.flow_name)}”`} onClose={close}
-          sub={open === 'chat' ? 'Type to your agent. Uses the flow’s own settings.' : open === 'phone' ? 'It rings the number you enter, from this flow’s number.' : undefined}
->
-          <div className={`db-testdlg${showCode || (tsetOpen && open !== 'chat') ? ' has-code' : ''}${started || showCode || tsetOpen ? '' : ' is-small'}`}>
+        <Dialog key={open} big={open !== 'phone' || live || !!result || showCode} title={open === 'chat' ? 'Chat with your agent' : open === 'phone' ? 'Call my phone' : video ? 'Video call with your agent' : 'Talk to your agent'}
+          sub={open === 'phone' ? 'It rings the number you enter, from this flow’s number.' : undefined} onClose={close}
+          actions={
+            <button type="button" className={`db-btn db-btn-icon${showCode ? ' is-on' : ''}`} aria-pressed={showCode} onClick={() => setShowCode(!showCode)}>
+              <Icon name="code" size={18} />Messages
+            </button>
+          }>
+          <div className={`db-testdlg${showCode ? ' has-code' : ''}${open === 'phone' && !live && !result && !showCode ? ' is-small' : ''}`}>
             <div className="db-testdlg-main">
-              {open === 'browser' && hasVision && (
-                <div className="db-testopts">
-                  {hasVision && (
-                    <label className="db-testopt">
-                      <Toggle on={camera} onChange={(v) => !live && setCamera(v)} />
-                      <span>Let it see my camera</span>
-                    </label>
-                  )}
-                </div>
-              )}
-
-              {open !== 'chat' && <div className="db-tset-bar">{settingsButton}</div>}
-              {voiceBlocked && !live && gapList(true)}
-
               <Suspense fallback={<Loading inline label="Getting ready" />}>
-                {open === 'browser' && (voiceBlocked && !live ? (
-                  <div className="db-test-go"><button className="db-btn db-primary db-btn-icon db-btn-lg" disabled><Icon name="voice" size={18} />Start talking</button></div>
-                ) : (
-                  <BrowserTest key={sessionKey} flowKey={setup.flowKey} setup={setup} video={avatar} camera={camera} customs={customs} participants={participants} log={wire.log} onLive={setLive} onDone={onDone} />
-                ))}
-                {open === 'chat' && <ChatTest flowKey={setup.flowKey} chatUrl={setup.chatUrl} log={wire.log} onLive={setLive} onDone={onDone} />}
-                {open === 'phone' && <PhoneTest flow={flow} setup={setup} customs={customs} blocked={voiceBlocked} log={wire.log} onLive={setLive} onDone={onDone} />}
+                {open === 'browser' && (
+                  <BrowserTest key={sessionKey} autoStart flowKey={setup.flowKey} setup={setup} video={video} camera={camera} customs={customs} participants={participants} log={wire.log} onLive={setLive} onDone={onDone} />
+                )}
+                {open === 'chat' && <ChatTest key={run} autoStart flowKey={setup.flowKey} chatUrl={setup.chatUrl} log={wire.log} onLive={setLive} onDone={onDone} />}
+                {open === 'phone' && <PhoneTest key={run} flow={flow} setup={setup} customs={customs} blocked={!voiceReady} log={wire.log} onLive={setLive} onDone={onDone} />}
               </Suspense>
-
-              {resultCard}
+              {endCard}
             </div>
             {showCode && <WirePanel entries={wire.entries} onClear={wire.clear} />}
-            {tsetOpen && open !== 'chat' && !showCode && (
-              <TestSettings flow={flow} voices={voices} value={over} onChange={setOver} locked={live} onClose={() => setTsetOpen(false)} />
-            )}
           </div>
         </Dialog>
       )}
-      </AnimatePresence>
     </div>
   )
 }
 
+// How a test that didn't finish ended, in words (phone statuses, a failed browser session).
+const ENDED_BADLY: Record<string, string> = {
+  failed: 'It didn’t go through',
+  'no-answer': 'Nobody picked up',
+  busy: 'The line was busy',
+}
+
+/**
+ * The end of a test: did it work? The last lines, what the agent noted (scores, feedback),
+ * then the fixes that usually follow and Talk again as the one filled button.
+ */
+function EndCard({ result, flowKey, copied, onCopy, onAgain }: { result: Result; flowKey: string; copied: boolean; onCopy: () => void; onAgain: () => void }) {
+  const said = result.transcript.filter((t) => !t.data && t.content.trim())
+  const noted = result.transcript.filter((t) => t.data).slice(-2)
+  const answered = said.some((t) => t.role === 'assistant')
+  const turns = said.filter((t) => t.role === 'user').length
+  // Hanging up yourself is how most phone tests end, not a failure.
+  const failed = !['completed', 'in-progress', 'canceled'].includes(result.status)
+  const headline = failed ? ENDED_BADLY[result.status] ?? 'It stopped early' : !answered ? 'The agent didn’t answer' : 'How did it go?'
+  const again = result.type === 'chat' ? 'Chat again' : result.type === 'phone' ? 'Call again' : 'Talk again'
+  return (
+    <section className={`db-setcard db-endcard${!answered || failed ? ' is-bad' : ''}`} aria-label="Test result">
+      <header className="db-endcard-head">
+        <b>{headline}</b>
+        <span className="db-muted">{fmtDur(result.seconds)} · {turns} turn{turns === 1 ? '' : 's'} from you</span>
+      </header>
+      {said.length > 0 && (
+        <ol className="db-endcard-lines">
+          {said.slice(-4).map((t, i) => (
+            <li key={i} className={t.role === 'user' ? 'is-user' : 'is-agent'}><b>{t.role === 'user' ? 'You' : 'Agent'}</b><span>{t.content}</span></li>
+          ))}
+        </ol>
+      )}
+      {noted.length > 0 && (
+        <div className="db-endcard-noted">
+          <span className="db-runopts-title">What the agent noted</span>
+          {noted.map((t, i) => <pre key={i}>{t.content}</pre>)}
+        </div>
+      )}
+      {result.note && <Notice kind="err">{result.note}</Notice>}
+      <div className="db-endcard-go">
+        <span className="db-endcard-links">
+          <Link to="/dashboard/flows/$flowId" params={{ flowId: flowKey }} search={{ session: result.sessionId }} className="db-textlink">View in sessions</Link>
+          {said.length > 0 && <button type="button" className="db-textlink" onClick={onCopy}>{copied ? 'Copied' : 'Copy transcript'}</button>}
+        </span>
+        <span className="db-btngroup" role="group" aria-label="What next">
+          <Link to="/dashboard/flows/$flowId/workflow" params={{ flowId: flowKey }} className="db-gbtn"><Icon name="flows" size={18} />Change the workflow</Link>
+          <Link to="/dashboard/flows/$flowId/voice" params={{ flowId: flowKey }} className="db-gbtn"><Icon name="voice" size={18} />Change the voice</Link>
+          <button type="button" className="db-gbtn is-lead" onClick={onAgain}><Icon name="play" size={18} />{again}</button>
+        </span>
+      </div>
+    </section>
+  )
+}
diff --git a/web/src/styles/dashboard-pages.css b/web/src/styles/dashboard-pages.css
index 97abac6..059c33e 100644
--- a/web/src/styles/dashboard-pages.css
+++ b/web/src/styles/dashboard-pages.css
@@ -203,9 +203,6 @@
 .db-testadv summary { display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 550; list-style: none; }
 .db-testadv summary::-webkit-details-marker { display: none; }
 .db-testadv[open] summary { margin-bottom: 14px; }
-.db-testresult { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 18px 22px; color: var(--db-text); }
-.db-testresult > svg { color: var(--db-accent-text); }
-.db-testresult-actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
 
 .db-testchip {
   margin-left: 8px; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; vertical-align: 1px;
@@ -217,7 +214,6 @@
     .db-live-bar { flex-wrap: wrap; }
   .db-live-ctl { margin-left: 0; width: 100%; justify-content: flex-start; }
   .db-bubblerow { max-width: 92%; }
-  .db-testresult-actions { margin-left: 0; }
 }
 
 .db-testgaps .db-h2 { margin: 0 0 4px; }
@@ -235,22 +231,6 @@
   .db-testgaps-list li .db-btn { width: 100%; justify-content: center; }
 }
 
-/* ---------- test tiles: one button each ---------- */
-.db-testtiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
-.db-testtile {
-  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 34px 26px 30px;
-  background: var(--surface); border: 1px solid var(--hair); border-radius: var(--radius); box-shadow: var(--glow);
-  transition: transform 0.2s, background 0.2s;
-}
-.db-testtile:not(.is-off):hover { transform: translateY(-2px); background: var(--surface-hover); }
-.db-testtile .db-h2 { margin: 6px 0 0; }
-.db-testtile p { margin: 0 0 10px; max-width: 30ch; }
-.db-testtile-icon {
-  display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; color: var(--db-accent-text);
-  background: linear-gradient(135deg, rgba(94, 230, 200, 0.24), rgba(94, 230, 200, 0.06));
-}
-.db-testtile.is-off .db-testtile-icon { filter: grayscale(0.8); opacity: 0.6; }
-.db-testtile-why { font-size: 14px; color: var(--db-muted); }
 
 /* ---------- the test dialog ---------- */
 .db-dialog.is-big { width: min(1320px, 100%); height: calc(100dvh - 48px); overflow: hidden; }
@@ -274,10 +254,6 @@
 .db-testopt { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; cursor: pointer; }
 .db-testbody { display: flex; flex-direction: column; gap: 16px; }
 .db-testdlg .db-live { box-shadow: none; }
-.db-testresult {
-  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px 20px; border-radius: 16px;
-  border: 1px solid rgba(94, 230, 200, 0.3); background: rgba(94, 230, 200, 0.06);
-}
 
 /* ---------- sent and received ---------- */
 .db-wire {
@@ -333,10 +309,6 @@
   .db-testdlg:not(.is-small) .db-live-lines { max-height: 50dvh; }
 }
 
-/* Test tiles: the button that morphs into its dialog, and the hidden copy
-   that holds the tile's size while the dialog is open. */
-.db-morph-from { display: inline-flex; }
-.db-morph-ghost { visibility: hidden; }
 
 /* The Avatars tips were named .db-tip, which is also the chart tooltip
    (position: absolute), so they floated to the corner. Now .db-advice. */
diff --git a/web/src/styles/dashboard-m3.css b/web/src/styles/dashboard-m3.css
index fd28131..f646958 100644
--- a/web/src/styles/dashboard-m3.css
+++ b/web/src/styles/dashboard-m3.css
@@ -388,8 +388,6 @@
 }
 
 /* ---------- Settings for this test: side panel with tabs ---------- */
-.db .db-tset-bar { display: flex; justify-content: flex-start; }
-.db .db-tset-open.is-on { background: var(--m3-tonal); border-color: transparent; }
 .db .db-tset-n { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; margin-left: 6px; border-radius: 10px; font-size: 12px; font-weight: 600; background: var(--db-accent); color: var(--db-on-fill, #02201a); }
 .db .db-tset { display: flex; flex-direction: column; min-height: 0; border-radius: 20px; border: 1px solid var(--hair); background: rgb(var(--ink) / 0.02); overflow: hidden; }
 .db .db-tset-head { display: flex; align-items: center; gap: 10px; padding: 16px 16px 10px 20px; }
@@ -431,17 +429,6 @@
 }
 .db .db-live-divider:hover .db-live-swap, .db .db-live-swap:focus-visible { opacity: 1; }
 .db .db-live-swap:hover { color: var(--db-text); }
-.db .db-live-float {
-  position: absolute; z-index: 5; cursor: grab; touch-action: none; border-radius: 16px; overflow: hidden;
-  box-shadow: 0 10px 34px rgb(0 0 0 / 0.45); outline: 1px solid rgb(var(--ink) / 0.12);
-}
-.db .db-live-float:active { cursor: grabbing; }
-.db .db-live-float .db-live-feed { border-radius: 0; }
-.db .db-live-float .db-live-feed video { aspect-ratio: 1; max-height: none; }
-.db .db-live-float-size {
-  position: absolute; right: 0; bottom: 0; width: 22px; height: 22px; cursor: nwse-resize; z-index: 2;
-  background: linear-gradient(135deg, transparent 50%, rgb(255 255 255 / 0.55) 50%, rgb(255 255 255 / 0.55) 60%, transparent 60%, transparent 70%, rgb(255 255 255 / 0.55) 70%, rgb(255 255 255 / 0.55) 80%, transparent 80%);
-}
 .db .db-live-feed video { width: 100%; height: 100%; object-fit: cover; aspect-ratio: auto; max-height: 62vh; }
 
 /* The orb: a soft ring of light instead of a scaled-up bitmap. */
@@ -452,49 +439,30 @@
 @keyframes db-halo { 0%, 100% { transform: scale(0.94); opacity: 0.85 } 50% { transform: scale(1.04); opacity: 1 } }
 @media (prefers-reduced-motion: reduce) { .db .db-live-halo { animation: none; } }
 
-/* Settings for this test: tabs share the width, no scrollbar; the open button spans the row. */
+
 .db .db-tset-tabs { overflow: hidden; }
 .db .db-tset-tab { flex: 1; justify-content: center; padding: 0 6px; }
-.db .db-tset-bar .db-tset-open { width: 100%; justify-content: center; height: 40px; border-radius: 20px; }
 
 @media (max-width: 760px) {
   .db .db-live-split { grid-template-columns: 1fr !important; }
   .db .db-live-divider { display: none; }
 }
 
-/* The stage fills the panel's height, so a floating window can go all the way down. */
+/* The stage fills the panel's height. */
 .db .db-live { display: flex; flex-direction: column; }
 .db .db-live > .db-live-stage { flex: 1; min-height: 360px; }
 .db .db-testdlg:not(.is-small) .db-live > .db-live-stage { min-height: 0; }
 
-/* ---------- Test page ----------
-   The flow name stays on one row. The three test tiles are a connected group:
-   2px apart, large outer corners, small inner ones, each still its own card. */
+/* ---------- Test page ---------- */
 .db .db-test .db-pagehead > div { min-width: 0; max-width: 100%; }
-.db .db-testtiles { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px; }
-.db .db-testtile {
-  border: 0; box-shadow: none; border-radius: 8px; background: var(--surface);
-  transition: background-color 0.2s var(--m3-ease), border-radius 0.2s var(--m3-ease);
-}
-.db .db-testtile:first-child { border-radius: 28px 8px 8px 28px; }
-.db .db-testtile:last-child { border-radius: 8px 28px 28px 8px; }
-.db .db-testtile:not(.is-off):hover { transform: none; background: var(--surface-hover); }
-.db .db-testtile.is-off { opacity: 0.72; }
-@media (max-width: 839px) {
-  .db .db-testtiles { grid-template-columns: 1fr; }
-  .db .db-testtile:first-child { border-radius: 28px 28px 8px 8px; }
-  .db .db-testtile:last-child { border-radius: 8px 8px 28px 28px; }
-}
 
 /* ---------- test dialog: bigger controls and text ----------
-   Start talking and "Settings for this test" share one width. Mute and End,
+   A retry button is full width up to 440px. Mute and End,
    and the message box and Send, are connected groups. */
 .db .db-testdlg { font-size: 16px; }
 .db .db-testdlg .db-test-go { width: 100%; }
-.db .db-testdlg .db-test-go > .db-btn, .db .db-testdlg .db-tset-bar .db-tset-open { width: 100%; max-width: 440px; margin-inline: auto; justify-content: center; }
+.db .db-testdlg .db-test-go > .db-btn { width: 100%; max-width: 440px; margin-inline: auto; justify-content: center; }
 .db .db-testdlg .db-test-go > .db-btn { height: 56px; border-radius: 28px; font-size: 16px; }
-.db .db-testdlg .db-tset-bar { justify-content: center; }
-.db .db-testdlg .db-tset-bar .db-tset-open { height: 48px; border-radius: 24px; font-size: 15px; }
 .db .db-live-cancel { height: 48px; min-width: 160px; border-radius: 24px; font-size: 15px; }
 .db .db-live-stagelabel { font-size: 22px; }
 .db .db-live-mic { font-size: 15px; }
@@ -512,9 +480,6 @@
 .db .db-live-type .db-gin { flex: 1; min-width: 0; height: 48px; font-size: 16px; padding: 0 20px; border-radius: 24px 8px 8px 24px; }
 .db .db-live-type .db-gbtn { height: 48px; padding: 0 20px 0 16px; border-radius: 8px 24px 24px 8px; font-size: 15px; }
 
-/* Result: View in sessions + Copy transcript. */
-.db .db-testresult { font-size: 16px; }
-.db .db-testresult-actions.db-btngroup { gap: 2px; }
 
 /* ---------- Avatar tab ----------
    Bigger section headings. Each look: a thumbnail (click to play) and one
```

## Code: RunOptions.tsx

```tsx
// "For this run": the three things people change between tests (the voice, the
// language it listens for, how fast it talks), read from the flow's own
// providers. Nothing is saved; changes ride along as customs, like the full
// settings panel (TestSettings), which stays one click deeper.

import { Dropdown, Slider } from '../controls'
import { activeFields, providerFor, type ProviderField } from '#/lib/dashboard/providers'
import type { FlowDoc, ProviderConfig, VoicePreset } from '#/lib/dashboard/types'
import type { TestOverrides } from './TestSettings'

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const PRESET = 'preset:'

/** The field of `kind`'s provider that answers to `pick`, when the flow's config has one. */
function fieldOf(cfg: ProviderConfig | null, kind: 'stt' | 'tts', pick: (f: ProviderField) => boolean) {
  if (!cfg || typeof cfg !== 'object') return null
  const p = providerFor(kind, cfg.service)
  return p ? activeFields(p, cfg).find(pick) ?? null : null
}

export default function RunOptions({ flow, voices, value, onChange, locked }: {
  flow: FlowDoc
  voices: VoicePreset[]
  value: TestOverrides
  onChange: (v: TestOverrides) => void
  locked?: boolean
}) {
  const ownTts = typeof flow.tts === 'object' ? flow.tts : null
  const ownStt = typeof flow.stt === 'object' ? flow.stt : null
  const tts = value.tts ?? ownTts
  const stt = value.stt ?? ownStt
  const voiceField = fieldOf(tts, 'tts', (f) => f.label === 'Voice' && f.kind === 'select')
  const speedField = fieldOf(tts, 'tts', (f) => f.label === 'Speed' && f.kind === 'slider')
  const langField = fieldOf(stt, 'stt', (f) => f.key === 'language' && f.kind === 'select')
  const saved = voices.filter((v) => v.kind === 'tts')

  // One override per side: equal to the flow's own means no override.
  const setTts = (next: ProviderConfig) => onChange({ ...value, tts: same(next, ownTts) ? undefined : next })
  const setStt = (next: ProviderConfig) => onChange({ ...value, stt: same(next, ownStt) ? undefined : next })

  const preset = saved.find((v) => same(value.tts, v.config))
  const voiceOptions = [
    ...(voiceField?.options ?? []),
    ...saved.map((v) => ({ value: PRESET + v.id, label: v.name, hint: 'Saved voice' })),
  ]
  const voiceValue = preset ? PRESET + preset.id : voiceField ? String(tts?.[voiceField.key] ?? voiceField.default ?? '') : undefined
  const pickVoice = (v: string) => {
    if (v.startsWith(PRESET)) {
      const p = saved.find((x) => x.id === v.slice(PRESET.length))
      if (p) onChange({ ...value, tts: p.config })
      return
    }
    if (tts && voiceField) setTts({ ...tts, [voiceField.key]: v })
  }

  if (!voiceOptions.length && !langField && !speedField) return null
  return (
    <div className={`db-runopts${locked ? ' is-locked' : ''}`} inert={locked || undefined}>
      {voiceOptions.length > 0 && (
        <label className="db-runopt">
          <span className="db-runopt-label">Voice</span>
          <Dropdown aria-label="Voice for this run" value={voiceValue} options={voiceOptions} onChange={pickVoice} />
        </label>
      )}
      {langField && stt && (
        <label className="db-runopt">
          <span className="db-runopt-label">Listens for</span>
          <Dropdown aria-label="Language for this run" value={String(stt[langField.key] ?? langField.default ?? '')} options={langField.options ?? []}
            onChange={(v) => setStt({ ...stt, [langField.key]: v })} />
        </label>
      )}
      {speedField && tts && (
        <div className="db-runopt">
          <span className="db-runopt-label">Talks at</span>
          <Slider value={Number(tts[speedField.key] ?? speedField.default ?? 1)} min={speedField.min ?? 0.5} max={speedField.max ?? 2} step={speedField.step ?? 0.05} unit={speedField.unit}
            onChange={(v) => setTts({ ...tts, [speedField.key]: v })} />
        </div>
      )}
    </div>
  )
}
```

## Code: new CSS

```css
/* ---------- Test: the start card, For this run, and How did it go? ----------
   What the run will be top left, the run's options under it, and one filled
   Start at the bottom right where the eye ends; chat and phone joined to its left.
   Type 18 / 16. */
.db .db-teststart { display: flex; flex-direction: column; gap: 20px; padding: 24px; }
.db .db-teststart-what { display: flex; align-items: flex-start; gap: 16px; }
.db .db-teststart-what > span:last-child { display: flex; flex-direction: column; gap: 4px; font-size: 16px; }
.db .db-teststart-what b { font-size: 24px; line-height: 32px; font-weight: 600; }
.db .db-teststart-icon { display: grid; place-items: center; flex-shrink: 0; width: 56px; height: 56px; border-radius: 18px; color: var(--db-accent-text); background: var(--cell-sel); }
.db .db-teststart .db-testopts { justify-content: flex-start; }
.db .db-teststart .db-testopt { font-size: 18px; }
.db .db-teststart-run { display: flex; flex-direction: column; gap: 12px; padding-top: 16px; border-top: 1px solid var(--hair); }
.db .db-runopts-title { font-size: 16px; font-weight: 600; color: var(--db-muted); }
.db .db-runopts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px 20px; }
.db .db-runopts.is-locked { opacity: 0.6; }
.db .db-runopt { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.db .db-runopt-label { font-size: 16px; color: var(--db-muted); }
.db .db-runopt .db-dd-btn { font-size: 18px; min-height: 44px; }
.db .db-runopts-more { display: flex; flex-wrap: wrap; gap: 8px; }
.db .db-runopts-more .db-btn { height: 40px; font-size: 16px; }
.db .db-runopts-more .db-btn.is-on { background: var(--cell-sel); }
.db .db-tset-n { height: 22px; font-size: 14px; }
.db .db-teststart .db-tset { max-height: 520px; }
.db .db-teststart-go { display: flex; justify-content: flex-end; align-items: center; gap: 12px; flex-wrap: wrap; }
.db .db-teststart-go .db-gbtn { height: 48px; font-size: 16px; }
.db .db-teststart-go .db-gbtn:first-child { border-radius: 24px 8px 8px 24px; }
.db .db-teststart-go .db-gbtn:last-child { border-radius: 8px 24px 24px 8px; }
.db .db-teststart-main { height: 56px; min-width: 240px; padding: 0 28px; border-radius: 28px; font-size: 18px; justify-content: center; }
.db .db-teststart-why { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; font-size: 16px; color: var(--db-muted); text-align: right; }
.db .db-teststart-why:empty { display: none; }
@media (max-width: 640px) {
  .db .db-teststart-go { flex-direction: column-reverse; align-items: stretch; }
  .db .db-teststart-go .db-btngroup { display: flex; }
  .db .db-teststart-go .db-gbtn { flex: 1; }
  .db .db-teststart-why { align-items: flex-start; text-align: left; }
}
.db .db-testgaps-list li { font-size: 16px; }
.db .db-testgaps-list li b { font-size: 18px; }

/* How did it go? The verdict, the last lines, what the agent noted, then Talk again bottom right. */
.db .db-endcard { display: flex; flex-direction: column; gap: 16px; padding: 20px 24px; box-shadow: none; background: var(--cell); }
.db .db-endcard.is-bad { box-shadow: 0 0 0 1px color-mix(in srgb, var(--db-err) 45%, transparent) inset; }
.db .db-endcard-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.db .db-endcard-head b { font-size: 24px; line-height: 32px; font-weight: 600; }
.db .db-endcard.is-bad .db-endcard-head b { color: var(--db-err); }
.db .db-endcard-head .db-muted { font-size: 16px; }
.db .db-endcard-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.db .db-endcard-lines li { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; font-size: 18px; line-height: 26px; }
.db .db-endcard-lines li b { font-size: 16px; font-weight: 600; color: var(--db-muted); }
.db .db-endcard-lines li.is-agent span { color: var(--db-text); }
.db .db-endcard-lines li.is-user span { color: var(--db-muted); }
.db .db-endcard-noted { display: flex; flex-direction: column; gap: 6px; }
.db .db-endcard-noted pre { margin: 0; padding: 12px 14px; border-radius: 12px; background: rgb(var(--ink) / 0.05); font-size: 16px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 200px; overflow: auto; }
.db .db-endcard-go { display: flex; align-items: center; justify-content: space-between; gap: 12px 20px; flex-wrap: wrap; }
.db .db-endcard-links { display: flex; gap: 20px; font-size: 16px; }
.db .db-endcard-links button.db-textlink { border: 0; padding: 0; background: none; font: inherit; color: inherit; cursor: pointer; text-decoration: underline; }
.db .db-endcard-go .db-gbtn { height: 48px; font-size: 16px; }
.db .db-endcard-go .db-gbtn:first-child { border-radius: 24px 8px 8px 24px; }
.db .db-endcard-go .db-gbtn:last-child { border-radius: 8px 24px 24px 8px; }
@media (max-width: 640px) {
  .db .db-endcard-go .db-btngroup { display: flex; flex-wrap: wrap; width: 100%; }
  .db .db-endcard-go .db-gbtn { flex: 1 1 100%; border-radius: 8px; }
  .db .db-endcard-go .db-gbtn:first-child { border-radius: 24px 24px 8px 8px; }
  .db .db-endcard-go .db-gbtn:last-child { border-radius: 8px 8px 24px 24px; }
}

/* The live call on the 18 / 16 scale: words are 18px, everything around them 16px. */
.db .db-testdlg .db-bubble { font-size: 18px; line-height: 1.5; }
.db .db-testdlg .db-bubble-who, .db .db-testdlg .db-bubble.is-data { font-size: 16px; }
.db .db-live-layouts .m3-seg-btn, .db .db-live-ctl .db-gbtn, .db .db-live-type .db-gbtn,
.db .db-live-cancel, .db .db-live-mic, .db .db-live-state .db-mono, .db .db-live-empty,
.db .db-live-feedtag, .db .db-tset-head small, .db .db-live-actions li { font-size: 16px; }
.db .db-live-state b { font-size: 18px; }
.db .db-live-feedtag { height: 28px; padding: 0 10px; }
.db .db-dialog-actions .db-btn { height: 40px; font-size: 16px; }
.db .db-dialog-actions .db-btn.is-on { background: var(--cell-sel); color: var(--db-accent-text); }
```
