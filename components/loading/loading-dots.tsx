import { cn } from "@/lib/utils";

const DOT_CLASSES = {
  sm: "h-1 w-1",
  md: "h-1.5 w-1.5",
  lg: "h-3 w-3",
} as const;

const GAP_CLASSES = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
} as const;

const DELAYS_MS = [0, 150, 300] as const;

export type LoadingDotsSize = keyof typeof DOT_CLASSES;

interface LoadingDotsProps {
  size?: LoadingDotsSize;
  /** Overrides the default "Loading…" announced to screen readers. */
  label?: string;
  className?: string;
}

/**
 * A three-dot pulse loading indicator: each dot scales/fades in a loop,
 * staggered by `animation-delay` (see `animate-dot-pulse` in `globals.css`).
 * Route-level and action-level loading only — not a replacement for
 * `UPD-011`'s per-widget dashboard skeletons.
 */
export function LoadingDots({
  size = "md",
  label = "Loading…",
  className,
}: LoadingDotsProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex items-center text-brand",
        GAP_CLASSES[size],
        className,
      )}
    >
      {DELAYS_MS.map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className={cn(
            "rounded-full bg-current animate-dot-pulse",
            DOT_CLASSES[size],
          )}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
