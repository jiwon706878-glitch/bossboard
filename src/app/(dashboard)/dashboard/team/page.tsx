"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { plans, type PlanId } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, Users, Zap, Link2, Copy, Check } from "lucide-react";

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_at?: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  accepted: boolean;
  created_at: string;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Admin section state
  const [adminOpen, setAdminOpen] = useState(false);
  const [sopCount, setSopCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [aiUsed, setAiUsed] = useState(0);

  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const { loadRole, isAdmin } = useRoleStore();

  const planId = ((currentBusiness as any)?.plan || "free") as PlanId;
  const plan = plans[planId];
  const maxMembers = plan?.limits?.teamMembers ?? 1;

  const loadTeamData = useCallback(async () => {
    if (!currentBusiness) return;

    // Load the business owner as the first team member
    const { data: business } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", currentBusiness.id)
      .single();

    if (business) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("id", business.user_id)
        .single();

      // For now, team = owner. When invite acceptance writes to a team_members
      // table, query that here too.
      if (ownerProfile) {
        setTeamMembers([{ ...ownerProfile, role: ownerProfile.role || "owner" }]);
      }
    }

    const { data: invites } = await supabase
      .from("invites")
      .select("id, email, role, accepted, created_at")
      .eq("workspace_id", currentBusiness.id)
      .eq("accepted", false)
      .order("created_at", { ascending: false });

    if (invites) setPendingInvites(invites);
  }, [currentBusiness, supabase]);

  const loadAdminData = useCallback(async () => {
    if (!currentBusiness?.id) return;

    const { data: { user } } = await supabase.auth.getUser();

    // Document counts
    const { data: sops } = await supabase
      .from("sops")
      .select("id, doc_type")
      .eq("business_id", currentBusiness.id)
      .is("deleted_at", null);

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
  }, [currentBusiness?.id, supabase]);

  useEffect(() => {
    loadRole();
    loadTeamData();
    loadAdminData();
  }, [loadRole, loadTeamData, loadAdminData]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !inviteEmail.trim()) return;
    setInviteLoading(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          businessId: currentBusiness.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send invite");
      } else {
        toast.success(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        setInviteRole("member");
        loadTeamData();
      }
    } catch {
      toast.error("Failed to send invite");
    }

    setInviteLoading(false);
  }

  async function handleRevokeInvite(inviteId: string) {
    setRevokeLoadingId(inviteId);

    try {
      const res = await fetch(`/api/team/invite?id=${inviteId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to revoke invite");
      } else {
        toast.success("Invite revoked");
        loadTeamData();
      }
    } catch {
      toast.error("Failed to revoke invite");
    }

    setRevokeLoadingId(null);
  }

  async function handleChangeRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTeamMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
    );
    toast.success("Role updated");
  }

  async function handleCopyInviteLink() {
    if (!currentBusiness) return;
    setLinkLoading(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "member",
          businessId: currentBusiness.id,
          linkOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate link");
        setLinkLoading(false);
        return;
      }

      await navigator.clipboard.writeText(data.inviteUrl);
      setLinkCopied(true);
      toast.success("Invite link copied!");
      loadTeamData();
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      toast.error("Failed to generate invite link");
    }

    setLinkLoading(false);
  }

  const totalUsed = teamMembers.length + pendingInvites.length;

  // Admin helpers
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team & Admin</h1>
        <p className="text-muted-foreground">Manage team members and invitations.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members</CardTitle>
            <Badge variant="outline" className="text-sm">
              {totalUsed}/{maxMembers === -1 ? "\u221e" : maxMembers}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{member.full_name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">{member.role || "member"}</Badge>
                </div>
              ))}
            </div>
          )}

          {pendingInvites.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Invites</h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between rounded-md border border-dashed px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">Invited as {invite.role}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 shrink-0 text-destructive"
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={revokeLoadingId === invite.id}
                    >
                      {revokeLoadingId === invite.id ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {totalUsed >= maxMembers && maxMembers !== -1 ? (
            <p className="text-sm text-muted-foreground">
              Team limit reached for your {plan.name} plan. Upgrade to invite more.
            </p>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Invite a Team Member</h3>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="colleague@business.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={inviteLoading || !currentBusiness}>
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={linkLoading || !currentBusiness}
                  onClick={handleCopyInviteLink}
                >
                  {linkCopied ? (
                    <Check className="mr-2 h-4 w-4 text-emerald-500" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  {linkLoading ? "Generating..." : linkCopied ? "Copied!" : "Copy Invite Link"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Admin section — only visible to owner/admin */}
      {isAdmin() && (
        <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors duration-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Admin Dashboard</CardTitle>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", adminOpen && "rotate-180")} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Overview cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Documents */}
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documents
                    </div>
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
                  </div>

                  {/* AI Generations */}
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Zap className="h-4 w-4 text-primary" />
                      AI Generations
                    </div>
                    <div className="font-mono text-2xl font-bold">
                      {aiUsed}{aiLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{aiLimit}</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">this month</p>
                    {aiLimit !== -1 && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", barColor(pctBar(aiUsed, aiLimit)))} style={{ width: `${pctBar(aiUsed, aiLimit)}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Team */}
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      Team Members
                    </div>
                    <div className="font-mono text-2xl font-bold">
                      {teamMembers.length}{teamLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{teamLimit}</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.name} plan</p>
                    {teamLimit !== -1 && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", barColor(pctBar(teamMembers.length, teamLimit)))} style={{ width: `${pctBar(teamMembers.length, teamLimit)}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Role management table */}
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
                      {teamMembers.map((m) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">{m.full_name || "\u2014"}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{m.email || "\u2014"}</td>
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
                            {m.created_at ? new Date(m.created_at).toLocaleDateString() : "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
