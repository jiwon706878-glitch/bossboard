"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

interface RoleState {
  role: "owner" | "admin" | "member";
  loaded: boolean;
  loadRole: () => Promise<void>;
  isAdmin: () => boolean;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  role: "member",
  loaded: false,
  loadRole: async () => {
    if (get().loaded) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check ownership and membership in parallel
    const [{ data: businesses }, { data: membership }] = await Promise.all([
      supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("business_members")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    if (businesses && businesses.length > 0) {
      set({ role: "owner", loaded: true });
      return;
    }

    if (membership) {
      const role = (membership.role as "owner" | "admin" | "member") ?? "member";
      set({ role, loaded: true });
      return;
    }

    // Fallback: check legacy users table
    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (userRow?.role as "owner" | "admin" | "member") ?? "member";
    set({ role, loaded: true });
  },
  isAdmin: () => {
    const { role } = get();
    return role === "owner" || role === "admin";
  },
}));
