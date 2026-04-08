import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod/v4";

const AdminUserSchema = z.object({
  userId: z.uuid(),
  action: z.enum(["change_plan", "ban", "unban"]),
  plan_id: z.enum(["free", "starter", "pro", "business"]).optional(),
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

export async function PATCH(req: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = AdminUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { userId, action, plan_id } = parsed.data;

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
        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
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
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
