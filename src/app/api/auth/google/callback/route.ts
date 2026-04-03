import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=google_auth_failed`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?error=google_auth_failed`);
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?error=google_auth_failed`);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ google_calendar_tokens: tokens })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to save Google tokens:", updateError.message);
      return NextResponse.redirect(`${appUrl}/dashboard/settings?error=google_auth_failed`);
    }

    return NextResponse.redirect(`${appUrl}/dashboard/calendar?connected=true`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=google_auth_failed`);
  }
}
