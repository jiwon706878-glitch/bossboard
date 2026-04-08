"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link2, Check } from "lucide-react";

interface MembersCardProps {
  teamMembers: any[];
  pendingInvites: any[];
  totalUsed: number;
  maxMembers: number;
  planName: string;
  isAdmin: boolean;
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  inviteRole: string;
  onInviteRoleChange: (value: string) => void;
  inviteLoading: boolean;
  onSendInvite: (e: React.FormEvent) => void;
  onRevokeInvite: (id: string) => void;
  revokeLoadingId: string | null;
  onCopyInviteLink: () => void;
  linkLoading: boolean;
  linkCopied: boolean;
  onRemoveMember: (memberId: string, memberName: string) => void;
  currentBusinessExists: boolean;
}

export function MembersCard({
  teamMembers,
  pendingInvites,
  totalUsed,
  maxMembers,
  planName,
  isAdmin,
  inviteEmail,
  onInviteEmailChange,
  inviteRole,
  onInviteRoleChange,
  inviteLoading,
  onSendInvite,
  onRevokeInvite,
  revokeLoadingId,
  onCopyInviteLink,
  linkLoading,
  linkCopied,
  onRemoveMember,
  currentBusinessExists,
}: MembersCardProps) {
  return (
    <Card>
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
                  {isAdmin && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => onRemoveMember(member.id, member.full_name || member.email || "this member")}
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
                  <Button variant="ghost" size="sm" className="ml-2 shrink-0 text-destructive" onClick={() => onRevokeInvite(invite.id)} disabled={revokeLoadingId === invite.id}>{revokeLoadingId === invite.id ? "Revoking..." : "Revoke"}</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {totalUsed >= maxMembers && maxMembers !== -1 ? (
          <p className="text-sm text-muted-foreground">Team limit reached for your {planName} plan. Upgrade to invite more.</p>
        ) : (
          <form onSubmit={onSendInvite} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Invite a Team Member</h3>
            <div className="flex gap-3">
              <Input type="email" placeholder="colleague@business.com" value={inviteEmail} onChange={(e) => onInviteEmailChange(e.target.value)} className="flex-1" required />
              <Select value={inviteRole} onValueChange={onInviteRoleChange}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={inviteLoading || !currentBusinessExists}>{inviteLoading ? "Sending..." : "Send Invite"}</Button>
              <Button type="button" variant="outline" disabled={linkLoading || !currentBusinessExists} onClick={onCopyInviteLink}>
                {linkCopied ? <Check className="mr-2 h-4 w-4 text-emerald-500" /> : <Link2 className="mr-2 h-4 w-4" />}
                {linkLoading ? "Generating..." : linkCopied ? "Copied!" : "Copy Invite Link"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
