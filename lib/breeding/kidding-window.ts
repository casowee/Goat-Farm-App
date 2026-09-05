// Feature 09 — Breeding (Seasonal, Farm-Wide). Pure kidding-window maths: no
// React, no Supabase. The window is COMPUTED from a season's real dates + the
// configured gestation length every time it's shown — it is never stored or
// duplicated on the occurrence row (09-breeding.md Section 5).

const MS_PER_DAY = 86_400_000;

/** A copy of `date` shifted forward by `days` whole days. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * The expected kidding window for a breeding season.
 *
 * - `start` = `startDate + gestationDays` — the earliest a doe served on the
 *   first day the buck was in could kid.
 * - `end`   = `endDate + gestationDays` — the latest, once the buck has been
 *   removed. While the season is still open (`endDate` is `null`) the window is
 *   open-ended and `end` is `null`.
 */
export function computeKiddingWindow(
  startDate: Date,
  endDate: Date | null,
  gestationDays: number,
): { start: Date; end: Date | null } {
  return {
    start: addDays(startDate, gestationDays),
    end: endDate ? addDays(endDate, gestationDays) : null,
  };
}
