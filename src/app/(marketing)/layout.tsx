import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { LaunchBanner } from "@/components/marketing/launch-banner";
import { Chatbot } from "@/components/marketing/chatbot";
import { MarketingShell } from "./marketing-shell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-y-auto h-dvh">
      {/* Server-rendered banner — auto-hides when paid user count hits 100. */}
      <LaunchBanner />
      <MarketingNavbar />
      <MarketingShell>{children}</MarketingShell>
      <MarketingFooter />
      <Chatbot />
      <CookieConsent />
    </div>
  );
}
