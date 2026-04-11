import type { JSONContent } from "@tiptap/react";
import { createAdminClient } from "@/lib/supabase/admin";
import { callAIWithFallback } from "./router";
import { tiptapToPlainText } from "./tiptap-text";
import { SchemaType, type ResponseSchema } from "./gemini";

/**
 * Gemini response schema for the indexer. Gemini's SDK enforces this
 * server-side so we get back a valid object without post-parsing
 * regexes. Claude fallback parses the JSON manually in router.ts.
 */
const INDEX_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "1-2 sentence summary of the document",
    },
    keywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "5-10 key terms that appear in the document",
    },
    synonyms: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "5-10 related terms NOT in the document that users might search for",
    },
  },
  required: ["summary", "keywords", "synonyms"],
};

interface IndexResult {
  summary: string;
  keywords: string[];
  synonyms: string[];
}

const MIN_CONTENT_CHARS = 100;
const MAX_PROMPT_CHARS = 4000;

/**
 * Generate + persist AI metadata for a single SOP. Only called from
 * background contexts — the dashboard and agent API POST to
 * /api/sops/[id]/reindex which runs this via the debounced queue.
 *
 * On success: writes ai_summary / ai_keywords / ai_synonyms /
 * ai_indexed_at and clears ai_index_pending.
 * On failure: just clears ai_index_pending so the page isn't stuck
 * in limbo — the next save will re-flag it.
 */
export async function indexSop(
  sopId: string,
  content: JSONContent | null,
  title: string
): Promise<void> {
  const plainText = tiptapToPlainText(content);
  if (plainText.length < MIN_CONTENT_CHARS) {
    // Too short to be worth indexing — but still clear the pending
    // flag so we don't reprocess on every save.
    const admin = createAdminClient();
    await admin
      .from("sops")
      .update({ ai_index_pending: false })
      .eq("id", sopId);
    return;
  }

  const prompt = `Analyze this document and extract metadata for search.

Title: ${title}
Content: ${plainText.slice(0, MAX_PROMPT_CHARS)}

Return JSON with:
- summary: 1-2 sentence summary
- keywords: 5-10 key terms FROM the document
- synonyms: 5-10 related terms NOT in document but users might search for`;

  try {
    const result = await callAIWithFallback<IndexResult>(prompt, {
      schema: INDEX_SCHEMA,
    });

    if (
      !result ||
      typeof result.summary !== "string" ||
      !Array.isArray(result.keywords) ||
      !Array.isArray(result.synonyms)
    ) {
      throw new Error("Indexer returned invalid shape");
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("sops")
      .update({
        ai_summary: result.summary.slice(0, 1000),
        ai_keywords: result.keywords.slice(0, 20).map((k) => String(k).slice(0, 60)),
        ai_synonyms: result.synonyms.slice(0, 20).map((k) => String(k).slice(0, 60)),
        ai_indexed_at: new Date().toISOString(),
        ai_index_pending: false,
      })
      .eq("id", sopId);

    if (error) {
      console.error("[auto-index] db update failed", sopId, error);
      return;
    }

    console.log(`[auto-index] indexed sop ${sopId}`);
  } catch (error) {
    console.error("[auto-index] failed for", sopId, error);
    const admin = createAdminClient();
    await admin
      .from("sops")
      .update({ ai_index_pending: false })
      .eq("id", sopId);
  }
}
