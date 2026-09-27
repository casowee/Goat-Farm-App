import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { BreedingTabs } from "@/components/breeding/breeding-tabs";

/**
 * Spec 17.3 (§5B) — the shared shape of the three Breeding tab routes
 * (`/breeding`, `/breeding/doe-performance`, `/breeding/top-performers`), which
 * all render the same header row, the same tab strip and then an intro paragraph
 * above their list.
 *
 * `BreedingTabs` is rendered for real, not as a placeholder. It is a client
 * component driven by `usePathname()` with no data of its own, so it can paint
 * immediately — and because it is route-backed, the tab the owner just tapped is
 * already highlighted while the page behind it loads. A skeleton there would be
 * strictly worse.
 */
export function SkeletonBreedingPage({
  introLines = 3,
  rows = 6,
}: {
  introLines?: number;
  rows?: number;
}) {
  return (
    <SkeletonRegion
      label="Loading breeding records…"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-24" actionWidth="w-24" />
      <BreedingTabs />
      <div className="flex flex-col gap-1">
        {Array.from({ length: introLines }, (_, index) => (
          <SkeletonLine
            key={index}
            width={index === introLines - 1 ? "w-1/2" : "w-full"}
          />
        ))}
      </div>
      <SkeletonList rows={rows} />
    </SkeletonRegion>
  );
}
