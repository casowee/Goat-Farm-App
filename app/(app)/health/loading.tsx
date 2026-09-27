import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Spec 17.3 (§5B) — page-shaped fallback for `/health`.
 *
 * UPD-016 replaced the stub page here with the real two-tab Health page, so
 * this replaced the generic `SkeletonModulePlaceholder` with the actual shape:
 * title, the underline tab bar, the filter / window control row, and a record
 * list. Both tabs are a control row over a list, so one shape covers both.
 *
 * UPD-017 added the "Bulk schedule" action to the header, so the header
 * placeholder now carries its action box — otherwise the title row would grow
 * when the page arrived.
 *
 * The tab bar is a skeleton rather than the real `HealthTabs`, because which tab
 * is active comes from `?tab=` and a route-level fallback has no search params
 * to read. Its box matches the real bar (`flex gap-1 border-b`, `px-3 py-2`
 * items) so nothing shifts when the page arrives.
 *
 * `SkeletonRegion` carries the `LoadingDots` indicator — per the owner's
 * standing decision, skeletons supplement the dots, they never replace them.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading health records…"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-20" actionWidth="w-36" />

      <div className="flex gap-1 border-b border-surface-border">
        <Skeleton className="mb-1 h-6 w-20 rounded-md" />
        <Skeleton className="mb-1 h-6 w-24 rounded-md" />
      </div>

      <div className="flex flex-col gap-4">
        <SkeletonLine width="w-72" lineHeight="h-5" barHeight="h-3" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <SkeletonList rows={6} />
      </div>
    </SkeletonRegion>
  );
}
