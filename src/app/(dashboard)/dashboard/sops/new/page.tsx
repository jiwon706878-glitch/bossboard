"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { sopKeys, recentDocKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, Save, ArrowLeft, Upload, FileUp, ExternalLink, Send, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import Link from "next/link";
import { TagInput } from "@/components/sops/tag-input";
import { markdownToTipTap } from "@/lib/markdown-to-tiptap";

const SOPEditor = lazy(() =>
  import("@/components/sops/sop-editor").then((m) => ({ default: m.SOPEditor }))
);

const CATEGORIES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "operations", label: "Operations" },
  { value: "safety", label: "Safety" },
  { value: "customer-service", label: "Customer Service" },
  { value: "inventory", label: "Inventory" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "other", label: "Other" },
];

const TEMPLATES = [
  { label: "Employee Onboarding Checklist", topic: "Employee Onboarding Checklist — steps for welcoming a new hire, paperwork, training schedule, first-week tasks" },
  { label: "Customer Complaint Handling", topic: "Customer Complaint Handling — how to receive, log, investigate, resolve, and follow up on customer complaints" },
  { label: "Opening/Closing Procedures", topic: "Opening and Closing Procedures — daily tasks for opening the business in the morning and closing at the end of the day" },
  { label: "Food Safety & Hygiene", topic: "Food Safety and Hygiene — handwashing, temperature control, cross-contamination prevention, cleaning schedules" },
  { label: "Cash Register Operations", topic: "Cash Register Operations — opening the register, processing transactions, handling returns, end-of-day reconciliation" },
  { label: "Inventory Management", topic: "Inventory Management — receiving stock, counting inventory, reorder thresholds, storage procedures" },
];

function textToTipTapJSON(text: string): JSONContent {
  const lines = text.split("\n");
  const content: JSONContent[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      content.push({ type: "paragraph" });
      continue;
    }
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    });
  }

  return { type: "doc", content };
}

export default function NewSOPPage() {
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
  const [generatedText, setGeneratedText] = useState("");
  const [generating, setGenerating] = useState(false);

  const [folderId, setFolderId] = useState("");
  const [docType, setDocType] = useState("sop");
  const [tags, setTags] = useState<string[]>([]);
  const [availableFolders, setAvailableFolders] = useState<{ id: string; name: string }[]>([]);

  // Upload & reformat state
  const [uploadText, setUploadText] = useState("");
  const [reformatting, setReformatting] = useState(false);

  // File convert state
  const [fileConverting, setFileConverting] = useState(false);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);

  // Generation warning state
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningDismiss, setWarningDismiss] = useState(false);

  // Auto-save state
  const [savedSopId, setSavedSopId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  // Pre-select folder from URL query param
  useEffect(() => {
    const folderParam = searchParams.get("folder");
    if (folderParam && !folderId) {
      setFolderId(folderParam);
    }
  }, [searchParams, folderId]);

  // Load available folders
  useEffect(() => {
    async function loadFolders() {
      const bizId = currentBusiness?.id;
      if (!bizId) return;
      const { data } = await supabase
        .from("folders")
        .select("id, name")
        .eq("business_id", bizId)
        .order("sort_order");
      setAvailableFolders(data ?? []);
    }
    loadFolders();
  }, [currentBusiness?.id, supabase]);

  async function getBusinessId(): Promise<string | null> {
    if (currentBusiness?.id) return currentBusiness.id;
    const { data } = await supabase.from("businesses").select("id").limit(1);
    return data?.[0]?.id || null;
  }

  function extractTitle(text: string): string {
    const lines = text.split("\n").filter((l: string) => l.trim());
    if (lines.length === 0) return "Untitled";

    // Check first line — if it's just "1. Title" or "Title", the actual title is on the next line
    const firstLine = lines[0].trim();
    const cleaned = firstLine
      .replace(/^\d+\.\s*/, "")
      .replace(/^Title:\s*/i, "")
      .trim();

    // If after cleaning we get just "Title" or empty, use the next line
    if (!cleaned || /^title$/i.test(cleaned)) {
      if (lines.length > 1) {
        const secondLine = lines[1].trim();
        const title = secondLine.replace(/^\d+\.\s*/, "").replace(/^Title:\s*/i, "").trim();
        return title.length > 80 ? title.substring(0, 80) : title;
      }
      return "Untitled";
    }

    return cleaned.length > 80 ? cleaned.substring(0, 80) : cleaned;
  }

  async function autoSaveDraft(titleText: string, content: JSONContent, text: string) {
    const bizId = await getBusinessId();
    if (!bizId) return;

    const summary = text.substring(0, 200).replace(/\n/g, " ").trim();
    const { data: user } = await supabase.auth.getUser();

    const insertPayload = {
      business_id: bizId,
      title: titleText.trim() || "Untitled",
      content,
      summary: summary || null,
      category: category || null,
      folder_id: folderId && folderId !== "none" ? folderId : null,
      doc_type: docType,
      tags: tags.length > 0 ? tags : [],
      source_file_url: sourceFileUrl,
      source_file_name: sourceFileName,
      status: "draft",
      version: 1,
      created_by: user.user?.id,
    };
    const { data, error } = await supabase
      .from("sops")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      return;
    }

    setSavedSopId(data.id);
    toast.success("Document saved as draft. Edit and publish when ready.");
  }

  function handleResult(text: string) {
    setGeneratedText(text);
    const json = textToTipTapJSON(text);
    setEditorContent(json);

    const extracted = extractTitle(text);
    // Use the AI-extracted title if it looks meaningful, otherwise fall back to the user's topic
    const generic = ["untitled sop", "제목", "title", "sop"];
    const titleText =
      extracted && !generic.includes(extracted.toLowerCase())
        ? extracted
        : topic.trim() || extracted;
    setTitle(titleText);

    // Auto-save as draft
    autoSaveDraft(titleText, json, text);

    // Auto-scroll to result
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function onGenerateClick() {
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }
    const dismissed = localStorage.getItem("bossboard_sop_warning_dismissed") === "true";
    if (dismissed) {
      handleGenerate();
    } else {
      setWarningOpen(true);
    }
  }

  function confirmGenerate() {
    if (warningDismiss) {
      localStorage.setItem("bossboard_sop_warning_dismissed", "true");
    }
    setWarningOpen(false);
    handleGenerate();
  }

  async function handleGenerate() {

    setGenerating(true);
    setGeneratedText("");
    setEditorContent(null);
    setTitle("");

    try {
      const businessId = await getBusinessId();

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          topic,
          category: category || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      const text = data.text;

      if (!text || !text.trim()) {
        toast.error("AI returned empty response. Please try again.");
        setGenerating(false);
        return;
      }

      handleResult(text);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate SOP"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleReformat() {
    if (!uploadText.trim()) {
      toast.error("Please paste or upload some text");
      return;
    }

    setReformatting(true);
    setGeneratedText("");
    setEditorContent(null);
    setTitle("");

    try {
      const businessId = await getBusinessId();

      const res = await fetch("/api/ai/reformat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, text: uploadText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (!data.text || !data.text.trim()) {
        toast.error("AI returned empty response. Please try again.");
        setReformatting(false);
        return;
      }

      handleResult(data.text);
      toast.success("Document reformatted! Review and save below.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reformat SOP"
      );
    } finally {
      setReformatting(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10_485_760) {
      toast.error("File too large. Max file size: 10MB.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const imageExts = ["jpg", "jpeg", "png", "webp"];
    const textExts = ["txt", "md", "csv"];
    const supported = [...textExts, "docx", "pdf", ...imageExts];

    if (!ext || !supported.includes(ext)) {
      toast.error("Unsupported format. Use TXT, MD, DOCX, PDF, JPG, PNG, or WebP.");
      return;
    }

    try {
      // Images and PDFs: upload + AI convert in one step
      if (imageExts.includes(ext) || ext === "pdf") {
        await handleFileConvert(file);
        return;
      }

      if (textExts.includes(ext)) {
        const text = await file.text();
        setUploadText(text);
        toast.success(`Loaded ${file.name}`);
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (!result.value.trim()) {
          toast.error("Could not extract text from this DOCX file.");
          return;
        }
        setUploadText(result.value);
        toast.success(`Loaded ${file.name}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to read file"
      );
    }
  }

  async function handleFileConvert(file: File) {
    setFileConverting(true);
    setGeneratedText("");
    setEditorContent(null);
    setTitle("");
    setSourceFileUrl(null);
    setSourceFileName(null);

    try {
      const businessId = await getBusinessId();
      const formData = new FormData();
      formData.append("file", file);
      if (businessId) formData.append("businessId", businessId);

      const res = await fetch("/api/ai/file-convert", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (!data.text?.trim()) {
        toast.error("AI returned empty response. Please try again.");
        setFileConverting(false);
        return;
      }

      setSourceFileUrl(data.fileUrl);
      setSourceFileName(data.fileName);
      if (data.suggestedDocType) {
        setDocType(data.suggestedDocType);
      }
      handleResult(data.text);
      toast.success(`"${file.name}" uploaded and converted!`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to convert file"
      );
    } finally {
      setFileConverting(false);
    }
  }

  function handleTemplateClick(templateTopic: string) {
    setTopic(templateTopic);
    // Trigger generate after state update
    setTimeout(() => {
      const btn = document.getElementById("generate-btn");
      if (btn) btn.click();
    }, 50);
  }

  async function handlePublish() {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!editorContent) {
      toast.error("Please add some content");
      return;
    }

    setPublishing(true);

    if (savedSopId) {
      // Update the auto-saved draft to published
      const { error } = await supabase
        .from("sops")
        .update({
          title: title.trim(),
          content: editorContent,
          category: category || null,
          folder_id: folderId && folderId !== "none" ? folderId : null,
          doc_type: docType,
          tags: tags.length > 0 ? tags : [],
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", savedSopId);

      if (error) {
        console.error("SOP publish error:", error.message);
        toast.error("Failed to publish document. Please try again.");
        setPublishing(false);
        return;
      }

      toast.success("Document published!");
      router.push(`/dashboard/sops/${savedSopId}`);
      if (currentBusiness?.id) {
        queryClient.invalidateQueries({ queryKey: sopKeys.all(currentBusiness.id) });
        queryClient.invalidateQueries({ queryKey: sopKeys.stats(currentBusiness.id) });
        queryClient.invalidateQueries({ queryKey: recentDocKeys.latest(currentBusiness.id) });
      }
    } else {
      // Manual tab — no auto-save happened, insert as published
      const bizId = await getBusinessId();
      if (!bizId) {
        toast.error("No business found. Please complete onboarding first.");
        setPublishing(false);
        return;
      }

      let summary = "";
      if (generatedText) {
        summary = generatedText.substring(0, 200).replace(/\n/g, " ").trim();
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const publishPayload = {
        business_id: bizId,
        title: title.trim(),
        content: editorContent,
        summary: summary || null,
        category: category || null,
        folder_id: folderId && folderId !== "none" ? folderId : null,
        doc_type: docType,
        tags: tags.length > 0 ? tags : [],
        source_file_url: sourceFileUrl,
        source_file_name: sourceFileName,
        status: "published",
        version: 1,
        created_by: userId,
      };
      const { data, error } = await supabase
        .from("sops")
        .insert(publishPayload)
        .select("id")
        .single();

      if (error) {
        console.error("SOP publish error:", error.message);
        toast.error("Failed to publish document. Please try again.");
        setPublishing(false);
        return;
      }

      toast.success("Document published!");
      router.push(`/dashboard/sops/${data.id}`);
      if (currentBusiness?.id) {
        queryClient.invalidateQueries({ queryKey: sopKeys.all(currentBusiness.id) });
        queryClient.invalidateQueries({ queryKey: sopKeys.stats(currentBusiness.id) });
        queryClient.invalidateQueries({ queryKey: recentDocKeys.latest(currentBusiness.id) });
      }
    }
  }

  function handleFileImport(file: File) {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      toast.error("Only .md and .txt files are supported for import");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const tiptapContent = markdownToTipTap(text);
      setEditorContent(tiptapContent);
      if (!title.trim()) {
        const firstHeading = tiptapContent.content?.find((n: any) => n.type === "heading");
        if (firstHeading?.content?.[0]?.text) {
          setTitle(firstHeading.content[0].text);
        } else {
          setTitle(file.name.replace(/\.(md|txt)$/, ""));
        }
      }
      toast.success(`Imported ${file.name}`);
    };
    reader.readAsText(file);
  }

  const isProcessing = generating || reformatting || fileConverting;
  const businessId = currentBusiness?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 lg:-m-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5 shrink-0">
        <Link href="/dashboard/sops">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to documents</span>
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground">New Document</span>
        {sourceFileName && <span className="text-xs text-muted-foreground truncate hidden sm:block">from {sourceFileName}</span>}
        <div className="flex-1" />
        {savedSopId && (
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href={`/dashboard/sops/${savedSopId}`}>
              <ExternalLink className="mr-1 h-3 w-3" /> View Draft
            </Link>
          </Button>
        )}
        <input ref={importRef} type="file" accept=".md,.txt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileImport(e.target.files[0]); e.target.value = ""; }} />
        <Button variant="ghost" size="sm" onClick={() => importRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Import .md
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowAiDialog(true)} disabled={isProcessing}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          AI Generate
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePublish()} disabled={publishing || !title.trim()}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {publishing ? "Saving..." : "Save Draft"}
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={publishing || !title.trim()}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {publishing ? "Publishing..." : "Publish"}
        </Button>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="border-b bg-muted/30 px-4 py-3 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {generating && "AI is generating your document..."}
            {reformatting && "AI is reformatting your document..."}
            {fileConverting && "Converting file..."}
          </div>
        </div>
      )}

      {/* Main editor area */}
      <div
        className={cn("flex-1 overflow-y-auto relative", isDragOver && "ring-2 ring-primary ring-inset bg-primary/5")}
        ref={resultRef}
        onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFileImport(file); }}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/5 pointer-events-none">
            <div className="rounded-lg border-2 border-dashed border-primary p-8 text-center">
              <p className="text-primary font-medium">Drop .md file to import</p>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-3xl px-4 py-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-4"
            autoFocus
          />
          <Suspense fallback={<div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Loading editor...</div>}>
            <SOPEditor
              content={editorContent}
              onChange={setEditorContent}
              businessId={businessId}
            />
          </Suspense>
          {(generatedText || sourceFileName) && (
            <p className="mt-2 text-xs text-muted-foreground/70">
              AI-generated content may contain inaccuracies. Review and customize before publishing.
            </p>
          )}
        </div>
      </div>

      {/* Bottom metadata bar */}
      <div className="border-t shrink-0">
        <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30">
            <span>Document settings</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", metaOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sop">SOP</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Folder</Label>
                <Select value={folderId || "none"} onValueChange={(v) => setFolderId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Unfiled" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unfiled</SelectItem>
                    {availableFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <TagInput tags={tags} onChange={setTags} />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
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
                onChange={(e) => setTopic(e.target.value)}
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
                  onChange={(e) => setUploadText(e.target.value)}
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
                  <input id="file-upload-dialog" type="file" accept=".txt,.md,.docx,.pdf,.csv,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileUpload} />
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
                      onClick={() => { setTopic(t.topic); }}
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
              <Button variant="outline" onClick={() => { setShowAiDialog(false); handleReformat(); }} disabled={reformatting}>
                {reformatting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Reformat (2 credits)
              </Button>
            )}
            <Button onClick={() => { setShowAiDialog(false); onGenerateClick(); }} disabled={generating || !topic}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate (3 credits)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generation warning dialog */}
      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Before you generate</DialogTitle>
            <DialogDescription>
              AI-generated content is a draft. Please review and customize all details to match your specific business before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox id="dismiss-warning" checked={warningDismiss} onCheckedChange={(v) => setWarningDismiss(v === true)} />
            <label htmlFor="dismiss-warning" className="text-sm text-muted-foreground cursor-pointer">Don&apos;t show this again</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningOpen(false)}>Cancel</Button>
            <Button onClick={confirmGenerate}>Got it, generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
