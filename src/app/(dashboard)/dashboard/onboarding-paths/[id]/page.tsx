"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  CheckSquare,
  UserPlus,
  Loader2,
  GraduationCap,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Step {
  type: "read_sop" | "complete_checklist";
  target_id: string;
  target_title?: string;
  day: number;
  required: boolean;
}

interface OnboardingPath {
  id: string;
  title: string;
  description: string | null;
  steps: Step[];
  business_id: string;
}

interface Assignment {
  id: string;
  path_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
}

interface MemberProgress {
  assignment: Assignment;
  name: string;
  completedSteps: Set<number>;
  totalSteps: number;
}

export default function OnboardingPathDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const pathId = params.id as string;
  const { currentBusiness } = useBusinessStore();

  const [path, setPath] = useState<OnboardingPath | null>(null);
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningUser, setAssigningUser] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    // Load path
    const { data: pathData, error } = await supabase
      .from("onboarding_paths")
      .select("id, title, description, steps, sop_ids, business_id, assigned_to, checklist_ids, created_at")
      .eq("id", pathId)
      .single();

    if (error || !pathData) {
      toast.error("Path not found");
      router.push("/dashboard/onboarding-paths");
      return;
    }
    setPath(pathData);

    // Load assignments
    const { data: assignments } = await supabase
      .from("onboarding_assignments")
      .select("id, path_id, user_id, started_at, completed_at, created_at")
      .eq("path_id", pathId);

    // Load team members for assignment dropdown
    let members: { id: string; full_name: string | null }[] = [];
    if (currentBusiness?.id) {
      const { data: memberData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("business_id", currentBusiness.id);
      members = memberData ?? [];
      setTeamMembers(members);
    }

    // Calculate progress for each assigned member
    const steps = (pathData.steps as Step[]) ?? [];
    const progressList: MemberProgress[] = [];

    for (const assignment of assignments ?? []) {
      const completedSteps = new Set<number>();

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        if (step.type === "read_sop") {
          const { data: read } = await supabase
            .from("sop_reads")
            .select("signed")
            .eq("sop_id", step.target_id)
            .eq("user_id", assignment.user_id)
            .eq("signed", true)
            .maybeSingle();
          if (read) completedSteps.add(i);
        } else if (step.type === "complete_checklist") {
          const { data: completion } = await supabase
            .from("checklist_completions")
            .select("id")
            .eq("checklist_id", step.target_id)
            .eq("completed_by", assignment.user_id)
            .limit(1)
            .maybeSingle();
          if (completion) completedSteps.add(i);
        }
      }

      // Find name from local members array (not state, avoids stale closure)
      const member = members.find((m) => m.id === assignment.user_id);
      let name = member?.full_name ?? "";
      if (!name) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", assignment.user_id)
          .single();
        name = profile?.full_name ?? "Member";
      }

      progressList.push({
        assignment,
        name,
        completedSteps,
        totalSteps: steps.length,
      });
    }

    setMemberProgress(progressList);
    setLoading(false);
  }, [pathId, supabase, router, currentBusiness?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAssign() {
    if (!assigningUser || !currentBusiness?.id) return;
    setAssigning(true);

    const { error } = await supabase.from("onboarding_assignments").insert({
      path_id: pathId,
      user_id: assigningUser,
      business_id: currentBusiness.id,
    });

    if (error) {
      toast.error(error.message);
      setAssigning(false);
      return;
    }

    toast.success("Member assigned to onboarding path");
    setAssigningUser("");
    setAssigning(false);
    loadData();
  }

  async function handleRemoveAssignment(assignmentId: string) {
    const { error } = await supabase
      .from("onboarding_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Assignment removed");
    loadData();
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase
      .from("onboarding_paths")
      .delete()
      .eq("id", pathId);

    if (error) {
      toast.error(error.message);
      setDeleting(false);
      return;
    }

    toast.success("Onboarding path deleted");
    router.push("/dashboard/onboarding-paths");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-md border bg-card" />
      </div>
    );
  }

  if (!path) return null;

  const steps = (path.steps as Step[]) ?? [];
  const assignedIds = new Set(memberProgress.map((m) => m.assignment.user_id));
  const unassignedMembers = teamMembers.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/onboarding-paths">
            <Button variant="ghost" size="sm" className="mt-1">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{path.title}</h1>
            {path.description && (
              <p className="mt-1 text-sm text-muted-foreground">{path.description}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {steps.length} {steps.length === 1 ? "step" : "steps"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
          Delete
        </Button>
      </div>

      {/* Steps */}
      <Card className="rounded-md shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Path Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border px-3 py-2.5"
            >
              <span className="font-mono text-xs text-muted-foreground shrink-0">
                Day {step.day}
              </span>
              {step.type === "read_sop" ? (
                <FileText className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <CheckSquare className="h-4 w-4 shrink-0 text-emerald-400" />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-sm">{step.target_title || "Untitled"}</span>
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {step.type === "read_sop" ? "Read & Sign" : "Complete"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Assign member */}
      <Card className="rounded-md shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Assign to Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select value={assigningUser} onValueChange={setAssigningUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a team member..." />
              </SelectTrigger>
              <SelectContent>
                {unassignedMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || "Unnamed Member"}
                  </SelectItem>
                ))}
                {unassignedMembers.length === 0 && (
                  <SelectItem value="_none" disabled>
                    All members assigned
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleAssign} disabled={!assigningUser || assigning} className="gap-1">
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member progress */}
      {memberProgress.length > 0 && (
        <Card className="rounded-md shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Member Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {memberProgress.map((mp) => {
              const pct = mp.totalSteps > 0
                ? Math.round((mp.completedSteps.size / mp.totalSteps) * 100)
                : 0;
              const isComplete = mp.completedSteps.size === mp.totalSteps && mp.totalSteps > 0;

              return (
                <div key={mp.assignment.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                        {mp.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{mp.name}</span>
                      {isComplete && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">
                          Complete
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {mp.completedSteps.size}/{mp.totalSteps} ({pct}%)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveAssignment(mp.assignment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isComplete ? "bg-emerald-400" : "bg-primary"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* Per-step status */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-1">
                    {steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {mp.completedSteps.has(si) ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                        <span className={cn(mp.completedSteps.has(si) && "line-through")}>
                          {step.target_title || `Step ${si + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
