"use client";

import { motion } from "framer-motion";

function Bar({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-bb-card rounded ${className}`}
    />
  );
}

export function LibrarySkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Bar className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-1/3" />
            <Bar className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="p-4 bg-bb-card rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <Bar className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Bar className="h-4 w-2/3" />
          <Bar className="h-3 w-1/2" />
        </div>
      </div>
      <Bar className="h-3 w-full" />
      <Bar className="h-3 w-4/5" />
    </div>
  );
}

export { Bar as MotionSkeleton };
