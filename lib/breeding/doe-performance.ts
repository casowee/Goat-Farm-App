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

/**
 * Kids whose birth dates fall within this many days of a cluster's anchor
 * (earliest) date are treated as ONE kidding event — twins/triplets registered
 * a day or two apart still count once. A doe cannot physically kid twice within
 * three days, so this never wrongly merges two real kiddings. Owner-confirmed
 * 2026-09-05 (spec §14); kept in one place for easy retuning.
 */
export const KIDDING_EVENT_GROUPING_DAYS = 3;

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

export interface KiddingEvent {
  /** The earliest kid birth date in the cluster (local midnight). */
  date: Date;
  /** How many kids were born in this event. */
  kidCount: number;
}

export type DoePerformanceFlag =
  | "overdue"
  | "long_average_interval"
  | "never_kidded_but_eligible";

export const DOE_PERFORMANCE_FLAG_LABELS: Record<DoePerformanceFlag, string> = {
  overdue: "Overdue since last kidding",
  long_average_interval: "Long average interval",
  never_kidded_but_eligible: "Never kidded (old enough)",
};

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
  /** Every flag that applies. A doe with any flag is "not performing well". */
  flags: DoePerformanceFlag[];
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
  const kidDays: number[] = [];
  for (const goat of allGoats) {
    if (goat.dam_id !== damId) continue;
    const day = toDayNumber(goat.date_of_birth);
    if (day !== null) kidDays.push(day);
  }
  kidDays.sort((a, b) => a - b);

  const events: KiddingEvent[] = [];
  let anchorDay: number | null = null;
  for (const day of kidDays) {
    if (
      anchorDay !== null &&
      events.length > 0 &&
      day - anchorDay <= KIDDING_EVENT_GROUPING_DAYS
    ) {
      events[events.length - 1].kidCount += 1;
      continue;
    }
    events.push({ date: dayNumberToDate(day), kidCount: 1 });
    anchorDay = day;
  }
  return events;
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
