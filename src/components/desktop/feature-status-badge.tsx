"use client";

export type FeatureStatus =
  | "stable"
  | "beta"
  | "experimental"
  | "coming-soon";

const STATUS_CONFIG: Record<
  FeatureStatus,
  { label: string; className: string }
> = {
  stable: {
    label: "",
    className: "",
  },
  beta: {
    label: "Beta",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  experimental: {
    label: "Experimental",
    className: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  "coming-soon": {
    label: "Coming Soon",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
};

/**
 * Single source of truth for the small "Beta / Experimental / Coming Soon"
 * pills sprinkled across the desktop UI. Renders nothing when the feature
 * is `stable` so callers can pass the status unconditionally.
 */
export function FeatureStatusBadge({
  status,
  className = "",
}: {
  status: FeatureStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg.label) return null;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
