// Feature 09 — Breeding (Seasonal, Farm-Wide). Shared season-occurrence shape
// and pure date helpers used by both `status.ts` and `reminders.ts`. No React,
// no Supabase.

/**
 * One logged breeding season. `start_date` / `end_date` mirror the
 * `breeding_season_occurrences` table; `buck_ids` are the linked
 * `breeding_season_bucks` rows and `buck_tags` is an optional convenience the
 * caller can attach by joining `goats` (the pure functions can't resolve a tag
 * from an id alone).
 */
export interface BreedingSeasonOccurrenceRow {
  id: number;
  buck_ids: number[];
  buck_tags?: string[];
  /** The linked `breeding_season_templates.id`, or `null` for an ad-hoc season. */
  season_template_id?: number | null;
  /** `YYYY-MM-DD` — the day the bucks went in. */
  start_date: string;
  /** `YYYY-MM-DD`, or `null` while the bucks are still with the herd. */
  end_date: string | null;
}

/** Parse a `YYYY-MM-DD` (or longer ISO) string to a local-midnight Date. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** A copy of `date` shifted forward by `months` calendar months. */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

/**
 * Whether a season covers `date`: it started on or before `date`, and either
 * has no end yet or ends on or after `date` (09-breeding.md Section 9).
 */
export function seasonCoversDate(
  occ: BreedingSeasonOccurrenceRow,
  date: Date,
): boolean {
  const start = parseDateOnly(occ.start_date);
  if (!start) return false;
  const day = startOfDay(date).getTime();
  if (start.getTime() > day) return false;
  const end = parseDateOnly(occ.end_date);
  return end === null || end.getTime() >= day;
}

/**
 * The season that currently covers `now`, or `null`. If more than one somehow
 * overlaps, the one that started most recently wins.
 */
export function currentSeason(
  occurrences: BreedingSeasonOccurrenceRow[],
  now: Date,
): BreedingSeasonOccurrenceRow | null {
  const covering = occurrences.filter((occ) => seasonCoversDate(occ, now));
  if (covering.length === 0) return null;
  return covering.reduce((latest, occ) =>
    occ.start_date > latest.start_date ? occ : latest,
  );
}

