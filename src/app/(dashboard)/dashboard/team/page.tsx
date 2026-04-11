"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { plans, type PlanId } from "@/config/plans";
import { fetchCurrentUser, fetchProfile, fetchTeamMembers, fetchPendingInvites, fetchSopStats, fetchUserBusinesses, userKeys, teamKeys, sopKeys, businessKeys } from "@/lib/queries";
import { toast } from "sonner";
import { MembersCard } from "@/components/team/members-card";
import { WorkspacesCard } from "@/components/team/workspaces-card";
import { AdminDashboard } from "@/components/team/admin-dashboard";

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
  const [newBizName, setNewBizName] = useState("");
  const [newBizType, setNewBizType] = useState("");

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

  // Day 5: AI credit usage query removed. The admin dashboard widget
  // was updated to drop credit-based stats; see below.

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

  async function handleTransferOwnership(targetUserId: string) {
    const targetName = teamMembers.find((m: any) => m.id === targetUserId)?.full_name || "this user";
    if (!confirm(`Transfer ownership of "${currentBusiness?.name}" to ${targetName}? You will be demoted to admin. This cannot be undone.`)) return;

    try {
      const { error: bizError } = await supabase
        .from("businesses")
        .update({ user_id: targetUserId })
        .eq("id", businessId!);
      if (bizError) throw bizError;

      await Promise.all([
        supabase
          .from("business_members")
          .update({ role: "owner" })
          .eq("business_id", businessId!)
          .eq("user_id", targetUserId),
        supabase
          .from("business_members")
          .update({ role: "admin" })
          .eq("business_id", businessId!)
          .eq("user_id", userId),
      ]);

      toast.success("Ownership transferred");
      invalidateTeam();
      queryClient.invalidateQueries({ queryKey: businessKeys.all(userId!) });
      useRoleStore.getState().loaded = false;
      loadRole();
    } catch (err: any) {
      console.error("Transfer ownership error:", err.message);
      toast.error("Failed to transfer ownership. Please try again.");
    }
  }

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
    <div className="mx-auto max-w-2xl space-y-6 stagger-children">
      <div>
        <h1 className="text-3xl font-bold">Team & Admin</h1>
        <p className="text-muted-foreground">Manage team members and invitations.</p>
      </div>

      <div className="animate-stagger-in" style={{ animationDelay: "0ms" }}>
        <MembersCard
          teamMembers={teamMembers}
          pendingInvites={pendingInvites}
          totalUsed={totalUsed}
          maxMembers={maxMembers}
          planName={plan.name}
          isAdmin={isAdmin()}
          inviteEmail={inviteEmail}
          onInviteEmailChange={setInviteEmail}
          inviteRole={inviteRole}
          onInviteRoleChange={setInviteRole}
          inviteLoading={inviteLoading}
          onSendInvite={handleSendInvite}
          onRevokeInvite={handleRevokeInvite}
          revokeLoadingId={revokeLoadingId}
          onCopyInviteLink={handleCopyInviteLink}
          linkLoading={linkLoading}
          linkCopied={linkCopied}
          onRemoveMember={handleRemoveMember}
          currentBusinessExists={!!currentBusiness}
        />
      </div>

      {/* Workspace Management */}
      {isAdmin() && (
        <div className="animate-stagger-in" style={{ animationDelay: "60ms" }}>
          <WorkspacesCard
            allBusinesses={allBusinesses}
            currentBusinessId={currentBusiness?.id}
            newBizName={newBizName}
            onNewBizNameChange={setNewBizName}
            newBizType={newBizType}
            onNewBizTypeChange={setNewBizType}
            onAddBusiness={handleAddBusiness}
            onDeleteBusiness={handleDeleteBusiness}
          />
        </div>
      )}

      {/* Admin Dashboard */}
      {isAdmin() && (
        <div className="animate-stagger-in" style={{ animationDelay: "120ms" }}>
          <AdminDashboard
            teamMembers={teamMembers}
            totalDocs={totalDocs}
            sopCount={sopCount}
            noteCount={noteCount}
            policyCount={policyCount}
            sopLimit={plan.limits.sops}
            teamLimit={plan.limits.teamMembers}
            planName={plan.name}
            userId={userId}
            currentOwnerUserId={currentOwnerUserId}
            onChangeRole={(memberId, newRole) => changeRoleMutation.mutate({ memberId, newRole })}
            onTransferOwnership={handleTransferOwnership}
          />
        </div>
      )}
    </div>
  );
}
