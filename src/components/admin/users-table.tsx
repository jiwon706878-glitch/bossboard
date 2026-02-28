"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Shield, ShieldOff, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { plans, type PlanId } from "@/config/plans";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  plan_id: string;
  created_at: string;
  last_sign_in: string | null;
  banned: boolean;
}

export function UsersTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  const filtered = users.filter((u) => {
    if (
      search &&
      !u.email.toLowerCase().includes(search.toLowerCase()) &&
      !(u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (planFilter !== "all" && u.plan_id !== planFilter) return false;
    return true;
  });

  async function changePlan(userId: string, newPlan: PlanId) {
    setActionLoading(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "change_plan", plan_id: newPlan }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to change plan");
    } else {
      toast.success(`Plan changed to ${newPlan}`);
      router.refresh();
    }
    setActionLoading(null);
  }

  async function toggleBan(userId: string, currentlyBanned: boolean) {
    setActionLoading(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        action: currentlyBanned ? "unban" : "ban",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
    } else {
      toast.success(currentlyBanned ? "User unbanned" : "User banned");
      router.refresh();
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {Object.values(plans).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Signed up</th>
                <th className="px-4 py-3 text-left font-medium">Last active</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {user.full_name || "No name"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {plans[user.plan_id as PlanId]?.name ?? user.plan_id}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.last_sign_in
                      ? formatDistanceToNow(new Date(user.last_sign_in), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {user.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Active
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoading === user.id}
                          >
                            <ChevronsUpDown className="mr-1 h-3 w-3" />
                            Plan
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Change plan for {user.email}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {(
                              Object.keys(plans) as PlanId[]
                            ).map((planId) => (
                              <Button
                                key={planId}
                                variant={
                                  user.plan_id === planId
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => changePlan(user.id, planId)}
                                disabled={
                                  user.plan_id === planId ||
                                  actionLoading === user.id
                                }
                              >
                                {plans[planId].name}
                                {user.plan_id === planId && " (current)"}
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBan(user.id, user.banned)}
                        disabled={actionLoading === user.id}
                        className={
                          user.banned
                            ? "text-green-600 hover:text-green-700"
                            : "text-destructive hover:text-destructive"
                        }
                      >
                        {user.banned ? (
                          <>
                            <ShieldOff className="mr-1 h-3 w-3" /> Unban
                          </>
                        ) : (
                          <>
                            <Shield className="mr-1 h-3 w-3" /> Ban
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
