/**
 * Centralised motion tokens for Framer Motion. Keep durations short
 * (≤ 300ms) for interactive feedback; springs only for elements where the
 * arrival overshoot reads as physical (cards, modals, sidebar).
 */
export const MOTION = {
  duration: {
    instant: 0.1,
    fast: 0.15,
    base: 0.2,
    moderate: 0.3,
    slow: 0.5,
  },
  ease: {
    out: [0.16, 1, 0.3, 1] as const,
    inOut: [0.65, 0, 0.35, 1] as const,
  },
  spring: {
    default: { type: "spring" as const, stiffness: 400, damping: 30 },
    soft: { type: "spring" as const, stiffness: 200, damping: 25 },
    snappy: { type: "spring" as const, stiffness: 500, damping: 25 },
  },
};
