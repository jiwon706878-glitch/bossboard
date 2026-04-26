"use client";

import { useState, useCallback, type ReactNode } from "react";
import { Modal } from "@/components/desktop/modal";

interface ConfirmConfig {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

interface PendingConfirm extends ConfirmConfig {
  resolve: (value: boolean) => void;
}

/**
 * Promise-based confirm dialog. Returns `{ confirm, ConfirmComponent }`.
 * Render `ConfirmComponent` once at the bottom of the page; await
 * `confirm({title, ...})` from any handler.
 */
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((cfg: ConfirmConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ ...cfg, resolve });
    });
  }, []);

  const handleAnswer = (answer: boolean) => {
    pending?.resolve(answer);
    setPending(null);
  };

  const ConfirmComponent: ReactNode = pending ? (
    <Modal
      isOpen={true}
      onClose={() => handleAnswer(false)}
      title={pending.title}
      variant={pending.variant === "danger" ? "error" : "default"}
    >
      {pending.description && (
        <p className="text-gray-300 text-sm mb-4">{pending.description}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => handleAnswer(false)}
          className="px-4 py-2 text-sm border border-bb-border hover:bg-bb-bg rounded-md"
        >
          {pending.cancelLabel ?? "Cancel"}
        </button>
        <button
          onClick={() => handleAnswer(true)}
          className={`px-4 py-2 text-sm rounded-md ${
            pending.variant === "danger"
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-bb-primary hover:bg-bb-primary-hover text-white"
          }`}
        >
          {pending.confirmLabel ?? "Confirm"}
        </button>
      </div>
    </Modal>
  ) : null;

  return { confirm, ConfirmComponent };
}
