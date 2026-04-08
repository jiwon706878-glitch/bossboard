"use client";

import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Loader2, Send, X, Paperclip, FileIcon,
} from "lucide-react";

interface CreatePostFormProps {
  formVisible: boolean;
  formType: string;
  setFormType: (v: string) => void;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formContent: string;
  setFormContent: (v: string) => void;
  formPinned: boolean;
  setFormPinned: (v: boolean) => void;
  pollInputs: string[];
  setPollInputs: (v: string[] | ((prev: string[]) => string[])) => void;
  formAttachments: File[];
  setFormAttachments: (v: File[] | ((prev: File[]) => File[])) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreatePostForm({
  formVisible,
  formType,
  setFormType,
  formTitle,
  setFormTitle,
  formContent,
  setFormContent,
  formPinned,
  setFormPinned,
  pollInputs,
  setPollInputs,
  formAttachments,
  setFormAttachments,
  fileInputRef,
  submitting,
  onSubmit,
}: CreatePostFormProps) {
  return (
    <div className={cn(
      "overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
      formVisible ? "max-h-[700px] opacity-100 mb-0" : "max-h-0 opacity-0 mb-0"
    )}>
      <Card data-board-form>
        <CardHeader>
          <CardTitle className="text-base">New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discussion">Discussion</SelectItem>
                    <SelectItem value="notice">Notice</SelectItem>
                    <SelectItem value="poll">Poll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formType === "notice" && (
                <div className="flex items-end gap-2 pb-1">
                  <Switch id="pin-notice" checked={formPinned} onCheckedChange={setFormPinned} />
                  <Label htmlFor="pin-notice" className="cursor-pointer text-sm">Pin to top</Label>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} placeholder="Post title" required />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Write your post..." rows={4} />
            </div>

            {/* Poll options */}
            {formType === "poll" && (
              <div className="space-y-2">
                <Label>Poll Options (2-5)</Label>
                {pollInputs.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      data-poll-input
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollInputs];
                        next[i] = e.target.value;
                        setPollInputs(next);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (i === pollInputs.length - 1 && opt.trim() && pollInputs.length < 5) {
                            setPollInputs((prev) => [...prev, ""]);
                          }
                          setTimeout(() => {
                            const inputs = document.querySelectorAll<HTMLInputElement>('[data-poll-input]');
                            if (inputs[i + 1]) inputs[i + 1].focus();
                          }, 100);
                        }
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="text-sm"
                    />
                    {pollInputs.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPollInputs(pollInputs.filter((_, j) => j !== i))} aria-label="Remove option">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollInputs.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPollInputs([...pollInputs, ""])}>
                    Add Option
                  </Button>
                )}
              </div>
            )}

            {/* Attachment preview chips */}
            {formAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formAttachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs bg-muted/50">
                    <FileIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)}KB)</span>
                    <button
                      type="button"
                      onClick={() => setFormAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setFormAttachments((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-1" />
                Attach
              </Button>
              <Button type="submit" disabled={submitting || !formTitle.trim()} className="press-effect">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {submitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
