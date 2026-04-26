"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  Check,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";
import { createClient } from "@/lib/supabase/client";
import { usePlan } from "@/lib/auth/use-plan";
import { isFeatureAvailable } from "@/lib/plan-gate";

type FeedbackType =
  | "bug"
  | "feature"
  | "question"
  | "other"
  | "priority_feature_request";
type Priority = "critical" | "normal" | "low";

interface DeviceInfo {
  device_id?: string;
  os?: string;
  os_version?: string | null;
  app_version?: string;
}

interface TypeOption {
  value: FeedbackType;
  label: string;
  icon: LucideIcon;
  color: string;
  /** When true, this option only appears for users on the Business plan. */
  businessOnly?: boolean;
}

const TYPES: TypeOption[] = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-400" },
  {
    value: "feature",
    label: "Feature Request",
    icon: Lightbulb,
    color: "text-amber-400",
  },
  {
    value: "question",
    label: "Question",
    icon: HelpCircle,
    color: "text-blue-400",
  },
  {
    value: "other",
    label: "Other",
    icon: MessageCircle,
    color: "text-gray-400",
  },
  {
    value: "priority_feature_request",
    label: "Priority FR",
    icon: Star,
    color: "text-purple-400",
    businessOnly: true,
  },
];

export default function FeedbackPage() {
  const { plan } = usePlan();
  const businessFeatures = isFeatureAvailable(
    "priority_feature_requests",
    plan,
  );
  const visibleTypes = TYPES.filter((t) => !t.businessOnly || businessFeatures);
  const [type, setType] = useState<FeedbackType>("bug");
  const [priority, setPriority] = useState<Priority>("normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    invoke<DeviceInfo>("get_device_info")
      .then(setDevice)
      .catch(() => setDevice(null));
  }, []);

  async function handleSubmit() {
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Sign in required to submit feedback.");
        return;
      }

      // Bugs use the user-picked severity; priority feature requests
      // (Business plan only) auto-promote to critical so they land at
      // the top of Jay's queue alongside critical bug reports;
      // everything else is normal.
      let resolvedPriority: Priority;
      if (type === "bug") {
        resolvedPriority = priority;
      } else if (type === "priority_feature_request") {
        resolvedPriority = "critical";
      } else {
        resolvedPriority = "normal";
      }

      const { error: insertError } = await supabase.from("feedback").insert({
        user_id: session.user.id,
        type,
        priority: resolvedPriority,
        subject: subject.trim().slice(0, 200),
        body: body.trim() || null,
        os: device?.os ?? null,
        app_version: device?.app_version ?? null,
      });
      if (insertError) {
        if (insertError.code === "42P01") {
          setError(
            "Feedback table not deployed yet. Ask the admin to run supabase migration 20260427400000_v4_admin_stats.sql.",
          );
          return;
        }
        throw insertError;
      }

      // Critical bugs and Business priority requests ping Telegram.
      // Best-effort — silent on failure.
      if (resolvedPriority === "critical") {
        fetch("/api/admin/telegram-summary", { method: "POST" }).catch(() => {});
      }

      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="size-16 rounded-full bg-green-500/15 grid place-items-center mx-auto mb-4">
            <Check className="size-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Thanks!</h2>
          <p className="text-gray-400 mb-6">
            {priority === "critical" && type === "bug"
              ? "Critical issue received. Jay sees it within hours."
              : "Your feedback is in the queue. Jay reads every message and replies within 24h."}
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setSubject("");
              setBody("");
              setError(null);
            }}
            className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
          >
            Send another
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Send Feedback</h1>
      <p className="text-sm text-gray-400 mb-6">
        Found a bug? Have an idea? Tell Jay directly. He reads every message and
        replies within 24 hours.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium block mb-2">Type</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {visibleTypes.map((t) => {
              const Icon = t.icon;
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    active
                      ? "border-bb-primary bg-bb-primary/5"
                      : "border-bb-border hover:border-bb-primary/40"
                  }`}
                >
                  <Icon className={`size-5 mx-auto mb-1 ${t.color}`} />
                  <div>{t.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {type === "priority_feature_request" && (
          <div className="rounded-md border border-purple-500/40 bg-purple-500/10 p-3 text-xs text-purple-200">
            <div className="font-medium text-purple-100">Business priority queue</div>
            <p className="mt-1">
              Priority feature requests skip the regular feedback queue and
              land at the top of Jay&apos;s roadmap review. Submitted as
              critical so they trigger an immediate Telegram alert.
            </p>
          </div>
        )}

        {type === "bug" && (
          <div>
            <label className="text-sm font-medium block mb-2">Severity</label>
            <div className="flex gap-2">
              {(["critical", "normal", "low"] as Priority[]).map((p) => {
                const active = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all ${
                      active
                        ? p === "critical"
                          ? "border-red-500 bg-red-500/5 text-red-300"
                          : "border-bb-primary bg-bb-primary/5"
                        : "border-bb-border hover:border-bb-primary/40"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {priority === "critical" && (
              <p className="text-xs text-red-400 mt-1">
                ⚡ Critical bugs trigger an immediate Telegram alert to Jay.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-medium block mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Library search returns wrong results"
            className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            maxLength={200}
          />
          <div className="text-[11px] text-gray-500 mt-1">
            {subject.length}/200
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">
            Description{" "}
            {type === "bug" && (
              <span className="text-gray-500 font-normal">
                (steps to reproduce, expected vs actual)
              </span>
            )}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={
              type === "bug"
                ? "1. I clicked X\n2. Expected Y\n3. Got Z instead"
                : "Optional details…"
            }
            className="w-full p-2 bg-bb-bg border border-bb-border rounded-md font-mono text-sm"
          />
        </div>

        <div className="rounded-lg border border-bb-border bg-bb-card p-3 text-xs text-gray-400">
          <div className="font-medium mb-1 text-bb-fg">Auto-attached:</div>
          <ul className="space-y-0.5">
            <li>
              • OS:{" "}
              <span className="font-mono">
                {device?.os ?? "—"}
                {device?.os_version ? ` ${device.os_version}` : ""}
              </span>
            </li>
            <li>
              • App version:{" "}
              <span className="font-mono">{device?.app_version ?? "—"}</span>
            </li>
            <li>• Account email (from your sign-in)</li>
          </ul>
          <p className="mt-2">
            File contents, DM transcripts, and API keys are NEVER attached.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!subject.trim() || submitting}
            className="flex-1 px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="size-4" />
            {submitting ? "Sending…" : "Send Feedback"}
          </button>
          <a
            href="https://github.com/jay/bossboard/issues"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 border border-bb-border hover:bg-bb-card rounded-md text-sm inline-flex items-center justify-center"
          >
            GitHub Issues
          </a>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Or email{" "}
          <a
            href="mailto:jay@mybossboard.com"
            className="text-bb-primary hover:underline"
          >
            jay@mybossboard.com
          </a>
        </p>
      </div>
    </div>
  );
}
