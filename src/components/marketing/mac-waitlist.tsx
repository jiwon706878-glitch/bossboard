"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Sparkles, Users, Check, Loader2 } from "lucide-react";

interface Status {
  count: number;
  cap: number;
}

export function MacWaitlist({ source = "download" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ alreadyOnList: boolean; position?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/waitlist/mac")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist/mac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.error === "waitlist_full") {
          setError("Waitlist is full (200 spots taken). Mac launch is close — follow @bossboard for updates.");
        } else if (body.error === "waitlist_not_ready") {
          setError("Mac waitlist isn't enabled yet. Try again after the next deploy.");
        } else {
          setError(body.error ?? `Signup failed (${res.status})`);
        }
        return;
      }
      setDone({
        alreadyOnList: !!body.alreadyOnList,
        position: body.position,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = status ? Math.max(0, status.cap - status.count) : null;

  if (done) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-1">
          <Check className="size-4" />
          {done.alreadyOnList ? "You're already on the list" : "You're on the list"}
        </div>
        <p className="text-sm text-muted-foreground">
          {done.position
            ? `You're #${done.position} on the Mac waitlist. We'll email you a 50% off first-year discount code when the Mac app ships.`
            : "We'll email you a 50% off first-year discount code when the Mac app ships."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-500/50 p-5 bg-gradient-to-br from-amber-500/5 to-purple-500/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-4 text-amber-600" />
        <h3 className="font-semibold">Mac Waitlist Reward</h3>
      </div>
      <p className="text-sm mb-4 text-muted-foreground">
        Join the Mac waitlist and get{" "}
        <strong className="text-amber-700 dark:text-amber-400">50% off your first year</strong>{" "}
        when the Mac app ships. Limited to first 200 waitlist members.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Get 50% off Mac launch"
          )}
        </button>
      </form>

      {status && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Users className="size-3" />
          <span>
            {status.count} {status.count === 1 ? "person" : "people"} waiting
            {remaining !== null && remaining > 0 && ` · ${remaining} ${remaining === 1 ? "spot" : "spots"} left`}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-300/50 dark:border-red-700/50 rounded text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
