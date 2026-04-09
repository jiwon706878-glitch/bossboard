"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plans, type PlanId } from "@/config/plans";
import { HardDrive, Download, FileUp } from "lucide-react";

interface StorageUsageCardProps {
  businessId: string;
  userId: string;
  planId: PlanId;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isHigh = pct > 80;

  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          backgroundColor: isHigh ? "var(--danger, #F87171)" : color,
        }}
      />
    </div>
  );
}

export function StorageUsageCard({ businessId, userId, planId }: StorageUsageCardProps) {
  const supabase = createClient();
  const plan = plans[planId];

  // Fetch egress usage for current month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data: egressData, isLoading: egressLoading } = useQuery({
    queryKey: ["egress-usage", businessId, currentMonth],
    queryFn: async () => {
      const startOfMonth = `${currentMonth}-01T00:00:00.000Z`;
      const { data, error } = await supabase
        .from("egress_usage")
        .select("bytes")
        .eq("business_id", businessId)
        .gte("created_at", startOfMonth);

      if (error || !data) return 0;
      return data.reduce((sum: number, row: { bytes: number }) => sum + (row.bytes || 0), 0);
    },
    enabled: !!businessId,
    staleTime: 60 * 1000,
  });

  // Fetch storage usage estimate (sum of attachment sizes from board_posts + wiki-uploads)
  const { data: storageData, isLoading: storageLoading } = useQuery({
    queryKey: ["storage-usage", businessId],
    queryFn: async () => {
      // Try to get storage usage from a dedicated table or estimate from attachments
      const { data, error } = await supabase
        .from("storage_usage")
        .select("total_bytes")
        .eq("business_id", businessId)
        .maybeSingle();

      if (!error && data?.total_bytes != null) {
        return data.total_bytes as number;
      }

      // Fallback: return 0 if no tracking table exists yet
      return 0;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  const storageBytes = storageData ?? 0;
  const egressBytes = egressData ?? 0;
  const storageLimitBytes = plan.limits.storageGb * 1024 * 1024 * 1024;
  const egressLimitBytes = plan.limits.egressGbPerMonth * 1024 * 1024 * 1024;

  const isLoading = egressLoading || storageLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage & Downloads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Storage usage */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>Storage</span>
          </div>
          {isLoading ? (
            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
          ) : (
            <>
              <ProgressBar value={storageBytes} max={storageLimitBytes} color="var(--accent, #4F8BFF)" />
              <p className="text-xs text-muted-foreground">
                {formatBytes(storageBytes)} / {plan.limits.storageGb} GB used
              </p>
            </>
          )}
        </div>

        {/* Egress / downloads */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Download className="h-4 w-4 text-muted-foreground" />
            <span>Downloads this month</span>
          </div>
          {isLoading ? (
            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
          ) : (
            <>
              <ProgressBar value={egressBytes} max={egressLimitBytes} color="var(--success, #34D399)" />
              <p className="text-xs text-muted-foreground">
                {formatBytes(egressBytes)} / {plan.limits.egressGbPerMonth} GB
              </p>
            </>
          )}
        </div>

        {/* Per-file limit info */}
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
          <FileUp className="h-3.5 w-3.5 shrink-0" />
          <span>Max file size: {plan.limits.fileSizeMb} MB per upload ({plan.name} plan)</span>
        </div>
      </CardContent>
    </Card>
  );
}
