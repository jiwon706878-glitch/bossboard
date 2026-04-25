"use client";

import { ReactNode, useEffect, useState, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: ReactNode;
  className?: string;
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
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

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[200px] bg-bb-card border border-bb-border rounded-md shadow-2xl py-1"
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
      )}
    </div>
  );
}
