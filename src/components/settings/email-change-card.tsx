"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUser, userKeys } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EmailChangeCard() {
  const supabase = createClient();
  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });

  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();

    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (newEmail.toLowerCase() === user?.email?.toLowerCase()) {
      toast.error("This is already your email");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Confirmation email sent to your new address. Please check your inbox.");
      setNewEmail("");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>
          Change your account email. A confirmation link will be sent to your new email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>New Email</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
            />
          </div>
          <Button type="submit" disabled={saving || !newEmail.trim()}>
            {saving ? "Sending confirmation..." : "Change Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
