import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 10_000_000) {
    return NextResponse.json({ error: "File too large. Max file size: 10MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();

  try {
    if (ext === "pdf") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
      const buffer = Buffer.from(await file.arrayBuffer());
      const data = await pdfParse(buffer);
      return NextResponse.json({ text: data.text });
    }

    return NextResponse.json(
      { error: "Unsupported format. Use the client-side handler for TXT, MD, CSV, DOCX." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Text extraction error:", error);
    return NextResponse.json(
      { error: `Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
