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
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check, Save } from "lucide-react";
import { toast } from "sonner";

export default function NewSocialPostPage() {
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("casual");
  const [platform, setPlatform] = useState("Instagram");
  const [scheduledAt, setScheduledAt] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const { complete, isLoading } = useCompletion({
    api: "/api/ai/caption",
    body: {
      businessId: currentBusiness?.id,
      description,
      tone,
      platform,
    },
    onFinish: (_prompt, completion) => {
      // Parse caption and hashtags
      const parts = completion.split("---HASHTAGS---");
      setCaption(parts[0]?.trim() || completion);
      if (parts[1]) {
        const tags = parts[1]
          .trim()
          .split(/\s+/)
          .map((t) => t.replace(/^#/, ""))
          .filter(Boolean);
        setHashtags(tags);
      }
    },
  });

  async function handleGenerate() {
    if (!currentBusiness) {
      toast.error("No business selected");
      return;
    }
    if (!description) {
      toast.error("Please describe your post");
      return;
    }
    await complete("");
  }

  async function handleSave(status: "draft" | "scheduled") {
    if (!currentBusiness || !caption) return;
    setSaving(true);

    const { error } = await supabase.from("social_posts").insert({
      business_id: currentBusiness.id,
      caption,
      hashtags,
      tone,
      status,
      scheduled_at: status === "scheduled" && scheduledAt ? scheduledAt : null,
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success(status === "draft" ? "Saved as draft!" : "Post scheduled!");
    router.push("/dashboard/social");
    router.refresh();
  }

  async function copyCaption() {
    const fullText =
      caption + (hashtags.length > 0 ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ") : "");
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Social Post</h1>
        <p className="text-muted-foreground">
          Describe your post and let AI generate the perfect caption.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What is this post about?</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., New seasonal menu launch, behind-the-scenes of our kitchen, customer appreciation day..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="fun">Fun & Playful</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Twitter/X">Twitter/X</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={isLoading || !description}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Caption (1 credit)
          </Button>
        </CardContent>
      </Card>

      {caption && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Caption</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyCaption}>
                {copied ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <Copy className="mr-1 h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm">{caption}</p>
              {hashtags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Schedule for (optional)</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" /> Save as Draft
              </Button>
              <Button
                onClick={() => handleSave(scheduledAt ? "scheduled" : "draft")}
                disabled={saving}
              >
                {scheduledAt ? "Schedule Post" : "Save Post"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
