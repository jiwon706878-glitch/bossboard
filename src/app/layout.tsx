import type { Metadata } from "next";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PaddleProvider } from "@/components/shared/paddle-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BossBoard — AI SOP Generator for Business Teams",
    template: "%s — BossBoard",
  },
  description:
    "AI-powered operations control tower — generate SOPs, manage your team, and streamline business operations.",
  metadataBase: new URL("https://mybossboard.com"),
  openGraph: {
    title: "BossBoard — AI SOP Generator for Business Teams",
    description: "Generate SOPs with AI, manage your team, and streamline operations. Free to start.",
    url: "https://mybossboard.com",
    siteName: "BossBoard",
    type: "website",
  },
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
    <html lang="en" suppressHydrationWarning className="overflow-hidden h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className="antialiased"
      >
        <ThemeProvider>
          <PaddleProvider>
            <TooltipProvider>
              {children}
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </PaddleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
