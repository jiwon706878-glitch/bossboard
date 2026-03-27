"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Send, MessageSquare, CalendarDays } from "lucide-react";

interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  content: string;
  notes: string | null;
  manager_feedback: string | null;
  manager_id: string | null;
  feedback_at: string | null;
  created_at: string;
  author_name: string | null;
  manager_name: string | null;
}

export default function JournalPage() {
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const { isAdmin } = useRoleStore();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Feedback state
  const [feedbackEntryId, setFeedbackEntryId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!currentBusiness?.id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from("journal_entries")
      .select("id, user_id, entry_date, content, notes, manager_feedback, manager_id, feedback_at, created_at")
      .eq("business_id", currentBusiness.id)
      .order("entry_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load journal:", error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Resolve author names
    const userIds = [...new Set([
      ...data.map((e) => e.user_id),
      ...data.filter((e) => e.manager_id).map((e) => e.manager_id!),
    ])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    setEntries(data.map((e) => ({
      ...e,
      author_name: nameMap.get(e.user_id) ?? null,
      manager_name: e.manager_id ? nameMap.get(e.manager_id) ?? null : null,
    })));

    setLoading(false);
  }, [currentBusiness?.id, supabase]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !currentBusiness?.id) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not logged in");
      setSubmitting(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          content: content.trim(),
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Journal entry updated");
        setEditingId(null);
      }
    } else {
      const { error } = await supabase
        .from("journal_entries")
        .insert({
          business_id: currentBusiness.id,
          user_id: user.id,
          entry_date: entryDate,
          content: content.trim(),
          notes: notes.trim() || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You already have an entry for this date. Click it to edit.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Journal entry saved");
      }
    }

    setContent("");
    setNotes("");
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setSubmitting(false);
    loadEntries();
  }

  function handleEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setEntryDate(entry.entry_date);
    setContent(entry.content);
    setNotes(entry.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setContent("");
    setNotes("");
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
  }

  async function handleFeedback(entryId: string) {
    if (!feedbackText.trim()) return;
    setFeedbackSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("journal_entries")
      .update({
        manager_feedback: feedbackText.trim(),
        manager_id: user?.id,
        feedback_at: new Date().toISOString(),
      })
      .eq("id", entryId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Feedback saved");
      setFeedbackEntryId(null);
      setFeedbackText("");
      loadEntries();
    }

    setFeedbackSubmitting(false);
  }

  function formatEntryDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return format(d, "EEE, MMM d, yyyy");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Journal</h1>
        <p className="text-muted-foreground">Daily work log</p>
      </div>

      {/* Entry form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Edit Entry" : "New Entry"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                disabled={!!editingId}
              />
            </div>
            <div className="space-y-2">
              <Label>What I did today</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe your work today..."
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Special notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any issues, observations, or notes..."
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting || !content.trim()}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {submitting ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Entries list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-md border bg-muted/40" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border bg-card py-12 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No journal entries yet. Write your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="border bg-card">
              <CardContent className="py-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{formatEntryDate(entry.entry_date)}</span>
                    {entry.author_name && (
                      <span className="text-muted-foreground">by {entry.author_name}</span>
                    )}
                  </div>
                  {entry.user_id === currentUserId && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleEdit(entry)}>
                      Edit
                    </Button>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap">{entry.content}</p>

                {/* Special notes */}
                {entry.notes && (
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Special notes</p>
                    <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
                  </div>
                )}

                {/* Manager feedback */}
                {entry.manager_feedback && (
                  <>
                    <Separator />
                    <div className="rounded-md border-l-2 border-l-primary bg-primary/5 px-3 py-2">
                      <p className="text-xs font-medium text-primary mb-1">
                        Feedback from {entry.manager_name || "Manager"}
                        {entry.feedback_at && (
                          <span className="font-normal text-muted-foreground ml-2">
                            {format(new Date(entry.feedback_at), "MMM d, h:mm a")}
                          </span>
                        )}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{entry.manager_feedback}</p>
                    </div>
                  </>
                )}

                {/* Feedback action for admins */}
                {isAdmin() && entry.user_id !== currentUserId && !entry.manager_feedback && (
                  <>
                    {feedbackEntryId === entry.id ? (
                      <div className="space-y-2 pt-1">
                        <Textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Write your feedback..."
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={feedbackSubmitting || !feedbackText.trim()}
                            onClick={() => handleFeedback(entry.id)}
                          >
                            {feedbackSubmitting ? "Saving..." : "Send Feedback"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setFeedbackEntryId(null); setFeedbackText(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => setFeedbackEntryId(entry.id)}
                      >
                        <MessageSquare className="mr-1 h-3 w-3" />
                        Add feedback
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
