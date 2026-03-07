"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Rocket } from "lucide-react";

const FEATURES = [
  { id: "review_replies", label: "AI Review Replies (auto-respond to Google/Yelp reviews)" },
  { id: "social_ai", label: "Social Media AI (captions & hashtags)" },
  { id: "content_studio", label: "Content Studio (video scripts for TikTok/Reels)" },
  { id: "email_marketing", label: "Email Marketing AI" },
  { id: "qr_code", label: "QR Code Generator (review collection)" },
  { id: "review_insights", label: "Review Insights Dashboard" },
  { id: "translation", label: "Multi-language Translation" },
  { id: "google_business", label: "Google Business Integration" },
];

interface WaitlistModalProps {
  children: React.ReactNode;
}

export function WaitlistModal({ children }: WaitlistModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureRequest, setFeatureRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        setOpen(false);
        return;
      }

      if (!res.ok) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      toast.success("You're on the list! We'll notify you at launch.");
      setOpen(false);
      setEmail("");
      setBusinessType("");
      setSelectedFeatures([]);
      setFeatureRequest("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Join the BossBoard Waitlist
          </DialogTitle>
          <DialogDescription>
            Be first in line when we launch March 15. First 100 signups get 1
            month free Pro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                <SelectValue placeholder="Select your business type" />
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

          <div className="space-y-3">
            <Label>Which features interest you most? (select all that apply)</Label>
            <div className="space-y-2">
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
              rows={3}
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
      </DialogContent>
    </Dialog>
  );
}
