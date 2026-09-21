// UPD-012 — Doe Reproductive Performance Tracking. Pure, portable logic: no
// React, no Supabase, so the list page, the (future) mobile client, and a
// Supabase function could all reuse it (architecture-context.md invariant 6).
//
// Kidding events are DERIVED from a doe's kids' birth dates — nothing about a
// doe's rhythm is stored. The underperformance flag is likewise NEVER stored
// (spec §7): it is recomputed here on every page load, so changing a threshold
// in settings reflects across every doe immediately with no backfill.
//
// Age is NOT re-implemented here — it delegates to `ageInMonths()` from
// `lib/goats/stage.ts`, the single source of truth (spec implementation step 3).

import { ageInMonths } from "@/lib/goats/stage";
import type { GoatSex, ReproductiveState } from "@/lib/goats/stage";
import { kidsOfDam } from "@/lib/breeding/kid-count";

/**
 * Kids whose birth dates fall within this many days of a cluster's anchor
 * (earliest) date are treated as ONE kidding event — twins/triplets registered
 * a day or two apart still count once. A doe cannot physically kid twice within
 * three days, so this never wrongly merges two real kiddings. Owner-confirmed
 * 2026-09-05 (spec §14); kept in one place for easy retuning.
 */
export const KIDDING_EVENT_GROUPING_DAYS = 3;

/**
 * When spec 09's `breeding_settings.gestation_days` is unavailable, this is the
 * minimum realistic gap between two kiddings (~5 months). Two of a doe's kidding
 * events closer together than this are almost certainly a data-entry mistake —
 * a kid registered under the wrong mother — not a real biological event, so it
 * is flagged as `impossible_interval` (a data-integrity flag, distinct from the
 * performance flags). Read spec 09's real gestation length opportunistically;
 * fall back here if that table/row isn't set up yet.
 */
export const DEFAULT_MIN_KIDDING_INTERVAL_DAYS = 150;

/** Average number of days per month used for the interval-in-months maths. */
const AVERAGE_DAYS_PER_MONTH = 30.44;

/** The subset of a `goats` row this computation needs. */
export interface DoePerformanceGoat {
  id: number;
  tag: string;
  name: string | null;
  sex: GoatSex;
  reproductive_state: ReproductiveState;
  date_of_birth: string;
  /** `goat_status` — only 'active' does are judged (spec §5). */
  status: string;
  /** `dam_id` — the mother link from feature 06. */
  dam_id: number | null;
}

/** One kid born in a kidding event — enough to link to its own detail page. */
export interface KiddingEventKid {
  id: number;
  tag: string;
  name: string | null;
  /** `goat_status`. */
  status: string;
}

export interface KiddingEvent {
  /** The earliest kid birth date in the cluster (local midnight). */
  date: Date;
  /** How many kids were born in this event (= `kids.length`). */
  kidCount: number;
  /** The actual kids born that day — twins/triplets are all listed. */
  kids: KiddingEventKid[];
}

export type DoePerformanceFlag =
  | "overdue"
  | "long_average_interval"
  | "never_kidded_but_eligible"
  | "impossible_interval";

export const DOE_PERFORMANCE_FLAG_LABELS: Record<DoePerformanceFlag, string> = {
  overdue: "Overdue since last kidding",
  long_average_interval: "Long average interval",
  never_kidded_but_eligible: "Never kidded (old enough)",
  impossible_interval: "Possible registration error",
};

/**
 * `impossible_interval` is a DATA-INTEGRITY flag, not a performance one: it
 * means "this looks like a data-entry mistake — probably a kid recorded under
 * the wrong mother", not "this doe is not performing well". The UI styles and
 * words it distinctly (a red / warning treatment, "verify the correct mother"),
 * separate from the amber "not performing well" flags.
 */
export const DOE_PERFORMANCE_PERFORMANCE_FLAGS: DoePerformanceFlag[] = [
  "overdue",
  "long_average_interval",
  "never_kidded_but_eligible",
];

export interface DoePerformance {
  doeId: number;
  /** Tag, per project convention (falls back to name, then id). */
  doeLabel: string;
  /** Whole months, from `ageInMonths()`. */
  ageMonths: number;
  kiddingEvents: KiddingEvent[];
  /** Whole months from the most recent kidding to `now`; null if never kidded. */
  monthsSinceLastKidding: number | null;
  /** Mean gap between consecutive kiddings, 1 dp; null if fewer than 2 events. */
  averageIntervalMonths: number | null;
  /**
   * Every flag that applies. `overdue` / `long_average_interval` /
   * `never_kidded_but_eligible` mean "not performing well"; `impossible_interval`
   * means "probably a data-entry mistake" and is styled separately by the UI.
   */
  flags: DoePerformanceFlag[];
  /**
   * `tooCloseAfter[i]` is `true` when the gap between kidding event `i` and
   * event `i + 1` is below the minimum realistic interval — the pair that
   * triggered `impossible_interval`. Length is `kiddingEvents.length - 1`
   * (empty for a doe with fewer than two events). Used to place the inline
   * "verify the correct mother" warning between exactly those two events.
   */
  tooCloseAfter: boolean[];
}

export interface DoePerformanceSettings {
  maxExpectedIntervalMonths: number;
  breedingEligibleAgeMonths: number;
}

/**
 * The migration defaults, mirrored for a farm with no settings row yet.
 * `breedingEligibleAgeMonths` is 12 — "a doeling can have kids once she is
 * older than a year" (owner, UPD-012 amendment 2026-09-05). Owner-editable.
 */
export const DEFAULT_DOE_PERFORMANCE_SETTINGS: DoePerformanceSettings = {
  maxExpectedIntervalMonths: 13,
  breedingEligibleAgeMonths: 12,
};

/** Whole-day number for a `YYYY-MM-DD` string (local midnight), or null. */
function toDayNumber(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return Math.round(date.getTime() / 86_400_000);
}

function dayNumberToDate(day: number): Date {
  const utc = new Date(day * 86_400_000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/**
 * Every kidding event for the doe with id `damId`, derived from her kids'
 * `date_of_birth`. Kids within `KIDDING_EVENT_GROUPING_DAYS` of a cluster's
 * anchor date collapse into one event. Sorted ascending by date.
 */
export function computeKiddingEvents(
  allGoats: DoePerformanceGoat[],
  damId: number,
): KiddingEvent[] {
  // `kidsOfDam` is the single dam_id-based selector (lib/breeding/kid-count.ts).
  const kids: { kid: KiddingEventKid; day: number }[] = [];
  for (const goat of kidsOfDam(allGoats, damId)) {
    const day = toDayNumber(goat.date_of_birth);
    if (day === null) continue;
    kids.push({
      kid: {
        id: goat.id,
        tag: goat.tag,
        name: goat.name,
        status: goat.status,
      },
      day,
    });
  }
  kids.sort((a, b) => a.day - b.day);

  const events: KiddingEvent[] = [];
  let anchorDay: number | null = null;
  for (const { kid, day } of kids) {
    if (
      anchorDay !== null &&
      events.length > 0 &&
      day - anchorDay <= KIDDING_EVENT_GROUPING_DAYS
    ) {
      const current = events[events.length - 1];
      current.kidCount += 1;
      current.kids.push(kid);
      continue;
    }
    events.push({ date: dayNumberToDate(day), kidCount: 1, kids: [kid] });
    anchorDay = day;
  }
  return events;
}

/**
 * UPD-014 — plain-language litter size, for a single kidding event's kid count.
 * "1 kid" reads as "Single" rather than a bare number; anything past
 * Quadruplets (rare) falls back to "N kids" rather than inventing more names.
 */
export function labelLitterSize(kidCount: number): string {
  switch (kidCount) {
    case 1:
      return "Single";
    case 2:
      return "Twins";
    case 3:
      return "Triplets";
    case 4:
      return "Quadruplets";
    default:
      return `${kidCount} kids`;
  }
}

export interface DoeLitterStats {
  /** Mean kids per kidding event, 1 dp (e.g. 1.8). */
  averageLitterSize: number;
  /** Keyed by `labelLitterSize()`'s output, e.g. { Single: 3, Twins: 2, Triplets: 1 }. */
  countsByLabel: Record<string, number>;
}

// Canonical display order for the four named sizes; any "N kids" fallback
// label sorts after them, by ascending N (see `formatLitterSizeBreakdown`).
const NAMED_LITTER_SIZE_ORDER = ["Single", "Twins", "Triplets", "Quadruplets"];

/**
 * A doe's litter-size pattern — her average litter size and a breakdown of how
 * many events fell into each size category. `null` when she has no kidding
 * events yet (nothing to summarize) — the UI shows nothing in that case.
 */
export function computeDoeLitterStats(
  events: KiddingEvent[],
): DoeLitterStats | null {
  if (events.length === 0) return null;

  const totalKids = events.reduce((sum, e) => sum + e.kidCount, 0);
  const averageLitterSize = Math.round((totalKids / events.length) * 10) / 10;

  const countsByLabel: Record<string, number> = {};
  for (const event of events) {
    const label = labelLitterSize(event.kidCount);
    countsByLabel[label] = (countsByLabel[label] ?? 0) + 1;
  }

  return { averageLitterSize, countsByLabel };
}

// The word for ONE event of this size ("1 triplet"), vs. several ("2 triplets").
// "Single" is the odd one out — it's an adjective, not already a plural noun —
// so it needs an "s" added rather than removed.
function pluralizeLitterSizeLabel(label: string, eventCount: number): string {
  if (label === "Single") return eventCount === 1 ? "single" : "singles";
  if (NAMED_LITTER_SIZE_ORDER.includes(label)) {
    const plural = label.toLowerCase();
    return eventCount === 1 ? plural.replace(/s$/, "") : plural;
  }
  // "N kids" fallback (5+) — already count-agnostic wording.
  return eventCount === 1 ? `litter of ${label}` : `litters of ${label}`;
}

/**
 * The short breakdown line, e.g. "3 singles · 2 twins · 1 triplet" — only the
 * categories a doe has actually had, in a stable Single→Twins→Triplets→
 * Quadruplets→(5+, ascending) order.
 */
export function formatLitterSizeBreakdown(stats: DoeLitterStats): string {
  const fallbackLabels = Object.keys(stats.countsByLabel)
    .filter((label) => !NAMED_LITTER_SIZE_ORDER.includes(label))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  return [...NAMED_LITTER_SIZE_ORDER, ...fallbackLabels]
    .filter((label) => (stats.countsByLabel[label] ?? 0) > 0)
    .map((label) => {
      const count = stats.countsByLabel[label];
      return `${count} ${pluralizeLitterSizeLabel(label, count)}`;
    })
    .join(" · ");
}

/**
 * The live performance picture for one doe. Returns `null` when she cannot be
 * judged yet — zero kiddings AND below breeding-eligible age (spec §6). A doe
 * that CAN be judged always returns an object; `flags` is empty when she is
 * performing fine. The caller filters to `flags.length > 0` for the list.
 */
export function computeDoePerformance(
  doe: DoePerformanceGoat,
  allGoats: DoePerformanceGoat[],
  settings: DoePerformanceSettings,
  now: Date,
  /**
   * Minimum realistic gap between two kiddings, in days. The caller resolves
   * this from spec 09's `breeding_settings.gestation_days` when that table/row
   * is readable, otherwise passes nothing and this defaults to
   * `DEFAULT_MIN_KIDDING_INTERVAL_DAYS`. Spec 09 is read opportunistically —
   * never hard-required.
   */
  minKiddingIntervalDays: number = DEFAULT_MIN_KIDDING_INTERVAL_DAYS,
): DoePerformance | null {
  // Raw age from date_of_birth — NOT the derived Kid/Doeling/Doe stage label.
  // "Breeding-eligible age" and "life stage" are two independent, separately
  // configurable concepts: a Doeling-stage doe past the eligible age is still
  // judged here (UPD-012 amendment 2026-09-05).
  const ageMonths = ageInMonths(doe.date_of_birth, now);
  const kiddingEvents = computeKiddingEvents(allGoats, doe.id);
  const doeLabel =
    doe.tag?.trim() || doe.name?.trim() || `Goat #${doe.id}`;

  const flags: DoePerformanceFlag[] = [];

  // Data-integrity check: any two consecutive kidding events closer together
  // than a goat can physically kid → probably a kid recorded under the wrong
  // mother. Independent of the performance flags below.
  const tooCloseAfter: boolean[] = [];
  for (let i = 0; i < kiddingEvents.length - 1; i += 1) {
    const gapDays =
      (kiddingEvents[i + 1].date.getTime() - kiddingEvents[i].date.getTime()) /
      86_400_000;
    const tooClose = gapDays < minKiddingIntervalDays;
    tooCloseAfter.push(tooClose);
    if (tooClose && !flags.includes("impossible_interval")) {
      flags.push("impossible_interval");
    }
  }

  if (kiddingEvents.length === 0) {
    if (ageMonths < settings.breedingEligibleAgeMonths) {
      return null; // not yet applicable — a doeling who hasn't had the chance
    }
    flags.push("never_kidded_but_eligible");
    return {
      doeId: doe.id,
      doeLabel,
      ageMonths,
      kiddingEvents,
      monthsSinceLastKidding: null,
      averageIntervalMonths: null,
      flags,
      tooCloseAfter,
    };
  }

  const lastEvent = kiddingEvents[kiddingEvents.length - 1];
  const monthsSinceLastKidding = ageInMonths(lastEvent.date, now);
  if (monthsSinceLastKidding > settings.maxExpectedIntervalMonths) {
    flags.push("overdue");
  }

  let averageIntervalMonths: number | null = null;
  if (kiddingEvents.length >= 2) {
    const firstDay = kiddingEvents[0].date.getTime() / 86_400_000;
    const lastDay = lastEvent.date.getTime() / 86_400_000;
    const meanDays = (lastDay - firstDay) / (kiddingEvents.length - 1);
    averageIntervalMonths =
      Math.round((meanDays / AVERAGE_DAYS_PER_MONTH) * 10) / 10;
    if (averageIntervalMonths > settings.maxExpectedIntervalMonths) {
      flags.push("long_average_interval");
    }
  }

  return {
    doeId: doe.id,
    doeLabel,
    ageMonths,
    kiddingEvents,
    monthsSinceLastKidding,
    averageIntervalMonths,
    flags,
    tooCloseAfter,
  };
}

export const DOE_PERFORMANCE_CATEGORIES = [
  "age",
  "health",
  "buck_issue",
  "other",
  "resolved",
] as const;

export type DoePerformanceCategory =
  (typeof DOE_PERFORMANCE_CATEGORIES)[number];

export const DOE_PERFORMANCE_CATEGORY_LABELS: Record<
  DoePerformanceCategory,
  string
> = {
  age: "Age",
  health: "Health issue",
  buck_issue: "Buck issue",
  other: "Other",
  resolved: "Resolved",
};

export function isDoePerformanceCategory(
  value: string,
): value is DoePerformanceCategory {
  return (DOE_PERFORMANCE_CATEGORIES as readonly string[]).includes(value);
}
