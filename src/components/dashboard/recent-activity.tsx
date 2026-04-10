"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, CheckSquare, MessageSquare, ListTodo } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface ActivityItem {
  id: string;
  type: "wiki" | "todo" | "board" | "checklist";
  title: string;
  subtitle: string;
  href: string;
  timestamp: string;
}

const TYPE_CONFIG = {
  wiki: { icon: BookOpen, color: "text-primary", label: "Wiki" },
  todo: { icon: ListTodo, color: "text-success", label: "Todo" },
  board: { icon: MessageSquare, color: "text-accent-purple", label: "Board" },
  checklist: { icon: CheckSquare, color: "text-warning", label: "Checklist" },
} as const;

async function fetchRecentActivity(businessId: string): Promise<ActivityItem[]> {
  // Fetch most recent items from each source in parallel
  const [sopsRes, todosRes, boardRes, checklistsRes] = await Promise.all([
    supabase
      .from("sops")
      .select("id, title, status, updated_at")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("todos")
      .select("id, text, completed, completed_at, created_at, business_id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("board_posts")
      .select("id, title, type, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("checklists")
      .select("id, title, status, updated_at")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const items: ActivityItem[] = [];

  for (const sop of sopsRes.data ?? []) {
    items.push({
      id: `wiki-${sop.id}`,
      type: "wiki",
      title: sop.title || "Untitled",
      subtitle: sop.status === "draft" ? "Draft updated" : "Page updated",
      href: `/dashboard/sops/${sop.id}`,
      timestamp: sop.updated_at,
    });
  }
  for (const todo of todosRes.data ?? []) {
    items.push({
      id: `todo-${todo.id}`,
      type: "todo",
      title: todo.text,
      subtitle: todo.completed ? "Completed" : "Created",
      href: "/dashboard/todos",
      timestamp: todo.completed_at ?? todo.created_at,
    });
  }
  for (const post of boardRes.data ?? []) {
    items.push({
      id: `board-${post.id}`,
      type: "board",
      title: post.title,
      subtitle: `New ${post.type ?? "post"}`,
      href: "/dashboard/board",
      timestamp: post.created_at,
    });
  }
  for (const cl of checklistsRes.data ?? []) {
    items.push({
      id: `checklist-${cl.id}`,
      type: "checklist",
      title: cl.title,
      subtitle: cl.status === "completed" ? "Completed" : "Updated",
      href: `/dashboard/checklists/${cl.id}`,
      timestamp: cl.updated_at,
    });
  }

  // Sort by timestamp desc and take top 12
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 12);
}

export function RecentActivity() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recent-activity", businessId],
    queryFn: () => fetchRecentActivity(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes — don't refetch on every tab switch
    gcTime: 10 * 60 * 1000,
  });

  return (
    <div className="rounded-lg border border-border bg-surface-elevated">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
        <a
          href="/dashboard/sops"
          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          View all →
        </a>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-surface" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-48 animate-pulse rounded bg-surface" />
                <div className="h-3 w-24 animate-pulse rounded bg-surface" />
              </div>
              <div className="h-3 w-16 animate-pulse rounded bg-surface" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-text-secondary">
          No activity yet. Create your first wiki page or todo to get started.
        </div>
      ) : (
        <div className="divide-y divide-border stagger-children">
          {items.map((item) => {
            const conf = TYPE_CONFIG[item.type];
            const Icon = conf.icon;
            return (
              <a
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-surface group"
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface",
                  conf.color,
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {conf.label} · {item.subtitle}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
