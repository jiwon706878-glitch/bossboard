import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    const remaining = Math.max(0, 100 - (count ?? 0));
    return Response.json({ count: count ?? 0, remaining });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Rate limit per IP: 3 submissions per hour
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(`waitlist:${ip}`, 3, 60 * 60_000)) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }

    const { email, businessType, interestedFeatures, featureRequest } =
      await req.json();

    if (!email || !businessType) {
      return new Response("Email and business type are required", {
        status: 400,
      });
    }

    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response("Invalid email format", { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("waitlist").insert({
      email,
      business_type: businessType,
      interested_features: interestedFeatures || [],
      feature_request: featureRequest || null,
    });

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { message: "You're already on the waitlist!" },
          { status: 409 }
        );
      }
      return new Response("Failed to join waitlist", { status: 500 });
    }

    return Response.json({ message: "Successfully joined the waitlist!" });
  } catch (error) {
    console.error("Waitlist POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
