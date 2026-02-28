import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Video } from "lucide-react";
import { ScriptsFilter } from "@/components/scripts/scripts-filter";

export default async function ScriptsPage() {
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

  const { data: scripts } = await supabase
    .from("scripts")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Studio</h1>
          <p className="text-muted-foreground">
            Generate camera-ready scripts for short-form video content.
          </p>
        </div>
        <Link href="/dashboard/scripts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Script
          </Button>
        </Link>
      </div>

      <ScriptsFilter scripts={scripts ?? []} />
    </div>
  );
}
