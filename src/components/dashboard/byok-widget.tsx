"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

const AI_PROVIDERS = ["anthropic", "google", "openai", "grok"] as const;
const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  google: "Gemini",
  openai: "OpenAI",
  grok: "Grok",
};

/**
 * Dashboard widget — BYOK status at a glance. Shows which AI
 * providers are connected, active agent count, and plan name.
 * Deep-links to settings for key management and agent creation.
 */
export function ByokWidget() {
  const supabase = createClient();
  const [connected, setConnected] = useState<string[]>([]);
  const [agentCount, setAgentCount] = useState(0);
  const [planName, setPlanName] = useState("Free");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_id, external_api_keys")
        .eq("id", user.id)
        .single();

      const planId = (profile?.plan_id ?? "free") as PlanId;
      setPlanName(plans[planId].name);

      const keys = (profile?.external_api_keys ?? {}) as Record<
        string,
        string | undefined
      >;
      setConnected(
        AI_PROVIDERS.filter((p) => typeof keys[p] === "string" && keys[p]!.length > 0)
      );

      // Agent count
      const res = await fetch("/api/agents/list", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAgentCount(data.limits?.current ?? 0);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Key className="h-4 w-4" />
          BYOK Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant="secondary">{planName}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI providers</span>
              <span className="font-medium">{connected.length} / 4</span>
            </div>
            {connected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {connected.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px]">
                    {PROVIDER_LABELS[p] ?? p}
                  </Badge>
                ))}
              </div>
            )}
            {connected.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No providers connected.{" "}
                <Link
                  href="/dashboard/settings#external-api-keys"
                  className="underline text-primary"
                >
                  Add one
                </Link>
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active agents</span>
              <span className="font-medium">{agentCount}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
