import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── User & Profile ───────────────────────────────
export const userKeys = {
  current: ["user", "current"] as const,
  profile: (userId: string) => ["user", "profile", userId] as const,
};

export async function fetchCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, role, plan_id, developer_mode, notification_settings")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Todos ────────────────────────────────────────
export const todoKeys = {
  all: ["todos"] as const,
  active: (userId: string) => ["todos", "active", userId] as const,
  completed: (userId: string) => ["todos", "completed", userId] as const,
};

export async function fetchActiveTodos(userId: string) {
  const { data, error } = await supabase
    .from("todos")
    .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCompletedTodos(userId: string) {
  const { data, error } = await supabase
    .from("todos")
    .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

// ─── Checklists ───────────────────────────────────
export const checklistKeys = {
  all: (businessId: string) => ["checklists", businessId] as const,
  active: (businessId: string) => ["checklists", "active", businessId] as const,
};

export async function fetchActiveChecklists(businessId: string) {
  const { data, error } = await supabase
    .from("checklists")
    .select("id, title, status, due_date, items, assigned_to")
    .eq("business_id", businessId)
    .neq("status", "completed")
    .order("due_date");
  if (error) throw error;
  return data ?? [];
}

// ─── Journal ──────────────────────────────────────
export const journalKeys = {
  all: (businessId: string) => ["journal", businessId] as const,
  entries: (businessId: string, limit: number) => ["journal", businessId, limit] as const,
};

export async function fetchJournalEntries(businessId: string, limit = 30) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, user_id, entry_date, content, notes, manager_feedback, manager_id, feedback_at, created_at")
    .eq("business_id", businessId)
    .order("entry_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── SOPs / Documents ─────────────────────────────
export const sopKeys = {
  all: (businessId: string) => ["sops", businessId] as const,
  stats: (businessId: string) => ["sops", "stats", businessId] as const,
};

export async function fetchSopStats(businessId: string) {
  const { data, error } = await supabase
    .from("sops")
    .select("id, status, updated_at, doc_type")
    .eq("business_id", businessId)
    .is("deleted_at", null);
  if (error) throw error;

  const sops: Array<{ id: string; status: string; updated_at: string | null; doc_type: string | null }> = data ?? [];
  const staleThreshold = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return {
    total: sops.length,
    draft: sops.filter((s) => s.status === "draft").length,
    published: sops.filter((s) => s.status === "published").length,
    stale: sops.filter((s) => s.updated_at && new Date(s.updated_at).getTime() < staleThreshold).length,
    sopCount: sops.filter((s) => (s.doc_type || "sop") === "sop").length,
    noteCount: sops.filter((s) => s.doc_type === "note").length,
    policyCount: sops.filter((s) => s.doc_type === "policy").length,
  };
}

// ─── AI Usage ─────────────────────────────────────
export const usageKeys = {
  monthly: (userId: string) => ["usage", "monthly", userId] as const,
};

export async function fetchMonthlyUsage(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data, error } = await supabase
    .from("ai_usage")
    .select("credits_used")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());
  if (error) throw error;
  return data?.reduce((sum: number, r: { credits_used: number }) => sum + r.credits_used, 0) ?? 0;
}

// ─── Team ─────────────────────────────────────────
export const teamKeys = {
  all: (businessId: string) => ["team", businessId] as const,
  members: (businessId: string) => ["team", "members", businessId] as const,
  invites: (businessId: string) => ["team", "invites", businessId] as const,
};

export async function fetchTeamMembers(businessId: string) {
  const { data: business } = await supabase
    .from("businesses")
    .select("user_id")
    .eq("id", businessId)
    .single();
  if (!business) return [];
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("id", business.user_id)
    .single();
  if (!ownerProfile) return [];
  return [{ ...ownerProfile, role: ownerProfile.role || "owner" }];
}

export async function fetchPendingInvites(businessId: string) {
  const { data, error } = await supabase
    .from("invites")
    .select("id, email, role, accepted, created_at")
    .eq("workspace_id", businessId)
    .eq("accepted", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Calendar ─────────────────────────────────────
export const calendarKeys = {
  events: (businessId: string, month: string) => ["calendar", businessId, month] as const,
};

export async function fetchCalendarEvents(businessId: string, userId: string, monthStart: string, monthEnd: string) {
  const [{ data: checklists }, { data: todos }] = await Promise.all([
    supabase
      .from("checklists")
      .select("id, title, due_date, status")
      .eq("business_id", businessId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd),
    supabase
      .from("todos")
      .select("id, text, due_date, completed")
      .eq("user_id", userId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd),
  ]);

  const mapped: Array<{ id: string; title: string; date: string; type: "checklist" | "todo"; status?: string; completed?: boolean }> = [];
  for (const c of checklists ?? []) {
    if (c.due_date) mapped.push({ id: c.id, title: c.title, date: c.due_date, type: "checklist", status: c.status });
  }
  for (const t of todos ?? []) {
    if (t.due_date) mapped.push({ id: t.id, title: t.text, date: t.due_date, type: "todo", completed: t.completed });
  }
  return mapped;
}

// ─── Journal (with name resolution) ───────────────
export async function fetchJournalEntriesWithNames(businessId: string, limit = 50) {
  const entries = await fetchJournalEntries(businessId, limit);
  if (entries.length === 0) return [];

  const userIds = [...new Set([
    ...entries.map((e: any) => e.user_id),
    ...entries.filter((e: any) => e.manager_id).map((e: any) => e.manager_id),
  ])];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  return entries.map((e: any) => ({
    ...e,
    author_name: nameMap.get(e.user_id) ?? null,
    manager_name: e.manager_id ? nameMap.get(e.manager_id) ?? null : null,
  }));
}

// ─── Settings (business details) ──────────────────
export const settingsKeys = {
  business: (businessId: string) => ["settings", "business", businessId] as const,
};

export async function fetchBusinessSettings(businessId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("language, timezone")
    .eq("id", businessId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Board Posts ──────────────────────────────────
export const boardKeys = {
  recent: (businessId: string) => ["board", "recent", businessId] as const,
};

export async function fetchRecentBoardPosts(businessId: string) {
  const { data, error } = await supabase
    .from("board_posts")
    .select("id, title, content, user_id, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((p: any) => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  return data.map((p: any) => ({
    ...p,
    author_name: nameMap.get(p.user_id) ?? "Unknown",
  }));
}

// ─── Recent Documents ─────────────────────────────
export const recentDocKeys = {
  latest: (businessId: string) => ["sops", "recent", businessId] as const,
};

export async function fetchRecentDocuments(businessId: string) {
  const { data, error } = await supabase
    .from("sops")
    .select("id, title, status, updated_at, doc_type")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return data ?? [];
}
