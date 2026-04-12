import { createAdminClient } from "@/lib/supabase/admin";
import { AnnouncementsAdmin } from "./announcements-admin";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const supabase = createAdminClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*, announcement_reads(count)")
    .order("created_at", { ascending: false });

  return <AnnouncementsAdmin initialAnnouncements={announcements ?? []} />;
}
