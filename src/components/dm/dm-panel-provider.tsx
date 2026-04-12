"use client";

import { DmSidePanel } from "./dm-side-panel";
import { useDmPanel } from "@/hooks/use-dm-panel";

export function DmPanelProvider() {
  const { open, conversationId, targetId, closePanel } = useDmPanel();

  return (
    <DmSidePanel
      open={open}
      onClose={closePanel}
      conversationId={conversationId}
      targetId={targetId}
    />
  );
}
