export default function Loading() {
  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-4rem)] overflow-hidden animate-pulse">
      <div className="hidden lg:flex lg:w-60 border-r bg-card p-4 space-y-3">
        <div className="h-5 w-20 rounded bg-muted" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 rounded bg-muted/60" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-md border bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  );
}