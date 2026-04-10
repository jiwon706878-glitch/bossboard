import { cn } from "@/lib/utils"

/**
 * Skeleton loader.
 * Uses Tailwind's animate-pulse (opacity-only animation) for cheapest
 * possible loading state — no shimmer overlay or shimmer keyframe.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface", className)}
      {...props}
    />
  )
}

export { Skeleton }
