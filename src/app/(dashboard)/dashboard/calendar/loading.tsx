export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
      <div className="h-80 rounded-md border bg-muted/40" />
    </div>
  );
}