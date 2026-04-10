"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractStepsFromContent } from "@/lib/checklists/extract-steps";
import { SOPOption, PreviewItem } from "@/lib/checklists/types";
import { FromSopTab } from "@/components/checklists/from-sop-tab";
import { AiGenerateTab } from "@/components/checklists/ai-generate-tab";
import { ManualTab } from "@/components/checklists/manual-tab";
import { fetchCurrentUser, fetchProfile, userKeys } from "@/lib/queries";
import { plans, type PlanId } from "@/config/plans";

export default function NewChecklistPage() {
  const supabase = createClient();
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();

  const [tab, setTab] = useState("from-sop");
  const [sops, setSops] = useState<SOPOption[]>([]);
  const [recurrence, setRecurrence] = useState("none");
  const [showOnCalendar, setShowOnCalendar] = useState(false);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [creating, setCreating] = useState(false);

  // Plan gating: daily/recurring checklists require Starter or above
  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const { data: profile } = useQuery({
    queryKey: userKeys.profile(user?.id ?? ""),
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const planId = (profile?.plan_id as PlanId) ?? "free";
  const recurringAllowed = planId !== "free";

  // Auto-set showOnCalendar default based on recurrence
  useEffect(() => {
    if (recurrence === "daily" || recurrence === "none") {
      setShowOnCalendar(false);
    } else {
      setShowOnCalendar(true);
    }
  }, [recurrence]);

  // Load SOPs
  useEffect(() => {
    if (!currentBusiness?.id) return;
    async function loadSops() {
      const { data } = await supabase
        .from("sops")
        .select("id, title, content")
        .eq("business_id", currentBusiness!.id)
        .is("deleted_at", null)
        .order("title");
      setSops(data ?? []);
    }
    loadSops();
  }, [currentBusiness?.id, supabase]);

  const createChecklist = useCallback(
    async (payload: {
      title: string;
      items: PreviewItem[];
      sop_id?: string;
    }) => {
      if (!currentBusiness?.id) return;
      setCreating(true);

      if (payload.items.length === 0) {
        toast.error("No checklist items to save.");
        setCreating(false);
        return;
      }

      // Plan gating: only Starter and above can create recurring checklists
      if (recurrence !== "none" && !recurringAllowed) {
        toast.error("Recurring checklists require the Starter plan or higher. Upgrade to unlock.");
        setCreating(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isTemplate = recurrence !== "none";

      const { data, error } = await supabase
        .from("checklists")
        .insert({
          business_id: currentBusiness.id,
          sop_id: payload.sop_id ?? null,
          title: payload.title,
          items: payload.items,
          status: "pending",
          due_date: dueDate || null,
          created_by: user?.id,
          is_template: isTemplate,
          recurrence_type: recurrence === "none" ? null : recurrence,
          show_on_calendar: showOnCalendar,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Checklist creation error:", error.message);
        toast.error("Failed to create checklist. Please try again.");
        setCreating(false);
        return;
      }

      toast.success("Checklist created");
      setCreating(false);
      if (data?.id) router.push(`/dashboard/checklists/${data.id}`);
    },
    [currentBusiness?.id, dueDate, recurrence, showOnCalendar, router, supabase, recurringAllowed]
  );

  const handleFromSop = useCallback(
    (selectedSopId: string, previewItems: PreviewItem[]) => {
      const sop = sops.find((s) => s.id === selectedSopId);
      if (!sop) return;
      const items =
        previewItems.length > 0
          ? previewItems
          : extractStepsFromContent(sop.content);
      createChecklist({
        title: sop.title,
        items,
        sop_id: selectedSopId,
      });
    },
    [sops, createChecklist]
  );

  const handleFromAi = useCallback(
    (title: string, items: PreviewItem[]) => {
      createChecklist({ title, items });
    },
    [createChecklist]
  );

  const handleManual = useCallback(
    (title: string, items: PreviewItem[]) => {
      createChecklist({ title, items });
    },
    [createChecklist]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/checklists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Checklist</h1>
          <p className="text-muted-foreground">
            Create a new checklist from an SOP, AI, or from scratch.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={showOnCalendar} onCheckedChange={setShowOnCalendar} />
        <Label className="text-sm">Show on calendar</Label>
      </div>

      {!recurringAllowed && (
        <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <div className="flex-1">
            <p className="font-medium text-foreground">
              Recurring checklists require the Starter plan
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Upgrade to create daily, weekly, or monthly recurring checklists that auto-reset.
              You can still create one-time checklists on the Free plan.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline"
            >
              Upgrade now →
            </Link>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="from-sop">From SOP</TabsTrigger>
          <TabsTrigger value="ai">AI Generate</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="from-sop" className="space-y-4 pt-4">
          <FromSopTab
            sops={sops}
            recurrence={recurrence}
            setRecurrence={setRecurrence}
            dueDate={dueDate}
            setDueDate={setDueDate}
            creating={creating}
            onSubmit={handleFromSop}
          />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 pt-4">
          <AiGenerateTab
            businessId={currentBusiness?.id ?? ""}
            recurrence={recurrence}
            setRecurrence={setRecurrence}
            dueDate={dueDate}
            setDueDate={setDueDate}
            creating={creating}
            onSubmit={handleFromAi}
          />
        </TabsContent>

        <TabsContent value="manual" className="pt-4">
          <ManualTab
            recurrence={recurrence}
            setRecurrence={setRecurrence}
            dueDate={dueDate}
            setDueDate={setDueDate}
            creating={creating}
            onSubmit={handleManual}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
