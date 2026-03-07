"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const FEATURES = [
  {
    id: "review_replies",
    label: "AI Review Replies (auto-respond to Google/Yelp reviews)",
  },
  { id: "social_ai", label: "Social Media AI (captions & hashtags)" },
  {
    id: "content_studio",
    label: "Content Studio (video scripts for TikTok/Reels)",
  },
  { id: "email_marketing", label: "Email Marketing AI" },
  { id: "qr_code", label: "QR Code Generator (review collection)" },
  { id: "review_insights", label: "Review Insights Dashboard" },
  { id: "translation", label: "Multi-language Translation" },
  { id: "google_business", label: "Google Business Integration" },
];

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureRequest, setFeatureRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((data) => setSpotsRemaining(data.remaining))
      .catch(() => {});
  }, []);

  function toggleFeature(featureId: string) {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !businessType) {
      toast.error("Please fill in email and business type");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          businessType,
          interestedFeatures: selectedFeatures,
          featureRequest: featureRequest || null,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.info(data.message);
        setSubmitted(true);
        return;
      }

      if (!res.ok) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      toast.success("You're on the list! We'll notify you at launch.");
      setSubmitted(true);
      if (spotsRemaining !== null && spotsRemaining > 0) {
        setSpotsRemaining(spotsRemaining - 1);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-lg border-primary/30">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h3 className="text-2xl font-bold">You&apos;re on the list!</h3>
          <p className="text-muted-foreground">
            We&apos;ll email you when BossBoard launches on March 15.
            {spotsRemaining !== null && spotsRemaining > 0 && (
              <> Only <span className="font-semibold text-primary">{spotsRemaining}</span> free Pro spots left.</>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg border-primary/30">
      <CardContent className="pt-6">
        {spotsRemaining !== null && (
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              {spotsRemaining > 0
                ? `${spotsRemaining}/100 spots remaining`
                : "Waitlist is full — join to be notified"}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-email">Email *</Label>
              <Input
                id="waitlist-email"
                type="email"
                required
                placeholder="you@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Business Type *</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Restaurant">Restaurant</SelectItem>
                  <SelectItem value="Cafe">Cafe</SelectItem>
                  <SelectItem value="Salon">Salon</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Gym/Fitness">Gym/Fitness</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>
              Which features interest you most? (select all that apply)
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <label
                  key={feature.id}
                  className="flex items-start gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedFeatures.includes(feature.id)}
                    onCheckedChange={() => toggleFeature(feature.id)}
                    className="mt-0.5"
                  />
                  <span>{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature-request">
              Any other features you&apos;d love to see?
            </Label>
            <Textarea
              id="feature-request"
              placeholder="Tell us what would make BossBoard perfect for your business..."
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            size="lg"
            disabled={submitting}
          >
            {submitting ? "Joining..." : "Join Waitlist"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
