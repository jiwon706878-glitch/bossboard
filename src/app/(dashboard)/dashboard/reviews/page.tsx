import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewsList } from "@/components/reviews/reviews-list";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (!businesses || businesses.length === 0) redirect("/onboarding");

  const businessId = businesses[0].id;

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("business_id", businessId)
    .order("review_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">
          Manage and respond to your customer reviews with AI.
        </p>
      </div>
      <ReviewsList reviews={reviews ?? []} businessId={businessId} />
    </div>
  );
}
