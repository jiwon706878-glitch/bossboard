"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shield, Users, FileText, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
}

export default function AdminPage() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();
  const { role, loadRole, isAdmin } = useRoleStore();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sopCount, setSopCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [aiUsed, setAiUsed] = useState(0);
  const [planId, setPlanId] = useState<PlanId>("free");

  const loadData = useCallback(async () => {
    await loadRole();
    if (!currentBusiness?.id) return;

    // Get plan
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_id")
        .eq("id", user.id)
        .single();
      setPlanId((profile?.plan_id as PlanId) ?? "free");
    }

    // Team members
    const { data: memberData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("business_id", currentBusiness.id);
    setMembers(memberData ?? []);

    // Document counts
    const { data: sops } = await supabase
      .from("sops")
      .select("id, doc_type")
      .eq("business_id", currentBusiness.id);

    if (sops) {
      setSopCount(sops.filter((s) => (s.doc_type || "sop") === "sop").length);
      setNoteCount(sops.filter((s) => s.doc_type === "note").length);
      setPolicyCount(sops.filter((s) => s.doc_type === "policy").length);
    }

    // AI usage this month
    if (user) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: usage } = await supabase
        .from("ai_usage")
        .select("credits_used")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());
      setAiUsed(usage?.reduce((sum, r) => sum + r.credits_used, 0) ?? 0);
    }

    setLoading(false);
  }, [currentBusiness?.id, supabase, loadRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleChangeRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
    );
    toast.success("Role updated");
  }

  const plan = plans[planId];
  const aiLimit = plan.limits.aiCredits;
  const sopLimit = plan.limits.sops;
  const teamLimit = plan.limits.teamMembers;
  const totalDocs = sopCount + noteCount + policyCount;

  function pctBar(used: number, limit: number) {
    if (limit === -1) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  function barColor(pct: number) {
    if (pct >= 100) return "bg-destructive";
    if (pct >= 80) return "bg-amber-400";
    return "bg-primary";
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-md border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="mx-auto max-w-[1080px] flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Business overview and team management.</p>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Documents */}
        <Card className="rounded-md shadow-none">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">
              {totalDocs}{sopLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{sopLimit}</span>}
            </div>
            <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
              <span>{sopCount} SOPs</span>
              <span>{noteCount} Notes</span>
              <span>{policyCount} Policies</span>
            </div>
            {sopLimit !== -1 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", barColor(pctBar(totalDocs, sopLimit)))} style={{ width: `${pctBar(totalDocs, sopLimit)}%` }} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Generations */}
        <Card className="rounded-md shadow-none">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">
              {aiUsed}{aiLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{aiLimit}</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">this month</p>
            {aiLimit !== -1 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", barColor(pctBar(aiUsed, aiLimit)))} style={{ width: `${pctBar(aiUsed, aiLimit)}%` }} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card className="rounded-md shadow-none">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">
              {members.length}{teamLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{teamLimit}</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{plan.name} plan</p>
            {teamLimit !== -1 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", barColor(pctBar(members.length, teamLimit)))} style={{ width: `${pctBar(members.length, teamLimit)}%` }} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team members table */}
      <Card className="rounded-md shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{m.full_name || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.email || "—"}</td>
                    <td className="py-3 pr-4">
                      <Select
                        value={m.role || "member"}
                        onValueChange={(v) => handleChangeRole(m.id, v)}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
