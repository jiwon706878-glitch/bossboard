import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JSONContent } from "@tiptap/react";

function tiptapToMarkdown(content: JSONContent | null): string {
  if (!content?.content) return "";

  const lines: string[] = [];
  for (const node of content.content) {
    if (node.type === "heading") {
      const level = node.attrs?.level ?? 1;
      const text = node.content?.map((c) => c.text || "").join("") || "";
      lines.push(`${"#".repeat(level)} ${text}`);
    } else if (node.type === "paragraph") {
      const text = node.content?.map((c) => c.text || "").join("") || "";
      lines.push(text);
    } else if (node.type === "bulletList") {
      for (const item of node.content ?? []) {
        const text = item.content?.[0]?.content?.map((c) => c.text || "").join("") || "";
        lines.push(`- ${text}`);
      }
    } else if (node.type === "orderedList") {
      let i = 1;
      for (const item of node.content ?? []) {
        const text = item.content?.[0]?.content?.map((c) => c.text || "").join("") || "";
        lines.push(`${i}. ${text}`);
        i++;
      }
    } else if (node.type === "taskList") {
      for (const item of node.content ?? []) {
        const checked = item.attrs?.checked ? "x" : " ";
        const text = item.content?.[0]?.content?.map((c) => c.text || "").join("") || "";
        lines.push(`- [${checked}] ${text}`);
      }
    }
  }
  return lines.join("\n");
}

// GET /api/v1/sops/:id — Full SOP as markdown
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sops")
    .select("id, title, content, summary, doc_type, status, category, tags, version, created_at, updated_at")
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  logApiCall(auth.businessId, auth.apiKeyId, `/api/v1/sops/${id}`, "GET", 200);

  return NextResponse.json({
    ...data,
    content_markdown: tiptapToMarkdown(data.content),
  });
}

// PUT /api/v1/sops/:id — Update SOP
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  // Verify SOP belongs to this business
  const { data: existing } = await admin
    .from("sops")
    .select("id")
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title) updates.title = body.title.trim();
  if (body.status) updates.status = body.status;
  if (body.type) updates.doc_type = body.type;
  if (body.folder_id !== undefined) updates.folder_id = body.folder_id || null;

  if (body.content) {
    updates.content = {
      type: "doc",
      content: body.content.split("\n").map((line: string) => ({
        type: "paragraph",
        content: line.trim() ? [{ type: "text", text: line }] : [],
      })),
    };
    updates.summary = body.content.substring(0, 200).replace(/\n/g, " ").trim();
  }

  const { data, error } = await admin
    .from("sops")
    .update(updates)
    .eq("id", id)
    .select("id, title, doc_type, status, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logApiCall(auth.businessId, auth.apiKeyId, `/api/v1/sops/${id}`, "PUT", 200);
  return NextResponse.json(data);
}
