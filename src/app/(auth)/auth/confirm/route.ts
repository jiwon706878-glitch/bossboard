import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "recovery",
    });

    if (!error) {
      // Send welcome email on first signup confirmation
      if (type === "signup" && data.user?.email) {
        const name = data.user.user_metadata?.full_name as string | undefined;
        sendEmail({
          to: data.user.email,
          subject: "Welcome to BossBoard",
          html: welcomeEmailHtml({ name }),
        }); // fire-and-forget — don't block redirect
      }

      // Redirect recovery to reset-password page, others to confirmed
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}/auth/confirmed`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_token`);
}
