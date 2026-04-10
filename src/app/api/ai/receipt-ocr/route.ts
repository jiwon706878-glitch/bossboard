import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit, CREDIT_COSTS } from "@/lib/ai/credits";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`receipt-ocr:${user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute." },
      { status: 429 }
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data. Send a multipart form with an image file." },
      { status: 400 }
    );
  }

  const file = formData.get("image") as File | null;
  const businessId = formData.get("businessId") as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Image file is required (field name: 'image')." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image must be under 10 MB." },
      { status: 400 }
    );
  }

  // Resolve and verify business ownership
  let resolvedBusinessId = businessId;
  if (!resolvedBusinessId || typeof resolvedBusinessId !== "string") {
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
  } else {
    const [{ data: ownedBiz }, { data: membership }] = await Promise.all([
      supabase
        .from("businesses")
        .select("id")
        .eq("id", resolvedBusinessId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("business_members")
        .select("user_id")
        .eq("business_id", resolvedBusinessId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (!ownedBiz && !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Credit check
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId =
    (profile?.plan_id as "free" | "starter" | "pro" | "business") ?? "free";

  const cost = CREDIT_COSTS.receipt_ocr;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: "AI credit limit reached. Please upgrade your plan." },
      { status: 429 }
    );
  }

  // Convert image to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: buffer,
            },
            {
              type: "text",
              text: `Extract all data from this receipt. Respond ONLY with valid JSON (no markdown fences, no extra text). Use this exact schema:
{
  "date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "currency": "USD" or detected currency code,
  "vendor": "string or null",
  "category": "food" | "supplies" | "transport" | "utilities" | "services" | "equipment" | "other",
  "items": [
    { "name": "string", "quantity": number, "unit_price": number, "total": number }
  ]
}
Use null for unreadable or missing fields. Return an empty items array if individual line items cannot be read.`,
            },
          ],
        },
      ],
    });

    // Parse the JSON response
    let receiptData;
    try {
      const cleaned = result.text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      receiptData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse receipt data from AI response.",
          raw: result.text,
        },
        { status: 502 }
      );
    }

    // Insert into receipts table
    const { data: receipt, error: insertError } = await supabase
      .from("receipts")
      .insert({
        business_id: resolvedBusinessId,
        user_id: user.id,
        date: receiptData.date || null,
        total_amount: receiptData.total_amount ?? null,
        currency: receiptData.currency || "USD",
        vendor: receiptData.vendor || null,
        category: receiptData.category || "other",
        items: receiptData.items || [],
      })
      .select("id, date, total_amount, currency, vendor, category, items, created_at")
      .single();

    if (insertError) {
      console.error("Receipt insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save receipt data." },
        { status: 500 }
      );
    }

    // Deduct credit on success
    deductCredit(user.id, resolvedBusinessId!, "receipt_ocr", cost).catch(
      console.error
    );

    return NextResponse.json({ receipt });
  } catch (error) {
    console.error("Receipt OCR error:", error);
    return NextResponse.json(
      {
        error: `Receipt OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
