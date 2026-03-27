import type { JSONContent } from "@tiptap/react";

export interface SOP {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  status: string;
  version: number;
  folder_id: string | null;
  doc_type: string;
  tags: string[];
  pinned: boolean;
  source_file_url: string | null;
  source_file_name: string | null;
  copy_protected: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  isUnread?: boolean;
}

export interface FolderPermissions {
  visible_to: string[]; // ["all"] or ["user-uuid-1", "user-uuid-2"]
}

export interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  permissions?: FolderPermissions | null;
}

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  archived: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface SOPDetail {
  id: string;
  title: string;
  content: JSONContent | null;
  summary: string | null;
  category: string | null;
  status: string;
  version: number;
  doc_type: string;
  tags: string[];
  pinned: boolean;
  source_file_url: string | null;
  source_file_name: string | null;
  copy_protected: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function formatLongDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
