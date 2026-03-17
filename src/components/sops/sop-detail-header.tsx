import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Tag, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/types/sops";
import type { SOPDetail } from "@/types/sops";

interface SOPDetailHeaderProps {
  sop: SOPDetail;
}

export function SOPDetailHeader({ sop }: SOPDetailHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <Link href="/dashboard/sops">
        <Button variant="ghost" size="sm" className="mt-1">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-foreground">{sop.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={cn("text-xs", STATUS_COLORS[sop.status])}
          >
            {sop.status}
          </Badge>
          {sop.category && (
            <Badge variant="outline" className="text-xs">
              <Tag className="mr-1 h-3 w-3" />
              {sop.category}
            </Badge>
          )}
          {sop.doc_type && sop.doc_type !== "sop" && (
            <Badge variant="outline" className="text-xs capitalize">
              {sop.doc_type}
            </Badge>
          )}
          {sop.pinned && (
            <Pin className="h-3 w-3 text-amber-400" />
          )}
          <span className="font-mono text-xs text-muted-foreground">
            v{sop.version}
          </span>
        </div>
        {sop.tags && sop.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {sop.tags.map((tag) => (
              <span key={tag} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
