import { GoatSpinner } from "@/components/loading/goat-spinner";

/**
 * Shared body for the `app/(app)/**\/loading.tsx` route boundaries — a
 * centered, full-page `GoatSpinner`. Not used for the dashboard's per-widget
 * skeletons (`UPD-011`), which stay Suspense-driven and untouched.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <GoatSpinner size="lg" />
    </div>
  );
}
