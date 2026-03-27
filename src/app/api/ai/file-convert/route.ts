import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit, CREDIT_COSTS } from "@/lib/ai/credits";
import { buildBusinessContext, BUSINESS_PROFILE_SELECT } from "@/lib/ai/business-context";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

const SYSTEM_PROMPT_TEXT = `You are an expert business documentation specialist. The user has uploaded a document. Your job is to convert it into clean, well-structured text while PRESERVING the document's original intent and format.

STEP 1 — Detect the document type. Read the content carefully and determine what it is:
- PROCEDURE/SOP: step-by-step instructions, how-to guides, manuals, checklists, recipes
- POLICY: rules, regulations, compliance documents, terms, guidelines
- REPORT: business plans, analyses, summaries, meeting notes, proposals
- REFERENCE: specifications, data sheets, catalogs, lists, tables
- OTHER: anything that doesn't fit the above

STEP 2 — Convert according to type:

If PROCEDURE/SOP:
  1. Title
  2. Purpose (1-2 sentences)
  3. Scope (who this applies to)
  4. Step-by-step procedure (numbered, clear, actionable)
  5. Safety/compliance notes (if applicable)
  6. Checklist summary (extractable items)

If POLICY:
  1. Title
  2. Effective date / version (if found)
  3. Purpose
  4. Policy statement (preserve original sections and numbering)
  5. Key requirements (bulleted)
  6. Compliance notes

If REPORT or REFERENCE or OTHER:
  1. Title
  2. Summary (2-3 sentences capturing the main point)
  3. Body (preserve the original document's sections, headings, and structure)
  4. Key takeaways (bulleted, if applicable)

RULES:
- Preserve ALL original information. Do not invent content.
- Keep the document's original section structure when it has one.
- Do NOT force every document into SOP/checklist format.
- Do NOT use markdown headers with #. Use plain numbered sections or bold text for headings.
- Write the content directly without any preamble like "Here is the converted document".
- Keep language simple and clear.`;

const SYSTEM_PROMPT_IMAGE = `You are an expert business documentation specialist. The user has uploaded an image. Analyze it carefully and produce clean, structured text.

STEP 1 — Determine what the image contains:
A) Text-heavy image (document scan, screenshot, whiteboard, sign, label, menu, form)
B) Diagram/flowchart (process flow, org chart, decision tree)
C) Photo with some text (workplace photo with signage, product with instructions)
D) Photo without text (workplace, equipment, location)

STEP 2 — Convert according to what you find:

If A (text-heavy): Extract ALL text accurately, preserving the original layout and structure. If it's a procedure, format as SOP steps. If it's a general document, preserve its original structure.

If B (diagram/flowchart): Describe the process flow as numbered steps. Note connections and decision points. Include any text labels from the diagram.

If C (photo with some text): Extract all visible text. Then briefly describe the relevant visual context (what the text is on, the setting).

If D (photo without text): Describe what's in the image — objects, setting, equipment, conditions. Frame it as a useful reference note for the business.

RULES:
- Extract text ACCURATELY — do not paraphrase or summarize text that's clearly readable.
- Do NOT force images into SOP/checklist format unless the content is clearly a procedure.
- Do NOT use markdown headers with #. Use plain numbered sections or bold text.
- Write the content directly without preamble.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const businessId = formData.get("businessId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
  }

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload PDF, JPG, PNG, or WebP." },
      { status: 400 }
    );
  }

  // Resolve business ID
  let resolvedBusinessId = businessId;
  if (!resolvedBusinessId) {
    const { data: userBusinesses } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (userBusinesses && userBusinesses.length > 0) {
      resolvedBusinessId = userBusinesses[0].id;
    } else {
      return NextResponse.json(
        { error: "No business found. Please complete onboarding first." },
        { status: 400 }
      );
    }
  }

  // Credit check
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "starter" | "pro" | "business") ?? "free";
  const cost = CREDIT_COSTS.file_convert;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: "AI credit limit reached. Please upgrade your plan." },
      { status: 429 }
    );
  }

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload original file to Supabase Storage
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storagePath = `${resolvedBusinessId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("wiki-uploads")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file. " + uploadError.message },
      { status: 500 }
    );
  }

  // Get business context
  const { data: business } = await supabase
    .from("businesses")
    .select(BUSINESS_PROFILE_SELECT)
    .eq("id", resolvedBusinessId)
    .single();

  const businessContext = buildBusinessContext(business ?? {});

  try {
    let resultText: string;

    if (fileType === "image") {
      // Vision: send image directly to Claude
      const base64 = buffer.toString("base64");
      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: base64,
              },
              {
                type: "text",
                text: `${businessContext}\n\n${SYSTEM_PROMPT_IMAGE}\n\nAnalyze this image and convert its content into structured text.`,
              },
            ],
          },
        ],
      });
      resultText = result.text;
    } else {
      // PDF: extract text first, then send to Claude
      // @ts-expect-error pdf-parse has no type declarations
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);
      const extractedText = pdfData.text?.trim();

      if (!extractedText) {
        return NextResponse.json(
          { error: "Could not extract text from this PDF. It may be scanned/image-based." },
          { status: 400 }
        );
      }

      const sanitizedText = extractedText
        .substring(0, 15000)
        .replace(/```/g, "")
        .replace(/system:/gi, "")
        .replace(/\bignore\b.*\binstructions?\b/gi, "")
        .trim();

      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        system: `${businessContext}\n\n${SYSTEM_PROMPT_TEXT}`,
        prompt: `Here is the uploaded document content. Detect its type and convert accordingly:\n\n${sanitizedText}`,
      });
      resultText = result.text;
    }

    if (!resultText?.trim()) {
      return NextResponse.json(
        { error: "AI returned empty response. Please try again." },
        { status: 500 }
      );
    }

    // Auto-detect suggested doc type from the converted content
    let suggestedDocType = "note";
    if (/step[- ]by[- ]step|procedure|checklist summary|safety.?compliance/i.test(resultText)) {
      suggestedDocType = "sop";
    } else if (/policy statement|compliance|effective date|regulation/i.test(resultText)) {
      suggestedDocType = "policy";
    }

    // Deduct credits (fire-and-forget)
    deductCredit(user.id, resolvedBusinessId!, "file_convert", cost).catch(console.error);

    return NextResponse.json({
      text: resultText,
      fileUrl: storagePath,
      fileName: file.name,
      suggestedDocType,
    });
  } catch (error) {
    console.error("File convert error:", error);
    return NextResponse.json(
      { error: `AI conversion failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
