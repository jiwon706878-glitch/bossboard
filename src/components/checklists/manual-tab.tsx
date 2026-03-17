"use client";

import { useState, useRef } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { PreviewItem, RECURRENCE_OPTIONS } from "@/lib/checklists/types";

const ChecklistEditor = dynamic(
  () => import("@/components/checklists/checklist-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] rounded-md border bg-card animate-pulse" />
    ),
  }
);

interface ManualTabProps {
  recurrence: string;
  setRecurrence: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  creating: boolean;
  onSubmit: (title: string, items: PreviewItem[]) => void;
}

export function ManualTab({
  recurrence,
  setRecurrence,
  dueDate,
  setDueDate,
  creating,
  onSubmit,
}: ManualTabProps) {
  const [manualTitle, setManualTitle] = useState("");
  const editorRef =
    useRef<
      import("@/components/checklists/checklist-editor").ChecklistEditorRef
    >(null);

  function handleCreate() {
    if (!manualTitle.trim()) return;
    const items = editorRef.current?.getItems() ?? [];
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    onSubmit(manualTitle.trim(), items);
  }

  return (
    <div className="space-y-4">
      {/* Title -- large, borderless, document-style */}
      <input
        type="text"
        value={manualTitle}
        onChange={(e) => setManualTitle(e.target.value)}
        placeholder="Untitled Checklist"
        className="w-full border-0 border-b border-border bg-transparent pb-2 text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary"
      />

      {/* TipTap TaskList editor */}
      <ChecklistEditor ref={editorRef} />

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
        onClick={handleCreate}
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
  );
}
