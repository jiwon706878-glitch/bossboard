import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  source: z.string().max(64).optional(),
});

const WAITLIST_CAP = 200;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { count, error: countError } = await supabase
    .from("mac_waitlist")
    .select("*", { count: "exact", head: true });

  if (countError && countError.code !== "PGRST116") {
    // 42P01 = relation does not exist (migration not applied yet)
    if (countError.code === "42P01") {
      return NextResponse.json(
        { error: "waitlist_not_ready", hint: "Run supabase migration 20260427300000_v4_mac_waitlist.sql" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const current = count ?? 0;
  if (current >= WAITLIST_CAP) {
    return NextResponse.json({ error: "waitlist_full" }, { status: 403 });
  }

  const { error: insertError } = await supabase.from("mac_waitlist").insert({
    email: parsed.data.email.toLowerCase(),
    source: parsed.data.source ?? "landing",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, alreadyOnList: true });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, position: current + 1 });
}

export async function GET() {
  const supabase = await createServerClient();
  const { count, error } = await supabase
    .from("mac_waitlist")
    .select("*", { count: "exact", head: true });
  if (error) {
    return NextResponse.json({ count: 0, cap: WAITLIST_CAP });
  }
  return NextResponse.json({ count: count ?? 0, cap: WAITLIST_CAP });
}
