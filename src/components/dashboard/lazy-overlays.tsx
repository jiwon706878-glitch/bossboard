"use client";

import dynamic from "next/dynamic";

const StickyNote = dynamic(
  () => import("@/components/dashboard/sticky-note").then((m) => ({ default: m.StickyNote })),
  { ssr: false }
);

const PageContextMenu = dynamic(
  () => import("@/components/dashboard/page-context-menu").then((m) => ({ default: m.PageContextMenu })),
  { ssr: false }
);

export function LazyOverlays() {
  return (
    <>
      <StickyNote />
      <PageContextMenu />
    </>
  );
}
