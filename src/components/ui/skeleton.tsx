import { cn } from "@/lib/utils"

/**
 * Skeleton loader with shimmer effect.
 * Use to indicate loading states that match the shape of the
 * incoming content.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-surface",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-surface-elevated to-transparent" />
    </div>
  )
}

export { Skeleton }
