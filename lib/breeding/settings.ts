// Feature 09 — Breeding (Seasonal, Farm-Wide). Pure, portable breeding-settings
// shape + gestation conversion. No React, no Supabase — so the settings form,
// the server action, and the pure status/reminder functions all share one
// definition, and it can move into a Supabase function later
// (architecture-context.md invariant 6).

/**
 * The farm-wide breeding constants (one row per owner). Field names mirror the
 * `breeding_settings` table so a DB row can be passed straight in, the same way
 * `lib/dashboard/*` works over near-raw row shapes.
 */
export interface BreedingSettings {
  /** How many bucks run with one breeding group. */
  bucks_per_group: number;
  /** How many does that one group is expected to hold. */
  does_per_group: number;
  /**
   * Gestation length in days. The owner's confirmed default is 171
   * (5 months + 3 weeks). Stored as a day count; the form collects
   * months + weeks and converts (see `gestationDaysFromMonthsWeeks`).
   */
  gestation_days: number;
}

/** The migration defaults, mirrored for a farm with no settings row yet. */
export const DEFAULT_BREEDING_SETTINGS: BreedingSettings = {
  bucks_per_group: 1,
  does_per_group: 30,
  gestation_days: 171,
};

/** Days per month / week used for the months+weeks ⇄ days approximation. */
const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;

/** Convert the form's "months + weeks" into a stored day count. */
export function gestationDaysFromMonthsWeeks(
  months: number,
  weeks: number,
): number {
  return Math.round(months) * DAYS_PER_MONTH + Math.round(weeks) * DAYS_PER_WEEK;
}

/** Split a stored day count back into whole months + leftover whole weeks. */
export function gestationMonthsWeeksFromDays(days: number): {
  months: number;
  weeks: number;
} {
  const safe = Math.max(0, Math.round(days));
  const months = Math.floor(safe / DAYS_PER_MONTH);
  const weeks = Math.round((safe - months * DAYS_PER_MONTH) / DAYS_PER_WEEK);
  return { months, weeks };
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "3" → "March". Falls back to the raw number for an out-of-range value. */
export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}
