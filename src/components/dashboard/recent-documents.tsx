"use client";

import { useQuery } from "@tanstack/react-query";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchRecentDocuments, recentDocKeys } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, StickyNote, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const docIcons: Record<string, typeof FileText> = {
  sop: FileText,
  note: StickyNote,
  policy: Shield,
};

export function RecentDocuments() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: recentDocKeys.latest(businessId ?? ""),
    queryFn: () => fetchRecentDocuments(businessId!),
    enabled: !!businessId,
  });

  if (isLoading) {
    return (
      <Card className="rounded-md shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recently Updated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-md shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Recently Updated</CardTitle>
          <Link href="/dashboard/sops" className="text-xs text-primary hover:underline">
            View all &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No documents yet. Create your first SOP in the Wiki.
          </p>
        ) : (
          <div className="space-y-1">
            {docs.map((doc: any) => {
              const Icon = docIcons[doc.doc_type || "sop"] || FileText;
              return (
                <Link
                  key={doc.id}
                  href={`/dashboard/sops/${doc.id}`}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{doc.title}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] shrink-0 ${
                      doc.status === "published"
                        ? "bg-emerald-400/10 text-emerald-600"
                        : "bg-amber-400/10 text-amber-600"
                    }`}
                  >
                    {doc.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {doc.updated_at ? timeAgo(doc.updated_at) : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
