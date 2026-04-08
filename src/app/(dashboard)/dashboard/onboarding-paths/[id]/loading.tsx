export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-16 rounded-md bg-muted/40" />
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-md bg-muted" />
            <div className="h-4 w-72 rounded bg-muted/40" />
            <div className="h-3 w-16 rounded bg-muted/40" />
          </div>
        </div>
        <div className="h-8 w-20 rounded-md bg-muted/40" />
      </div>
      {/* Steps card */}
      <div className="rounded-md border bg-card">
        <div className="p-4 border-b">
          <div className="h-4 w-24 rounded bg-muted/40" />
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border px-3 py-2.5">
              <div className="h-3 w-10 rounded bg-muted/40" />
              <div className="h-4 w-4 rounded bg-muted/40" />
              <div className="h-4 flex-1 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
      {/* Assign member card */}
      <div className="rounded-md border bg-card">
        <div className="p-4 border-b">
          <div className="h-4 w-32 rounded bg-muted/40" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-9 flex-1 rounded-md border bg-muted/40" />
            <div className="h-9 w-20 rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
