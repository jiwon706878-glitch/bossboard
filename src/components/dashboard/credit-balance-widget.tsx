"use client";

import { useQuery } from "@tanstack/react-query";
import { getBalance, type CreditBalance } from "@/lib/credits";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CreditBalanceWidgetProps {
  businessId: string;
}

export function CreditBalanceWidget({ businessId }: CreditBalanceWidgetProps) {
  const { data: balance, isLoading } = useQuery<CreditBalance>({
    queryKey: ["credit-balance", businessId],
    queryFn: () => getBalance(businessId),
    enabled: !!businessId,
    staleTime: 60_000, // 1 minute
    refetchInterval: 5 * 60_000, // refresh every 5 min
  });

  if (isLoading || !balance) {
    return (
      <div className="px-4 py-3">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  const total = balance.monthly + balance.purchased;
  const used = balance.monthlyUsed + balance.purchasedUsed;
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 100;
  const remaining = balance.available;
  const lowWarning = total > 0 && remaining / total < 0.2;
  const empty = remaining <= 0;

  return (
    <Link
      href="/dashboard/settings"
      className="block px-4 py-3 group"
      title="View credit details"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          Credits
        </span>
        <span
          className={cn(
            "font-mono font-medium tabular-nums",
            empty
              ? "text-destructive"
              : lowWarning
                ? "text-amber-500"
                : "text-foreground"
          )}
        >
          {remaining.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            empty
              ? "bg-destructive"
              : lowWarning
                ? "bg-amber-500"
                : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {empty && (
        <p className="mt-1 text-[11px] text-destructive font-medium">
          No credits remaining — Buy More
        </p>
      )}
    </Link>
  );
}
