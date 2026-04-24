import { OfflineBanner } from "@/components/desktop/offline-banner";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
