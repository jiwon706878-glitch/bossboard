"use client";

import { useEffect, useState } from "react";

export type BetaFeatureId = "free_discussion_meeting";

const STORAGE_KEY = "bb_beta_features";

interface Stored {
  [id: string]: boolean;
}

function read(): Stored {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Stored) : {};
  } catch {
    return {};
  }
}

function write(value: Stored): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function isBetaFeatureEnabled(id: BetaFeatureId): boolean {
  return read()[id] === true;
}

export function setBetaFeatureEnabled(id: BetaFeatureId, enabled: boolean): void {
  write({ ...read(), [id]: enabled });
}

export function useBetaFeature(id: BetaFeatureId): [boolean, (v: boolean) => void] {
  // Lazy initializer reads directly from localStorage on first render so we
  // don't need a setState inside useEffect. SSR-safe — read() short-circuits
  // when window/localStorage is undefined.
  const [enabled, setEnabled] = useState<boolean>(() => isBetaFeatureEnabled(id));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabled(isBetaFeatureEnabled(id));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [id]);

  return [
    enabled,
    (v: boolean) => {
      setBetaFeatureEnabled(id, v);
      setEnabled(v);
    },
  ];
}
