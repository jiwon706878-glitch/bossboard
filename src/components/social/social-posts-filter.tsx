"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ImageIcon, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface SocialPost {
  id: string;
  image_url: string | null;
  caption: string | null;
  hashtags: string[];
  tone: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

export function SocialPostsFilter({ posts }: { posts: SocialPost[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();
  const supabase = createClient();

  const filtered = posts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    scheduled:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    posted:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  async function handleDelete(id: string) {
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All posts</SelectItem>
          <SelectItem value="draft">Drafts</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="posted">Posted</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No posts yet. Create your first AI-powered social post!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <Card key={post.id}>
              <CardContent className="pt-6">
                {post.image_url && (
                  <div className="mb-3 aspect-video rounded-lg bg-muted overflow-hidden">
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant="secondary"
                    className={statusColors[post.status]}
                  >
                    {post.status}
                  </Badge>
                  {post.scheduled_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.scheduled_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm line-clamp-3">
                  {post.caption || "No caption yet"}
                </p>
                {post.hashtags && post.hashtags.length > 0 && (
                  <p className="mt-2 text-xs text-primary line-clamp-1">
                    {post.hashtags.map((h) => `#${h}`).join(" ")}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
