// Feature 12 — Dashboard & Analytics. Pure farm-wide weight-trend aggregation:
// no React, no Supabase. The dashboard groups every weigh-in by calendar month
// and plots the herd's average recorded weight for that month (owner's choice
// 2026-08-29 — Spec 12, Section 13). Barn scoping happens in the query that
// feeds this (via `goats.barn_id`); this function just buckets whatever it is
// given.

export interface WeightTrendPoint {
  weighed_on: string;
  weight_kg: number;
}

export interface MonthlyWeightAverage {
  /** `YYYY-MM` — stable sort key. */
  month: string;
  /** Human label, e.g. `Aug 2026`. */
  label: string;
  /** Mean of every weigh-in in the month, to 2 dp. */
  averageKg: number;
  /** How many weigh-ins went into the average. */
  count: number;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Average recorded weight per calendar month, oldest month first. Points with an
 * unparseable date are skipped. Months with no weigh-ins are simply absent — the
 * chart connects the months that exist rather than inventing zero-value gaps.
 */
export function computeMonthlyWeightAverages(
  points: WeightTrendPoint[],
): MonthlyWeightAverage[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const point of points) {
    const match = /^(\d{4})-(\d{2})/.exec(point.weighed_on);
    if (!match) continue;
    const month = `${match[1]}-${match[2]}`;

    const bucket = buckets.get(month) ?? { sum: 0, count: 0 };
    bucket.sum += Number(point.weight_kg);
    bucket.count += 1;
    buckets.set(month, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { sum, count }]) => ({
      month,
      label: monthLabel(month),
      averageKg: Math.round((sum / count) * 100) / 100,
      count,
    }));
}
