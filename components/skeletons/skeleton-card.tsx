import type { ReactNode } from "react";
import { SkeletonDots } from "@/components/skeletons/skeleton-region";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Spec 17.3 (§5A) — a card-shaped placeholder.
 *
 * Built from the real `Card` / `CardHeader` / `CardContent` rather than a
 * hand-rolled `div`, so the radius, ring, padding and `--card-spacing` gaps are
 * the same values the finished card uses and cannot drift from it (§5A's
 * same-size rule, and `code-standards.md`'s "build UI from shadcn components").
 *
 * `titleLines` / `descriptionLines` mirror the real header: every dashboard card
 * has a `CardTitle` and a one-or-two-line `CardDescription`, and the description
 * wraps to two lines at phone width — which is why two is the default there.
 */
export function SkeletonCard({
  contentHeight = "h-24",
  descriptionLines = 1,
  withDots = false,
  padding = "px-(--card-spacing)",
  label,
  className,
  children,
}: {
  /** Height of the content block, matched to whatever fills it. */
  contentHeight?: string;
  /** How many lines the real `CardDescription` occupies. 0 omits it. */
  descriptionLines?: number;
  /** Show the loading dots centred in the content area (§5F / owner preference). */
  withDots?: boolean;
  /**
   * A visually hidden "what is loading" label (§5F). Pass it when this card is a
   * `<Suspense fallback>` standing on its own; leave it out inside a
   * `SkeletonRegion`, which already labels the whole page once.
   */
  label?: string;
  /** Override when the real card uses non-default header/content padding. */
  padding?: string;
  className?: string;
  /** Replaces the default content block — used for donuts, lists and tables. */
  children?: ReactNode;
}) {
  return (
    // `aria-busy` and the anti-flash fade live on the card itself, not on a
    // wrapper: these cards are grid items (some spanning two columns), and an
    // extra `div` around one would become the grid item instead and break the
    // layout it is supposed to be standing in for.
    <Card
      aria-busy="true"
      className={cn("skeleton-fade min-w-0 rounded-2xl", className)}
    >
      {label && <span className="sr-only">{label}</span>}
      <CardHeader className={padding}>
        <SkeletonLine width="w-36" lineHeight="h-6" barHeight="h-4" />
        {Array.from({ length: descriptionLines }, (_, index) => (
          <SkeletonLine
            key={index}
            width={index === descriptionLines - 1 ? "w-2/3" : "w-full"}
          />
        ))}
      </CardHeader>
      <CardContent className={padding}>
        {children ?? (
          <div
            className={cn(
              "flex w-full items-center justify-center",
              contentHeight,
            )}
          >
            {withDots ? (
              <SkeletonDots size="md" />
            ) : (
              <Skeleton className="h-full w-full rounded-xl" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Spec 17.3 (§5A) — a chart card.
 *
 * `donut` matches `DonutChartSkeleton` from `UPD-011` (a 256px circle plus three
 * legend pills); `bar` matches `LineChartSkeleton`'s 240px block, which the
 * weight-growth and newborn-period charts both fill. Those two existing
 * placeholders stay where they are — they are the `next/dynamic` fallbacks for
 * the chart *bundles* (a different wait from this spec's data wait), so this
 * component reproduces their geometry instead of replacing them.
 */
export function SkeletonChart({
  variant = "bar",
  descriptionLines = 2,
  withDots = false,
  label,
  className,
}: {
  variant?: "donut" | "bar";
  descriptionLines?: number;
  withDots?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <SkeletonCard
      className={className}
      padding="px-3"
      descriptionLines={descriptionLines}
      label={label}
    >
      {variant === "donut" ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-64 w-64 items-center justify-center">
            <Skeleton className="h-64 w-64 rounded-full" />
            {withDots && (
              <SkeletonDots size="md" className="absolute" />
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
      ) : (
        <div className="relative flex h-60 w-full items-center justify-center">
          <Skeleton className="h-60 w-full rounded-xl" />
          {withDots && <SkeletonDots size="md" className="absolute" />}
        </div>
      )}
    </SkeletonCard>
  );
}
