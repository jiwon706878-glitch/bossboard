import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  const remaining = Math.max(0, 100 - (count ?? 0));
  return Response.json({ count: count ?? 0, remaining });
}

export async function POST(req: Request) {
  const { email, businessType, interestedFeatures, featureRequest } =
    await req.json();

  if (!email || !businessType) {
    return new Response("Email and business type are required", {
      status: 400,
    });
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
}
