"use client";

import { Modal } from "@/components/desktop/modal";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Ctrl+K", action: "Open search" },
  { keys: "Ctrl+R", action: "Refresh page" },
  { keys: "Ctrl+S", action: "Save (in editor)" },
  { keys: "Ctrl+B", action: "Toggle sidebar" },
  { keys: "Ctrl+Shift+D", action: "Toggle DM panel" },
  { keys: "Ctrl+,", action: "Open Settings" },
  { keys: "Ctrl+/", action: "Show this shortcuts list" },
  { keys: "Esc", action: "Close panels and modals" },
];

export function ShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard shortcuts">
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between text-sm">
            <span className="text-bb-fg">{s.action}</span>
            <kbd className="px-2 py-0.5 text-xs bg-bb-bg border border-bb-border rounded text-gray-300 font-mono">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
