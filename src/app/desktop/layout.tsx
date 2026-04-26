"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";
import { Titlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/desktop/sidebar";
import { OfflineBanner } from "@/components/desktop/offline-banner";
import { WorkspaceHealthBanner } from "@/components/desktop/workspace-health-banner";
import { ThemeProvider } from "@/components/desktop/theme-provider";
import { GlobalContextMenu } from "@/components/desktop/global-context-menu";
import { DMPanel } from "@/components/desktop/dm-panel";
import { ShortcutsModal } from "@/components/desktop/shortcuts-modal";
import { AboutModal } from "@/components/desktop/about-modal";
import { ErrorBoundary } from "@/components/desktop/error-boundary";
import { ToastContainer } from "@/components/desktop/toast";
import { migrateOldKeys } from "@/lib/ai/keys";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/desktop" || pathname === "/desktop/login";

  const [dmOpen, setDmOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    migrateOldKeys().catch(() => {
      /* migration is best-effort; users can re-add keys in Settings */
    });
  }, []);

  useEffect(() => {
    const onDM = () => setDmOpen((v) => !v);
    const onShortcuts = () => setShortcutsOpen(true);
    const onAbout = () => setAboutOpen(true);
    window.addEventListener("bb-dm-toggle", onDM);
    window.addEventListener("bb-shortcuts-open", onShortcuts);
    window.addEventListener("bb-about-open", onAbout);
    return () => {
      window.removeEventListener("bb-dm-toggle", onDM);
      window.removeEventListener("bb-shortcuts-open", onShortcuts);
      window.removeEventListener("bb-about-open", onAbout);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const next = localStorage.getItem("bb_sidebar_collapsed") !== "true";
        localStorage.setItem("bb_sidebar_collapsed", String(next));
        window.dispatchEvent(new CustomEvent("bb-sidebar-toggle", { detail: { collapsed: next } }));
        return;
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDmOpen((v) => !v);
        return;
      }
      if (meta && e.key === ",") {
        e.preventDefault();
        router.push("/desktop/settings");
        return;
      }
      if (meta && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setDmOpen(false);
        setShortcutsOpen(false);
        setAboutOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return (
    <ThemeProvider>
      <div className="bb-app-shell h-screen flex flex-col bg-bb-bg text-bb-fg overflow-hidden">
        <Titlebar />
        <OfflineBanner />
        <WorkspaceHealthBanner />
        <div className="flex-1 flex overflow-hidden">
          {!isAuthPage && <Sidebar />}
          <main className="flex-1 overflow-auto">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: MOTION.duration.base, ease: MOTION.ease.out }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </main>
        </div>
        <GlobalContextMenu />
        <DMPanel isOpen={dmOpen} onClose={() => setDmOpen(false)} />
        <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
        <ToastContainer />
      </div>
    </ThemeProvider>
  );
}
