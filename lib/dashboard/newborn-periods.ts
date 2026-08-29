// UPD-007 — Newborn Kids period chart. Pure, portable: no React, no Supabase,
// so the dashboard page and (later) a mobile client can both reuse it
// (architecture-context.md invariant 6).
//
// This is an early *visual proxy* for spotting breeding-season patterns from
// birth dates alone — it is NOT spec 09's real breeding/mating analysis. It
// counts goats that were born here (`origin = 'born_here'`) by the calendar
// month of their `date_of_birth`, within a selectable window ending at `now`.
//
// The defining behaviour: every month in the window is emitted in chronological
// order, INCLUDING months with zero births as an explicit `count: 0`. A visible
// zero bar ("0 kids in July") tells a different story from a missing bar, and
// surfacing those gaps is the entire point of the chart.

/** The subset of a `goats` row this computation needs. */
export interface NewbornPeriodGoat {
  origin: "born_here" | "purchased";
  date_of_birth: string | null;
}

export interface NewbornPeriodBucket {
  /** Human label for the month, e.g. `Mar 2026`. */
  periodLabel: string;
  /** Kids born here in that calendar month. Always present (0 for empty months). */
  count: number;
}

/** Allowed window sizes, in months. */
export type NewbornWindowMonths = 3 | 6 | 12;

const ISO_MONTH = /^(\d{4})-(\d{2})/;

function monthKey(year: number, monthIndex: number): string {
  // monthIndex is 0-based; normalise so callers can pass negatives.
  const d = new Date(year, monthIndex, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, m] = key.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Kids born per calendar month over the last `windowMonths` months (the current
 * month plus the preceding `windowMonths - 1`), oldest month first. Every month
 * in the window is present; months with no births come back as `count: 0`.
 *
 * Only `origin = 'born_here'` goats with a parseable `date_of_birth` are
 * counted; purchased goats and rows with an unusable date are ignored.
 */
export function computeNewbornsByPeriod(
  goats: NewbornPeriodGoat[],
  windowMonths: NewbornWindowMonths,
  now: Date = new Date(),
): NewbornPeriodBucket[] {
  const counts = new Map<string, number>();

  // Seed every month in the window with an explicit zero, oldest first.
  const orderedKeys: string[] = [];
  for (let offset = windowMonths - 1; offset >= 0; offset -= 1) {
    const key = monthKey(now.getFullYear(), now.getMonth() - offset);
    orderedKeys.push(key);
    counts.set(key, 0);
  }

  for (const goat of goats) {
    if (goat.origin !== "born_here" || !goat.date_of_birth) continue;
    const match = ISO_MONTH.exec(goat.date_of_birth);
    if (!match) continue;
    const key = `${match[1]}-${match[2]}`;
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return orderedKeys.map((key) => ({
    periodLabel: monthLabel(key),
    count: counts.get(key) ?? 0,
  }));
}
