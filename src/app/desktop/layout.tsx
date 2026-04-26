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
import {
  DeviceLimitModal,
  type RegisteredDevice,
} from "@/components/desktop/device-limit-modal";
import { migrateOldKeys } from "@/lib/ai/keys";
import { generateSystemReference } from "@/lib/agents/system-reference";
import { registerDevice, revokeRemoteDevice } from "@/lib/auth/register-device";
import { registerGlobalErrorHandlers } from "@/lib/error-tracking";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/desktop" || pathname === "/desktop/login";

  const [dmOpen, setDmOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState<{
    devices: RegisteredDevice[];
    plan: "free" | "starter" | "pro" | "business";
    currentDeviceId: string;
  } | null>(null);

  useEffect(() => {
    // Window error + unhandled-rejection → Sentry + error_logs.
    // Idempotent: re-mounts of the layout don't double-register.
    registerGlobalErrorHandlers();

    migrateOldKeys().catch(() => {
      /* migration is best-effort; users can re-add keys in Settings */
    });
    // Refresh BB-System-Reference.md and Welcome.md once per app session.
    // Best-effort — if /Library doesn't exist yet (first run before workspace
    // pick), the helper swallows the error.
    generateSystemReference();
  }, []);

  useEffect(() => {
    // Register this device with the cloud once per session. The helper
    // gracefully skips when not in Tauri, when the user isn't signed in,
    // and when the SQL migration hasn't been applied yet.
    let cancelled = false;
    (async () => {
      const result = await registerDevice();
      if (cancelled) return;
      if (result.kind === "limit_reached") {
        setDeviceLimit({
          devices: result.devices,
          plan: result.plan as "free" | "starter" | "pro" | "business",
          currentDeviceId: result.currentDeviceId,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRevokeAndRetry(deviceId: string) {
    const r = await revokeRemoteDevice(deviceId);
    if (!r.success) {
      throw new Error(r.message ?? "Revoke failed");
    }
    // Try to register again now that a slot opened.
    const result = await registerDevice();
    if (result.kind === "limit_reached") {
      setDeviceLimit({
        devices: result.devices,
        plan: result.plan as "free" | "starter" | "pro" | "business",
        currentDeviceId: result.currentDeviceId,
      });
    } else {
      setDeviceLimit(null);
    }
  }

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
        {deviceLimit && (
          <DeviceLimitModal
            currentDevices={deviceLimit.devices}
            currentDeviceId={deviceLimit.currentDeviceId}
            plan={deviceLimit.plan}
            onUpgrade={() =>
              window.open("https://mybossboard.com/pricing", "_blank")
            }
            onRevoke={handleRevokeAndRetry}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
