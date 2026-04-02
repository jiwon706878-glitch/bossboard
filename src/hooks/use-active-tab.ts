"use client";

import { create } from "zustand";

interface ActiveTabState {
  activePath: string;
  setActivePath: (path: string) => void;
}

export const useActiveTab = create<ActiveTabState>((set) => ({
  activePath: typeof window !== "undefined" ? window.location.pathname : "/dashboard",
  setActivePath: (path) => set({ activePath: path }),
}));
