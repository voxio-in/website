// What a route shows while it resolves.
//
// Skeletons in the shape of a page — a heading, three lines, a row of cards —
// rather than a spinner, so the layout is already standing when the real
// content arrives and nothing jumps.

export default function PendingPage() {
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
