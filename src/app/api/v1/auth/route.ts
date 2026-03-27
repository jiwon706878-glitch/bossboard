import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";

// POST /api/v1/auth — Validate API key
export async function POST(req: NextRequest) {
  const result = await authenticateApiKey(req);
  if (result instanceof NextResponse) return result;

  logApiCall(result.businessId, result.apiKeyId, "/api/v1/auth", "POST", 200);
  return NextResponse.json({ authenticated: true, businessId: result.businessId });
}
