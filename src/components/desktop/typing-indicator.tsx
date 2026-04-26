"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  provider: string;
  startTime: number;
}

export function TypingIndicator({ provider, startTime }: Props) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 500);
    return () => clearInterval(interval);
  }, [startTime]);

  if (elapsed < 3000) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm inline-block"
      >
        <span className="inline-flex gap-1">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay }}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full"
            />
          ))}
        </span>
      </motion.div>
    );
  }

  if (elapsed < 15000) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm inline-flex items-center gap-2 text-sm text-gray-400"
      >
        <span>Thinking</span>
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          ...
        </motion.span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400 max-w-xs"
    >
      <div>
        Processing complex request
        {provider === "local" && " (Local AI is slower)"}
        ...
      </div>
      <div className="text-xs mt-1 opacity-70">
        {Math.floor(elapsed / 1000)}s elapsed
      </div>
    </motion.div>
  );
}
