"use client";

import { useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";

export interface RegisteredDevice {
  id: string;
  device_id: string;
  device_name: string | null;
  os: string;
  last_seen: string;
}

interface Props {
  currentDevices: RegisteredDevice[];
  currentDeviceId: string;
  plan: "free" | "starter" | "pro" | "business";
  onUpgrade: () => void;
  onRevoke: (deviceId: string) => Promise<void>;
}

const PLAN_NEXT: Record<Props["plan"], string> = {
  free: "Starter",
  starter: "Pro",
  pro: "Business",
  business: "",
};

const PLAN_DEVICE_HINT: Record<Props["plan"], string> = {
  free: "1 device",
  starter: "2 devices",
  pro: "unlimited devices",
  business: "unlimited devices",
};

/**
 * Modal shown when device registration is rejected because the plan limit
 * is reached. Lets the user revoke another device (so the current one can
 * register) or upgrade.
 */
export function DeviceLimitModal({
  currentDevices,
  currentDeviceId,
  plan,
  onUpgrade,
  onRevoke,
}: Props) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(deviceId: string) {
    setRevoking(deviceId);
    setError(null);
    try {
      await onRevoke(deviceId);
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
          {PLAN_DEVICE_HINT[plan]}.
        </p>

        <div className="border border-bb-border rounded-lg divide-y divide-bb-border mb-6">
          {currentDevices.map((d) => {
            const isCurrent = d.device_id === currentDeviceId;
            return (
              <div
                key={d.device_id}
                className="p-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {d.device_name || d.os}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] text-bb-primary uppercase">
                        this device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {d.os} · last seen {new Date(d.last_seen).toLocaleString()}
                  </div>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => revoke(d.device_id)}
                    disabled={revoking === d.device_id}
                    className="px-2 py-1 text-xs border border-bb-border hover:bg-bb-bg rounded inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {revoking === d.device_id ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      "Sign out"
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-900/20 border border-red-800 rounded text-red-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {PLAN_NEXT[plan] && (
            <button
              onClick={onUpgrade}
              className="w-full px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
            >
              Upgrade to {PLAN_NEXT[plan]}
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
