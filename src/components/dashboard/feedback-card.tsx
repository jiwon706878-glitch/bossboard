"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export function FeedbackCard() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not logged in"); setSending(false); return; }

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      business_id: currentBusiness?.id || null,
      content: text.trim(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Thanks for your feedback!");
      setText("");
      setSent(true);
    }
    setSending(false);
  }

  if (sent) {
    return (
      <Card className="border bg-card">
        <CardContent className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Thank you for your feedback!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-card">
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Have feedback or suggestions?</p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us what you think..."
            rows={2}
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
            {sending ? "Sending..." : "Send Feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
