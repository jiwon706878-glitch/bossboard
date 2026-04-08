"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface WorkspacesCardProps {
  allBusinesses: any[];
  currentBusinessId: string | undefined;
  newBizName: string;
  onNewBizNameChange: (value: string) => void;
  newBizType: string;
  onNewBizTypeChange: (value: string) => void;
  onAddBusiness: (e: React.FormEvent) => void;
  onDeleteBusiness: (bizId: string, bizName: string) => void;
}

export function WorkspacesCard({
  allBusinesses,
  currentBusinessId,
  newBizName,
  onNewBizNameChange,
  newBizType,
  onNewBizTypeChange,
  onAddBusiness,
  onDeleteBusiness,
}: WorkspacesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {allBusinesses.map((biz: any) => (
            <div key={biz.id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="font-medium text-sm">{biz.name}</p>
                <p className="text-xs text-muted-foreground">{biz.type} {"\u00b7"} Created {new Date(biz.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {currentBusinessId === biz.id && (
                  <Badge variant="secondary" className="text-[10px]">Current</Badge>
                )}
                {allBusinesses.length > 1 && (
                  <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => onDeleteBusiness(biz.id, biz.name)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Add Workspace</h3>
          <form onSubmit={onAddBusiness} className="flex gap-3">
            <Input placeholder="Business name" value={newBizName} onChange={(e) => onNewBizNameChange(e.target.value)} className="flex-1" />
            <Input placeholder="e.g., Cafe, Brewery, Office" value={newBizType} onChange={(e) => onNewBizTypeChange(e.target.value)} className="w-[180px]" />
            <Button type="submit" disabled={!newBizName.trim()}>Add</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
