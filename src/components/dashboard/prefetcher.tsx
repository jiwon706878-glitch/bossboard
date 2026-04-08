"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBusinessStore } from "@/hooks/use-business";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  fetchAllChecklists,
  userKeys,
  checklistKeys,
  todoKeys,
  sopKeys,
  fetchSopStats,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";

/**
 * Invisible component that prefetches dashboard page data on initial load.
 * Route JS bundles are pre-loaded by TabShell via dynamic import().
 */
export function DashboardPrefetcher() {
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
  });
  const userId = user?.id;

  // Prefetch all page data in background
  useEffect(() => {
    if (!businessId || !userId) return;

    const supabase = createClient();

    const prefetch = async () => {
      // Batch 1: Heavy pages that feel slow
      // NOTE: Board prefetch removed — its queryFn returns a different shape than
      // the board page expects (missing poll_options, comment_count, etc.)
      // The board page runs its own rich queryFn on first visit.
      await Promise.allSettled([
        // Checklists
        queryClient.prefetchQuery({
          queryKey: checklistKeys.all(businessId),
          queryFn: () => fetchAllChecklists(businessId),
          staleTime: 2 * 60 * 1000,
        }),
        // SOP stats
        queryClient.prefetchQuery({
          queryKey: sopKeys.stats(businessId),
          queryFn: () => fetchSopStats(businessId),
          staleTime: 2 * 60 * 1000,
        }),
      ]);

      // Batch 2: Lighter pages — use the same queryFn as the actual pages
      // to ensure cache data shape matches what components expect
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: todoKeys.active(userId),
          queryFn: async () => {
            const { data } = await supabase
              .from("todos")
              .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
              .eq("user_id", userId)
              .eq("completed", false)
              .order("sort_order");
            return data ?? [];
          },
          staleTime: 2 * 60 * 1000,
        }),
        // Team members
        queryClient.prefetchQuery({
          queryKey: ["team", "members", businessId],
          queryFn: async () => {
            const { data } = await supabase
              .from("business_members")
              .select("user_id, role, email, joined_at")
              .eq("business_id", businessId);
            return data ?? [];
          },
          staleTime: 2 * 60 * 1000,
        }),
      ]);
    };

    const timer = setTimeout(prefetch, 300);
    return () => clearTimeout(timer);
  }, [businessId, userId, queryClient]);

  return null; // Invisible component
}