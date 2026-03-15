import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StickyNote } from "@/components/dashboard/sticky-note";
import { PageContextMenu } from "@/components/dashboard/page-context-menu";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="flex h-dvh overflow-hidden">
      <DashboardSidebar className="hidden lg:flex" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
        <StickyNote />
        <PageContextMenu />
      </div>
    </div>
  );
}
