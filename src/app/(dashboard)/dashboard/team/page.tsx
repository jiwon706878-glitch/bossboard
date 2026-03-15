"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
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

  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const planId = ((currentBusiness as any)?.plan || "free") as PlanId;
  const plan = plans[planId];
  const maxMembers = plan?.limits?.teamMembers ?? 1;

  const loadTeamData = useCallback(async () => {
    if (!currentBusiness) return;

    const { data: members } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("business_id", currentBusiness.id);

    if (members) setTeamMembers(members);

    const { data: invites } = await supabase
      .from("invites")
      .select("id, email, role, accepted, created_at")
      .eq("workspace_id", currentBusiness.id)
      .eq("accepted", false)
      .order("created_at", { ascending: false });

    if (invites) setPendingInvites(invites);
  }, [currentBusiness, supabase]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

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

  const totalUsed = teamMembers.length + pendingInvites.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="text-muted-foreground">Manage team members and invitations.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members</CardTitle>
            <Badge variant="outline" className="text-sm">
              {totalUsed}/{maxMembers === -1 ? "∞" : maxMembers}
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
              <Button type="submit" disabled={inviteLoading || !currentBusiness}>
                {inviteLoading ? "Sending..." : "Send Invite"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
