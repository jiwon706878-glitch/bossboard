"use client";

import * as Sentry from "@sentry/nextjs";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";
import { createClient } from "@/lib/supabase/client";

interface DeviceInfo {
  os?: string;
  app_version?: string;
}

let globalHandlersRegistered = false;

/**
 * Captures an error in two places:
 *   1. Sentry (the existing sentry.client.config.ts is already wired
 *      with `enabled` gated on NEXT_PUBLIC_SENTRY_DSN — without the
 *      env var Sentry is a no-op).
 *   2. Supabase `error_logs` table so the /admin/launch dashboard
 *      shows error counts in the same place as feedback. Best-effort:
 *      a missing table or no session means the call silently no-ops.
 */
export async function captureError(
  error: Error,
  context?: { type?: "js_error" | "panic" | "api_error" },
): Promise<string | undefined> {
  const eventId = Sentry.captureException(error);

  try {
    let device: DeviceInfo = {};
    if (isTauri()) {
      device = await invoke<DeviceInfo>("get_device_info").catch(() => ({}));
    }
    const supabase = createClient();
    await supabase
      .from("error_logs")
      .insert({
        type: context?.type ?? "js_error",
        message: error.message?.slice(0, 1000) ?? "(no message)",
        stack: error.stack?.slice(0, 4000) ?? null,
        os: device.os ?? null,
        app_version: device.app_version ?? null,
      })
      .then(() => {
        /* fire-and-forget */
      });
  } catch {
    /* second-tier failure — never throw from the error handler */
  }

  return eventId;
}

/**
 * Idempotent — calling more than once is a no-op. Mount once from the
 * desktop layout so window-level errors and unhandled promise rejections
 * end up in error_logs alongside the manual captureError calls.
 */
export function registerGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  if (globalHandlersRegistered) return;
  globalHandlersRegistered = true;

  window.addEventListener("error", (e) => {
    const err = e.error instanceof Error ? e.error : new Error(e.message);
    captureError(err, { type: "js_error" });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const err =
      reason instanceof Error ? reason : new Error(String(reason ?? "unknown"));
    captureError(err, { type: "js_error" });
  });
}
