"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, Activity } from "lucide-react";

interface QuickCounts {
  todayPosts: number;
  unreadDms: number;
}

/**
 * Dashboard widget — today's board posts and unread DMs. Lightweight
 * counters that help the user decide whether to check Board or DM
 * before diving into the document-centric sections below.
 * Auto-refreshes every 60s.
 */
export function QuickStatsWidget() {
  const supabase = createClient();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [counts, setCounts] = useState<QuickCounts>({
    todayPosts: 0,
    unreadDms: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Board posts created today in this business
      const { count: todayPosts } = await supabase
        .from("board_posts")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", todayIso);

      // Unread DMs: conversations where last_message_at > my last_read_at.
      // This is a lightweight heuristic — fetch all my participations and
      // compare timestamps client-side rather than a complex server join.
      const dmRes = await fetch("/api/dm/conversations", {
        cache: "no-store",
      });
      let unreadDms = 0;
      if (dmRes.ok) {
        const data = await dmRes.json();
        unreadDms = (data.conversations ?? []).filter(
          (c: { unread: boolean }) => c.unread
        ).length;
      }

      setCounts({
        todayPosts: todayPosts ?? 0,
        unreadDms,
      });
    } catch {
      // Silent — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, [businessId, supabase]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const items = [
    {
      label: "Board today",
      value: counts.todayPosts,
      icon: MessageSquare,
      href: "/dashboard/board",
    },
    {
      label: "Unread DMs",
      value: counts.unreadDms,
      icon: Send,
      href: "/dashboard/dm",
      highlight: counts.unreadDms > 0,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <Link key={item.label} href={item.href}>
                <div
                  className={`rounded-md border p-3 text-center transition-colors hover:border-primary/50 ${
                    item.highlight ? "border-primary/50" : ""
                  }`}
                >
                  <item.icon className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="mt-1 text-2xl font-bold">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
