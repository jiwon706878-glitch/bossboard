"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PenLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TagInput } from "@/components/sops/tag-input";

export function QuickNoteButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();
  const router = useRouter();

  async function handleOpen() {
    setTitle(`Note - ${format(new Date(), "MMM d")}`);
    setContent("");
    setFolderId("");
    setTags([]);

    if (currentBusiness?.id) {
      const { data } = await supabase
        .from("folders")
        .select("id, name")
        .eq("business_id", currentBusiness.id)
        .order("sort_order");
      setFolders(data ?? []);
    }

    setOpen(true);
  }

  async function handleSave() {
    if (!content.trim()) {
      toast.error("Please add some content");
      return;
    }

    setSaving(true);

    const bizId = currentBusiness?.id;
    if (!bizId) {
      const { data } = await supabase.from("businesses").select("id").limit(1);
      if (!data?.[0]?.id) {
        toast.error("No business found");
        setSaving(false);
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();

    const tipTapContent = {
      type: "doc",
      content: content.split("\n").map((line) =>
        line.trim()
          ? { type: "paragraph", content: [{ type: "text", text: line }] }
          : { type: "paragraph" }
      ),
    };

    const { data, error } = await supabase
      .from("sops")
      .insert({
        business_id: bizId || currentBusiness?.id,
        title: title.trim() || `Note - ${format(new Date(), "MMM d")}`,
        content: tipTapContent,
        summary: content.substring(0, 200).replace(/\n/g, " ").trim() || null,
        folder_id: folderId && folderId !== "none" ? folderId : null,
        doc_type: "note",
        tags: tags.length > 0 ? tags : [],
        status: "published",
        version: 1,
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    toast.success("Note saved!", {
      action: {
        label: "View",
        onClick: () => router.push(`/dashboard/sops/${data.id}`),
      },
    });
  }

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-150 hover:scale-105 active:scale-95"
        title="Quick Note"
      >
        <PenLine className="h-5 w-5" />
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Note</DialogTitle>
            <DialogDescription className="sr-only">Write a quick note</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note..."
                rows={6}
                autoFocus
              />
            </div>
            {folders.length > 0 && (
              <div className="space-y-2">
                <Label>Folder (optional)</Label>
                <Select value={folderId} onValueChange={setFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
              {saving ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Sidebar text button version */
export function QuickNoteSidebarButton() {
  const [open, setOpen] = useState(false);
  // Reuse the main button's dialog by rendering a hidden trigger
  return (
    <QuickNoteInline />
  );
}

/** Inline version that can be placed in sidebar */
function QuickNoteInline() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();
  const router = useRouter();

  async function handleSave() {
    if (!content.trim()) { toast.error("Add content"); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const tipTapContent = {
      type: "doc",
      content: content.split("\n").map((line) =>
        line.trim()
          ? { type: "paragraph", content: [{ type: "text", text: line }] }
          : { type: "paragraph" }
      ),
    };

    const { data, error } = await supabase
      .from("sops")
      .insert({
        business_id: currentBusiness?.id,
        title: title.trim() || `Note - ${format(new Date(), "MMM d")}`,
        content: tipTapContent,
        doc_type: "note",
        status: "published",
        version: 1,
        created_by: user?.id,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    setTitle("");
    setContent("");
    toast.success("Note saved!");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setTitle(`Note - ${format(new Date(), "MMM d")}`); }}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors duration-100"
      >
        <PenLine className="h-3 w-3" />
        Quick Note
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Quick Note</DialogTitle><DialogDescription className="sr-only">Write a quick note</DialogDescription></DialogHeader>
          <div className="space-y-3 pt-1">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write..." rows={4} autoFocus />
            <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
