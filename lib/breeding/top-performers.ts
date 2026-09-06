// Breeding "Top Performers" — active does ranked by lifetime kid count. Pure —
// no React, no Supabase.
//
// "Total kids ever born to her" reuses the same dam_id-based selector every
// other kid count in the app uses (`kidsOfDam`, lib/breeding/kid-count.ts) —
// all life statuses count, matching UPD-010's "Total kids" stat. The kidding-
// event count reuses `computeKiddingEvents` (twins/triplets collapse) rather
// than re-deriving the grouping.

import { computeKidCountBreakdown, kidsOfDam } from "@/lib/breeding/kid-count";
import {
  computeKiddingEvents,
  type DoePerformanceGoat,
} from "@/lib/breeding/doe-performance";

export interface TopPerformingDoe {
  doeId: number;
  tag: string;
  name: string | null;
  /** Every kid ever linked to her via `dam_id`, any life status. */
  totalKids: number;
  /** Kidding events (twins/triplets collapse) — shown as secondary context. */
  kiddingEventCount: number;
}

/**
 * Currently-active does, ranked by `totalKids` descending (ties broken by tag,
 * natural order). Does with no kids on record are included at the bottom — the
 * caller decides whether to show or summarise them.
 */
export function computeTopPerformingDoes(
  allGoats: DoePerformanceGoat[],
): TopPerformingDoe[] {
  const rows = allGoats
    .filter((goat) => goat.sex === "female" && goat.status === "active")
    .map((doe) => ({
      doeId: doe.id,
      tag: doe.tag,
      name: doe.name,
      totalKids: computeKidCountBreakdown(kidsOfDam(allGoats, doe.id)).total,
      kiddingEventCount: computeKiddingEvents(allGoats, doe.id).length,
    }));

  rows.sort(
    (a, b) =>
      b.totalKids - a.totalKids ||
      a.tag.localeCompare(b.tag, undefined, { numeric: true }),
  );
  return rows;
}
