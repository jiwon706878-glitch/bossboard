"use client";

import { useState } from "react";
import { Star, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReviewReplyForm } from "./review-reply-form";
import { toast } from "sonner";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  sentiment: string | null;
  review_date: string;
}

export function ReviewCard({
  review,
  businessId,
}: {
  review: Review;
  businessId: string;
}) {
  const [showReply, setShowReply] = useState(false);
  const [generatedReply, setGeneratedReply] = useState("");
  const [copied, setCopied] = useState(false);

  const sentimentColor = {
    positive: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    neutral: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    negative: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generatedReply);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
              {review.reviewer_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{review.reviewer_name}</p>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.review_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          {review.sentiment && (
            <Badge
              variant="secondary"
              className={sentimentColor[review.sentiment as keyof typeof sentimentColor]}
            >
              {review.sentiment}
            </Badge>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {review.review_text}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReply(!showReply)}
          >
            {showReply ? "Hide" : "Generate AI Reply"}
          </Button>
          {generatedReply && (
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              {copied ? (
                <Check className="mr-1 h-3 w-3" />
              ) : (
                <Copy className="mr-1 h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy Reply"}
            </Button>
          )}
        </div>
        {showReply && (
          <div className="mt-4">
            <ReviewReplyForm
              review={review}
              businessId={businessId}
              onReplyGenerated={setGeneratedReply}
            />
            {generatedReply && (
              <div className="mt-3 rounded-lg border bg-muted/50 p-3">
                <p className="text-sm whitespace-pre-wrap">{generatedReply}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
