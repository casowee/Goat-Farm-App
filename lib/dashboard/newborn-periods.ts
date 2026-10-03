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
//
// UPD-018 adds `computeNewbornSummary`, which the Newborn Kids card reads: the
// bars count the kids born in the window MINUS those that died, and the "lost"
// badge counts exactly the kids the bars left out. Both come out of one call,
// over one window, through one rule (`isLostKid`) — so bars + lost = born
// always holds.

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
 * The window's calendar months as `YYYY-MM` keys, oldest first: the month `now`
 * falls in plus the preceding `windowMonths - 1`. The single definition of the
 * window — the chart and the kid-loss stat both read it.
 */
function windowMonthKeys(
  windowMonths: NewbornWindowMonths,
  now: Date,
): string[] {
  const keys: string[] = [];
  for (let offset = windowMonths - 1; offset >= 0; offset -= 1) {
    keys.push(monthKey(now.getFullYear(), now.getMonth() - offset));
  }
  return keys;
}

/**
 * The `YYYY-MM` key a goat counts under as a newborn, or `null` if it is not a
 * countable newborn at all (purchased, or no usable `date_of_birth`).
 */
function birthMonthKey(goat: NewbornPeriodGoat): string | null {
  if (goat.origin !== "born_here" || !goat.date_of_birth) return null;
  const match = ISO_MONTH.exec(goat.date_of_birth);
  return match ? `${match[1]}-${match[2]}` : null;
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
  // Seed every month in the window with an explicit zero, oldest first.
  const orderedKeys = windowMonthKeys(windowMonths, now);
  const counts = new Map<string, number>(orderedKeys.map((key) => [key, 0]));

  for (const goat of goats) {
    const key = birthMonthKey(goat);
    if (key !== null && counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return orderedKeys.map((key) => ({
    periodLabel: monthLabel(key),
    count: counts.get(key) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// UPD-018 — kids lost
// ---------------------------------------------------------------------------

/** The subset of a `goats` row the kid-loss count needs. */
export interface KidLossGoat extends NewbornPeriodGoat {
  status: "active" | "sold" | "deceased" | "stolen";
}

export interface KidLossSummary {
  /** `born_here` kids with `date_of_birth` in the window, lost ones included. */
  born: number;
  /** Of those: the ones whose status is `deceased`. */
  lost: number;
}

/**
 * THE "lost" rule — the only place it is written. A newborn is lost if it has
 * died, whenever that happened; sold and stolen kids are not lost.
 */
function isLostKid(goat: KidLossGoat): boolean {
  return goat.status === "deceased";
}

/**
 * How many kids were born in the window and how many of them have died. The
 * window is exactly `computeNewbornsByPeriod`'s, so `born` always equals that
 * function's total for the same goats and arguments.
 */
export function computeKidLosses(
  goats: KidLossGoat[],
  windowMonths: NewbornWindowMonths,
  endDate: Date,
): KidLossSummary {
  const windowKeys = new Set(windowMonthKeys(windowMonths, endDate));
  const summary: KidLossSummary = { born: 0, lost: 0 };

  for (const goat of goats) {
    const key = birthMonthKey(goat);
    if (key === null || !windowKeys.has(key)) continue;
    summary.born += 1;
    if (isLostKid(goat)) summary.lost += 1;
  }

  return summary;
}

export interface NewbornSummary {
  /**
   * The chart's bars: kids born per month, EXCLUDING those that died. Every
   * month in the window is present, zeros included — a month whose only birth
   * was a lost kid is a `count: 0` bar, not a gap.
   */
  buckets: NewbornPeriodBucket[];
  /** Totals for the same window. `sum(buckets) + losses.lost === losses.born`. */
  losses: KidLossSummary;
}

/**
 * Everything the Newborn Kids card shows, from ONE window and ONE end date, so
 * the bars and the "lost" badge cannot be computed over different ranges.
 */
export function computeNewbornSummary(
  goats: KidLossGoat[],
  windowMonths: NewbornWindowMonths,
  endDate: Date,
): NewbornSummary {
  return {
    buckets: computeNewbornsByPeriod(
      goats.filter((goat) => !isLostKid(goat)),
      windowMonths,
      endDate,
    ),
    losses: computeKidLosses(goats, windowMonths, endDate),
  };
}
