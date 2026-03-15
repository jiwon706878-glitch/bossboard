"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  GraduationCap,
  Plus,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OnboardingPath {
  id: string;
  title: string;
  description: string | null;
  steps: Step[];
  created_at: string;
}

interface Step {
  type: "read_sop" | "complete_checklist";
  target_id: string;
  target_title?: string;
  day: number;
  required: boolean;
}

interface Assignment {
  id: string;
  path_id: string;
  user_id: string;
  completed_at: string | null;
  profiles?: { full_name: string | null };
}

interface SOPOption { id: string; title: string }
interface ChecklistOption { id: string; title: string }

export default function OnboardingPathsPage() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();
  const router = useRouter();

  const [paths, setPaths] = useState<OnboardingPath[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSteps, setFormSteps] = useState<Step[]>([]);
  const [saving, setSaving] = useState(false);

  // Options for step dropdowns
  const [sops, setSops] = useState<SOPOption[]>([]);
  const [checklists, setChecklists] = useState<ChecklistOption[]>([]);

  const loadData = useCallback(async () => {
    if (!currentBusiness?.id) return;

    const [{ data: pathData }, { data: assignData }, { data: sopData }, { data: clData }] =
      await Promise.all([
        supabase
          .from("onboarding_paths")
          .select("id, title, description, steps, created_at")
          .eq("business_id", currentBusiness.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("onboarding_assignments")
          .select("id, path_id, user_id, completed_at")
          .eq("business_id", currentBusiness.id),
        supabase
          .from("sops")
          .select("id, title")
          .eq("business_id", currentBusiness.id)
          .order("title"),
        supabase
          .from("checklists")
          .select("id, title")
          .eq("business_id", currentBusiness.id)
          .order("title"),
      ]);

    setPaths(pathData ?? []);
    setAssignments(assignData ?? []);
    setSops(sopData ?? []);
    setChecklists(clData ?? []);
    setLoading(false);
  }, [currentBusiness?.id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function addStep() {
    setFormSteps([
      ...formSteps,
      { type: "read_sop", target_id: "", day: formSteps.length + 1, required: true },
    ]);
  }

  function updateStep(index: number, updates: Partial<Step>) {
    setFormSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  function removeStep(index: number) {
    setFormSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!formTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (formSteps.length === 0) {
      toast.error("Add at least one step");
      return;
    }
    if (formSteps.some((s) => !s.target_id)) {
      toast.error("Select a target for each step");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Enrich steps with titles
    const enrichedSteps = formSteps.map((s) => {
      const target = s.type === "read_sop"
        ? sops.find((sop) => sop.id === s.target_id)
        : checklists.find((cl) => cl.id === s.target_id);
      return { ...s, target_title: target?.title ?? "" };
    });

    const { error } = await supabase.from("onboarding_paths").insert({
      business_id: currentBusiness?.id,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      steps: enrichedSteps,
      created_by: user?.id,
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Onboarding path created");
    setCreateOpen(false);
    setFormTitle("");
    setFormDesc("");
    setFormSteps([]);
    setSaving(false);
    loadData();
  }

  function getAssignmentCount(pathId: string) {
    return assignments.filter((a) => a.path_id === pathId).length;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-md border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Onboarding Paths</h1>
          <p className="text-muted-foreground">
            Guide new team members through required SOPs and checklists.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Path
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Onboarding Path</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder='e.g. "New Barista - Week 1"'
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What this onboarding path covers..."
                  rows={2}
                />
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
                    <Plus className="h-3 w-3" /> Add Step
                  </Button>
                </div>

                {formSteps.length === 0 && (
                  <p className="text-sm text-muted-foreground">No steps yet. Add steps to build the path.</p>
                )}

                {formSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md border p-3">
                    <span className="mt-2 font-mono text-xs text-muted-foreground shrink-0">
                      Day {step.day}
                    </span>
                    <div className="flex-1 space-y-2">
                      <Select
                        value={step.type}
                        onValueChange={(v) => updateStep(i, { type: v as Step["type"], target_id: "" })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read_sop">Read SOP</SelectItem>
                          <SelectItem value="complete_checklist">Complete Checklist</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={step.target_id}
                        onValueChange={(v) => updateStep(i, { target_id: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(step.type === "read_sop" ? sops : checklists).map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min={1}
                        value={step.day}
                        onChange={(e) => updateStep(i, { day: parseInt(e.target.value) || 1 })}
                        className="h-8 w-20 text-xs"
                        placeholder="Day"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-muted-foreground hover:text-destructive"
                      onClick={() => removeStep(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Creating..." : "Create Path"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {paths.length === 0 ? (
        <Card className="rounded-md shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No onboarding paths yet. Create one to guide new team members.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => {
            const assignCount = getAssignmentCount(path.id);
            const stepCount = path.steps?.length ?? 0;

            return (
              <Card
                key={path.id}
                className="cursor-pointer rounded-md shadow-none transition-colors duration-150 hover:bg-muted/30"
                onClick={() => router.push(`/dashboard/onboarding-paths/${path.id}`)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent"
                  >
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{path.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stepCount} {stepCount === 1 ? "step" : "steps"}
                      {assignCount > 0 && (
                        <span className="ml-2">
                          <Users className="mr-0.5 inline h-3 w-3" />
                          {assignCount} assigned
                        </span>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
