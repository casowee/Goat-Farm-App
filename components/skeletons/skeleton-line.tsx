import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Spec 17.3 (§5A) — one line of placeholder text.
 *
 * The bar is deliberately thinner than the line it stands in for, but it is
 * centred inside a box of the *real* line height. That is what keeps the
 * same-size rule (§5A, V3): a full-height bar would look like a solid block,
 * while a bare thin bar would make the skeleton shorter than the text that
 * replaces it and the page would jump. Sizing the box and the bar separately
 * gets both.
 *
 * `lineHeight` values match the type scale in `ui-context.md`: `h-5` is one line
 * of `text-sm`, `h-7` one line of `text-xl` (a page title), `h-4` one line of
 * `text-xs`.
 */
export function SkeletonLine({
  width = "w-40",
  lineHeight = "h-5",
  barHeight = "h-3",
  className,
}: {
  /** Tailwind width utility — vary it between lines so a block of them doesn't look printed. */
  width?: string;
  /** The line box height of the text being replaced. */
  lineHeight?: string;
  /** The visible bar inside that box. */
  barHeight?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center", lineHeight, className)}>
      <Skeleton className={cn("rounded-full", barHeight, width)} />
    </div>
  );
}
