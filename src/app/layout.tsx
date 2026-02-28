import type { Metadata } from "next";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PaddleProvider } from "@/components/shared/paddle-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "BossBoard — AI-Powered Business Management",
  description:
    "Review management, social media content, and short-form video scripting — all powered by AI.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
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
        <link rel="icon" href="/favicon.png" />
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
