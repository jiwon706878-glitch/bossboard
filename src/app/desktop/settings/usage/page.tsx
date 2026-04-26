"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Zap, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";

type Period = "today" | "this_week" | "this_month";

interface UsageBreakdown {
  key: string; // "<provider>" for by_provider; "<agent>|<provider>" for by_agent
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
}

interface UsageData {
  period: Period;
  totals: {
    total_tokens: number;
    total_cost_estimate: number;
  };
  by_provider: UsageBreakdown[];
  by_agent: UsageBreakdown[];
}

const PERIOD_LABEL: Record<Period, string> = {
  today: "Today (24h)",
  this_week: "This week (7 days)",
  this_month: "This month (30 days)",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function UsagePage() {
  const [period, setPeriod] = useState<Period>("this_month");
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function loadUsage() {
    if (!isTauri()) {
      setError("Token usage is tracked locally — only available in the desktop app.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<UsageData>("get_token_usage", { period });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold">Token Usage</h1>
          <p className="text-sm text-gray-400 mt-1">
            Local tracking of AI usage across your agents. Costs are estimates;
            your actual bill comes from your provider directly.
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="px-3 py-2 rounded-md border border-bb-border bg-bb-bg text-sm"
        >
          <option value="today">Today</option>
          <option value="this_week">This week</option>
          <option value="this_month">This month</option>
        </select>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="mt-6 text-sm text-gray-400">Loading…</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="rounded-lg border border-bb-border bg-bb-card p-4">
              <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
                <Zap className="size-4 text-amber-400" />
                Total tokens · {PERIOD_LABEL[period]}
              </div>
              <div className="text-3xl font-bold">
                {formatTokens(data.totals.total_tokens)}
              </div>
            </div>
            <div className="rounded-lg border border-bb-border bg-bb-card p-4">
              <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
                <TrendingUp className="size-4 text-green-400" />
                Estimated cost
              </div>
              <div className="text-3xl font-bold">
                ${data.totals.total_cost_estimate.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                BYOK — billed by your provider, not BossBoard.
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-lg border border-bb-border p-4">
            <h2 className="font-semibold mb-3">By provider</h2>
            {data.by_provider.length === 0 ? (
              <p className="text-sm text-gray-400">
                No usage recorded for this period yet.
              </p>
            ) : (
              <div className="divide-y divide-bb-border">
                {data.by_provider.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium capitalize">{row.key}</span>
                    <div className="text-right">
                      <div>
                        {formatTokens(row.tokens_in)} in /{" "}
                        {formatTokens(row.tokens_out)} out
                      </div>
                      <div className="text-xs text-gray-500">
                        ${row.cost_estimate.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-4 rounded-lg border border-bb-border p-4">
            <h2 className="font-semibold mb-3">By agent</h2>
            {data.by_agent.length === 0 ? (
              <p className="text-sm text-gray-400">
                No agent has logged usage yet.
              </p>
            ) : (
              <div className="divide-y divide-bb-border">
                {data.by_agent.map((row) => {
                  const [agent, provider] = row.key.split("|");
                  return (
                    <div
                      key={row.key}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{agent}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {provider}
                        </span>
                      </div>
                      <div className="text-right">
                        <div>
                          {formatTokens(row.tokens_in + row.tokens_out)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ${row.cost_estimate.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <section className="mt-6 rounded-lg border-l-4 border-blue-500 bg-blue-900/15 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-4 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">BYOK reminder</p>
            <p className="text-gray-400 mt-1">
              These costs are estimates based on each provider&apos;s public
              per-token rate (Anthropic Sonnet, OpenAI GPT-4o, Google Gemini
              Flash, xAI Grok). Your actual bill comes from your AI provider
              directly. BossBoard never marks up or charges for AI usage.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
