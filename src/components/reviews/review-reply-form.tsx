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
import { Sparkles, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";

const languages = [
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "portuguese", label: "Portuguese" },
];

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
  const [translating, setTranslating] = useState(false);

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

  async function handleTranslate(language: string) {
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          text: review.review_text,
          targetLanguage: language,
        }),
      });
      if (res.status === 429) {
        toast.error("AI credit limit reached");
        return;
      }
      if (!res.ok) {
        toast.error("Translation failed");
        return;
      }
      const translated = await res.text();
      onReplyGenerated(translated);
      toast.success(`Translated to ${language}`);
    } catch {
      toast.error("Connection error");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
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
        disabled={isLoading || translating}
      >
        {isLoading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="mr-1 h-3 w-3" />
        )}
        Generate Reply (1 credit)
      </Button>
      <div className="space-y-1">
        <Label className="text-xs">Translate</Label>
        <Select
          value=""
          onValueChange={handleTranslate}
          disabled={translating || isLoading}
        >
          <SelectTrigger className="w-[140px]">
            {translating ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Translating...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Languages className="h-3 w-3" /> Translate
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label} (1 credit)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
