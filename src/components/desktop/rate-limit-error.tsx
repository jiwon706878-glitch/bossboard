"use client";

import { AlertCircle, ExternalLink } from "lucide-react";

const PROVIDER_TIER_LINKS: Record<string, string> = {
  anthropic: "https://console.anthropic.com/settings/limits",
  openai: "https://platform.openai.com/account/limits",
  google: "https://aistudio.google.com/app/plan_information",
  xai: "https://console.x.ai/team/default/usage",
  grok: "https://console.x.ai/team/default/usage",
};

interface Props {
  provider: string;
  retryAfterSeconds?: number;
}

/**
 * Shown inline when an agent call returns 429. Explains in plain language
 * that the limit is from the provider, not BossBoard, and links to the
 * provider's tier page so the user can upgrade their account.
 */
export function RateLimitErrorBanner({ provider, retryAfterSeconds }: Props) {
  const tierLink = PROVIDER_TIER_LINKS[provider.toLowerCase()];

  return (
    <div
      role="alert"
      className="border-l-4 border-amber-500 bg-amber-900/20 p-4 rounded-r-md"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="size-5 text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm">
          <h3 className="font-semibold text-amber-200">
            {provider} API rate limit reached
          </h3>
          <p className="text-amber-200/80 mt-1">
            Your <strong className="capitalize">{provider}</strong> account hit
            its rate limit. This is from the provider, not BossBoard.
          </p>

          <div className="mt-3 text-xs text-amber-200/80">
            <strong className="text-amber-200">Why does this happen?</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>
                New API accounts have low rate limits (Tier 1 ≈ 3–5 requests/min)
              </li>
              <li>Spending more on the platform raises the tier and the limit</li>
              <li>
                BossBoard never bills you — your usage goes directly to the
                provider
              </li>
            </ul>
          </div>

          {tierLink && (
            <a
              href={tierLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-bb-primary hover:underline mt-3"
            >
              Check your {provider} tier
              <ExternalLink className="size-3" />
            </a>
          )}

          {retryAfterSeconds !== undefined && (
            <p className="text-[11px] text-amber-200/70 mt-2">
              Retry in {Math.ceil(retryAfterSeconds)} seconds
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
