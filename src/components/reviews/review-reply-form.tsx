"use client";

import { useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
}

export function ReviewReplyForm({
  review,
  businessId,
  onReplyGenerated,
}: {
  review: Review;
  businessId: string;
  onReplyGenerated: (reply: string) => void;
}) {
  const [tone, setTone] = useState("professional");

  const { complete, isLoading } = useCompletion({
    api: "/api/ai/review-reply",
    body: {
      reviewId: review.id,
      businessId,
      reviewerName: review.reviewer_name,
      rating: review.rating,
      reviewText: review.review_text,
      tone,
    },
    onFinish: (_prompt, completion) => {
      onReplyGenerated(completion);
    },
  });

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Tone</Label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="empathetic">Empathetic</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        onClick={() => complete("")}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="mr-1 h-3 w-3" />
        )}
        Generate Reply (1 credit)
      </Button>
    </div>
  );
}
