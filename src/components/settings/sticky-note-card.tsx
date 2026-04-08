"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function StickyNoteCard() {
  const [stickyHidden, setStickyHidden] = useState(false);

  useEffect(() => {
    setStickyHidden(localStorage.getItem("bossboard-sticky-hidden") === "true");
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Sticky Note</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="font-medium">Show sticky note</Label>
            <p className="text-sm text-muted-foreground">Display the quick notes widget on the dashboard.</p>
          </div>
          <Switch
            checked={!stickyHidden}
            onCheckedChange={(v) => {
              const hidden = !v;
              localStorage.setItem("bossboard-sticky-hidden", hidden ? "true" : "false");
              setStickyHidden(hidden);
              window.dispatchEvent(new CustomEvent("bossboard-sticky-toggle", { detail: { hidden } }));
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
