import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt: "Say hello in one sentence.",
    });
    return NextResponse.json({ success: true, text: result.text });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
