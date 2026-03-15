"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CheckSquare,
  Plus,
  Loader2,
  Sparkles,
  X,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { extractStepsFromContent } from "@/lib/checklists/extract-steps";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";

interface SOPOption {
  id: string;
  title: string;
  content: any;
}

interface PreviewItem {
  text: string;
  required: boolean;
}

const RECURRENCE_OPTIONS = [
  { value: "none", label: "No recurrence" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

export default function NewChecklistPage() {
  const supabase = createClient();
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();

  const [tab, setTab] = useState("from-sop");
  const [sops, setSops] = useState<SOPOption[]>([]);
  const [recurrence, setRecurrence] = useState("none");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [creating, setCreating] = useState(false);

  // From SOP tab
  const [selectedSopId, setSelectedSopId] = useState("");
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  // AI Generate tab
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiItems, setAiItems] = useState<PreviewItem[]>([]);
  const [aiTitle, setAiTitle] = useState("");

  // Manual tab
  const [manualTitle, setManualTitle] = useState("");

  const manualEditor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start typing checklist items... each line becomes a checkbox",
      }),
    ],
    content: {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph" }],
            },
          ],
        },
      ],
    },
    editorProps: {
      attributes: {
        class: "min-h-[300px] outline-none prose prose-sm dark:prose-invert max-w-none px-1 py-2 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]_label]:mt-0.5 [&_li[data-type=taskItem]_div]:flex-1 [&_li[data-type=taskItem]_p]:my-0.5",
      },
    },
  });

  // Load SOPs
  useEffect(() => {
    if (!currentBusiness?.id) return;
    async function loadSops() {
      const { data } = await supabase
        .from("sops")
        .select("id, title, content")
        .eq("business_id", currentBusiness!.id)
        .order("title");
      setSops(data ?? []);
    }
    loadSops();
  }, [currentBusiness?.id, supabase]);

  // Preview extraction when SOP is selected
  useEffect(() => {
    if (!selectedSopId) {
      setPreviewItems([]);
      return;
    }
    const sop = sops.find((s) => s.id === selectedSopId);
    if (!sop) return;
    const items = extractStepsFromContent(sop.content);
    setPreviewItems(items);
  }, [selectedSopId, sops]);

  async function handleCreateFromSop() {
    if (!selectedSopId || !currentBusiness?.id) return;
    setCreating(true);

    const sop = sops.find((s) => s.id === selectedSopId);
    if (!sop) { setCreating(false); return; }

    const items = previewItems.length > 0 ? previewItems : extractStepsFromContent(sop.content);
    if (items.length === 0) {
      toast.error("Could not extract checklist items from this SOP.");
      setCreating(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const isTemplate = recurrence !== "none";

    const { data, error } = await supabase
      .from("checklists")
      .insert({
        business_id: currentBusiness.id,
        sop_id: selectedSopId,
        title: sop.title,
        items,
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
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim() || !currentBusiness?.id) return;
    setAiGenerating(true);
    setAiItems([]);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          topic: `Generate a checklist (not an SOP) for: ${aiPrompt}. Return ONLY a numbered list of action items. No headers, no sections, just the checklist items.`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      const text = data.text;

      if (!text?.trim()) {
        toast.error("AI returned empty response");
        setAiGenerating(false);
        return;
      }

      const lines = text.split("\n").filter((l: string) => l.trim());
      const items: PreviewItem[] = [];
      for (const line of lines) {
        const cleaned = line
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[-•□☐✓✔]\s*/, "")
          .replace(/^\*\s*/, "")
          .trim();
        if (cleaned && cleaned.length > 3 && !/^(title|purpose|scope|checklist|summary)/i.test(cleaned)) {
          items.push({ text: cleaned, required: true });
        }
      }

      if (items.length === 0) {
        toast.error("Could not extract items from AI response");
        setAiGenerating(false);
        return;
      }

      setAiItems(items);
      if (!aiTitle) {
        setAiTitle(aiPrompt.length > 60 ? aiPrompt.slice(0, 60) : aiPrompt);
      }
      toast.success(`Generated ${items.length} items`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate checklist"
      );
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleCreateFromAi() {
    if (!currentBusiness?.id || aiItems.length === 0) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    const isTemplate = recurrence !== "none";

    const { data, error } = await supabase
      .from("checklists")
      .insert({
        business_id: currentBusiness.id,
        title: aiTitle || "Untitled Checklist",
        items: aiItems,
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
  }

  function extractTaskItems(): { text: string; required: boolean }[] {
    if (!manualEditor) return [];
    const items: { text: string; required: boolean }[] = [];
    manualEditor.state.doc.descendants((node) => {
      if (node.type.name === "taskItem") {
        const text = node.textContent.trim();
        if (text) {
          items.push({ text, required: true });
        }
      }
    });
    return items;
  }

  async function handleCreateManual() {
    if (!manualTitle.trim() || !currentBusiness?.id) return;
    setCreating(true);

    const items = extractTaskItems();

    if (items.length === 0) {
      toast.error("Add at least one item");
      setCreating(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const isTemplate = recurrence !== "none";

    const { data, error } = await supabase
      .from("checklists")
      .insert({
        business_id: currentBusiness.id,
        title: manualTitle.trim(),
        items,
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
  }

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

        {/* ── From SOP ────────────────────────────────────── */}
        <TabsContent value="from-sop" className="space-y-4 pt-4">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Create from SOP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select SOP</Label>
                <Select value={selectedSopId} onValueChange={setSelectedSopId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an SOP..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview extracted items */}
              {previewItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Extracted items ({previewItems.length})</Label>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-3">
                    {previewItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSopId && previewItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No extractable checklist items found in this SOP.
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateFromSop}
                disabled={creating || !selectedSopId || previewItems.length === 0}
                className="w-full"
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckSquare className="mr-2 h-4 w-4" />
                )}
                Create Checklist ({previewItems.length} items)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Generate ─────────────────────────────────── */}
        <TabsContent value="ai" className="space-y-4 pt-4">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">AI Generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Describe what checklist you need</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Daily cafe opening checklist, Kitchen closing procedures, Weekly safety inspection..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                variant="outline"
              >
                {aiGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {aiGenerating ? "Generating..." : "Generate Items (3 credits)"}
              </Button>

              {/* Generated items — editable list */}
              {aiItems.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={aiTitle}
                      onChange={(e) => setAiTitle(e.target.value)}
                      placeholder="Checklist title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Items ({aiItems.length})</Label>
                    <div className="space-y-1.5">
                      {aiItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <Input
                            value={item.text}
                            onChange={(e) => {
                              const next = [...aiItems];
                              next[i] = { ...next[i], text: e.target.value };
                              setAiItems(next);
                            }}
                            className="h-8 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setAiItems(aiItems.filter((_, j) => j !== i))}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAiItems([...aiItems, { text: "", required: true }])}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add item
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Recurrence</Label>
                      <Select value={recurrence} onValueChange={setRecurrence}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due date</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateFromAi}
                    disabled={creating || aiItems.length === 0}
                    className="w-full"
                  >
                    {creating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckSquare className="mr-2 h-4 w-4" />
                    )}
                    Create Checklist ({aiItems.filter((i) => i.text.trim()).length} items)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Manual ──────────────────────────────────────── */}
        <TabsContent value="manual" className="pt-4">
          <div className="space-y-4">
            {/* Title — large, borderless, document-style */}
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Untitled Checklist"
              className="w-full border-0 border-b border-border bg-transparent pb-2 text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary"
            />

            {/* TipTap TaskList editor */}
            <div className="rounded-md border bg-card">
              <EditorContent editor={manualEditor} />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Recurrence</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Due date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleCreateManual}
              disabled={creating || !manualTitle.trim()}
              className="w-full"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckSquare className="mr-2 h-4 w-4" />
              )}
              Create Checklist
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
