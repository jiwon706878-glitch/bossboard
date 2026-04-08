export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      {/* Back button */}
      <div className="h-4 w-16 rounded bg-muted/40" />
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-8 w-64 rounded-md bg-muted" />
          <div className="h-5 w-32 rounded bg-muted/40" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-md bg-muted/40" />
          <div className="h-8 w-8 rounded-md bg-muted/40" />
        </div>
      </div>
      {/* Meta row */}
      <div className="flex items-center gap-4">
        <div className="h-4 w-36 rounded bg-muted/40" />
        <div className="h-4 w-44 rounded bg-muted/40" />
      </div>
      {/* Content card */}
      <div className="rounded-md border bg-card p-6 space-y-4">
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-5/6 rounded bg-muted/40" />
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-3/4 rounded bg-muted/40" />
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-2/3 rounded bg-muted/40" />
        <div className="h-8 w-0" />
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-5/6 rounded bg-muted/40" />
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-4/5 rounded bg-muted/40" />
      </div>
    </div>
  );
}
