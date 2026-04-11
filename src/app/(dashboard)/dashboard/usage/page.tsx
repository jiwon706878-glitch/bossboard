import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, ArrowUpRight } from "lucide-react";
import Link from "next/link";

/**
 * AI Usage page — Day 5 replaced the credit dashboard with a BYOK
 * status summary. Credits no longer exist; paid plans use the
 * caller's own Anthropic/Gemini/OpenAI key and pay their provider
 * directly. This page confirms the BYOK connection and surfaces
 * plan limits that still matter (SOPs, team, storage).
 */
export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, external_api_keys")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id ?? "free") as PlanId;
  const plan = plans[planId];

  const keys = (profile?.external_api_keys ?? {}) as Record<
    string,
    string | undefined
  >;
  const connectedProviders = (
    ["anthropic", "google", "openai", "grok"] as const
  ).filter((p) => typeof keys[p] === "string" && keys[p]!.length > 0);

  const isFree = planId === "free";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Usage</h1>
        <p className="text-muted-foreground">
          BossBoard is BYOK-first — connect your own AI provider key and
          the bill comes from them, not us.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Key className="h-4 w-4" />
              BYOK status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFree ? (
              <div>
                <p className="text-sm">
                  AI features require a paid plan. Upgrade to Starter or
                  higher to connect your own AI key and unlock SOP
                  generation, tab chat, receipt OCR, and file convert.
                </p>
                <Link href="/dashboard/billing" className="mt-4 inline-block">
                  <Button size="sm" variant="outline" className="gap-1">
                    View plans <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : connectedProviders.length === 0 ? (
              <div>
                <p className="text-sm">
                  No AI provider connected yet. Add at least one key to use
                  AI features on your {plan.name} plan.
                </p>
                <Link
                  href="/dashboard/settings#external-api-keys"
                  className="mt-4 inline-block"
                >
                  <Button size="sm" variant="outline" className="gap-1">
                    Connect a provider <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm">
                  Connected: {connectedProviders.length} provider
                  {connectedProviders.length === 1 ? "" : "s"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {connectedProviders.map((p) => (
                    <Badge key={p} variant="secondary" className="capitalize">
                      {p}
                    </Badge>
                  ))}
                </div>
                <Link
                  href="/dashboard/settings#external-api-keys"
                  className="mt-4 inline-block text-xs text-muted-foreground underline"
                >
                  Manage keys
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant="secondary">{plan.name}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SOPs</span>
              <span className="font-medium">
                {plan.limits.sops === -1 ? "Unlimited" : plan.limits.sops}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Team members</span>
              <span className="font-medium">
                {plan.limits.teamMembers === -1
                  ? "Unlimited"
                  : plan.limits.teamMembers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI agents</span>
              <span className="font-medium">
                {plan.limits.agentMembers === -1
                  ? "Unlimited"
                  : plan.limits.agentMembers}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-medium">{plan.limits.storageGb} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto-indexing</span>
              <span className="font-medium">
                {plan.limits.autoIndexing ? "Enabled" : "Disabled"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
