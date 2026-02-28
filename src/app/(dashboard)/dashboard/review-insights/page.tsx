"use client";

import { useState } from "react";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface ReviewInsights {
  overallSentiment: "positive" | "mixed" | "negative";
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  averageRating: number;
  totalReviews: number;
  topThemes: { theme: string; count: number; sentiment: "positive" | "neutral" | "negative" }[];
  topPraises: string[];
  topComplaints: string[];
  keywords: { word: string; count: number }[];
  actionItems: string[];
  summary: string;
}

export default function ReviewInsightsPage() {
  const [reviewsText, setReviewsText] = useState("");
  const [insights, setInsights] = useState<ReviewInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  async function handleAnalyze() {
    if (!currentBusiness) {
      toast.error("No business selected");
      return;
    }

    const reviews = reviewsText
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (reviews.length < 2) {
      toast.error("Please paste at least 2 reviews (one per line)");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/review-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          reviews,
        }),
      });

      if (res.status === 429) {
        toast.error("AI credit limit reached. Please upgrade your plan.");
        return;
      }

      if (!res.ok) {
        toast.error("Failed to analyze reviews");
        return;
      }

      const data = await res.json();
      setInsights(data.insights);
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const sentimentColor = {
    positive: "text-green-600",
    mixed: "text-amber-600",
    neutral: "text-amber-600",
    negative: "text-red-600",
  };

  const sentimentBg: Record<string, string> = {
    positive: "bg-green-100 text-green-800",
    mixed: "bg-amber-100 text-amber-800",
    neutral: "bg-amber-100 text-amber-800",
    negative: "bg-red-100 text-red-800",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Insights</h1>
        <p className="text-muted-foreground">
          Paste your customer reviews and get AI-powered sentiment analysis,
          themes, and actionable suggestions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Paste Your Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Customer Reviews (one per line)</Label>
            <Textarea
              value={reviewsText}
              onChange={(e) => setReviewsText(e.target.value)}
              placeholder={"Great food and friendly staff! Will come back.\nService was slow and the food was cold. Disappointed.\nLove this place! Best coffee in town.\nParking is terrible but the product is worth it."}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Paste reviews from Google, Yelp, Facebook, etc. One review per line.
            </p>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !reviewsText.trim()}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Analyze Reviews (5 credits)
          </Button>
        </CardContent>
      </Card>

      {insights && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{insights.summary}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{insights.totalReviews}</p>
                  <p className="text-xs text-muted-foreground">Reviews Analyzed</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{insights.averageRating?.toFixed(1) || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className={`text-2xl font-bold capitalize ${sentimentColor[insights.overallSentiment]}`}>
                    {insights.overallSentiment}
                  </p>
                  <p className="text-xs text-muted-foreground">Overall Sentiment</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="flex justify-center gap-2 text-sm">
                    <span className="text-green-600">{insights.sentimentBreakdown.positive}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-amber-600">{insights.sentimentBreakdown.neutral}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-600">{insights.sentimentBreakdown.negative}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Pos / Neutral / Neg</p>
                </div>
              </div>

              {/* Sentiment Bar */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sentiment Distribution
                </p>
                <div className="flex h-4 overflow-hidden rounded-full">
                  <div
                    className="bg-green-500 transition-all"
                    style={{
                      width: `${(insights.sentimentBreakdown.positive / insights.totalReviews) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-amber-400 transition-all"
                    style={{
                      width: `${(insights.sentimentBreakdown.neutral / insights.totalReviews) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${(insights.sentimentBreakdown.negative / insights.totalReviews) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Themes & Keywords */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.topThemes.map((t) => (
                    <div
                      key={t.theme}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={sentimentBg[t.sentiment]}
                        >
                          {t.sentiment}
                        </Badge>
                        <span className="text-sm">{t.theme}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t.count}x
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {insights.keywords.map((k) => (
                    <Badge
                      key={k.word}
                      variant="outline"
                      className="text-sm"
                    >
                      {k.word}{" "}
                      <span className="ml-1 text-muted-foreground">
                        ({k.count})
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Praises & Complaints */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-green-600">
                  <ThumbsUp className="h-4 w-4" /> Top Praises
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.topPraises.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-600">
                  <ThumbsDown className="h-4 w-4" /> Top Complaints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.topComplaints.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                      {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insights.actionItems.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border bg-amber-50 p-3 text-sm dark:bg-amber-950/20"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
