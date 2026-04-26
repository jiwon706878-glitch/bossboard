"use client";

import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION.duration.base, ease: MOTION.ease.out }}
    >
      {children}
    </motion.div>
  );
}
