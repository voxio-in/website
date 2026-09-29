// Placeholder for dashboard pages that aren't built yet.

export default function Soon({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="db-page">
      <h1 className="db-h1">{title}</h1>
      <div className="db-empty">
        <p>{children ?? 'Coming soon.'}</p>
      </div>
    </div>
  )
}
