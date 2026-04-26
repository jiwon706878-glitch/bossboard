import { NextResponse } from "next/server";

/**
 * Vercel Cron entrypoint. Forwards Authorization to the
 * /api/admin/telegram-summary handler so the bearer-token check there
 * remains the single source of truth.
 *
 * Vercel sets `Authorization: Bearer <CRON_SECRET>` automatically when
 * scheduling crons configured via `vercel.json`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = `${url.origin}/api/admin/telegram-summary`;

  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "missing_auth" }, { status: 401 });
  }

  const res = await fetch(target, {
    method: "POST",
    headers: { Authorization: auth },
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
