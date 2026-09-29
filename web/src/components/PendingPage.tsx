// What a route shows while it resolves.
//
// Skeletons in the shape of a page — a heading, three lines, a row of cards —
// rather than a spinner, so the layout is already standing when the real
// content arrives and nothing jumps.

import { useRouterState } from '@tanstack/react-router'

import { ThinkingOrb } from 'thinking-orbs'

export default function PendingPage() {
  // The dashboard shows the orb instead: its pages are data, not a layout to hold.
  const inDashboard = useRouterState({ select: (s) => s.location.pathname.startsWith('/dashboard') })
  if (inDashboard) {
    return (
      <div className="db-loading" role="status" aria-label="Loading">
        <ThinkingOrb state="searching" size={64} />
        <span>Loading</span>
      </div>
    )
  }
  return (
    <main className="pending" aria-busy="true" aria-label="Loading">
      <div className="skel skel--title" />
      <div className="skel skel--line" />
      <div className="skel skel--line" />
      <div className="skel skel--line" />
      <div className="skel--grid">
        <div className="skel skel--card" />
        <div className="skel skel--card" />
        <div className="skel skel--card" />
      </div>
    </main>
  )
}
