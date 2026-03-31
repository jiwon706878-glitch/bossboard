"use client";

import { useState, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export const FeedbackCard = memo(function FeedbackCard({
  onSent,
}: {
  onSent?: () => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("feedback");
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
      category,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Thanks for your feedback!");
      setText("");
      setCategory("feedback");
      setSent(true);
      onSent?.();
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-muted-foreground">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="feedback">Feedback</SelectItem>
          <SelectItem value="bug">Bug Report</SelectItem>
          <SelectItem value="feature">Feature Request</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell us what you think..."
        rows={3}
        className="text-sm"
      />
      <Button type="submit" size="sm" disabled={sending || !text.trim()}>
        {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
        {sending ? "Sending..." : "Send"}
      </Button>
    </form>
  );
});
