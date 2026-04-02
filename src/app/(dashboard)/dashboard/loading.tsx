export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg border bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-lg border bg-muted/40" />
        <div className="h-48 rounded-lg border bg-muted/40" />
      </div>
    </div>
  );
}