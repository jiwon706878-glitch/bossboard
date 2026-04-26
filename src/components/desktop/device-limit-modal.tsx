"use client";

import { useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";

export interface RegisteredDevice {
  id: string;
  os: string;
  appVersion: string;
  lastSeen: string;
  isCurrent: boolean;
}

interface Props {
  currentDevices: RegisteredDevice[];
  plan: "free" | "starter" | "pro" | "business";
  onUpgrade: () => void;
  onRevoke: (deviceId: string) => Promise<void>;
}

const PLAN_LIMITS: Record<Props["plan"], { devices: number; nextLabel: string }> = {
  free: { devices: 1, nextLabel: "Starter" },
  starter: { devices: 2, nextLabel: "Pro" },
  pro: { devices: -1, nextLabel: "Business" },
  business: { devices: -1, nextLabel: "" },
};

/**
 * Modal shown when device registration is rejected because the plan limit
 * is reached. Lets the user revoke another device (so the current one can
 * register) or upgrade.
 *
 * Shipping the UI today; the wiring depends on a Supabase `devices` table
 * + register_device / revoke_device RPCs (deferred — see LAUNCH-CHECKLIST
 * v2-additions Addition 3). Until those exist, callers can pass a no-op
 * onRevoke for development testing.
 */
export function DeviceLimitModal({
  currentDevices,
  plan,
  onUpgrade,
  onRevoke,
}: Props) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = PLAN_LIMITS[plan];

  async function revoke(id: string) {
    setRevoking(id);
    setError(null);
    try {
      await onRevoke(id);
      // Caller is expected to refresh the device list / reload the app.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: MOTION.duration.base, ease: MOTION.ease.out }}
        className="bg-bb-card border border-bb-border rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="size-12 rounded-full bg-amber-500/15 grid place-items-center mx-auto mb-4">
          <Lock className="size-6 text-amber-400" />
        </div>

        <h2 className="text-xl font-semibold text-center mb-2">
          Device limit reached
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          Your <strong className="text-bb-fg capitalize">{plan}</strong> plan allows{" "}
          {limit.devices === -1
            ? "unlimited devices"
            : `${limit.devices} ${limit.devices === 1 ? "device" : "devices"}`}
          .
        </p>

        <div className="border border-bb-border rounded-lg divide-y divide-bb-border mb-6">
          {currentDevices.map((d) => (
            <div key={d.id} className="p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {d.os}
                  {d.isCurrent && (
                    <span className="ml-2 text-[10px] text-bb-primary uppercase">
                      this device
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  v{d.appVersion} · last seen {new Date(d.lastSeen).toLocaleString()}
                </div>
              </div>
              {!d.isCurrent && (
                <button
                  onClick={() => revoke(d.id)}
                  disabled={revoking === d.id}
                  className="px-2 py-1 text-xs border border-bb-border hover:bg-bb-bg rounded inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {revoking === d.id ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    "Sign out"
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-900/20 border border-red-800 rounded text-red-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {limit.nextLabel && (
            <button
              onClick={onUpgrade}
              className="w-full px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
            >
              Upgrade to {limit.nextLabel}
            </button>
          )}
          <p className="text-[11px] text-gray-500 text-center">
            Or sign out from another device above to continue here.
          </p>
        </div>

        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer">Why does this happen?</summary>
          <p className="mt-2">
            Each install of BossBoard registers as a separate device — including
            reinstalls and PC formatting. If you reformatted, simply sign out
            from the old device above and the slot frees up immediately.
          </p>
        </details>
      </motion.div>
    </div>
  );
}
