"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractStepsFromContent } from "@/lib/checklists/extract-steps";
import { SOPOption, PreviewItem } from "@/lib/checklists/types";
import { FromSopTab } from "@/components/checklists/from-sop-tab";
import { AiGenerateTab } from "@/components/checklists/ai-generate-tab";
import { ManualTab } from "@/components/checklists/manual-tab";

export default function NewChecklistPage() {
  const supabase = createClient();
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();

  const [tab, setTab] = useState("from-sop");
  const [sops, setSops] = useState<SOPOption[]>([]);
  const [recurrence, setRecurrence] = useState("none");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [creating, setCreating] = useState(false);

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
        })
        .select("id")
        .single();

      if (error) {
        toast.error(error.message);
        setCreating(false);
        return;
      }

      toast.success("Checklist created");
      setCreating(false);
      if (data?.id) router.push(`/dashboard/checklists/${data.id}`);
    },
    [currentBusiness?.id, dueDate, recurrence, router, supabase]
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
