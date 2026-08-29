// UPD-006 (6b) — Herd population timeline. Pure, portable: no React, no
// Supabase, so the dashboard page and (later) a mobile client or spec 11
// (sales & purchases) can all reuse it (architecture-context.md invariant 6).
//
// The timeline combines two sources into one chronological running total:
//   1. Derived additions — every goat contributes +1 on the day it joined the
//      herd: `date_of_birth` for born-here goats, `purchase_date` for purchased
//      goats. No manual entry is needed for these; the data already exists on
//      the goat record.
//   2. Manual herd_events — `other_addition` is +1; `sale` / `death` /
//      `other_removal` are -1, on `event_date`.
//
// Births and purchases are NOT in herd_events by design — storing them there
// would double-count against the derived additions.

/** The subset of a `goats` row the timeline needs. */
export interface HerdTimelineGoat {
  origin: "born_here" | "purchased";
  date_of_birth: string | null;
  purchase_date: string | null;
}

/** The subset of a `herd_events` row the timeline needs. */
export interface HerdTimelineEvent {
  event_type: "sale" | "death" | "other_addition" | "other_removal";
  event_date: string;
}

export interface HerdTimelinePoint {
  /** `YYYY-MM-DD` — the day this net change happened. */
  date: string;
  /** Net change to the herd size on this day (can be positive or negative). */
  delta: number;
  /** Herd size after this day's change. */
  runningTotal: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** +1 for anything that grows the herd, -1 for anything that shrinks it. */
export function herdEventDelta(type: HerdTimelineEvent["event_type"]): number {
  return type === "other_addition" ? 1 : -1;
}

/**
 * One point per day on which the herd size changed, oldest first, each with the
 * running total after that day. Days with no change are absent — a line/area
 * chart connects the points it is given.
 *
 * A purchased goat with no recorded `purchase_date` falls back to its
 * `date_of_birth` (the earliest day it could have joined) so the running total
 * still reconciles with the actual goat count; entries with no usable date at
 * all are skipped.
 */
export function computeHerdTimeline(
  goats: HerdTimelineGoat[],
  events: HerdTimelineEvent[],
): HerdTimelinePoint[] {
  const deltaByDate = new Map<string, number>();

  const addDelta = (rawDate: string | null, delta: number) => {
    if (!rawDate || !ISO_DATE.test(rawDate)) return;
    const date = rawDate.slice(0, 10);
    deltaByDate.set(date, (deltaByDate.get(date) ?? 0) + delta);
  };

  for (const goat of goats) {
    const joinedOn =
      goat.origin === "purchased"
        ? (goat.purchase_date ?? goat.date_of_birth)
        : goat.date_of_birth;
    addDelta(joinedOn, 1);
  }

  for (const event of events) {
    addDelta(event.event_date, herdEventDelta(event.event_type));
  }

  const points: HerdTimelinePoint[] = [];
  let runningTotal = 0;
  for (const date of [...deltaByDate.keys()].sort()) {
    const delta = deltaByDate.get(date) ?? 0;
    runningTotal += delta;
    points.push({ date, delta, runningTotal });
  }
  return points;
}
