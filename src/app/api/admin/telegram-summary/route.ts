import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin-check";

interface AdminStats {
  total_users?: number;
  active_today?: number;
  by_os?: Record<string, number>;
  active_by_os?: Record<string, number>;
  by_plan?: Record<string, number>;
  mac_waitlist_count?: number;
  first_hundred_count?: number;
  feedback_pending?: number;
  feedback_critical?: number;
  errors_24h?: number;
  panics_24h?: number;
  error?: string;
}

/**
 * Sends the current admin_get_stats snapshot to Telegram. Auth comes from
 * one of two sources:
 *   - Signed-in admin user (manual "Send to Telegram" button), OR
 *   - Bearer CRON_SECRET in the Authorization header (Vercel Cron).
 *
 * Required env: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID.
 * Optional env: CRON_SECRET (for the cron path).
 */
export async function POST(req: Request) {
  if (!(await assertAuthorized(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "telegram_not_configured", hint: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID env vars." },
      { status: 503 },
    );
  }

  const supabase = await createServerClient();
  const { data, error: rpcError } = await supabase.rpc("admin_get_stats");
  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }
  const stats = data as AdminStats;
  if (stats.error === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const message = formatSummary(stats);

  const tgRes = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!tgRes.ok) {
    const tgBody = await tgRes.text().catch(() => "");
    return NextResponse.json(
      { error: `telegram_send_failed: ${tgBody.slice(0, 200)}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}

async function assertAuthorized(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdmin(user?.email ?? null);
}

function formatSummary(s: AdminStats): string {
  const byOs = s.by_os ?? {};
  const byPlan = s.by_plan ?? {};
  const mac = byOs.mac ?? 0;
  return `🤖 *BossBoard Admin Daily Summary*

📊 *Users*: ${s.total_users ?? 0} total · ${s.active_today ?? 0} active today

💻 *By OS:*
  • Windows: ${byOs.windows ?? 0} (${(s.active_by_os ?? {}).windows ?? 0} active)
  • macOS: ${mac === 0 ? `0 (waitlist: ${s.mac_waitlist_count ?? 0})` : mac}
  • Linux: ${byOs.linux ?? 0}

💰 *Plans:*
  • Free: ${byPlan.free ?? 0}
  • Starter: ${byPlan.starter ?? 0}
  • Pro: ${byPlan.pro ?? 0}
  • Business: ${byPlan.business ?? 0}

🎉 *Beta:*
  • First-100 used: ${s.first_hundred_count ?? 0}/100

🚨 *Issues:*
  • Critical: ${s.feedback_critical ?? 0}
  • Pending: ${s.feedback_pending ?? 0}
  • Errors (24h): ${s.errors_24h ?? 0}
  • Panics (24h): ${s.panics_24h ?? 0}

[Open Admin Dashboard](https://mybossboard.com/admin)`.trim();
}
