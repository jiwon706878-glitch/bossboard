"use client";

import { useState, useEffect, useCallback } from "react";

const COOLDOWN_MS = 3_000;
const MAX_CLICKS = 10;
const WINDOW_MS = 5 * 60_000; // 5 minutes
const BLOCK_MS = 10 * 60_000; // 10 minutes
const LS_COOLDOWN = "bb_refresh_cooldown_until";
const LS_HISTORY = "bb_refresh_click_history";

function readHistory(): number[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readBlockUntil(): number {
  try {
    return Number(localStorage.getItem(LS_COOLDOWN) || 0);
  } catch {
    return 0;
  }
}

export function useRefreshRateLimit() {
  const [cooling, setCooling] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);

  // Initialize from localStorage
  useEffect(() => {
    const until = readBlockUntil();
    if (until > Date.now()) {
      setBlocked(true);
      setBlockedUntil(until);
    }
  }, []);

  // Clear block when timer expires
  useEffect(() => {
    if (!blocked || blockedUntil <= Date.now()) return;
    const timer = setTimeout(() => {
      setBlocked(false);
      setBlockedUntil(0);
      localStorage.removeItem(LS_COOLDOWN);
      localStorage.removeItem(LS_HISTORY);
    }, blockedUntil - Date.now());
    return () => clearTimeout(timer);
  }, [blocked, blockedUntil]);

  const canRefresh = !cooling && !blocked;

  const recordClick = useCallback((): boolean => {
    const now = Date.now();

    // Check block
    const until = readBlockUntil();
    if (until > now) {
      setBlocked(true);
      setBlockedUntil(until);
      return false;
    }

    // Record click
    const history = readHistory().filter((t) => t > now - WINDOW_MS);
    history.push(now);
    localStorage.setItem(LS_HISTORY, JSON.stringify(history));

    // Check if over limit
    if (history.length >= MAX_CLICKS) {
      const blockUntil = now + BLOCK_MS;
      localStorage.setItem(LS_COOLDOWN, String(blockUntil));
      setBlocked(true);
      setBlockedUntil(blockUntil);
      return false;
    }

    // Start cooldown
    setCooling(true);
    setTimeout(() => setCooling(false), COOLDOWN_MS);
    return true;
  }, []);

  return { canRefresh, blocked, cooling, blockedUntil, recordClick };
}
