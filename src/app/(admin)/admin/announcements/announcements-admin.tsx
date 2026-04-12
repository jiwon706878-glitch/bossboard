"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Eye,
  Send,
  Newspaper,
  Bug,
  Sparkles,
  Tag,
  Megaphone,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  { value: "magazine", label: "Magazine", icon: Newspaper },
  { value: "bugfix", label: "Bug Fix", icon: Bug },
  { value: "feature", label: "Feature", icon: Sparkles },
  { value: "promo", label: "Promo", icon: Tag },
  { value: "general", label: "General", icon: Megaphone },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: Category;
  attachment_url: string | null;
  attachment_name: string | null;
  target_plan: string | null;
  target_user_id: string | null;
  scheduled_at: string;
  expires_at: string | null;
  created_at: string;
  announcement_reads: Array<{ count: number }>;
}

interface Props {
  initialAnnouncements: Announcement[];
}

export function AnnouncementsAdmin({ initialAnnouncements }: Props) {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [targetPlan, setTargetPlan] = useState("");
  const [expiresIn, setExpiresIn] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  function resetForm() {
    setTitle("");
    setBody("");
    setCategory("general");
    setTargetPlan("");
    setExpiresIn("");
    setAttachmentUrl("");
    setAttachmentName("");
    setComposing(false);
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }

    setSending(true);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      body: body.trim(),
      category,
      scheduled_at: new Date().toISOString(),
    };

    if (targetPlan) payload.target_plan = targetPlan;
    if (attachmentUrl) {
      payload.attachment_url = attachmentUrl;
      payload.attachment_name = attachmentName || "Attachment";
    }
    if (expiresIn) {
      const exp = new Date();
      exp.setDate(exp.getDate() + parseInt(expiresIn, 10));
      payload.expires_at = exp.toISOString();
    }

    // Get current user as created_by
    const { data: { user } } = await supabase.auth.getUser();
    if (user) payload.created_by = user.id;

    const { data, error } = await supabase
      .from("announcements")
      .insert(payload)
      .select("*, announcement_reads(count)")
      .single();

    if (error) {
      toast.error("Failed to send: " + error.message);
    } else if (data) {
      setAnnouncements((prev) => [data as Announcement, ...prev]);
      toast.success("Announcement sent");
      resetForm();
    }
    setSending(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
    } else {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Deleted");
    }
  }

  const getReadCount = (a: Announcement) =>
    a.announcement_reads?.[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Broadcast to all users or target by plan
          </p>
        </div>
        {!composing && (
          <Button onClick={() => setComposing(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        )}
      </div>

      {/* Compose form */}
      {composing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compose Announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="Announcement body (supports plain text)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            {/* Category selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        category === cat.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Targeting */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Target plan (optional)
                </label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value)}
                >
                  <option value="">All users</option>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Expires in (days, optional)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 7"
                  min="1"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                />
              </div>
            </div>

            {/* Attachment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Attachment URL (optional)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="File name"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send Now"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements list */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No announcements yet. Create one to broadcast to your users.
            </CardContent>
          </Card>
        ) : (
          announcements.map((a) => {
            const CatIcon =
              CATEGORIES.find((c) => c.value === a.category)?.icon ?? Megaphone;
            const readCount = getReadCount(a);
            const isExpired =
              a.expires_at && new Date(a.expires_at) < new Date();

            return (
              <Card
                key={a.id}
                className={cn(isExpired && "opacity-60")}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted p-2">
                      <CatIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{a.title}</h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {a.category}
                        </span>
                        {a.target_plan && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                            {a.target_plan} only
                          </span>
                        )}
                        {isExpired && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                            expired
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {a.body}
                      </p>
                      {a.attachment_url && (
                        <a
                          href={a.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          {a.attachment_name || "Attachment"}
                        </a>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {readCount} read
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(a.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
