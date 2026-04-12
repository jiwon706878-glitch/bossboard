"use client";

import { create } from "zustand";

interface DmPanelState {
  open: boolean;
  conversationId: string | null;
  targetId: string | null;
  openPanel: (opts?: { conversationId?: string; targetId?: string }) => void;
  closePanel: () => void;
}

export const useDmPanel = create<DmPanelState>((set) => ({
  open: false,
  conversationId: null,
  targetId: null,
  openPanel: (opts) =>
    set({
      open: true,
      conversationId: opts?.conversationId ?? null,
      targetId: opts?.targetId ?? null,
    }),
  closePanel: () =>
    set({
      open: false,
      conversationId: null,
      targetId: null,
    }),
}));
