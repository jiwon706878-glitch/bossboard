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
        <div>
          <div className="text-3xl font-bold">BossBoard</div>
          <div className="text-xs text-gray-500 mt-1">v3.0.0 beta — local-first AI workspace</div>
        </div>
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
