"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  variant?: "default" | "error" | "warning" | "info";
}

export function Modal({ isOpen, onClose, title, children, variant = "default" }: ModalProps) {
  const borderColor = {
    default: "border-gray-700",
    error: "border-red-700",
    warning: "border-yellow-700",
    info: "border-blue-700",
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.duration.base }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: MOTION.duration.base, ease: MOTION.ease.out }}
            className={`bg-bb-card border ${borderColor} rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="font-semibold">{title}</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant === "danger" ? "error" : "default"}
    >
      <p className="text-gray-300 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-700 hover:bg-gray-800 rounded-md"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-sm rounded-md ${
            variant === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-bb-primary hover:bg-bb-primary-hover"
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
