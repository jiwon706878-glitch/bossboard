"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { businessKeys } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BusinessCardProps {
  userId: string;
  initialName: string;
}

export function BusinessCard({ userId, initialName }: BusinessCardProps) {
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);

  const displayName = nameInput ?? initialName;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBusiness) return;
    const nameToSave = nameInput ?? initialName;
    if (!String(nameToSave).trim()) { toast.error("Business name cannot be empty"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("businesses")
      .update({ name: String(nameToSave).trim() })
      .eq("id", currentBusiness.id)
      .select()
      .single();
    if (error) { toast.error(error.message); }
    else {
      toast.success("Business updated");
      setNameInput(null);
      if (data) setCurrentBusiness(data);
      queryClient.invalidateQueries({ queryKey: businessKeys.all(userId) });
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Business</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={displayName} onChange={(e) => setNameInput(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving || !currentBusiness}>
            {saving ? "Saving..." : "Save Business"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
