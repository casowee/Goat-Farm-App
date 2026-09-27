import { LoadingDots } from "@/components/loading/loading-dots";

/**
 * A centered, full-page `LoadingDots` for a wait with no known page shape.
 *
 * **No longer wired to the route boundaries.** It was `UPD-015`'s shared body for
 * every `app/(app)/**\/loading.tsx`; spec 17.3 (§5B) replaced those with
 * page-shaped skeletons, which each carry the same `LoadingDots` inside them — so
 * the dots the owner asked to keep are still on screen during every route load,
 * now inside a placeholder that also shows what is coming.
 *
 * Kept rather than deleted for two reasons: it is still the right treatment for a
 * full-page wait whose destination has no predictable layout (a future route, an
 * interstitial), and removing an owner-approved component as a side effect of
 * another spec is not this spec's call. Flag it for deletion if nothing adopts it.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingDots size="lg" />
    </div>
  );
}
