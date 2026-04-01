"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { userKeys } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProfileCardProps {
  userId: string;
  initialName: string;
  isFetching: boolean;
}

export function ProfileCard({ userId, initialName, isFetching }: ProfileCardProps) {
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const displayName = nameInput ?? initialName;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const nameToSave = nameInput ?? initialName;
    if (!nameToSave?.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: nameToSave.trim() }).eq("id", userId);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Profile updated");
      setNameInput(null);
      queryClient.setQueryData(userKeys.profile(userId), (old: any) => ({ ...old, full_name: nameToSave.trim() }));
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={displayName} onChange={(e) => setNameInput(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving || isFetching}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
