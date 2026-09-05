import { Skeleton } from "@/components/ui/skeleton";

// UPD-011 (11a) — lightweight placeholders shown while a chart's JS chunk
// (Recharts, code-split via `next/dynamic`) loads, so the summary numbers and
// non-chart cards never wait on it. Sized to roughly match the chart they
// stand in for, to avoid layout shift when the real chart mounts.

export function DonutChartSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="h-44 w-44 rounded-full" />
      <div className="flex flex-wrap justify-center gap-2">
        <Skeleton className="h-4 w-14 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function LineChartSkeleton() {
  return <Skeleton className="h-60 w-full rounded-xl" />;
}
