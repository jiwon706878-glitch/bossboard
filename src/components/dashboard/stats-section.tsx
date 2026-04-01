"use client";

import { FileText, Users, Zap } from "lucide-react";
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
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <Card className="rounded-md shadow-none">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Documents
          </div>
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-2xl font-bold">{totalSops}</span>
            <span className="text-xs text-muted-foreground">{publishedSops} published {"\u00b7"} {draftSops} drafts</span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-none">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            Team
          </div>
          <span className="font-mono text-2xl font-bold">{teamCount}</span>
          <span className="ml-2 text-xs text-muted-foreground">members</span>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-none">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            AI Generations
          </div>
          <span className="font-mono text-2xl font-bold">{creditsUsed}</span>
          {!unlimitedCredits && (
            <span className="ml-1 text-xs text-muted-foreground">/ {creditsLimit}</span>
          )}
          <span className="ml-2 text-xs text-muted-foreground">this month</span>
        </CardContent>
      </Card>
    </div>
  );
}
