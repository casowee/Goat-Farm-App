import type { ReactNode } from "react";
import {
  LoadingDots,
  type LoadingDotsSize,
} from "@/components/loading/loading-dots";
import { cn } from "@/lib/utils";

/**
 * Spec 17.3 (§5F) — the wrapper every skeleton screen sits in.
 *
 * Three jobs, all of which have to be applied in exactly one place or they get
 * forgotten on the next skeleton someone adds:
 *
 *  - **Anti-flash.** `skeleton-fade` keeps the region transparent for ~150 ms.
 *    A navigation that resolves faster than that unmounts this region before the
 *    animation starts, so nothing flickers.
 *  - **Accessibility.** `aria-busy="true"` plus one visually hidden "Loading…"
 *    label per region, so a screen reader says the region is loading instead of
 *    reading out a wall of empty boxes.
 *  - It is a plain server component: no hooks, no `"use client"`, so it can be
 *    rendered from a `loading.tsx` or a `<Suspense fallback>` alike.
 *
 * The label is per *region*, not per box — a page-shaped skeleton is one region
 * even though it contains a dozen `Skeleton`s.
 */
export function SkeletonRegion({
  label = "Loading…",
  className,
  children,
}: {
  /** What is loading, for screen readers. Overridden per page for clarity. */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div aria-busy="true" className={cn("skeleton-fade", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * UPD-015's three-dot indicator, positioned for use inside a skeleton.
 *
 * The owner's standing preference (confirmed for this spec) is that the dots
 * stay visible whenever something is loading — a skeleton shows the *shape* of
 * what is coming, and the dots confirm the app is actually working rather than
 * stuck. So the two are used together, never one instead of the other.
 *
 * `aria-hidden`, because the enclosing `SkeletonRegion` already carries the
 * `aria-busy` state and the one "Loading…" label; without this the dots'
 * own `role="status"` would announce a second time.
 */
export function SkeletonDots({
  size = "sm",
  className,
}: {
  size?: LoadingDotsSize;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("inline-flex", className)}>
      <LoadingDots size={size} className="text-brand" />
    </span>
  );
}
