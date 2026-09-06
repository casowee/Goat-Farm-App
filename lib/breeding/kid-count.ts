// Shared "kids born to a doe" logic. Pure — no React, no Supabase.
//
// This is the ONE place the `dam_id`-based kid selection lives (originally an
// inline count query on the goat detail page, UPD-010's "Total kids" stat). The
// doe-performance kidding-event grouping, the goat-profile Breeding tab's
// total + status breakdown, and the Breeding "Top Performers" ranking all build
// on `kidsOfDam` so there is a single definition of "her kids".

/** Every goat whose `dam_id` points at `damId` — all life statuses included. */
export function kidsOfDam<T extends { dam_id: number | null }>(
  allGoats: T[],
  damId: number,
): T[] {
  return allGoats.filter((goat) => goat.dam_id === damId);
}

/** `goat_status` values, in the order the breakdown line reads them out. */
export type KidStatusKey = "active" | "sold" | "deceased" | "stolen";

const KID_STATUS_ORDER: KidStatusKey[] = [
  "active",
  "sold",
  "deceased",
  "stolen",
];

/** How each status reads in the "Total: 6 · 4 active · 1 sold · 1 died" line. */
const KID_STATUS_LABELS: Record<KidStatusKey, string> = {
  active: "active",
  sold: "sold",
  deceased: "died",
  stolen: "stolen",
};

export interface KidCountBreakdown {
  total: number;
  /** Only the statuses that actually occur, in `KID_STATUS_ORDER`. */
  byStatus: { key: KidStatusKey; label: string; count: number }[];
}

/**
 * Total kid count plus a per-status split. Non-zero segments only — a doe with
 * no sold kids shows no "0 sold" segment (spec: "only show non-zero status
 * segments"). An unrecognised status is still counted in `total`.
 */
export function computeKidCountBreakdown(
  kids: { status: string }[],
): KidCountBreakdown {
  const counts = new Map<string, number>();
  for (const kid of kids) {
    counts.set(kid.status, (counts.get(kid.status) ?? 0) + 1);
  }

  const byStatus = KID_STATUS_ORDER.map((key) => ({
    key,
    label: KID_STATUS_LABELS[key],
    count: counts.get(key) ?? 0,
  })).filter((segment) => segment.count > 0);

  return { total: kids.length, byStatus };
}
