"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface Script {
  id: string;
  title: string;
  format: string;
  topic: string;
  hook: string | null;
  body: string | null;
  cta: string | null;
  created_at: string;
}

const formatLabels: Record<string, string> = {
  tiktok: "TikTok",
  reel: "Instagram Reel",
  youtube_short: "YouTube Short",
  story: "Story",
  testimonial: "Testimonial",
};

export function ScriptsFilter({ scripts }: { scripts: Script[] }) {
  const [formatFilter, setFormatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const filtered = scripts.filter((s) => {
    if (formatFilter !== "all" && s.format !== formatFilter) return false;
    if (
      searchQuery &&
      !s.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.topic.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  async function handleDelete(id: string) {
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Script deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search scripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            {Object.entries(formatLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No scripts yet. Create your first video script!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((script) => (
            <Card key={script.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {formatLabels[script.format] || script.format}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(script.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <CardTitle className="text-base">{script.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {script.hook || script.topic}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(script.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
