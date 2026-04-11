import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── User & Profile ───────────────────────────────
export const userKeys = {
  current: ["user", "current"] as const,
  profile: (userId: string) => ["user", "profile", userId] as const,
};

export async function fetchCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, plan_id, developer_mode, notification_settings, external_api_keys, avatar_url, google_calendar_tokens")
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

export async function fetchAllChecklists(businessId: string) {
  const { data, error } = await supabase
    .from("checklists")
    .select("id, title, status, due_date, items, assigned_to, recurrence_type, sop_id, created_at, show_on_calendar")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
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

// ─── Team ─────────────────────────────────────────
export const teamKeys = {
  all: (businessId: string) => ["team", businessId] as const,
  members: (businessId: string) => ["team", "members", businessId] as const,
  invites: (businessId: string) => ["team", "invites", businessId] as const,
};

export async function fetchTeamMembers(businessId: string) {
  const { data: members, error } = await supabase
    .from("business_members")
    .select("user_id, role, email, joined_at")
    .eq("business_id", businessId)
    .order("joined_at");

  if (error || !members || members.length === 0) {
    // Fallback for businesses without members table entries
    const { data: business } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", businessId)
      .single();
    if (!business) return [];
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", business.user_id)
      .single();
    if (!ownerProfile) return [];
    return [{
      id: ownerProfile.id,
      full_name: ownerProfile.full_name,
      email: null,
      role: "owner",
      created_at: null,
    }];
  }

  // Get profile names for all members
  const userIds = members.map((m: { user_id: string }) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map<string, { id: string; full_name: string | null }>((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p]));

  return members.map((m: { user_id: string; role: string; email: string | null; joined_at: string | null }) => {
    const profile = profileMap.get(m.user_id);
    return {
      id: m.user_id,
      full_name: profile?.full_name || null,
      email: m.email || null,
      role: m.role,
      created_at: m.joined_at,
    };
  });
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
      .select("id, title, due_date, status, recurrence_type")
      .eq("business_id", businessId)
      .eq("show_on_calendar", true)
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
    ...entries.map((e: { user_id: string; manager_id: string | null; [key: string]: unknown }) => e.user_id),
    ...entries.filter((e: { user_id: string; manager_id: string | null; [key: string]: unknown }) => e.manager_id).map((e: { user_id: string; manager_id: string | null; [key: string]: unknown }) => e.manager_id),
  ])];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));

  return entries.map((e: { user_id: string; manager_id: string | null; [key: string]: unknown }) => ({
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

// ─── Businesses ───────────────────────────────────
export const businessKeys = {
  all: (userId: string) => ["businesses", userId] as const,
};

export async function fetchUserBusinesses(userId: string) {
  // Get owned businesses and memberships in parallel
  const [{ data: ownedBiz }, { data: memberships }] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at"),
    supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId),
  ]);

  const ownedIds = new Set((ownedBiz ?? []).map((b: { id: string }) => b.id));
  const memberBizIds = (memberships ?? [])
    .map((m: { business_id: string }) => m.business_id)
    .filter((id: string) => !ownedIds.has(id));

  let memberBiz: Array<Record<string, unknown>> = [];
  if (memberBizIds.length > 0) {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .in("id", memberBizIds)
      .order("created_at");
    memberBiz = data ?? [];
  }

  return [...(ownedBiz ?? []), ...memberBiz];
}

// ─── Board Posts ──────────────────────────────────
export const boardKeys = {
  recent: (businessId: string) => ["board", "recent", businessId] as const,
  all: (businessId: string) => ["board", "all", businessId] as const,
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

  const userIds = [...new Set(data.map((p: { id: string; user_id: string; [key: string]: unknown }) => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  const nameMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));

  return data.map((p: { id: string; user_id: string; [key: string]: unknown }) => ({
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
