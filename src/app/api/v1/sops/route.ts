import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/sops — List SOPs
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const admin = createAdminClient();
  let query = admin
    .from("sops")
    .select("id, title, summary, doc_type, status, folder_id, updated_at")
    .eq("business_id", auth.businessId)
    .is("deleted_at", null);

  if (folder) query = query.eq("folder_id", folder);
  if (type) query = query.eq("doc_type", type);
  if (status) query = query.eq("status", status);

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/sops", "GET", 200);
  return NextResponse.json({ sops: data ?? [] });
}

// POST /api/v1/sops — Create a new SOP
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const { title, content, type, folder_id, status: sopStatus } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const admin = createAdminClient();

  // Convert markdown content to TipTap JSON
  const tiptapContent = content
    ? {
        type: "doc",
        content: content.split("\n").map((line: string) => ({
          type: "paragraph",
          content: line.trim() ? [{ type: "text", text: line }] : [],
        })),
      }
    : null;

  const { data, error } = await admin
    .from("sops")
    .insert({
      business_id: auth.businessId,
      title: title.trim(),
      content: tiptapContent,
      summary: content?.substring(0, 200).replace(/\n/g, " ").trim() || null,
      doc_type: type || "sop",
      folder_id: folder_id || null,
      status: sopStatus || "published",
      version: 1,
    })
    .select("id, title, doc_type, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/sops", "POST", 201);
  return NextResponse.json(data, { status: 201 });
}
