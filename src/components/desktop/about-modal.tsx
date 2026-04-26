"use client";

import { Modal } from "@/components/desktop/modal";

export function AboutModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About BossBoard">
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="text-3xl font-bold">BossBoard</div>
          <span className="text-[10px] px-2 py-0.5 bg-bb-primary/15 text-bb-primary border border-bb-primary/30 rounded uppercase tracking-wide">
            Beta v0.1
          </span>
        </div>
        <div className="text-xs text-gray-500">Local-first AI workspace · v3.0.0-beta.1</div>
        <p className="text-gray-300">
          Hire AI agents. Manage them like a pro. Your files stay on your machine; bring your own
          AI keys.
        </p>
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-gray-500">Website: </span>
            <span className="text-bb-primary">mybossboard.com</span>
          </div>
          <div>
            <span className="text-gray-500">Docs: </span>
            <span className="text-bb-primary">mybossboard.com/docs</span>
          </div>
          <div>
            <span className="text-gray-500">Contact: </span>
            <span className="text-bb-primary">jay@mybossboard.com</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
