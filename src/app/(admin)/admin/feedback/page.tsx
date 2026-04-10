import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackTable } from "@/components/admin/feedback-table";
import { AdminPageTitle } from "@/components/admin/admin-page-title";

export default async function AdminFeedbackPage() {
  const supabase = createAdminClient();

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, user_id, business_id, content, category, read, created_at")
    .order("created_at", { ascending: false });

  // Resolve user names
  const userIds = [...new Set((feedback ?? []).map((f: any) => f.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  // Resolve user emails
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
  const emailMap = new Map((authUsers ?? []).map((u: any) => [u.id, u.email]));

  // Resolve business names
  const bizIds = [...new Set((feedback ?? []).filter((f: any) => f.business_id).map((f: any) => f.business_id))];
  const { data: businesses } = bizIds.length > 0
    ? await supabase.from("businesses").select("id, name").in("id", bizIds)
    : { data: [] };
  const bizMap = new Map((businesses ?? []).map((b: any) => [b.id, b.name]));

  const feedbackItems = (feedback ?? []).map((f: any) => ({
    id: f.id,
    user_name: nameMap.get(f.user_id) ?? "Unknown",
    user_email: emailMap.get(f.user_id) ?? "unknown",
    business_name: f.business_id ? (bizMap.get(f.business_id) ?? "Unknown") : "\u2014",
    content: f.content,
    category: f.category || "feedback",
    read: f.read ?? false,
    created_at: f.created_at,
  }));

  const stats = {
    total: feedbackItems.length,
    feedback: feedbackItems.filter((f: any) => f.category === "feedback").length,
    bugs: feedbackItems.filter((f: any) => f.category === "bug").length,
    features: feedbackItems.filter((f: any) => f.category === "feature").length,
  };

  return (
    <div className="space-y-6">
      <AdminPageTitle
        titleKey="feedback"
        subtitle={`${stats.total} total — ${stats.feedback} feedback \u00b7 ${stats.bugs} bugs \u00b7 ${stats.features} feature requests`}
      />
      <FeedbackTable items={feedbackItems} />
    </div>
  );
}
