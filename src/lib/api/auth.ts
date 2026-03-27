import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ApiKeyContext {
  businessId: string;
  apiKeyId: string;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiKeyContext | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Use: Bearer <api_key>" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey || apiKey.length < 20) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const keyHash = await hashKey(apiKey);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .select("id, business_id")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Update last_used_at (fire-and-forget)
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return { businessId: data.business_id, apiKeyId: data.id };
}

export async function logApiCall(
  businessId: string,
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number
) {
  const admin = createAdminClient();
  admin
    .from("agent_activity_log")
    .insert({ business_id: businessId, api_key_id: apiKeyId, endpoint, method, status_code: statusCode })
    .then(() => {});
}

export async function authenticateRawKey(
  apiKey: string
): Promise<ApiKeyContext | null> {
  if (!apiKey || apiKey.length < 20) return null;

  const keyHash = await hashKey(apiKey);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .select("id, business_id")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) return null;

  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return { businessId: data.business_id, apiKeyId: data.id };
}

export { hashKey };
