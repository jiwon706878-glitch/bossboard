"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, Users, Zap } from "lucide-react";

function pctBar(used: number, limit: number) { if (limit === -1) return 0; return Math.min(100, Math.round((used / limit) * 100)); }
function barColor(pct: number) { if (pct >= 100) return "bg-destructive"; if (pct >= 80) return "bg-amber-400"; return "bg-primary"; }

interface AdminDashboardProps {
  teamMembers: any[];
  totalDocs: number;
  sopCount: number;
  noteCount: number;
  policyCount: number;
  sopLimit: number;
  teamLimit: number;
  planName: string;
  userId: string | undefined;
  currentOwnerUserId: string | undefined;
  onChangeRole: (memberId: string, newRole: string) => void;
  onTransferOwnership: (targetUserId: string) => Promise<void>;
}

export function AdminDashboard({
  teamMembers,
  totalDocs,
  sopCount,
  noteCount,
  policyCount,
  sopLimit,
  teamLimit,
  planName,
  userId,
  currentOwnerUserId,
  onChangeRole,
  onTransferOwnership,
}: AdminDashboardProps) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferring, setTransferring] = useState(false);

  async function handleTransfer() {
    if (!transferTarget) return;
    setTransferring(true);
    await onTransferOwnership(transferTarget);
    setTransferTarget("");
    setTransferring(false);
  }

  return (
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
            {/* Day 5: removed the AI Generations / credit usage tile.
                Credits no longer exist; BYOK drives AI on paid plans. */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><FileText className="h-4 w-4 text-primary" />Documents</div>
                <div className="font-mono text-2xl font-bold">{totalDocs}{sopLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{sopLimit}</span>}</div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground"><span>{sopCount} SOPs</span><span>{noteCount} Notes</span><span>{policyCount} Policies</span></div>
                {sopLimit !== -1 && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", barColor(pctBar(totalDocs, sopLimit)))} style={{ width: `${pctBar(totalDocs, sopLimit)}%` }} /></div>}
              </div>
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Users className="h-4 w-4 text-primary" />Team Members</div>
                <div className="font-mono text-2xl font-bold">{teamMembers.length}{teamLimit !== -1 && <span className="text-sm font-normal text-muted-foreground">/{teamLimit}</span>}</div>
                <p className="mt-1 text-xs text-muted-foreground">{planName} plan</p>
                {teamLimit !== -1 && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", barColor(pctBar(teamMembers.length, teamLimit)))} style={{ width: `${pctBar(teamMembers.length, teamLimit)}%` }} /></div>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 pr-4 font-medium">Name</th><th className="pb-2 pr-4 font-medium">Email</th><th className="pb-2 pr-4 font-medium">Role</th><th className="pb-2 font-medium">Joined</th></tr></thead>
                <tbody className="stagger-children">
                  {teamMembers.map((m: any) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{m.full_name || m.email || "\u2014"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{m.email || "\u2014"}</td>
                      <td className="py-3 pr-4">
                        {m.role === "owner" ? (
                          <Badge variant="secondary" className="text-xs">Owner</Badge>
                        ) : (
                          <Select value={m.role || "member"} onValueChange={(v) => onChangeRole(m.id, v)}>
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

            {/* Transfer Ownership */}
            {userId === currentOwnerUserId && teamMembers.length > 1 && (
              <>
                <Separator />
                <div className="rounded-md border border-dashed border-destructive/30 p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Transfer Ownership</p>
                    <p className="text-xs text-muted-foreground">Transfer ownership to another team member. This cannot be undone -- you will become an admin.</p>
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
                      disabled={!transferTarget || transferring}
                      onClick={handleTransfer}
                    >
                      {transferring ? "Transferring..." : "Transfer"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
