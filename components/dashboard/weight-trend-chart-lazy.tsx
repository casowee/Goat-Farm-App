"use client";

import dynamic from "next/dynamic";
import { LineChartSkeleton } from "@/components/dashboard/chart-skeleton";

// UPD-011 (11a) — same rationale as composition-donut-lazy.tsx: defer the
// Recharts-backed chart's chunk so it never blocks the rest of the dashboard.
export const WeightTrendChartLazy = dynamic(
  () => import("@/components/dashboard/weight-trend-chart").then((m) => m.WeightTrendChart),
  { ssr: false, loading: () => <LineChartSkeleton /> },
);
