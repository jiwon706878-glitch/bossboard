"use client";

import { useState } from "react";
import { CheckSquare, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PreviewItem, RECURRENCE_OPTIONS } from "@/lib/checklists/types";

interface AiGenerateTabProps {
  businessId: string;
  recurrence: string;
  setRecurrence: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  creating: boolean;
  onSubmit: (title: string, items: PreviewItem[]) => void;
}

export function AiGenerateTab({
  businessId, recurrence, setRecurrence, dueDate, setDueDate, creating, onSubmit,
}: AiGenerateTabProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiItems, setAiItems] = useState<PreviewItem[]>([]);
  const [aiTitle, setAiTitle] = useState("");

  async function handleAiGenerate() {
    if (!aiPrompt.trim() || !businessId) return;
    setAiGenerating(true);
    setAiItems([]);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          topic: `Generate a checklist (not an SOP) for: ${aiPrompt}. Return ONLY a numbered list of action items. No headers, no sections, just the checklist items.`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      const text = data.text;
      if (!text?.trim()) { toast.error("AI returned empty response"); return; }

      const lines = text.split("\n").filter((l: string) => l.trim());
      const items: PreviewItem[] = [];
      for (const line of lines) {
        const cleaned = line
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[-\u2022\u25A1\u2610\u2713\u2714]\s*/, "")
          .replace(/^\*\s*/, "")
          .trim();
        if (cleaned && cleaned.length > 3 && !/^(title|purpose|scope|checklist|summary)/i.test(cleaned)) {
          items.push({ text: cleaned, required: true });
        }
      }
      if (items.length === 0) { toast.error("Could not extract items from AI response"); return; }

      setAiItems(items);
      if (!aiTitle) setAiTitle(aiPrompt.length > 60 ? aiPrompt.slice(0, 60) : aiPrompt);
      toast.success(`Generated ${items.length} items`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate checklist");
    } finally {
      setAiGenerating(false);
    }
  }

  function updateItem(i: number, text: string) {
    const next = [...aiItems];
    next[i] = { ...next[i], text };
    setAiItems(next);
  }

  return (
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
        <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiPrompt.trim()} variant="outline">
          {aiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {aiGenerating ? "Generating..." : "Generate Items (3 credits)"}
        </Button>

        {aiItems.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} placeholder="Checklist title" />
            </div>
            <div className="space-y-2">
              <Label>Items ({aiItems.length})</Label>
              <div className="space-y-1.5">
                {aiItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input value={item.text} onChange={(e) => updateItem(i, e.target.value)} className="h-8 text-sm" />
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
                type="button" variant="outline" size="sm"
                onClick={() => setAiItems([...aiItems, { text: "", required: true }])}
              >
                <Plus className="mr-1 h-3 w-3" /> Add item
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <Button
              onClick={() => onSubmit(aiTitle || "Untitled Checklist", aiItems)}
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
  );
}
