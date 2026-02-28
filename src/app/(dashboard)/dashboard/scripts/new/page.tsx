"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const formats = [
  { value: "tiktok", label: "TikTok" },
  { value: "reel", label: "Instagram Reel" },
  { value: "youtube_short", label: "YouTube Short" },
  { value: "story", label: "Story" },
  { value: "testimonial", label: "Testimonial" },
];

function parseScript(text: string) {
  const sections: Record<string, string> = {};
  const markers = ["---HOOK---", "---BODY---", "---CTA---", "---FILMING GUIDE---"];

  let current = "";
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (markers.includes(trimmed)) {
      current = trimmed.replace(/---/g, "").trim().toLowerCase();
      continue;
    }
    if (current) {
      sections[current] = (sections[current] || "") + line + "\n";
    }
  }

  return {
    hook: sections["hook"]?.trim() || "",
    body: sections["body"]?.trim() || "",
    cta: sections["cta"]?.trim() || "",
    filmingGuide: sections["filming guide"]?.trim() || "",
  };
}

export default function NewScriptPage() {
  const [format, setFormat] = useState("tiktok");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [title, setTitle] = useState("");
  const [parsedScript, setParsedScript] = useState<{
    hook: string;
    body: string;
    cta: string;
    filmingGuide: string;
  } | null>(null);
  const [fullScript, setFullScript] = useState("");
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const { complete, isLoading } = useCompletion({
    api: "/api/ai/script",
    body: {
      businessId: currentBusiness?.id,
      format,
      topic,
      audience,
    },
    onFinish: (_prompt, completion) => {
      setFullScript(completion);
      setParsedScript(parseScript(completion));
      if (!title) {
        setTitle(
          topic.length > 50 ? topic.substring(0, 50) + "..." : topic
        );
      }
    },
  });

  async function handleGenerate() {
    if (!currentBusiness) {
      toast.error("No business selected");
      return;
    }
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }
    await complete("");
  }

  async function handleSave() {
    if (!currentBusiness || !fullScript) return;
    setSaving(true);

    const { error } = await supabase.from("scripts").insert({
      business_id: currentBusiness.id,
      title: title || topic,
      format,
      topic,
      audience: audience || null,
      hook: parsedScript?.hook || null,
      body: parsedScript?.body || null,
      cta: parsedScript?.cta || null,
      filming_guide: parsedScript?.filmingGuide || null,
      full_script: fullScript,
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Script saved!");
    router.push("/dashboard/scripts");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Script</h1>
        <p className="text-muted-foreground">
          Create a camera-ready script for your short-form video.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Script Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Video Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Topic / Idea</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Behind the scenes of our morning prep, customer Q&A about our new product..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Target Audience (optional)</Label>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., Local families, fitness enthusiasts, foodies..."
            />
          </div>
          <Button onClick={handleGenerate} disabled={isLoading || !topic}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Script (3 credits)
          </Button>
        </CardContent>
      </Card>

      {parsedScript && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Script</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Script title"
              />
            </div>

            {parsedScript.hook && (
              <div className="rounded-lg border-l-4 border-amber bg-amber/10 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-foreground">
                  Hook
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {parsedScript.hook}
                </p>
              </div>
            )}

            {parsedScript.body && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Body
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {parsedScript.body}
                </p>
              </div>
            )}

            {parsedScript.cta && (
              <div className="rounded-lg border-l-4 border-primary bg-primary/10 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Call to Action
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {parsedScript.cta}
                </p>
              </div>
            )}

            {parsedScript.filmingGuide && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Filming Guide
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {parsedScript.filmingGuide}
                </p>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Script"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
