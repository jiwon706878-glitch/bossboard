import dynamic from "next/dynamic";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

const Chatbot = dynamic(
  () => import("@/components/marketing/chatbot").then((m) => ({ default: m.Chatbot }))
);

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <Chatbot />
    </div>
  );
}
