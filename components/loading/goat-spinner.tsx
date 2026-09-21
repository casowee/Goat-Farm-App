import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-16 w-16",
} as const;

export type GoatSpinnerSize = keyof typeof SIZE_CLASSES;

interface GoatSpinnerProps {
  size?: GoatSpinnerSize;
  /** Overrides the default "Loading…" announced to screen readers. */
  label?: string;
  className?: string;
}

/**
 * A small, branded, stroke-based goat silhouette that hops in a loop via a
 * transform-only CSS keyframe (see `animate-goat-bounce` in `globals.css`).
 * Route-level and action-level loading only — not a replacement for
 * `UPD-011`'s per-widget dashboard skeletons.
 */
export function GoatSpinner({
  size = "md",
  label = "Loading…",
  className,
}: GoatSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block text-brand", SIZE_CLASSES[size], className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full animate-goat-bounce"
        aria-hidden="true"
      >
        {/* horns */}
        <path d="M16.5 6c.2-1.6.9-2.7 2-3.5" />
        <path d="M15 5.2c-.1-1.5.3-2.6 1-3.7" />
        {/* head */}
        <circle cx="16.5" cy="8.5" r="2.3" />
        {/* ear */}
        <path d="M14.5 7.8c-1-.3-1.7-.1-2.2.4" />
        {/* snout + beard */}
        <path d="M18.6 9.3c.9.2 1.4.6 1.5 1.1" />
        <path d="M19.3 11v1.6" />
        {/* neck */}
        <path d="M14.7 10.2 13.3 12" />
        {/* body */}
        <path d="M4.5 14.2c0-1.7 1.2-3.2 3.4-3.2h5.4c2.3 0 3.7 1.4 3.7 3.1v.7c0 1.6-1.2 2.7-2.8 2.7H7.6c-1.7 0-3.1-1.1-3.1-2.7z" />
        {/* tail */}
        <path d="M4.6 13.6c-1-.1-1.6.3-1.8 1" />
        {/* legs */}
        <path d="M7.5 17.3 7 21" />
        <path d="M13 17.3l.5 3.7" />
      </svg>
    </span>
  );
}
