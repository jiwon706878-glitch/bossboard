"use client";

export function ContextMenuBlocker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      onContextMenu={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
        e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
