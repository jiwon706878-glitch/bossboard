export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-8 w-16 rounded-md bg-muted/40" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-8 w-64 rounded-md bg-muted" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 rounded-full bg-muted/40" />
            <div className="h-4 w-28 rounded bg-muted/40" />
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="h-4 w-16 rounded bg-muted/40" />
          <div className="h-4 w-10 rounded bg-muted/40" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted" />
      </div>
      {/* Checklist items card */}
      <div className="rounded-md border bg-card">
        <div className="p-4 border-b">
          <div className="h-4 w-28 rounded bg-muted/40" />
        </div>
        <div className="p-4 space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2.5">
              <div className="h-4 w-4 rounded bg-muted/40 shrink-0" />
              <div className="h-4 flex-1 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
      {/* Complete button */}
      <div className="h-9 w-40 rounded-md bg-muted" />
    </div>
  );
}
