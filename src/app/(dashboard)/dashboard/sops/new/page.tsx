"use client";

import { useState, useRef, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Save, ArrowLeft, Upload, FileUp, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import Link from "next/link";

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
  const [tab, setTab] = useState("ai");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
  const [generatedText, setGeneratedText] = useState("");
  const [generating, setGenerating] = useState(false);

  // Upload & reformat state
  const [uploadText, setUploadText] = useState("");
  const [reformatting, setReformatting] = useState(false);

  // Auto-save state
  const [savedSopId, setSavedSopId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  async function getBusinessId(): Promise<string | null> {
    if (currentBusiness?.id) return currentBusiness.id;
    const { data } = await supabase.from("businesses").select("id").limit(1);
    return data?.[0]?.id || null;
  }

  function extractTitle(text: string): string {
    const firstLine = text.split("\n").find((l: string) => l.trim());
    if (!firstLine) return "Untitled SOP";
    const cleaned = firstLine
      .replace(/^\d+\.\s*/, "")
      .replace(/^Title:\s*/i, "")
      .trim();
    return cleaned.length > 80 ? cleaned.substring(0, 80) : cleaned;
  }

  async function autoSaveDraft(titleText: string, content: JSONContent, text: string) {
    const bizId = await getBusinessId();
    if (!bizId) return;

    const summary = text.substring(0, 200).replace(/\n/g, " ").trim();
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("sops")
      .insert({
        business_id: bizId,
        title: titleText.trim() || "Untitled SOP",
        content,
        summary: summary || null,
        category: category || null,
        status: "draft",
        version: 1,
        created_by: user.user?.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Auto-save failed:", error.message);
      return;
    }

    setSavedSopId(data.id);
    toast.success("SOP saved as draft. Edit and publish when ready.");
  }

  function handleResult(text: string) {
    setGeneratedText(text);
    const json = textToTipTapJSON(text);
    setEditorContent(json);

    const titleText = extractTitle(text);
    setTitle(titleText);

    // Auto-save as draft
    autoSaveDraft(titleText, json, text);

    // Auto-scroll to result
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleGenerate() {
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }

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
      console.error("SOP generation error:", error);
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
      toast.success("SOP reformatted! Review and save below.");
    } catch (error) {
      console.error("SOP reformat error:", error);
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

    if (file.size > 4_718_592) {
      toast.error("File too large. Max file size: 4.5MB.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const supported = ["txt", "md", "csv", "docx", "pdf"];

    if (!ext || !supported.includes(ext)) {
      toast.error("Unsupported file format. Please use TXT, MD, DOCX, PDF, or CSV.");
      return;
    }

    try {
      if (ext === "txt" || ext === "md" || ext === "csv") {
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
      } else if (ext === "pdf") {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to extract text from PDF");
        }
        const data = await res.json();
        if (!data.text?.trim()) {
          toast.error("Could not extract text from this PDF.");
          return;
        }
        setUploadText(data.text);
        toast.success(`Loaded ${file.name}`);
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to read file"
      );
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
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", savedSopId);

      if (error) {
        toast.error(error.message);
        setPublishing(false);
        return;
      }

      toast.success("SOP published!");
      router.push(`/dashboard/sops/${savedSopId}`);
      router.refresh();
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

      const { data, error } = await supabase
        .from("sops")
        .insert({
          business_id: bizId,
          title: title.trim(),
          content: editorContent,
          summary: summary || null,
          category: category || null,
          status: "published",
          version: 1,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select("id")
        .single();

      if (error) {
        toast.error(error.message);
        setPublishing(false);
        return;
      }

      toast.success("SOP published!");
      router.push(`/dashboard/sops/${data.id}`);
      router.refresh();
    }
  }

  const isProcessing = generating || reformatting;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/sops">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">New SOP</h1>
          <p className="text-muted-foreground">
            Create a new Standard Operating Procedure.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ai">AI Generate</TabsTrigger>
          <TabsTrigger value="upload">Upload &amp; Reformat</TabsTrigger>
          <TabsTrigger value="manual">Start from scratch</TabsTrigger>
        </TabsList>

        {/* AI Generate Tab */}
        <TabsContent value="ai" className="space-y-4 pt-4">
          <Card className="border bg-card border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-foreground">Generate with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Topic / Task</Label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Opening procedures for the morning shift, How to handle customer complaints..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                id="generate-btn"
                onClick={handleGenerate}
                disabled={generating || !topic}
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {generating ? "Generating..." : "Generate SOP (3 credits)"}
              </Button>

              {/* Templates */}
              {!editorContent && !generating && (
                <div className="pt-2">
                  <p className="mb-3 text-sm text-muted-foreground">Or choose a template:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => handleTemplateClick(t.topic)}
                        className="rounded-md border px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted/50 border-border text-foreground"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generating skeleton */}
          {generating && !editorContent && (
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Generating your SOP...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                <p className="pt-2 text-center text-sm text-muted-foreground animate-pulse">
                  AI is writing your SOP — this usually takes 10-20 seconds...
                </p>
              </CardContent>
            </Card>
          )}

          {editorContent && (
            <div ref={resultRef}>
              <Card className="border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Generated SOP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="SOP title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Suspense
                      fallback={
                        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                          Loading editor...
                        </div>
                      }
                    >
                      <SOPEditor
                        content={editorContent}
                        onChange={setEditorContent}
                      />
                    </Suspense>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handlePublish} disabled={publishing}>
                      {publishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {publishing ? "Publishing..." : "Publish SOP"}
                    </Button>
                    {savedSopId && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/sops/${savedSopId}`}>
                          <ExternalLink className="mr-1 h-4 w-4" /> View Draft
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Upload & Reformat Tab */}
        <TabsContent value="upload" className="space-y-4 pt-4">
          <Card className="border bg-card border-l-4 border-l-amber">
            <CardHeader>
              <CardTitle className="text-foreground">Upload &amp; Reformat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste your existing SOP text or upload a .txt file. AI will reformat it into a clean, structured format.
              </p>
              <div className="space-y-2">
                <Label className="text-foreground">Paste your existing SOP</Label>
                <Textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder="Paste your existing SOP text here..."
                  rows={8}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="file-upload"
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/50 border-border"
                  >
                    <FileUp className="h-4 w-4" />
                    Upload file
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.md,.docx,.pdf,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {uploadText && (
                    <span className="text-xs text-muted-foreground">
                      {uploadText.length.toLocaleString()} characters loaded
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports: TXT, MD, DOCX, PDF, CSV (Notion, Obsidian, Google Docs, Word compatible)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleReformat}
                disabled={reformatting || !uploadText.trim()}
              >
                {reformatting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {reformatting ? "Reformatting..." : "Reformat with AI (2 credits)"}
              </Button>
            </CardContent>
          </Card>

          {/* Reformatting skeleton */}
          {reformatting && !editorContent && (
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Reformatting your SOP...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <p className="pt-2 text-center text-sm text-muted-foreground animate-pulse">
                  AI is restructuring your SOP...
                </p>
              </CardContent>
            </Card>
          )}

          {editorContent && (
            <div ref={resultRef}>
              <Card className="border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Reformatted SOP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="SOP title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Suspense
                      fallback={
                        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                          Loading editor...
                        </div>
                      }
                    >
                      <SOPEditor
                        content={editorContent}
                        onChange={setEditorContent}
                      />
                    </Suspense>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handlePublish} disabled={publishing}>
                      {publishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {publishing ? "Publishing..." : "Publish SOP"}
                    </Button>
                    {savedSopId && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/sops/${savedSopId}`}>
                          <ExternalLink className="mr-1 h-4 w-4" /> View Draft
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual" className="space-y-4 pt-4">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Create SOP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="SOP title"
                />
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Suspense
                  fallback={
                    <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                      Loading editor...
                    </div>
                  }
                >
                  <SOPEditor
                    content={editorContent}
                    onChange={setEditorContent}
                  />
                </Suspense>
              </div>
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {publishing ? "Publishing..." : "Save & Publish SOP"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
