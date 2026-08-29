// Feature 08 — Weight Records. Pure, portable helpers: no React, no Supabase.
// Shared by the server action, the goat-profile Weight tab, and (later) the
// Spec 12 herd-weight analytics, so the maths lives in one place and can move
// to a Supabase function if mobile needs it (architecture-context.md
// invariant 6).

export interface WeightPoint {
  weighed_on: string;
  weight_kg: number;
}

/**
 * A weigh-in with its change vs. the immediately preceding entry.
 * `delta` is `null` for the first (oldest) point.
 */
export interface WeightRowWithDelta<T extends WeightPoint> {
  row: T;
  delta: number | null;
}

/** Trim trailing zeros: 12.5 not "12.50", 12 not "12.00". */
export function formatKg(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * Given weigh-ins **oldest-first**, pair each with the change in kg vs. the
 * previous entry. Input order is preserved.
 */
export function weightDeltas<T extends WeightPoint>(
  points: T[],
): WeightRowWithDelta<T>[] {
  return points.map((row, i) => ({
    row,
    delta: i === 0 ? null : row.weight_kg - points[i - 1].weight_kg,
  }));
}
