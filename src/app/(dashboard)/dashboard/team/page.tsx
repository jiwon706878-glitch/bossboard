"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { plans, type PlanId } from "@/config/plans";
import { fetchCurrentUser, fetchProfile, fetchTeamMembers, fetchPendingInvites, fetchSopStats, fetchMonthlyUsage, fetchUserBusinesses, userKeys, teamKeys, sopKeys, usageKeys, businessKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, Users, Zap, Link2, Check } from "lucide-react";

const supabase = createClient();

export default function TeamPage() {
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const { loadRole, isAdmin } = useRoleStore();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newBizType, setNewBizType] = useState("");
  const [transferTarget, setTransferTarget] = useState("");
  const [transferringOwnership, setTransferringOwnership] = useState(false);

  // Queries
  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const planId = (profile?.plan_id || "free") as PlanId;
  const plan = plans[planId];
  const maxMembers = plan?.limits?.teamMembers ?? 1;

  // Load role on mount
  useQuery({ queryKey: ["role"], queryFn: () => { loadRole(); return null; }, staleTime: Infinity });

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: teamKeys.members(businessId ?? ""),
    queryFn: () => fetchTeamMembers(businessId!),
    enabled: !!businessId,
  });

  const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery({
    queryKey: teamKeys.invites(businessId ?? ""),
    queryFn: () => fetchPendingInvites(businessId!),
    enabled: !!businessId,
  });

  const { data: sopStats } = useQuery({
    queryKey: sopKeys.stats(businessId ?? ""),
    queryFn: () => fetchSopStats(businessId!),
    enabled: !!businessId,
  });

  const { data: aiUsed = 0 } = useQuery({
    queryKey: usageKeys.monthly(userId ?? ""),
    queryFn: () => fetchMonthlyUsage(userId!),
    enabled: !!userId,
  });

  const { data: allBusinesses = [] } = useQuery({
    queryKey: businessKeys.all(userId ?? ""),
    queryFn: () => fetchUserBusinesses(userId!),
    enabled: !!userId,
  });

  const sopCount = sopStats?.sopCount ?? 0;
  const noteCount = sopStats?.noteCount ?? 0;
  const policyCount = sopStats?.policyCount ?? 0;
  const totalDocs = sopCount + noteCount + policyCount;
  const totalUsed = teamMembers.length + pendingInvites.length;
  const aiLimit = plan.limits.aiCredits;
  const sopLimit = plan.limits.sops;
  const teamLimit = plan.limits.teamMembers;

  function invalidateTeam() {
    queryClient.invalidateQueries({ queryKey: teamKeys.members(businessId!) });
    queryClient.invalidateQueries({ queryKey: teamKeys.invites(businessId!) });
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness || !inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const res = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, businessId: currentBusiness.id }) });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to send invite");
      else { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(""); setInviteRole("member"); invalidateTeam(); }
    } catch { toast.error("Failed to send invite"); }
    setInviteLoading(false);
  }

  async function handleRevokeInvite(inviteId: string) {
    setRevokeLoadingId(inviteId);
    try {
      const res = await fetch(`/api/team/invite?id=${inviteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to revoke invite");
      else { toast.success("Invite revoked"); invalidateTeam(); }
    } catch { toast.error("Failed to revoke invite"); }
    setRevokeLoadingId(null);
  }

  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase.from("business_members").update({ role: newRole }).eq("user_id", memberId).eq("business_id", businessId!);
      if (error) throw error;
    },
    onMutate: async ({ memberId, newRole }) => {
      await queryClient.cancelQueries({ queryKey: teamKeys.members(businessId!) });
      const prev = queryClient.getQueryData(teamKeys.members(businessId!));
      queryClient.setQueryData(teamKeys.members(businessId!), (old: any[]) => (old ?? []).map((m: any) => m.id === memberId ? { ...m, role: newRole } : m));
      return { prev };
    },
    onError: (_err, _vars, ctx) => { queryClient.setQueryData(teamKeys.members(businessId!), ctx?.prev); toast.error("Failed to update role"); },
    onSuccess: () => toast.success("Role updated"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKeys.members(businessId!) }),
  });

  async function handleCopyInviteLink() {
    if (!currentBusiness) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "member", businessId: currentBusiness.id, linkOnly: true }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to generate link"); setLinkLoading(false); return; }
      await navigator.clipboard.writeText(data.inviteUrl);
      setLinkCopied(true); toast.success("Invite link copied!"); invalidateTeam();
      setTimeout(() => setLinkCopied(false), 3000);
    } catch { toast.error("Failed to generate invite link"); }
    setLinkLoading(false);
  }

  async function handleAddBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!newBizName.trim() || !userId) return;
    const { error } = await supabase
      .from("businesses")
      .insert({ name: newBizName.trim(), type: newBizType.trim() || "other", user_id: userId })
      .select()
      .single();
    if (error) { console.error("Add business error:", error.message); toast.error("Failed to create workspace. Please try again."); }
    else {
      toast.success("Workspace added");
      setNewBizName("");
      setNewBizType("");
      queryClient.invalidateQueries({ queryKey: businessKeys.all(userId) });
    }
  }

  async function handleDeleteBusiness(bizId: string, bizName: string) {
    if (!confirm(`Delete "${bizName}"? This will remove all data associated with this workspace. This cannot be undone.`)) return;
    const { error } = await supabase.from("businesses").delete().eq("id", bizId);
    if (error) { console.error("Delete business error:", error.message); toast.error("Failed to delete workspace. Please try again."); }
    else {
      toast.success("Workspace deleted");
      queryClient.invalidateQueries({ queryKey: businessKeys.all(userId!) });
      if (currentBusiness?.id === bizId) {
        const remaining = allBusinesses.filter((b: any) => b.id !== bizId);
        if (remaining.length > 0) useBusinessStore.getState().setCurrentBusiness(remaining[0]);
        else useBusinessStore.getState().setCurrentBusiness(null);
      }
    }
  }

  // Get the current owner's user_id from the business record
  const currentOwnerUserId = allBusinesses.find((b: any) => b.id === businessId)?.user_id;

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from ${currentBusiness?.name}? They will lose access to all business data.`)) return;

    const { error } = await supabase
      .from("business_members")
      .delete()
      .eq("business_id", businessId!)
      .eq("user_id", memberId);

    if (error) toast.error("Failed to remove member");
    else {
      toast.success("Member removed");
      invalidateTeam();
    }
  }

  async function handleTransferOwnership() {
    if (!transferTarget || !businessId) return;
    const targetName = teamMembers.find((m: any) => m.id === transferTarget)?.full_name || "this user";
    if (!confirm(`Transfer ownership of "${currentBusiness?.name}" to ${targetName}? You will be demoted to admin. This cannot be undone.`)) return;

    setTransferringOwnership(true);
    try {
      // 1. Update business owner
      const { error: bizError } = await supabase
        .from("businesses")
        .update({ user_id: transferTarget })
        .eq("id", businessId);
      if (bizError) throw bizError;

      // 2. Update roles in parallel (independent of each other)
      await Promise.all([
        supabase
          .from("business_members")
          .update({ role: "owner" })
          .eq("business_id", businessId)
          .eq("user_id", transferTarget),
        supabase
          .from("business_members")
          .update({ role: "admin" })
          .eq("business_id", businessId)
          .eq("user_id", userId),
      ]);

      toast.success("Ownership transferred");
      setTransferTarget("");
      invalidateTeam();
      queryClient.invalidateQueries({ queryKey: businessKeys.all(userId!) });
      useRoleStore.getState().loaded = false;
      loadRole();
    } catch (err: any) {
      console.error("Transfer ownership error:", err.message);
      toast.error("Failed to transfer ownership. Please try again.");
    }
    setTransferringOwnership(false);
  }

  function pctBar(used: number, limit: number) { if (limit === -1) return 0; return Math.min(100, Math.round((used / limit) * 100)); }
  function barColor(pct: number) { if (pct >= 100) return "bg-destructive"; if (pct >= 80) return "bg-amber-400"; return "bg-primary"; }

  if (membersLoading || invitesLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-md border bg-muted/40" />)}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team & Admin</h1>
        <p className="text-muted-foreground">Manage team members and invitations.</p>
      </div>

      <div className="animate-stagger-in" style={{ animationDelay: "0ms" }}><Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members</CardTitle>
            <Badge variant="outline" className="text-sm">{totalUsed}/{maxMembers === -1 ? "\u221e" : maxMembers}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div className="min-w-0"><p className="font-medium truncate">{member.full_name || member.email || "Unnamed"}</p>{member.email && member.full_name && <p className="text-sm text-muted-foreground truncate">{member.email}</p>}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">{member.role || "member"}</Badge>
                    {isAdmin() && member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id, member.full_name || member.email || "this member")}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingInvites.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Invites</h3>
              <div className="space-y-2">
                {pendingInvites.map((invite: any) => (
                  <div key={invite.id} className="flex items-center justify-between rounded-md border border-dashed px-4 py-3">
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{invite.email || "Invite link"}</p><p className="text-xs text-muted-foreground">Invited as {invite.role} · {invite.email ? "Email invite" : "Link invite"}</p></div>
                    <Button variant="ghost" size="sm" className="ml-2 shrink-0 text-destructive" onClick={() => handleRevokeInvite(invite.id)} disabled={revokeLoadingId === invite.id}>{revokeLoadingId === invite.id ? "Revoking..." : "Revoke"}</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {totalUsed >= maxMembers && maxMembers !== -1 ? (
            <p className="text-sm text-muted-foreground">Team limit reached for your {plan.name} plan. Upgrade to invite more.</p>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Invite a Team Member</h3>
              <div className="flex gap-3">
                <Input type="email" placeholder="colleague@business.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1" required />
                <Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={inviteLoading || !currentBusiness}>{inviteLoading ? "Sending..." : "Send Invite"}</Button>
                <Button type="button" variant="outline" disabled={linkLoading || !currentBusiness} onClick={handleCopyInviteLink}>
                  {linkCopied ? <Check className="mr-2 h-4 w-4 text-emerald-500" /> : <Link2 className="mr-2 h-4 w-4" />}
                  {linkLoading ? "Generating..." : linkCopied ? "Copied!" : "Copy Invite Link"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card></div>

      {/* Workspace Management */}
      {isAdmin() && (
        <div className="animate-stagger-in" style={{ animationDelay: "60ms" }}><Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {allBusinesses.map((biz: any) => (
                <div key={biz.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.type} {"\u00b7"} Created {new Date(biz.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentBusiness?.id === biz.id && (
                      <Badge variant="secondary" className="text-[10px]">Current</Badge>
                    )}
                    {allBusinesses.length > 1 && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteBusiness(biz.id, biz.name)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Add Workspace</h3>
              <form onSubmit={handleAddBusiness} className="flex gap-3">
                <Input placeholder="Business name" value={newBizName} onChange={(e) => setNewBizName(e.target.value)} className="flex-1" />
                <Input placeholder="e.g., Cafe, Brewery, Office" value={newBizType} onChange={(e) => setNewBizType(e.target.value)} className="w-[180px]" />
                <Button type="submit" disabled={!newBizName.trim()}>Add</Button>
              </form>
            </div>
          </CardContent>
        </Card></div>
      )}

      {/* Admin Dashboard */}
      {isAdmin() && (
        <div className="animate-stagger-in" style={{ animationDelay: "120ms" }}><Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
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
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><FileText className="h-4 w-4 text-primary" />Documents</div>
                    <div className="font-mono text-2xl font-bold">{totalDocs}{sopLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{sopLimit}</span>}</div>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground"><span>{sopCount} SOPs</span><span>{noteCount} Notes</span><span>{policyCount} Policies</span></div>
                    {sopLimit !== -1 && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", barColor(pctBar(totalDocs, sopLimit)))} style={{ width: `${pctBar(totalDocs, sopLimit)}%` }} /></div>}
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Zap className="h-4 w-4 text-primary" />AI Generations</div>
                    <div className="font-mono text-2xl font-bold">{aiUsed}{aiLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{aiLimit}</span>}</div>
                    <p className="mt-1 text-xs text-muted-foreground">this month</p>
                    {aiLimit !== -1 && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", barColor(pctBar(aiUsed, aiLimit)))} style={{ width: `${pctBar(aiUsed, aiLimit)}%` }} /></div>}
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Users className="h-4 w-4 text-primary" />Team Members</div>
                    <div className="font-mono text-2xl font-bold">{teamMembers.length}{teamLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{teamLimit}</span>}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.name} plan</p>
                    {teamLimit !== -1 && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", barColor(pctBar(teamMembers.length, teamLimit)))} style={{ width: `${pctBar(teamMembers.length, teamLimit)}%` }} /></div>}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 pr-4 font-medium">Name</th><th className="pb-2 pr-4 font-medium">Email</th><th className="pb-2 pr-4 font-medium">Role</th><th className="pb-2 font-medium">Joined</th></tr></thead>
                    <tbody>
                      {teamMembers.map((m: any) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">{m.full_name || m.email || "\u2014"}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{m.email || "\u2014"}</td>
                          <td className="py-3 pr-4">
                            {m.role === "owner" ? (
                              <Badge variant="secondary" className="text-xs">Owner</Badge>
                            ) : (
                              <Select value={m.role || "member"} onValueChange={(v) => changeRoleMutation.mutate({ memberId: m.id, newRole: v })}>
                                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleDateString() : "\u2014"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Transfer Ownership — only the current owner sees this */}
                {userId === currentOwnerUserId && teamMembers.length > 1 && (
                  <>
                    <Separator />
                    <div className="rounded-md border border-dashed border-destructive/30 p-4 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-destructive">Transfer Ownership</p>
                        <p className="text-xs text-muted-foreground">Transfer ownership to another team member. This cannot be undone — you will become an admin.</p>
                      </div>
                      <div className="flex gap-3">
                        <Select value={transferTarget} onValueChange={setTransferTarget}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select new owner" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.filter((m: any) => m.id !== userId).map((m: any) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.full_name || m.email || "Unnamed"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!transferTarget || transferringOwnership}
                          onClick={handleTransferOwnership}
                        >
                          {transferringOwnership ? "Transferring..." : "Transfer"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible></div>
      )}
    </div>
  );
}
