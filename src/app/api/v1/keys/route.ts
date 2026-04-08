import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashKey } from "@/lib/api/auth";
import { z } from "zod/v4";

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
  businessId: z.uuid(),
});

// Generate a new API key (requires session auth, not API key)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { name, businessId } = parsed.data;

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
  } catch (error) {
    console.error("API keys POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// List API keys (session auth)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only return keys for businesses owned by the current user
    const { data: userBusinesses } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id);

    const businessIds = (userBusinesses ?? []).map((b: { id: string }) => b.id);

    if (businessIds.length === 0) {
      return NextResponse.json({ keys: [] });
    }

    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, business_id")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false });

    return NextResponse.json({ keys: data ?? [] });
  } catch (error) {
    console.error("API keys GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete an API key (session auth)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");
    if (!keyId) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Verify the key belongs to a business owned by the current user
    const { data: keyRecord } = await supabase
      .from("api_keys")
      .select("id, business_id")
      .eq("id", keyId)
      .single();

    if (!keyRecord) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", keyRecord.business_id)
      .eq("user_id", user.id)
      .single();

    if (!biz) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { error } = await supabase.from("api_keys").delete().eq("id", keyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API keys DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
