export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-20 rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}