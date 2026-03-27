import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashKey } from "@/lib/api/auth";

// Generate a new API key (requires session auth, not API key)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, businessId } = await req.json();
  if (!name || !businessId) {
    return NextResponse.json({ error: "name and businessId required" }, { status: 400 });
  }

  // Verify ownership
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!biz) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // Generate key
  const rawKey = `bb_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 10);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      business_id: businessId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: name.trim(),
      created_by: user.id,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the raw key ONCE — it can never be retrieved again
  return NextResponse.json({ key: rawKey, ...data }, { status: 201 });
}

// List API keys (session auth)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at")
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

// Delete an API key (session auth)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");
  if (!keyId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("api_keys").delete().eq("id", keyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
