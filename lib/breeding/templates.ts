// Feature 09 — Breeding (Seasonal, Farm-Wide). The farm's named, recurring
// breeding windows. Pure — no React, no Supabase. Replaces the old
// `breeding_settings.typical_season_starts` flat array (2026-09-05 amendment).

import {
  currentSeason,
  startOfDay,
  type BreedingSeasonOccurrenceRow,
} from "@/lib/breeding/season";

/** Field names mirror the `breeding_season_templates` table. */
export interface SeasonTemplate {
  id: number;
  label: string;
  /** 1-12. */
  start_month: number;
  length_months: number;
}

/** Seeded for a new owner (also the in-code fallback if a farm has no rows). */
export const DEFAULT_SEASON_TEMPLATES: Omit<SeasonTemplate, "id">[] = [
  { label: "Season 1", start_month: 3, length_months: 3 },
  { label: "Season 2", start_month: 9, length_months: 3 },
];

/** The next 1st-of-`startMonth` strictly after `now`. */
export function upcomingTemplateStart(startMonth: number, now: Date): Date {
  const today = startOfDay(now);
  for (let yearOffset = 0; yearOffset <= 1; yearOffset += 1) {
    const candidate = new Date(
      today.getFullYear() + yearOffset,
      startMonth - 1,
      1,
    );
    if (candidate.getTime() > today.getTime()) return candidate;
  }
  return new Date(today.getFullYear() + 1, startMonth - 1, 1);
}

/**
 * The template the Log Season form should default to: the currently-active
 * season's template if one is running (a new log is likely continuing or
 * correcting it), otherwise the template with the soonest upcoming start.
 * `null` when there are no templates.
 */
export function relevantTemplateId(
  templates: SeasonTemplate[],
  occurrences: BreedingSeasonOccurrenceRow[],
  now: Date,
): number | null {
  const active = currentSeason(occurrences, now);
  if (
    active?.season_template_id != null &&
    templates.some((t) => t.id === active.season_template_id)
  ) {
    return active.season_template_id;
  }

  let soonest: { date: Date; id: number } | null = null;
  for (const template of templates) {
    const date = upcomingTemplateStart(template.start_month, now);
    if (!soonest || date.getTime() < soonest.date.getTime()) {
      soonest = { date, id: template.id };
    }
  }
  return soonest?.id ?? null;
}
