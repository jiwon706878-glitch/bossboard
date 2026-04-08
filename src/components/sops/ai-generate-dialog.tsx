"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Upload, FileUp } from "lucide-react";

const TEMPLATES = [
  { label: "Employee Onboarding Checklist", topic: "Employee Onboarding Checklist — steps for welcoming a new hire, paperwork, training schedule, first-week tasks" },
  { label: "Customer Complaint Handling", topic: "Customer Complaint Handling — how to receive, log, investigate, resolve, and follow up on customer complaints" },
  { label: "Opening/Closing Procedures", topic: "Opening and Closing Procedures — daily tasks for opening the business in the morning and closing at the end of the day" },
  { label: "Food Safety & Hygiene", topic: "Food Safety and Hygiene — handwashing, temperature control, cross-contamination prevention, cleaning schedules" },
  { label: "Cash Register Operations", topic: "Cash Register Operations — opening the register, processing transactions, handling returns, end-of-day reconciliation" },
  { label: "Inventory Management", topic: "Inventory Management — receiving stock, counting inventory, reorder thresholds, storage procedures" },
];

interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  onTopicChange: (topic: string) => void;
  uploadText: string;
  onUploadTextChange: (text: string) => void;
  generating: boolean;
  reformatting: boolean;
  onGenerate: () => void;
  onReformat: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AiGenerateDialog({
  open,
  onOpenChange,
  topic,
  onTopicChange,
  uploadText,
  onUploadTextChange,
  generating,
  reformatting,
  onGenerate,
  onReformat,
  onFileUpload,
}: AiGenerateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Generate</DialogTitle>
          <DialogDescription>Describe what you want to create and AI will write it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Topic / Task</Label>
            <Textarea
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="e.g., Opening procedures for the morning shift..."
              rows={3}
            />
          </div>

          {/* Upload section */}
          <div className="space-y-2">
            <Label>Or upload & reformat</Label>
            <div className="flex items-center gap-3">
              <Textarea
                value={uploadText}
                onChange={(e) => onUploadTextChange(e.target.value)}
                placeholder="Paste existing text to reformat..."
                rows={2}
                className="flex-1"
              />
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="file-upload-dialog"
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
                >
                  <FileUp className="h-3 w-3" /> Upload
                </Label>
                <input id="file-upload-dialog" type="file" accept=".txt,.md,.docx,.pdf,.csv,.jpg,.jpeg,.png,.webp" className="hidden" onChange={onFileUpload} />
              </div>
            </div>
            {uploadText && <span className="text-[10px] text-muted-foreground">{uploadText.length.toLocaleString()} characters</span>}
          </div>

          {/* Templates */}
          {!generating && !reformatting && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Quick templates:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => { onTopicChange(t.topic); }}
                    className="rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {uploadText.trim() && (
            <Button variant="outline" onClick={() => { onOpenChange(false); onReformat(); }} disabled={reformatting}>
              {reformatting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Reformat (2 credits)
            </Button>
          )}
          <Button onClick={() => { onOpenChange(false); onGenerate(); }} disabled={generating || !topic}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate (3 credits)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
