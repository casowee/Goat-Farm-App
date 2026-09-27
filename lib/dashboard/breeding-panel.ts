// Spec 17.3 (§5C) — the breeding pieces the dashboard's "Breeding season" and
// "Due soon" cards both need, assembled once.
//
// Moved out of the dashboard page unchanged: the same four queries, the same
// buck-tag join, the same `eligibleBreedingMales` call. It lives in `lib` because
// it is data assembly with no JSX; the "Due soon" card's `ApproveSeasonButton`
// elements are still built in the component, where they belong.
//
// `cache()`d with no arguments, so the two sections that read it share one
// assembly and one set of round-trips even though they render independently.

import { cache } from "react";
import {
  listAllDashboardGoats,
  listBreedingOccurrences,
  listBreedingSeasonBucks,
  listBreedingSeasonTemplates,
  listDashboardBarns,
} from "@/lib/dashboard/queries";
import { eligibleBreedingMales } from "@/lib/breeding/eligible-males";
import type { SeasonTemplate } from "@/lib/breeding/templates";

export interface BreedingOccurrenceRow {
  id: number;
  buck_ids: number[];
  buck_tags: string[];
  season_template_id: number | null;
  start_date: string;
  end_date: string | null;
}

export const loadBreedingPanel = cache(async () => {
  // Independent of one another, so they run together — and each is `cache()`d,
  // so a sibling dashboard section asking for the same rows gets them free.
  const [allGoats, occurrences, seasonBucks, templateRows, barns] =
    await Promise.all([
      listAllDashboardGoats(),
      listBreedingOccurrences(),
      listBreedingSeasonBucks(),
      listBreedingSeasonTemplates(),
      listDashboardBarns(),
    ]);

  const templates: SeasonTemplate[] = templateRows;
  const goatById = new Map(allGoats.map((g) => [g.id, g]));
  const { bucks, bucklings } = eligibleBreedingMales(allGoats, new Date());

  const bucksBySeason = new Map<number, { ids: number[]; tags: string[] }>();
  for (const row of seasonBucks) {
    const entry = bucksBySeason.get(row.season_id) ?? { ids: [], tags: [] };
    entry.ids.push(row.buck_id);
    const tag = goatById.get(row.buck_id)?.tag;
    if (tag) entry.tags.push(tag);
    bucksBySeason.set(row.season_id, entry);
  }

  const occurrenceRows: BreedingOccurrenceRow[] = occurrences.map((o) => {
    const linked = bucksBySeason.get(o.id) ?? { ids: [], tags: [] };
    return {
      id: o.id,
      buck_ids: linked.ids,
      buck_tags: linked.tags,
      season_template_id: o.season_template_id,
      start_date: o.start_date,
      end_date: o.end_date,
    };
  });

  return { templates, occurrenceRows, bucks, bucklings, barns };
});
