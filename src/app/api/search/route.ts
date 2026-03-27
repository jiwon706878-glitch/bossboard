import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const businessId = searchParams.get("businessId");
  const mode = searchParams.get("mode"); // "text" or "ai"

  if (!query || !businessId) {
    return NextResponse.json({ error: "q and businessId required" }, { status: 400 });
  }

  // Full-text search using trigram similarity for partial matches + ts_rank for full-text
  const words = query.split(/\s+/).filter(Boolean);
  const tsQuery = words.map((w) => `${w}:*`).join(" & ");

  const { data: results, error } = await supabase
    .rpc("search_sops", {
      p_business_id: businessId,
      p_query: query,
      p_ts_query: tsQuery,
      p_limit: 20,
    });

  // Fallback: if RPC doesn't exist, do simple ILIKE search
  let searchResults = results;
  if (error) {
    const { data: fallback } = await supabase
      .from("sops")
      .select("id, title, summary, doc_type, status, updated_at")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .order("updated_at", { ascending: false })
      .limit(20);
    searchResults = fallback;
  }

  if (mode !== "ai") {
    return NextResponse.json({ results: searchResults ?? [] });
  }

  // AI mode: answer the question using document context
  if (!searchResults || searchResults.length === 0) {
    return NextResponse.json({
      results: [],
      aiAnswer: "No relevant documents found to answer this question.",
    });
  }

  // Build context from top results
  const context = (searchResults as Array<{ id: string; title: string; summary: string | null }>)
    .slice(0, 5)
    .map((r, i) => `[Document ${i + 1}: ${r.title}]\n${r.summary || "(no summary)"}`)
    .join("\n\n");

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `You are a helpful assistant answering questions about a company's internal documents and SOPs. Answer based ONLY on the provided document context. If the context doesn't contain enough information, say so. Keep answers concise (2-4 sentences). Reference the document title when citing information.`,
      prompt: `Question: ${query}\n\nDocument context:\n${context}`,
    });

    return NextResponse.json({
      results: searchResults,
      aiAnswer: result.text,
      sources: (searchResults as Array<{ id: string; title: string }>).slice(0, 5).map((r) => ({
        id: r.id,
        title: r.title,
      })),
    });
  } catch (aiError) {
    console.error("AI search error:", aiError);
    return NextResponse.json({
      results: searchResults,
      aiAnswer: null,
      aiError: "AI search temporarily unavailable",
    });
  }
}
