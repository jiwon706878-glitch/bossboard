"use client";

import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface DeveloperModeCardProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  saving: boolean;
}

export function DeveloperModeCard({ enabled, onToggle, saving }: DeveloperModeCardProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Developer Mode</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="font-medium">Enable Developer Mode</Label>
            <p className="text-sm text-muted-foreground">Show API keys, MCP connection guide, and Agent Activity in your sidebar.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} disabled={saving} />
        </div>
      </CardContent>
    </Card>
  );
}
