"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isToday, isPast, differenceInDays } from "date-fns";
import {
  FileText,
  Users,
  Zap,
  Lightbulb,
  Plus,
  Clock,
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Send,
  Trash2,
  PenLine,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ChecklistRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  items: { text: string }[];
  assigned_to: string | null;
}

interface NoteRow {
  id: string;
  title: string;
  summary: string | null;
  created_at: string;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  icon: "checklist" | "sop" | "note" | "read";
  link?: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  // Data
  const [overdueChecklists, setOverdueChecklists] = useState<ChecklistRow[]>([]);
  const [todayChecklists, setTodayChecklists] = useState<ChecklistRow[]>([]);
  const [todayNotes, setTodayNotes] = useState<NoteRow[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [quickNote, setQuickNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Stats (collapsed section)
  const [statsOpen, setStatsOpen] = useState(false);
  const [totalSops, setTotalSops] = useState(0);
  const [draftSops, setDraftSops] = useState(0);
  const [publishedSops, setPublishedSops] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(30);
  const [unlimitedCredits, setUnlimitedCredits] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, plan_id")
          .eq("id", user.id)
          .single();

        setUserName(profile?.full_name || user.email?.split("@")[0] || "User");

        const planId = (profile?.plan_id as PlanId) ?? "free";
        const plan = plans[planId];
        const limit = plan.limits.aiCredits;
        if (limit === -1) setUnlimitedCredits(true);
        else setCreditsLimit(limit);

        // AI usage
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const { data: usage } = await supabase
          .from("ai_usage")
          .select("credits_used")
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());
        setCreditsUsed(usage?.reduce((sum, r) => sum + r.credits_used, 0) ?? 0);

        const businessId = currentBusiness?.id;
        if (!businessId) return;

        // Checklists
        const { data: allChecklists } = await supabase
          .from("checklists")
          .select("id, title, status, due_date, items, assigned_to")
          .eq("business_id", businessId)
          .neq("status", "completed")
          .order("due_date");

        if (allChecklists) {
          const overdue: ChecklistRow[] = [];
          const today: ChecklistRow[] = [];

          for (const cl of allChecklists) {
            if (!cl.due_date) { today.push(cl); continue; }
            if (cl.due_date === todayStr) today.push(cl);
            else if (cl.due_date < todayStr) overdue.push(cl);
          }

          setOverdueChecklists(overdue);
          setTodayChecklists(today);
        }

        // Today's notes
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: notes } = await supabase
          .from("sops")
          .select("id, title, summary, created_at")
          .eq("business_id", businessId)
          .eq("doc_type", "note")
          .gte("created_at", startOfDay.toISOString())
          .order("created_at", { ascending: false })
          .limit(10);
        setTodayNotes(notes ?? []);

        // SOPs for stats
        const { data: sops } = await supabase
          .from("sops")
          .select("id, title, status, created_at, updated_at")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: false });

        if (sops) {
          setTotalSops(sops.length);
          setDraftSops(sops.filter((s) => s.status === "draft").length);
          setPublishedSops(sops.filter((s) => s.status === "published").length);

          // Build activity from recent SOPs + completions
          const activityItems: ActivityItem[] = [];

          // Recent SOP activity
          const recentSops = sops.slice(0, 5);
          for (const sop of recentSops) {
            const isNew = new Date(sop.created_at).getTime() === new Date(sop.updated_at).getTime();
            activityItems.push({
              id: sop.id,
              text: isNew ? `Created: "${sop.title}"` : `Updated: "${sop.title}"`,
              time: formatDistanceToNow(new Date(sop.updated_at), { addSuffix: true }),
              icon: isNew ? "note" : "sop",
              link: `/dashboard/sops/${sop.id}`,
            });
          }
          setActivity(activityItems.slice(0, 10));
        }

        // Team count
        const { data: invites } = await supabase
          .from("invites")
          .select("id, accepted")
          .eq("workspace_id", businessId);
        if (invites) {
          setTeamCount(invites.filter((i) => i.accepted).length + 1);
        } else {
          setTeamCount(1);
        }
      } catch {
        // Dashboard will show zeros
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [supabase, currentBusiness?.id]);

  async function handleQuickNote() {
    if (!quickNote.trim() || !currentBusiness?.id) return;
    setAddingNote(true);

    const { data: { user } } = await supabase.auth.getUser();
    const content = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: quickNote.trim() }] }],
    };

    const { data, error } = await supabase
      .from("sops")
      .insert({
        business_id: currentBusiness.id,
        title: `Note - ${format(new Date(), "MMM d, h:mm a")}`,
        content,
        summary: quickNote.trim().substring(0, 200),
        doc_type: "note",
        status: "published",
        version: 1,
        created_by: user?.id,
      })
      .select("id, title, summary, created_at")
      .single();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setTodayNotes((prev) => [data, ...prev]);
      setQuickNote("");
      toast.success("Note added");
    }
    setAddingNote(false);
  }

  async function handleDeleteNote(noteId: string) {
    await supabase.from("sops").delete().eq("id", noteId);
    setTodayNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  const summaryParts: string[] = [];
  if (todayChecklists.length > 0) summaryParts.push(`${todayChecklists.length} checklist${todayChecklists.length > 1 ? "s" : ""} today`);
  if (overdueChecklists.length > 0) summaryParts.push(`${overdueChecklists.length} overdue`);
  if (todayNotes.length > 0) summaryParts.push(`${todayNotes.length} note${todayNotes.length > 1 ? "s" : ""}`);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-32 animate-pulse rounded-md border bg-card" />
        <div className="h-48 animate-pulse rounded-md border bg-card" />
        <div className="h-32 animate-pulse rounded-md border bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {userName}
        </h2>
        <p className="text-sm text-muted-foreground">{todayFormatted}</p>
        {summaryParts.length > 0 && (
          <p className="text-xs text-muted-foreground">{summaryParts.join(" · ")}</p>
        )}
      </div>

      {/* SECTION 1: Overdue */}
      {overdueChecklists.length > 0 && (
        <Card className="rounded-md border-l-[3px] border-l-destructive shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Overdue ({overdueChecklists.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueChecklists.map((cl) => {
              const daysOverdue = cl.due_date ? differenceInDays(new Date(), new Date(cl.due_date)) : 0;
              return (
                <Link key={cl.id} href={`/dashboard/checklists/${cl.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                  <span className="flex-1 text-sm">{cl.title}</span>
                  <span className="text-xs text-destructive">
                    {daysOverdue === 1 ? "overdue from yesterday" : `overdue ${daysOverdue} days`}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: Today's Checklists */}
      <Card className="rounded-md border-l-[3px] border-l-primary shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckSquare className="h-4 w-4 text-primary" />
            Today&apos;s Checklists ({todayChecklists.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayChecklists.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No checklists due today. <Link href="/dashboard/sops" className="text-primary hover:underline">Create one from an SOP</Link>.
            </p>
          ) : (
            <div className="space-y-2">
              {todayChecklists.map((cl) => {
                const itemCount = cl.items?.length ?? 0;
                const isInProgress = cl.status === "in_progress";
                return (
                  <Link key={cl.id} href={`/dashboard/checklists/${cl.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                    {cl.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isInProgress ? (
                      <Clock className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm">{cl.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {itemCount} items · {cl.status === "pending" ? "not started" : cl.status.replace("_", " ")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: Today's Notes & Todos */}
      <Card className="rounded-md shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PenLine className="h-4 w-4 text-muted-foreground" />
            Today&apos;s Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Inline add */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleQuickNote(); }}
            className="flex items-center gap-2"
          >
            <Input
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Add a note..."
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="ghost" disabled={addingNote || !quickNote.trim()} className="shrink-0 h-8 w-8 p-0">
              {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>

          {/* Notes list */}
          {todayNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes today.</p>
          ) : (
            <div className="space-y-1">
              {todayNotes.map((note) => (
                <div key={note.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <Link href={`/dashboard/sops/${note.id}`} className="flex-1 text-sm truncate">
                    {note.summary || note.title}
                  </Link>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(note.created_at), "h:mm a")}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: Team Activity */}
      {activity.length > 0 && (
        <Card className="rounded-md shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {item.icon === "checklist" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : item.icon === "read" ? (
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.link ? (
                      <Link href={item.link} className="text-sm hover:underline truncate block">
                        {item.text}
                      </Link>
                    ) : (
                      <p className="text-sm truncate">{item.text}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 5: Statistics (collapsed by default) */}
      <Card className="rounded-md shadow-none">
        <button
          type="button"
          className="flex w-full items-center justify-between px-6 py-4 text-left"
          onClick={() => setStatsOpen(!statsOpen)}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            Statistics
          </span>
          {statsOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {statsOpen && (
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-3">
              {/* SOPs */}
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  SOP Overview
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-2xl font-bold">{totalSops}</span>
                  <span className="text-xs text-muted-foreground">{publishedSops} published · {draftSops} drafts</span>
                </div>
              </div>

              {/* Team */}
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Team
                </div>
                <span className="font-mono text-2xl font-bold">{teamCount}</span>
                <span className="ml-2 text-xs text-muted-foreground">members</span>
              </div>

              {/* AI Credits */}
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  AI Generations
                </div>
                <span className="font-mono text-2xl font-bold">{creditsUsed}</span>
                {!unlimitedCredits && (
                  <span className="ml-1 text-xs text-muted-foreground">/ {creditsLimit}</span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">this month</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
