import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  Star,
  MessageSquare,
  Share2,
  Video,
  Clock,
  TrendingDown,
  Megaphone,
  Sparkles,
  ArrowRight,
  UserPlus,
  Building2,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" /> AI-Powered Business Tools
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Run Your Business{" "}
            <span className="text-primary">Smarter</span>, Not Harder
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Replace $100+/month in marketing tools with one AI-powered
            dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                See How It Works
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. 30 free AI credits/month.
          </p>
        </div>
      </section>

      {/* Pain Points */}
      <section className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Sound familiar?</h2>
            <p className="mt-2 text-muted-foreground">
              These are the problems that keep business owners up at night.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MessageSquare,
                title: "Unanswered reviews",
                desc: "Bad reviews pile up while you're busy running your business.",
              },
              {
                icon: Clock,
                title: "No time for social",
                desc: "You know you should post, but who has the time to write captions?",
              },
              {
                icon: TrendingDown,
                title: "Losing to competitors",
                desc: "Competitors with marketing teams are eating your lunch online.",
              },
              {
                icon: Megaphone,
                title: "Video feels impossible",
                desc: "Short-form video is huge, but scripting content feels overwhelming.",
              },
            ].map((item) => (
              <Card key={item.title} className="text-center">
                <CardContent className="pt-6">
                  <item.icon className="mx-auto mb-3 h-8 w-8 text-[#E8825A]" />
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution / Features */}
      <section id="features" className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              Three modules. One dashboard.{" "}
              <span className="text-primary">Zero headaches.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Review AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Paste any customer review from Google, Yelp, or Facebook — our AI generates a professional reply in seconds. Copy and post it back.</p>
                <ul className="space-y-1 pt-2">
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Smart sentiment analysis</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Multiple tone options</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> One-click copy replies</li>
                </ul>
                <p className="pt-2 text-xs text-muted-foreground/70">Works with: Google, Yelp, Facebook, TripAdvisor</p>
              </CardContent>
            </Card>
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF1E8]">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Social AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Generate scroll-stopping captions and hashtags for any platform. Upload an image, get content in seconds.</p>
                <ul className="space-y-1 pt-2">
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Image-aware captions</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Smart hashtags</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Post scheduling</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Content Studio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Turn ideas into camera-ready scripts. TikToks, Reels, Shorts — with hooks, body, CTAs, and filming tips.</p>
                <ul className="space-y-1 pt-2">
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> 5 video formats</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Hook + Body + CTA</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary" /> Filming guides</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              Get started in{" "}
              <span className="text-primary">3 easy steps</span>
            </h2>
            <p className="mt-2 text-muted-foreground">
              From sign-up to AI-generated content in under a minute.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: UserPlus,
                step: 1,
                title: "Sign Up Free",
                desc: "Create your account in 30 seconds. No credit card required.",
              },
              {
                icon: Building2,
                step: 2,
                title: "Add Your Business",
                desc: "Tell us about your business type and brand voice.",
              },
              {
                icon: Sparkles,
                step: 3,
                title: "Let AI Work For You",
                desc: "Generate replies, captions, and scripts instantly.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <Badge variant="secondary" className="mb-2">
                  Step {item.step}
                </Badge>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
            <p className="mt-2 text-muted-foreground">
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="mt-10">
            <PricingToggle />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* CTA */}
      <section className="border-t bg-primary px-4 py-20 text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">
            Ready to run your business smarter?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Join smart business owners using AI to save time, get more
            reviews, and grow their online presence.
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 gap-2"
            >
              Start Free Today <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
