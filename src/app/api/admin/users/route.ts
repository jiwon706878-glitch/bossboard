import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "jiwon706878@gmail.com";

export async function PATCH(req: Request) {
  // Verify admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action, plan_id } = await req.json();

  if (!userId || !action) {
    return NextResponse.json(
      { error: "userId and action are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  switch (action) {
    case "change_plan": {
      if (!plan_id) {
        return NextResponse.json(
          { error: "plan_id is required" },
          { status: 400 }
        );
      }

      const { error } = await admin
        .from("profiles")
        .update({ plan_id })
        .eq("id", userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Also update subscriptions table if exists
      await admin
        .from("subscriptions")
        .update({ plan_id })
        .eq("user_id", userId);

      return NextResponse.json({ success: true });
    }

    case "ban": {
      // Ban user by setting banned_until far in the future
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // ~100 years
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    case "unban": {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json(
        { error: "Unknown action" },
        { status: 400 }
      );
  }
}
