export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-16 rounded-md bg-muted/40" />
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded bg-muted/40" />
        </div>
      </div>
      {/* Calendar toggle */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-9 rounded-full bg-muted/40" />
        <div className="h-4 w-28 rounded bg-muted/40" />
      </div>
      {/* Tabs */}
      <div className="flex gap-1 border-b pb-px">
        <div className="h-8 w-24 rounded-md bg-muted" />
        <div className="h-8 w-28 rounded-md bg-muted/40" />
        <div className="h-8 w-20 rounded-md bg-muted/40" />
      </div>
      {/* Tab content placeholder */}
      <div className="space-y-4 pt-2">
        <div className="h-10 w-full rounded-md border bg-muted/40" />
        <div className="h-10 w-full rounded-md border bg-muted/40" />
        <div className="h-10 w-48 rounded-md bg-muted" />
      </div>
    </div>
  );
}
