"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/sops/tag-input";

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

interface DocumentSettingsBarProps {
  metaOpen: boolean;
  onMetaOpenChange: (open: boolean) => void;
  docType: string;
  onDocTypeChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  folderId: string;
  onFolderIdChange: (value: string) => void;
  availableFolders: { id: string; name: string }[];
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function DocumentSettingsBar({
  metaOpen,
  onMetaOpenChange,
  docType,
  onDocTypeChange,
  category,
  onCategoryChange,
  folderId,
  onFolderIdChange,
  availableFolders,
  tags,
  onTagsChange,
}: DocumentSettingsBarProps) {
  return (
    <div className="border-t shrink-0">
      <Collapsible open={metaOpen} onOpenChange={onMetaOpenChange}>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30">
          <span>Document settings</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", metaOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={docType} onValueChange={onDocTypeChange}>
                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sop">SOP</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="log">Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Folder</Label>
              <Select value={folderId || "none"} onValueChange={(v) => onFolderIdChange(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Unfiled" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unfiled</SelectItem>
                  {availableFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <TagInput tags={tags} onChange={onTagsChange} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
