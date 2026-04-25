"use client";

import { X, Bell } from "lucide-react";

export function NotificationsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-bb-card border-l border-bb-border z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-bb-border">
          <h2 className="font-semibold">Notifications</h2>
          <button onClick={onClose} className="p-1 hover:bg-bb-bg rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center text-center text-sm text-gray-500">
          <Bell className="w-10 h-10 mb-3 opacity-50" />
          <div>You&apos;re all caught up.</div>
          <div className="text-xs mt-1">
            Notifications will arrive here when agents finish tasks (Week 4).
          </div>
        </div>
      </div>
    </>
  );
}
