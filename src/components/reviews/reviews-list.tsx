"use client";

import { useState } from "react";
import { ReviewCard } from "./review-card";
import { AddReviewDialog } from "./add-review-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  sentiment: string | null;
  review_date: string;
}

export function ReviewsList({
  reviews,
  businessId,
}: {
  reviews: Review[];
  businessId: string;
}) {
  const [filterRating, setFilterRating] = useState("all");
  const [filterSentiment, setFilterSentiment] = useState("all");

  const filtered = reviews.filter((r) => {
    if (filterRating !== "all" && r.rating !== parseInt(filterRating))
      return false;
    if (filterSentiment !== "all" && r.sentiment !== filterSentiment)
      return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((r) => (
                <SelectItem key={r} value={r.toString()}>
                  {r} stars
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSentiment} onValueChange={setFilterSentiment}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sentiments</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <AddReviewDialog businessId={businessId} />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No reviews yet. Add your first review to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              businessId={businessId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
