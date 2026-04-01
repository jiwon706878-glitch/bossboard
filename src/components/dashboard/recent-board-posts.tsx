"use client";

import { useQuery } from "@tanstack/react-query";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchRecentBoardPosts, boardKeys } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
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

export function RecentBoardPosts() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: boardKeys.recent(businessId ?? ""),
    queryFn: () => fetchRecentBoardPosts(businessId!),
    enabled: !!businessId,
  });

  if (isLoading) {
    return (
      <Card className="rounded-md shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-primary" />
            Recent Board Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
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
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-primary" />
            Recent Board Posts
          </CardTitle>
          <Link href="/dashboard/board" className="text-xs text-primary hover:underline">
            View all &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No board posts yet</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post: any) => (
              <Link key={post.id} href="/dashboard/board" className="block rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {(post.author_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span>{post.author_name}</span>
                  <span>&middot;</span>
                  <span>{timeAgo(post.created_at)}</span>
                </div>
                <p className="mt-1 text-sm truncate">
                  {post.title || (post.content?.slice(0, 100) + (post.content?.length > 100 ? "..." : ""))}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
