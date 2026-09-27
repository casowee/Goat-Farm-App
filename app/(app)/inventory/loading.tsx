import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Spec 17.3 (§5B) — inventory.
 *
 * `app/(app)/inventory/page.tsx` has no action button beside its title (the "Add
 * medicine" / "Add feed" buttons sit inside each tab panel, right-aligned), so
 * the header here carries none either — a placeholder button that then vanished
 * would shift the row.
 *
 * The tab bar is the real `TabsList` geometry: `h-8`, `rounded-lg`, `bg-muted`,
 * `p-[3px]`, two pills.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading inventory…"
      className="flex flex-col gap-4 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-28" withAction={false} />

      <div className="flex flex-col gap-2">
        <div className="inline-flex h-8 w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
          <Skeleton className="h-full w-28 rounded-md" />
          <Skeleton className="h-full w-20 rounded-md" />
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
          <SkeletonList rows={6} withBadge secondaryLines={0} />
        </div>
      </div>
    </SkeletonRegion>
  );
}
