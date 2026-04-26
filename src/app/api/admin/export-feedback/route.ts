import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin-check";

const HEADERS = [
  "id",
  "type",
  "priority",
  "status",
  "subject",
  "body",
  "os",
  "app_version",
  "user_email",
  "created_at",
] as const;

type FeedbackRow = Partial<Record<(typeof HEADERS)[number], unknown>>;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * GET /api/admin/export-feedback
 * Returns the feedback queue as a CSV download for the /admin/launch
 * dashboard. Admin-gated: 403 to anyone not on the allow-list.
 *
 * Reads through the admin_list_feedback RPC (priority null = all,
 * limit 1000). Defers to the SQL function for status/priority
 * sorting so the CSV order matches the dashboard.
 */
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data, error } = await supabase.rpc("admin_list_feedback", {
    p_priority: null,
    p_limit: 1000,
  });

  if (error) {
    if (error.code === "42883") {
      return new NextResponse(
        "admin_list_feedback RPC isn't deployed. Run supabase migration 20260427400000_v4_admin_stats.sql.",
        { status: 503 },
      );
    }
    return new NextResponse(error.message, { status: 500 });
  }

  if (data && typeof data === "object" && "error" in data) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const rows: FeedbackRow[] = Array.isArray(data) ? (data as FeedbackRow[]) : [];

  const csvLines = [
    HEADERS.join(","),
    ...rows.map((row) => HEADERS.map((h) => csvEscape(row[h])).join(",")),
  ];
  const csv = csvLines.join("\n");

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="feedback-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
