"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { LaunchBanner } from "@/components/marketing/launch-banner";

const Chatbot = dynamic(
  () => import("@/components/marketing/chatbot").then((m) => ({ default: m.Chatbot }))
);

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-y-auto h-dvh">
      <LaunchBanner />
      <MarketingNavbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          className="flex-1"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <MarketingFooter />
      <Chatbot />
      <CookieConsent />
    </div>
  );
}
