"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { TagInput } from "@/components/sops/tag-input";
import type { JSONContent } from "@tiptap/react";

const SOPEditor = dynamic(
  () => import("@/components/sops/sop-editor").then((m) => ({ default: m.SOPEditor })),
  { ssr: false, loading: () => <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Loading editor...</div> }
);

const CATEGORIES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "operations", label: "Operations" },
  { value: "safety", label: "Safety" },
  { value: "customer-service", label: "Customer Service" },
  { value: "inventory", label: "Inventory" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function EditSOPPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("draft");
  const [folderId, setFolderId] = useState("");
  const [docType, setDocType] = useState("sop");
  const [tags, setTags] = useState<string[]>([]);
  const [availableFolders, setAvailableFolders] = useState<{ id: string; name: string }[]>([]);
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const sopId = params.id as string;

  useEffect(() => {
    async function fetchSOP() {
      const { data, error } = await supabase
        .from("sops")
        .select("*")
        .eq("id", sopId)
        .single();

      if (error || !data) {
        toast.error("SOP not found");
        router.push("/dashboard/sops");
        return;
      }

      setTitle(data.title || "");
      setCategory(data.category || "");
      setStatus(data.status || "draft");
      setFolderId(data.folder_id || "");
      setDocType(data.doc_type || "sop");
      setTags(data.tags || []);
      setEditorContent(data.content || null);

      // Load folders for this business
      if (data.business_id) {
        const { data: folders } = await supabase
          .from("folders")
          .select("id, name")
          .eq("business_id", data.business_id)
          .order("sort_order");
        setAvailableFolders(folders ?? []);
      }

      setLoading(false);
    }
    fetchSOP();
  }, [sopId, supabase, router]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from("sops")
      .update({
        title: title.trim(),
        content: editorContent,
        category: category && category !== "none" ? category : null,
        folder_id: folderId && folderId !== "none" ? folderId : null,
        doc_type: docType,
        tags: tags.length > 0 ? tags : [],
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sopId);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("SOP updated!");
    router.push(`/dashboard/sops/${sopId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-md border bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/sops/${sopId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit SOP</h1>
          <p className="text-muted-foreground">
            Update your Standard Operating Procedure.
          </p>
        </div>
      </div>

      <Card className="border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">SOP Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="SOP title"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Content</Label>
            <SOPEditor content={editorContent} onChange={setEditorContent} />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Link href={`/dashboard/sops/${sopId}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
