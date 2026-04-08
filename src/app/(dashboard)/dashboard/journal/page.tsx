"use client";

import { useState, useMemo, useEffect, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { fetchCurrentUser, fetchJournalEntriesWithNames, userKeys, journalKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, Send, MessageSquare, CalendarDays, ChevronDown, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface JournalEntry {
  id: string; user_id: string; entry_date: string; content: string; notes: string | null;
  manager_feedback: string | null; manager_id: string | null; feedback_at: string | null;
  created_at: string; author_name: string | null; manager_name: string | null;
}

interface MonthGroup { key: string; label: string; entries: JournalEntry[]; }

function groupEntriesByMonth(entries: JournalEntry[]): MonthGroup[] {
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const groups = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const key = entry.entry_date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return [...groups.keys()].sort((a, b) => b.localeCompare(a)).map((key) => {
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return { key, label: key === currentMonthKey ? "This Month" : format(date, "MMMM yyyy"), entries: groups.get(key)! };
  });
}

export default function JournalPage() {
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const { isAdmin } = useRoleStore();

  // Form state
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importingTasks, setImportingTasks] = useState(false);
  const [feedbackEntryId, setFeedbackEntryId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const currentUserId = user?.id ?? null;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: journalKeys.entries(businessId ?? "", 50),
    queryFn: () => fetchJournalEntriesWithNames(businessId!, 50),
    enabled: !!businessId,
  });

  const monthGroups = useMemo(() => groupEntriesByMonth(entries), [entries]);

  useEffect(() => {
    const currentMonthKey = format(new Date(), "yyyy-MM");
    setCollapsedMonths((prev) => {
      const next = new Set<string>();
      for (const group of monthGroups) {
        if (group.key !== currentMonthKey) {
          if (prev.has(group.key) || !prev.has("__init__")) next.add(group.key);
        }
      }
      next.add("__init__");
      return next;
    });
  }, [monthGroups]);

  function toggleMonth(key: string) {
    setCollapsedMonths((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  const submitMutation = useMutation({
    mutationFn: async (params: { isEdit: boolean; entryId?: string; content: string; notes: string | null; entryDate: string }) => {
      if (params.isEdit) {
        const { error } = await supabase.from("journal_entries").update({ content: params.content, notes: params.notes, updated_at: new Date().toISOString() }).eq("id", params.entryId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journal_entries").insert({ business_id: businessId, user_id: currentUserId, entry_date: params.entryDate, content: params.content, notes: params.notes });
        if (error) throw error;
      }
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: journalKeys.entries(businessId!, 50) });
      const prev = queryClient.getQueryData<JournalEntry[]>(journalKeys.entries(businessId!, 50));
      if (params.isEdit) {
        queryClient.setQueryData<JournalEntry[]>(journalKeys.entries(businessId!, 50), (old) =>
          (old ?? []).map((e) => e.id === params.entryId ? { ...e, content: params.content, notes: params.notes } : e));
      } else {
        const optimistic: JournalEntry = { id: `temp-${Date.now()}`, user_id: currentUserId!, entry_date: params.entryDate, content: params.content, notes: params.notes, manager_feedback: null, manager_id: null, feedback_at: null, created_at: new Date().toISOString(), author_name: null, manager_name: null };
        queryClient.setQueryData<JournalEntry[]>(journalKeys.entries(businessId!, 50), (old) => [optimistic, ...(old ?? [])]);
      }
      return { prev };
    },
    onError: (err: any, params, ctx) => {
      queryClient.setQueryData(journalKeys.entries(businessId!, 50), ctx?.prev);
      if (err?.code === "23505") toast.error("You already have an entry for this date. Click it to edit.");
      else { console.error("Journal save error:", err?.message); toast.error("Failed to save journal entry. Please try again."); }
    },
    onSuccess: (_, params) => { toast.success(params.isEdit ? "Journal entry updated" : "Journal entry saved"); if (params.isEdit) setEditingId(null); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: journalKeys.entries(businessId!, 50) }),
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ entryId, text }: { entryId: string; text: string }) => {
      const { error } = await supabase.from("journal_entries").update({ manager_feedback: text, manager_id: currentUserId, feedback_at: new Date().toISOString() }).eq("id", entryId);
      if (error) throw error;
    },
    onMutate: async ({ entryId, text }) => {
      await queryClient.cancelQueries({ queryKey: journalKeys.entries(businessId!, 50) });
      const prev = queryClient.getQueryData<JournalEntry[]>(journalKeys.entries(businessId!, 50));
      queryClient.setQueryData<JournalEntry[]>(journalKeys.entries(businessId!, 50), (old) =>
        (old ?? []).map((e) => e.id === entryId ? { ...e, manager_feedback: text, manager_id: currentUserId, feedback_at: new Date().toISOString() } : e));
      return { prev };
    },
    onError: (_err, _vars, ctx) => { queryClient.setQueryData(journalKeys.entries(businessId!, 50), ctx?.prev); toast.error("Failed to save feedback"); },
    onSuccess: () => toast.success("Feedback saved"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: journalKeys.entries(businessId!, 50) }),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !businessId || !currentUserId) return;
    setSubmitting(true);
    try { await submitMutation.mutateAsync({ isEdit: !!editingId, entryId: editingId ?? undefined, content: content.trim(), notes: notes.trim() || null, entryDate }); } catch {}
    setContent(""); setNotes(""); setEntryDate(format(new Date(), "yyyy-MM-dd")); setSubmitting(false);
  }

  function handleEdit(entry: JournalEntry) { setEditingId(entry.id); setEntryDate(entry.entry_date); setContent(entry.content); setNotes(entry.notes || ""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function handleCancelEdit() { setEditingId(null); setContent(""); setNotes(""); setEntryDate(format(new Date(), "yyyy-MM-dd")); }

  function handleFeedback(entryId: string) {
    if (!feedbackText.trim() || !currentUserId) return;
    setFeedbackSubmitting(true);
    feedbackMutation.mutate({ entryId, text: feedbackText.trim() }, {
      onSettled: () => { setFeedbackEntryId(null); setFeedbackText(""); setFeedbackSubmitting(false); },
    });
  }

  async function handleImportTasks() {
    if (!currentUserId) return;
    setImportingTasks(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const [{ data: todos }, { data: checklists }] = await Promise.all([
      supabase.from("todos").select("text").eq("user_id", currentUserId).eq("completed", true).eq("due_date", todayStr),
      businessId ? supabase.from("checklists").select("title").eq("business_id", businessId).eq("status", "completed").eq("due_date", todayStr) : Promise.resolve({ data: [] }),
    ]);
    const lines: string[] = [];
    if (todos && todos.length > 0) { lines.push("Completed todos:"); for (const t of todos) lines.push(`- ${t.text}`); }
    if (checklists && checklists.length > 0) { if (lines.length > 0) lines.push(""); lines.push("Completed checklists:"); for (const c of checklists) lines.push(`- ${c.title}`); }
    if (lines.length === 0) { toast("No completed tasks found for today"); }
    else { const imported = lines.join("\n"); setContent((prev) => prev.trim() ? prev.trimEnd() + "\n\n" + imported : imported); toast.success(`Imported ${(todos?.length ?? 0) + (checklists?.length ?? 0)} completed tasks`); }
    setImportingTasks(false);
  }

  function formatEntryDate(dateStr: string) {
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return format(new Date(dateStr + "T00:00:00"), "EEE, MMM d, yyyy");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><h1 className="text-3xl font-bold">Journal</h1><p className="text-muted-foreground">Daily work log</p></div>

      <Card>
        <CardHeader><CardTitle className="text-base">{editingId ? "Edit Entry" : "New Entry"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} max={format(new Date(), "yyyy-MM-dd")} disabled={!!editingId} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>What I did today</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleImportTasks} disabled={importingTasks}>
                  {importingTasks ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ListTodo className="mr-1 h-3 w-3" />}
                  Import today&apos;s tasks
                </Button>
              </div>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe your work today..." rows={4} required />
            </div>
            <div className="space-y-2">
              <Label>Special notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any issues, observations, or notes..." rows={2} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting || !content.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {submitting ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-md border bg-muted/40" />)}</div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border bg-card py-12 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No journal entries yet. Write your first one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => {
            const isOpen = !collapsedMonths.has(group.key);
            return (
              <Collapsible key={group.key} open={isOpen} onOpenChange={() => toggleMonth(group.key)}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-1 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !isOpen && "-rotate-90")} />
                    <span>{group.label}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{group.entries.length}</Badge>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 pt-1 stagger-children">
                    {group.entries.map((entry) => (
                      <EntryCard key={entry.id} entry={entry} currentUserId={currentUserId} isAdmin={isAdmin()} feedbackEntryId={feedbackEntryId} feedbackText={feedbackText} feedbackSubmitting={feedbackSubmitting} formatEntryDate={formatEntryDate} onEdit={handleEdit} onFeedback={handleFeedback} onStartFeedback={(id) => setFeedbackEntryId(id)} onCancelFeedback={() => { setFeedbackEntryId(null); setFeedbackText(""); }} onFeedbackTextChange={setFeedbackText} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EntryCard = memo(function EntryCard({ entry, currentUserId, isAdmin, feedbackEntryId, feedbackText, feedbackSubmitting, formatEntryDate, onEdit, onFeedback, onStartFeedback, onCancelFeedback, onFeedbackTextChange }: {
  entry: JournalEntry; currentUserId: string | null; isAdmin: boolean; feedbackEntryId: string | null; feedbackText: string; feedbackSubmitting: boolean;
  formatEntryDate: (dateStr: string) => string; onEdit: (entry: JournalEntry) => void; onFeedback: (entryId: string) => void;
  onStartFeedback: (id: string) => void; onCancelFeedback: () => void; onFeedbackTextChange: (text: string) => void;
}) {
  return (
    <Card className="border bg-card">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{formatEntryDate(entry.entry_date)}</span>
            {entry.author_name && <span className="text-muted-foreground">by {entry.author_name}</span>}
          </div>
          {entry.user_id === currentUserId && <Button variant="ghost" size="sm" className="text-xs" onClick={() => onEdit(entry)}>Edit</Button>}
        </div>
        <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
        {entry.notes && (<div className="rounded-md bg-muted/50 px-3 py-2 animate-center-scale-in"><p className="text-xs font-medium text-muted-foreground mb-1">Special notes</p><p className="text-sm whitespace-pre-wrap">{entry.notes}</p></div>)}
        {entry.manager_feedback && (<><Separator /><div className="rounded-md border-l-2 border-l-primary bg-primary/5 px-3 py-2"><p className="text-xs font-medium text-primary mb-1">Feedback from {entry.manager_name || "Manager"}{entry.feedback_at && <span className="font-normal text-muted-foreground ml-2">{format(new Date(entry.feedback_at), "MMM d, h:mm a")}</span>}</p><p className="text-sm whitespace-pre-wrap">{entry.manager_feedback}</p></div></>)}
        {isAdmin && entry.user_id !== currentUserId && !entry.manager_feedback && (<>
          {feedbackEntryId === entry.id ? (
            <div className="space-y-2 pt-1">
              <Textarea value={feedbackText} onChange={(e) => onFeedbackTextChange(e.target.value)} placeholder="Write your feedback..." rows={2} autoFocus />
              <div className="flex gap-2">
                <Button size="sm" disabled={feedbackSubmitting || !feedbackText.trim()} onClick={() => onFeedback(entry.id)}>{feedbackSubmitting ? "Saving..." : "Send Feedback"}</Button>
                <Button size="sm" variant="ghost" onClick={onCancelFeedback}>Cancel</Button>
              </div>
            </div>
          ) : (<Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => onStartFeedback(entry.id)}><MessageSquare className="mr-1 h-3 w-3" />Add feedback</Button>)}
        </>)}
      </CardContent>
    </Card>
  );
});
