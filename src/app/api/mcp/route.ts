import { NextRequest, NextResponse } from "next/server";
import { authenticateRawKey, logApiCall, type ApiKeyContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JSONContent } from "@tiptap/react";

// ─── MCP Tool Definitions ──────────────────────────────────────────────────

const TOOLS = [
  {
    name: "bossboard_get_context",
    description:
      "Get the business context including company name, type, SOP count, recent documents, and agent notes. Use this first to understand the business before taking actions.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "bossboard_list_sops",
    description:
      "List all SOPs/documents in the business wiki. Can filter by folder, document type (sop, note, policy), or status (draft, published, archived).",
    inputSchema: {
      type: "object" as const,
      properties: {
        folder_id: { type: "string", description: "Filter by folder UUID" },
        type: { type: "string", enum: ["sop", "note", "policy"], description: "Filter by document type" },
        status: { type: "string", enum: ["draft", "published", "archived"], description: "Filter by status" },
        limit: { type: "number", description: "Max results (default 50, max 100)" },
      },
    },
  },
  {
    name: "bossboard_get_sop",
    description:
      "Get the full content of a specific SOP/document by ID. Returns title, content as markdown, metadata, and tags.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The SOP/document UUID" },
      },
      required: ["id"],
    },
  },
  {
    name: "bossboard_create_sop",
    description:
      "Create a new SOP/document in the business wiki. Content should be in plain text or markdown format.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Document title" },
        content: { type: "string", description: "Document content in markdown/plain text" },
        type: { type: "string", enum: ["sop", "note", "policy"], description: "Document type (default: sop)" },
        folder_id: { type: "string", description: "Folder UUID to place the document in" },
        status: { type: "string", enum: ["draft", "published"], description: "Status (default: published)" },
      },
      required: ["title"],
    },
  },
  {
    name: "bossboard_update_sop",
    description:
      "Update an existing SOP/document. You can update title, content, status, type, or folder.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The SOP/document UUID to update" },
        title: { type: "string", description: "New title" },
        content: { type: "string", description: "New content in markdown/plain text" },
        type: { type: "string", enum: ["sop", "note", "policy"], description: "New document type" },
        status: { type: "string", enum: ["draft", "published", "archived"], description: "New status" },
        folder_id: { type: "string", description: "New folder UUID (null to unfile)" },
      },
      required: ["id"],
    },
  },
  {
    name: "bossboard_write_note",
    description:
      "Write a note to the business context memory. Use this to record learned facts, observations, or reminders about the business that should persist across conversations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: { type: "string", description: "The note content (max 2000 chars)" },
      },
      required: ["content"],
    },
  },
  {
    name: "bossboard_search",
    description:
      "Search across all documents in the wiki by keyword or natural language question. Returns matching documents and optionally an AI-generated answer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query or question" },
        ai_answer: { type: "boolean", description: "Set true to get an AI-generated answer from matching documents (costs credits)" },
      },
      required: ["query"],
    },
  },
];

// ─── Tool Handlers ─────────────────────────────────────────────────────────

function tiptapToMarkdown(content: JSONContent | null): string {
  if (!content?.content) return "";
  const lines: string[] = [];
  for (const node of content.content) {
    if (node.type === "heading") {
      const level = node.attrs?.level ?? 1;
      const text = node.content?.map((c) => c.text || "").join("") || "";
      lines.push(`${"#".repeat(level)} ${text}`);
    } else if (node.type === "paragraph") {
      lines.push(node.content?.map((c) => c.text || "").join("") || "");
    } else if (node.type === "bulletList") {
      for (const item of node.content ?? []) {
        lines.push(`- ${item.content?.[0]?.content?.map((c) => c.text || "").join("") || ""}`);
      }
    } else if (node.type === "orderedList") {
      let i = 1;
      for (const item of node.content ?? []) {
        lines.push(`${i++}. ${item.content?.[0]?.content?.map((c) => c.text || "").join("") || ""}`);
      }
    }
  }
  return lines.join("\n");
}

function textToTiptap(text: string): JSONContent {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line.trim() ? [{ type: "text", text: line }] : [],
    })),
  };
}

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  auth: ApiKeyContext
): Promise<unknown> {
  const admin = createAdminClient();

  switch (toolName) {
    case "bossboard_get_context": {
      const [{ data: business }, { count: sopCount }, { data: recent }, { data: notes }] =
        await Promise.all([
          admin.from("businesses").select("name, type, address, menu_or_services, brand_tone, target_customers").eq("id", auth.businessId).single(),
          admin.from("sops").select("id", { count: "exact", head: true }).eq("business_id", auth.businessId).is("deleted_at", null),
          admin.from("sops").select("id, title, doc_type, updated_at").eq("business_id", auth.businessId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(5),
          admin.from("agent_notes").select("content, created_at").eq("business_id", auth.businessId).order("created_at", { ascending: false }).limit(10),
        ]);
      return { business, sopCount, recentDocuments: recent, agentNotes: notes };
    }

    case "bossboard_list_sops": {
      let q = admin.from("sops").select("id, title, summary, doc_type, status, folder_id, updated_at").eq("business_id", auth.businessId).is("deleted_at", null);
      if (args.folder_id) q = q.eq("folder_id", args.folder_id as string);
      if (args.type) q = q.eq("doc_type", args.type as string);
      if (args.status) q = q.eq("status", args.status as string);
      const { data } = await q.order("updated_at", { ascending: false }).limit(Math.min(Number(args.limit) || 50, 100));
      return { sops: data ?? [] };
    }

    case "bossboard_get_sop": {
      const { data } = await admin.from("sops").select("id, title, content, summary, doc_type, status, category, tags, version, created_at, updated_at").eq("id", args.id as string).eq("business_id", auth.businessId).is("deleted_at", null).single();
      if (!data) return { error: "SOP not found" };
      return { ...data, content_markdown: tiptapToMarkdown(data.content) };
    }

    case "bossboard_create_sop": {
      const content = args.content ? textToTiptap(args.content as string) : null;
      const { data, error } = await admin.from("sops").insert({
        business_id: auth.businessId,
        title: (args.title as string).trim(),
        content,
        summary: args.content ? (args.content as string).substring(0, 200).replace(/\n/g, " ").trim() : null,
        doc_type: (args.type as string) || "sop",
        folder_id: (args.folder_id as string) || null,
        status: (args.status as string) || "published",
        version: 1,
      }).select("id, title, doc_type, status, created_at").single();
      if (error) return { error: error.message };
      return data;
    }

    case "bossboard_update_sop": {
      const { data: existing } = await admin.from("sops").select("id").eq("id", args.id as string).eq("business_id", auth.businessId).single();
      if (!existing) return { error: "SOP not found" };
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.title) updates.title = (args.title as string).trim();
      if (args.status) updates.status = args.status;
      if (args.type) updates.doc_type = args.type;
      if (args.folder_id !== undefined) updates.folder_id = args.folder_id || null;
      if (args.content) {
        updates.content = textToTiptap(args.content as string);
        updates.summary = (args.content as string).substring(0, 200).replace(/\n/g, " ").trim();
      }
      const { data, error } = await admin.from("sops").update(updates).eq("id", args.id as string).select("id, title, doc_type, status, updated_at").single();
      if (error) return { error: error.message };
      return data;
    }

    case "bossboard_write_note": {
      const { data, error } = await admin.from("agent_notes").insert({
        business_id: auth.businessId,
        api_key_id: auth.apiKeyId,
        content: (args.content as string).trim().substring(0, 2000),
      }).select("id, content, created_at").single();
      if (error) return { error: error.message };
      return data;
    }

    case "bossboard_search": {
      const query = args.query as string;
      const mode = args.ai_answer ? "ai" : "text";
      const words = query.split(/\s+/).filter(Boolean);
      const tsQuery = words.map((w) => `${w}:*`).join(" & ");

      // Try RPC first, fallback to ILIKE
      const { data: results, error } = await admin.rpc("search_sops", {
        p_business_id: auth.businessId,
        p_query: query,
        p_ts_query: tsQuery,
        p_limit: 20,
      });

      let searchResults = results;
      if (error) {
        const { data: fallback } = await admin.from("sops").select("id, title, summary, doc_type, status, updated_at").eq("business_id", auth.businessId).is("deleted_at", null).or(`title.ilike.%${query}%,summary.ilike.%${query}%`).order("updated_at", { ascending: false }).limit(20);
        searchResults = fallback;
      }

      if (mode !== "ai") return { results: searchResults ?? [] };

      // AI answer
      if (!searchResults || searchResults.length === 0) {
        return { results: [], aiAnswer: "No relevant documents found." };
      }

      const context = (searchResults as Array<{ title: string; summary: string | null }>)
        .slice(0, 5)
        .map((r, i) => `[Document ${i + 1}: ${r.title}]\n${r.summary || "(no summary)"}`)
        .join("\n\n");

      try {
        const { generateText } = await import("ai");
        const { anthropic } = await import("@ai-sdk/anthropic");
        const result = await generateText({
          model: anthropic("claude-sonnet-4-20250514"),
          system: "Answer based ONLY on the provided document context. Be concise (2-4 sentences). Reference document titles.",
          prompt: `Question: ${query}\n\nContext:\n${context}`,
        });
        return {
          results: searchResults,
          aiAnswer: result.text,
          sources: (searchResults as Array<{ id: string; title: string }>).slice(0, 5).map((r) => ({ id: r.id, title: r.title })),
        };
      } catch {
        return { results: searchResults, aiAnswer: null, aiError: "AI unavailable" };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── MCP JSON-RPC Handler ──────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

function jsonRpcResponse(id: string | number, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (body.jsonrpc !== "2.0" || !body.method || body.id === undefined) {
    return jsonRpcError(body?.id ?? null, -32600, "Invalid JSON-RPC request");
  }

  const { id, method, params } = body;

  // ── initialize ────────────────────────────────────────────────────────
  if (method === "initialize") {
    return jsonRpcResponse(id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "bossboard-mcp", version: "1.0.0" },
      capabilities: { tools: {} },
    });
  }

  // ── tools/list ────────────────────────────────────────────────────────
  if (method === "tools/list") {
    return jsonRpcResponse(id, { tools: TOOLS });
  }

  // ── tools/call ────────────────────────────────────────────────────────
  if (method === "tools/call") {
    const toolName = params?.name as string;
    const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;
    const apiKey = (params?.api_key ?? req.headers.get("x-api-key") ?? "") as string;

    if (!toolName) {
      return jsonRpcError(id, -32602, "Missing params.name");
    }

    if (!TOOLS.find((t) => t.name === toolName)) {
      return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
    }

    // Authenticate
    const auth = await authenticateRawKey(apiKey);
    if (!auth) {
      return jsonRpcError(id, -32001, "Invalid API key. Pass api_key in params or x-api-key header.");
    }

    try {
      const result = await handleToolCall(toolName, toolArgs, auth);

      // Log the call
      logApiCall(auth.businessId, auth.apiKeyId, `mcp/${toolName}`, "POST", 200);

      return jsonRpcResponse(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    } catch (err) {
      logApiCall(auth.businessId, auth.apiKeyId, `mcp/${toolName}`, "POST", 500);
      return jsonRpcError(id, -32000, err instanceof Error ? err.message : "Tool execution failed");
    }
  }

  // ── notifications/initialized ─────────────────────────────────────────
  if (method === "notifications/initialized") {
    return jsonRpcResponse(id, {});
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}
