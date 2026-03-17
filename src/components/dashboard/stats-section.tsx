"use client";

import { useState } from "react";
import { FileText, Users, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsSectionProps {
  totalSops: number;
  publishedSops: number;
  draftSops: number;
  teamCount: number;
  creditsUsed: number;
  creditsLimit: number;
  unlimitedCredits: boolean;
}

export function StatsSection({
  totalSops,
  publishedSops,
  draftSops,
  teamCount,
  creditsUsed,
  creditsLimit,
  unlimitedCredits,
}: StatsSectionProps) {
  const [statsOpen, setStatsOpen] = useState(false);

  return (
    <Card className="rounded-md shadow-none">
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        onClick={() => setStatsOpen(!statsOpen)}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Statistics
        </span>
        {statsOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {statsOpen && (
        <CardContent className="pt-0">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                SOP Overview
              </div>
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-2xl font-bold">{totalSops}</span>
                <span className="text-xs text-muted-foreground">{publishedSops} published {"\u00b7"} {draftSops} drafts</span>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                Team
              </div>
              <span className="font-mono text-2xl font-bold">{teamCount}</span>
              <span className="ml-2 text-xs text-muted-foreground">members</span>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                AI Generations
              </div>
              <span className="font-mono text-2xl font-bold">{creditsUsed}</span>
              {!unlimitedCredits && (
                <span className="ml-1 text-xs text-muted-foreground">/ {creditsLimit}</span>
              )}
              <span className="ml-2 text-xs text-muted-foreground">this month</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
