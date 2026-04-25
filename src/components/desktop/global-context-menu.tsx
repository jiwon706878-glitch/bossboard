"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Scissors,
  Settings as SettingsIcon,
  Smile,
  Type as TypeIcon,
  ClipboardPaste,
  CheckSquare,
} from "lucide-react";
import type { ContextMenuItem } from "@/components/desktop/context-menu";

type EditableEl = HTMLInputElement | HTMLTextAreaElement;

function isFormEditable(el: HTMLElement): el is EditableEl {
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
}

function selectionFromInput(el: EditableEl): string {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  return el.value.slice(start, end);
}

function replaceSelection(el: EditableEl, text: string) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  el.setRangeText(text, start, end, "end");
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function GlobalContextMenu({ onNotice }: { onNotice?: (msg: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<ContextMenuItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement | null;
      if (!target) return;

      let nextItems: ContextMenuItem[];
      if (isFormEditable(target) || target.isContentEditable) {
        nextItems = buildEditableMenu(target, onNotice);
      } else {
        nextItems = buildAppMenu(router, onNotice);
      }
      setItems(nextItems);
      setPosition({ x: e.clientX, y: e.clientY });
      setOpen(true);
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, [router, onNotice]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const adjustments: { x?: number; y?: number } = {};
    if (rect.right > window.innerWidth) {
      adjustments.x = window.innerWidth - rect.width - 8;
    }
    if (rect.bottom > window.innerHeight) {
      adjustments.y = window.innerHeight - rect.height - 8;
    }
    if (adjustments.x !== undefined || adjustments.y !== undefined) {
      setPosition((p) => ({
        x: adjustments.x !== undefined ? adjustments.x : p.x,
        y: adjustments.y !== undefined ? adjustments.y : p.y,
      }));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[220px] bg-bb-card border border-bb-border rounded-md shadow-2xl py-1"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="my-1 border-t border-bb-border" />;
        }
        return (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                setOpen(false);
              }
            }}
            disabled={item.disabled}
            className={`
              w-full text-left px-3 py-1.5 text-sm flex items-center gap-2
              ${
                item.disabled
                  ? "text-gray-600 cursor-not-allowed"
                  : item.danger
                    ? "text-red-400 hover:bg-red-900/30"
                    : "text-gray-200 hover:bg-bb-primary/20"
              }
            `}
          >
            {item.icon && (
              <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-xs text-gray-500">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

function buildEditableMenu(
  target: HTMLElement,
  onNotice?: (msg: string) => void,
): ContextMenuItem[] {
  const formEditable = isFormEditable(target) ? target : null;
  const hasSelection = formEditable
    ? (formEditable.selectionStart ?? 0) !== (formEditable.selectionEnd ?? 0)
    : !!window.getSelection()?.toString();

  const cut = async () => {
    if (formEditable) {
      const sel = selectionFromInput(formEditable);
      if (!sel) return;
      try {
        await navigator.clipboard.writeText(sel);
        replaceSelection(formEditable, "");
      } catch {
        onNotice?.("Cut failed — clipboard permission denied.");
      }
    } else {
      document.execCommand("cut");
    }
  };
  const copy = async () => {
    if (formEditable) {
      const sel = selectionFromInput(formEditable);
      if (!sel) return;
      try {
        await navigator.clipboard.writeText(sel);
      } catch {
        onNotice?.("Copy failed — clipboard permission denied.");
      }
    } else {
      document.execCommand("copy");
    }
  };
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (formEditable) {
        replaceSelection(formEditable, text);
      } else {
        document.execCommand("insertText", false, text);
      }
    } catch {
      onNotice?.("Paste failed — clipboard permission denied.");
    }
  };
  const selectAll = () => {
    if (formEditable) {
      formEditable.select();
    } else if (target.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };
  const insertEmoji = () =>
    onNotice?.("Press Win+. to open the system emoji panel and insert one at the cursor.");
  const insertSpecialChar = () =>
    onNotice?.("Press Win+. and switch to the Symbols tab for special characters.");

  return [
    { label: "Cut", icon: <Scissors className="w-3.5 h-3.5" />, shortcut: "Ctrl+X", onClick: cut, disabled: !hasSelection },
    { label: "Copy", icon: <Copy className="w-3.5 h-3.5" />, shortcut: "Ctrl+C", onClick: copy, disabled: !hasSelection },
    { label: "Paste", icon: <ClipboardPaste className="w-3.5 h-3.5" />, shortcut: "Ctrl+V", onClick: paste },
    { label: "Select All", icon: <CheckSquare className="w-3.5 h-3.5" />, shortcut: "Ctrl+A", onClick: selectAll },
    { separator: true, label: "" },
    { label: "Insert emoji", icon: <Smile className="w-3.5 h-3.5" />, shortcut: "Win+.", onClick: insertEmoji },
    { label: "Insert special character", icon: <TypeIcon className="w-3.5 h-3.5" />, onClick: insertSpecialChar },
  ];
}

function buildAppMenu(
  router: ReturnType<typeof useRouter>,
  onNotice?: (msg: string) => void,
): ContextMenuItem[] {
  return [
    {
      label: "Refresh",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      shortcut: "Ctrl+R",
      onClick: () => window.location.reload(),
    },
    {
      label: "Back",
      icon: <ArrowLeft className="w-3.5 h-3.5" />,
      onClick: () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          onNotice?.("No previous page in history.");
        }
      },
    },
    { separator: true, label: "" },
    {
      label: "Settings",
      icon: <SettingsIcon className="w-3.5 h-3.5" />,
      onClick: () => router.push("/desktop/settings"),
    },
  ];
}
