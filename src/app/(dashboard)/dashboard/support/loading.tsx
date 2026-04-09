export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-md bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
        </div>
        <div className="h-9 w-28 rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[72px] rounded-md border bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
