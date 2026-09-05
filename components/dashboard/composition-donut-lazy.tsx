"use client";

import dynamic from "next/dynamic";
import { DonutChartSkeleton } from "@/components/dashboard/chart-skeleton";

// UPD-011 (11a) — Recharts is the dashboard's single largest client chunk
// (~390KB in production, measured via `npm run build`'s output). Code-splitting
// it out of the main bundle via `next/dynamic` (only possible from a Client
// Component — `ssr: false` isn't allowed directly in a Server Component) means
// the summary numbers and other non-chart cards don't wait on it to hydrate.
export const CompositionDonutLazy = dynamic(
  () => import("@/components/dashboard/composition-donut").then((m) => m.CompositionDonut),
  { ssr: false, loading: () => <DonutChartSkeleton /> },
);
