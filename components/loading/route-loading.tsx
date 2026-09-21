import { LoadingDots } from "@/components/loading/loading-dots";

/**
 * Shared body for the `app/(app)/**\/loading.tsx` route boundaries — a
 * centered, full-page `LoadingDots`. Not used for the dashboard's per-widget
 * skeletons (`UPD-011`), which stay Suspense-driven and untouched.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingDots size="lg" />
    </div>
  );
}
