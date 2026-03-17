"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { extractStepsFromContent } from "@/lib/checklists/extract-steps";
import {
  SOPOption,
  PreviewItem,
  RECURRENCE_OPTIONS,
} from "@/lib/checklists/types";

interface FromSopTabProps {
  sops: SOPOption[];
  recurrence: string;
  setRecurrence: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  creating: boolean;
  onSubmit: (selectedSopId: string, previewItems: PreviewItem[]) => void;
}

export function FromSopTab({
  sops,
  recurrence,
  setRecurrence,
  dueDate,
  setDueDate,
  creating,
  onSubmit,
}: FromSopTabProps) {
  const [selectedSopId, setSelectedSopId] = useState("");
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  useEffect(() => {
    if (!selectedSopId) {
      setPreviewItems([]);
      return;
    }
    const sop = sops.find((s) => s.id === selectedSopId);
    if (!sop) return;
    const items = extractStepsFromContent(sop.content);
    setPreviewItems(items);
  }, [selectedSopId, sops]);

  return (
    <Card className="border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Create from SOP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select SOP</Label>
          <Select value={selectedSopId} onValueChange={setSelectedSopId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an SOP..." />
            </SelectTrigger>
            <SelectContent>
              {sops.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {previewItems.length > 0 && (
          <div className="space-y-2">
            <Label>Extracted items ({previewItems.length})</Label>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-3">
              {previewItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedSopId && previewItems.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No extractable checklist items found in this SOP.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Recurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={() => onSubmit(selectedSopId, previewItems)}
          disabled={creating || !selectedSopId || previewItems.length === 0}
          className="w-full"
        >
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckSquare className="mr-2 h-4 w-4" />
          )}
          Create Checklist ({previewItems.length} items)
        </Button>
      </CardContent>
    </Card>
  );
}
