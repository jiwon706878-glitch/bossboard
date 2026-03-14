"use client";

import { useState, lazy, Suspense } from "react";
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
import { Sparkles, Loader2, Save, ArrowLeft } from "lucide-react";
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
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  async function getBusinessId(): Promise<string | null> {
    if (currentBusiness?.id) return currentBusiness.id;
    const { data } = await supabase.from("businesses").select("id").limit(1);
    return data?.[0]?.id || null;
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

      setGeneratedText(text);
      const json = textToTipTapJSON(text);
      setEditorContent(json);

      // Extract title from first line
      const firstLine = text.split("\n").find((l: string) => l.trim());
      if (firstLine) {
        const cleaned = firstLine
          .replace(/^\d+\.\s*/, "")
          .replace(/^Title:\s*/i, "")
          .trim();
        setTitle(cleaned.length > 80 ? cleaned.substring(0, 80) : cleaned);
      }

      toast.success("SOP generated! Review and save below.");
    } catch (error) {
      console.error("SOP generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate SOP"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!editorContent) {
      toast.error("Please add some content");
      return;
    }

    setSaving(true);

    const bizId = await getBusinessId();
    if (!bizId) {
      toast.error("No business found. Please complete onboarding first.");
      setSaving(false);
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
        status: "draft",
        version: 1,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("SOP created!");
    router.push(`/dashboard/sops/${data.id}`);
    router.refresh();
  }

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
          <TabsTrigger value="manual">Start from scratch</TabsTrigger>
        </TabsList>

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
              <Button onClick={handleGenerate} disabled={generating || !topic}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {generating ? "Generating..." : "Generate SOP (3 credits)"}
              </Button>
            </CardContent>
          </Card>

          {editorContent && (
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
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save SOP"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

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
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save SOP"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
