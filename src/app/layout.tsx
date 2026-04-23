import type { Metadata } from "next";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PaddleProvider } from "@/components/shared/paddle-provider";
import { QueryProvider } from "@/providers/query-provider";
import { I18nProvider } from "@/lib/i18n";
import { ThemeLoader } from "@/components/theme-loader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: {
    default: "BossBoard — Hire AI Agents. Manage Them Like a Pro.",
    template: "%s — BossBoard",
  },
  description:
    "The workspace where humans and AI agents actually collaborate. Wiki, Board, DM, Calendar, Meetings — your agents have names, roles, and permissions.",
  metadataBase: new URL("https://mybossboard.com"),
  openGraph: {
    title: "BossBoard — Hire AI Agents. Manage Them Like a Pro.",
    description:
      "The workspace where humans and AI agents actually collaborate. Wiki, Board, DM, Calendar, Meetings — your agents have names, roles, and permissions.",
    url: "https://mybossboard.com",
    siteName: "BossBoard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BossBoard — Hire AI Agents. Manage Them Like a Pro.",
    description:
      "The workspace where humans and AI agents actually collaborate. Built for solo developers and indie AI builders.",
  },
  keywords: [
    "AI agents",
    "AI workspace",
    "MCP server",
    "BYOK",
    "Claude",
    "Cursor",
    "agent management",
    "AI team collaboration",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload primary font weights to minimize FOUT */}
        <link rel="preload" href="/fonts/A2Z-4Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/A2Z-7Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className="antialiased"
      >
        <ThemeProvider>
          <ThemeLoader />
          <I18nProvider>
            <QueryProvider>
              <PaddleProvider>
                <TooltipProvider>
                  {children}
                  <Toaster richColors position="bottom-right" closeButton />
                </TooltipProvider>
              </PaddleProvider>
            </QueryProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
