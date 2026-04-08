export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 lg:-m-6 animate-pulse">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0">
        <div className="h-8 w-8 rounded-md bg-muted/40" />
        <div className="h-4 w-28 rounded bg-muted/40" />
        <div className="flex-1" />
        <div className="h-8 w-24 rounded-md bg-muted/40" />
        <div className="h-8 w-28 rounded-md bg-muted/40" />
        <div className="h-8 w-24 rounded-md bg-muted/40" />
        <div className="h-8 w-20 rounded-md bg-muted" />
      </div>
      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {/* Title input */}
          <div className="h-9 w-72 rounded bg-muted" />
          {/* Editor placeholder */}
          <div className="rounded-md border bg-card p-4 space-y-3">
            <div className="h-4 w-full rounded bg-muted/40" />
            <div className="h-4 w-4/5 rounded bg-muted/40" />
            <div className="h-4 w-full rounded bg-muted/40" />
            <div className="h-4 w-2/3 rounded bg-muted/40" />
            <div className="h-32 w-0" />
          </div>
        </div>
      </div>
      {/* Bottom metadata bar */}
      <div className="border-t shrink-0 px-4 py-2">
        <div className="h-4 w-32 rounded bg-muted/40" />
      </div>
    </div>
  );
}
