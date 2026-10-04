// UPD-016 amendment (2026-10-04) — the Health page shows GROUP health events
// only: one row per bulk action (`health_records.batch_id is not null`), each
// saying both what was done and what is next. Pure, no React / no Supabase.
//
// Grouping is by batch and nothing else. A record with no batch — anything done
// to a single goat, routine or not — is never grouped and never shown here,
// even when several share a date and a product; it lives on that goat's own
// card.
//
// This is NOT a second due-date calculation. The Upcoming tab's order and its
// overdue / due-soon marks come from the shared `dueSoon()`
// (`lib/dashboard/due-soon.ts`); this file only folds its per-goat output into
// one row per batch.

import type { DueSoonItem } from "@/lib/dashboard/due-soon";
import type { HealthRecordType } from "@/lib/health/records";

/** A group event due within this many days is marked "Due soon". */
export const GROUP_DUE_SOON_DAYS = 7;

/**
 * The routine whole-group activities. Each tab's default view shows one row
 * per activity; the Archive can be filtered by one.
 */
export const GROUP_ACTIVITIES = ["deworming", "dip_wash", "vaccination"] as const;

export type GroupActivity = (typeof GROUP_ACTIVITIES)[number];

/** Narrow an `?activity=` value; anything unrecognised means "all". */
export function parseGroupActivity(
  value: string | undefined,
): GroupActivity | null {
  return (GROUP_ACTIVITIES as readonly string[]).includes(value ?? "")
    ? (value as GroupActivity)
    : null;
}

export type GroupDueStatus = "overdue" | "due_soon";

export interface GroupEventGoat {
  id: number;
  tag: string;
  name: string | null;
}

/** One row of either Health page tab. */
export interface GroupEvent {
  /** The batch id — one row per bulk action. */
  batchId: number;
  recordType: HealthRecordType;
  title: string;
  /** The product recorded (e.g. "Nilvasol 1L"), or null when none was. */
  product: string | null;
  /** ISO `YYYY-MM-DD`, or null if it could not be read. */
  dateGiven: string | null;
  /** ISO `YYYY-MM-DD`, or null when no next due date was set. */
  nextDueDate: string | null;
  /** The generated group label ("Does (57 of 58)"). */
  label: string;
  goats: GroupEventGoat[];
  /** Set on the Upcoming tab only; null = neither overdue nor due soon. */
  dueStatus: GroupDueStatus | null;
  /**
   * A newer group event of the same activity has since been done for the same
   * group, so this one's next due date no longer stands. Only ever true in the
   * Upcoming Archive — superseded events are left out of the default view.
   */
  superseded?: boolean;
}

/** The value most of the entries share; the first one seen wins a tie. */
function mostCommon<T>(values: T[]): T {
  const counts = new Map<T, number>();
  let best = values[0];
  let bestCount = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function cleanProduct(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function byTag(a: GroupEventGoat, b: GroupEventGoat): number {
  return a.tag.localeCompare(b.tag, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * The Upcoming tab: fold `dueSoon()`'s per-goat items into one row per batch,
 * soonest first, so anything overdue is at the top.
 *
 * - An item with no `batchId` (a single-goat record) is skipped.
 * - Every record in a batch starts identical. One can later be edited on its
 *   goat's own card, so each field of the row takes the value most of the
 *   batch's records still share — a single corrected goat neither splits the
 *   row nor rewrites it. That goat's own card shows its own dates.
 */
export function upcomingGroupEvents(items: DueSoonItem[]): GroupEvent[] {
  const byBatch = new Map<number, DueSoonItem[]>();
  for (const item of items) {
    if (item.batchId == null) continue;
    const list = byBatch.get(item.batchId) ?? [];
    list.push(item);
    byBatch.set(item.batchId, list);
  }

  const events: (GroupEvent & { nextDueDate: string })[] = [];
  for (const [batchId, batchItems] of byBatch) {
    const dueDate = mostCommon(batchItems.map((item) => item.dueDate));
    // `dueSoon()` already worked out the day count for that date.
    const days =
      batchItems.find((item) => item.dueDate === dueDate)?.daysUntilDue ?? 0;

    events.push({
      batchId,
      recordType: mostCommon(batchItems.map((item) => item.recordType)),
      title: mostCommon(batchItems.map((item) => item.title)),
      product: mostCommon(batchItems.map((item) => cleanProduct(item.product))),
      dateGiven: mostCommon(batchItems.map((item) => item.dateOccurred ?? null)),
      nextDueDate: dueDate,
      label: mostCommon(batchItems.map((item) => item.batchLabel)) ?? "Group",
      goats: batchItems
        .map((item) => ({
          id: item.goatId,
          tag: item.goatTag,
          name: item.goatName,
        }))
        .sort(byTag),
      dueStatus:
        days < 0 ? "overdue" : days <= GROUP_DUE_SOON_DAYS ? "due_soon" : null,
    });
  }

  return events.sort(
    (a, b) =>
      a.nextDueDate.localeCompare(b.nextDueDate) || a.batchId - b.batchId,
  );
}

/**
 * The group a label names, ignoring an exclusion suffix: "Does (57 of 58)" and
 * "Does" are the same group, "Kids · Barn 2" is a different one.
 */
export function baseGroupLabel(label: string): string {
  return label.replace(/\s*\(\d+ of \d+\)\s*$/, "").trim();
}

/**
 * The ids of group events that have been superseded: a NEWER group event of
 * the same activity has been done for the same group (same
 * {@link baseGroupLabel}). "Newer" is a later date given; on the same date,
 * the later-recorded batch wins.
 *
 * Takes every group event (the Done list — {@link doneGroupEvents}' output),
 * because an event is superseded by what was done later whether or not that
 * later event has a next due date of its own.
 */
export function supersededBatchIds(events: GroupEvent[]): Set<number> {
  const newestByGroup = new Map<string, GroupEvent>();
  const isNewer = (a: GroupEvent, b: GroupEvent) =>
    (a.dateGiven ?? "") > (b.dateGiven ?? "") ||
    ((a.dateGiven ?? "") === (b.dateGiven ?? "") && a.batchId > b.batchId);

  const keyOf = (event: GroupEvent) =>
    `${event.recordType}|${baseGroupLabel(event.label)}`;

  for (const event of events) {
    const current = newestByGroup.get(keyOf(event));
    if (!current || isNewer(event, current)) {
      newestByGroup.set(keyOf(event), event);
    }
  }

  const superseded = new Set<number>();
  for (const event of events) {
    if (newestByGroup.get(keyOf(event))?.batchId !== event.batchId) {
      superseded.add(event.batchId);
    }
  }
  return superseded;
}

/**
 * The Upcoming tab's default view: for each activity and group, its latest
 * next due date — i.e. every upcoming event that has not been superseded.
 * Keeps {@link upcomingGroupEvents}' soonest-first order, so overdue stays at
 * the top.
 */
export function currentUpcoming(
  events: GroupEvent[],
  superseded: Set<number>,
): GroupEvent[] {
  return events.filter((event) => !superseded.has(event.batchId));
}

/**
 * The Upcoming Archive: every event with a next due date. A superseded event
 * is flagged and loses its overdue / due-soon mark — it is history, not
 * something still owed.
 */
export function flagSuperseded(
  events: GroupEvent[],
  superseded: Set<number>,
): GroupEvent[] {
  return events.map((event) =>
    superseded.has(event.batchId)
      ? { ...event, dueStatus: null, superseded: true }
      : event,
  );
}

export interface LatestDoneActivity {
  activity: GroupActivity;
  /** The most recent group event, or null when there has never been one. */
  event: GroupEvent | null;
}

/**
 * The Done tab's default view: for each activity, its most recent group event,
 * however old — or `null` when the activity has never had one, so the page
 * can say "No group deworming yet". Always one entry per activity, in
 * {@link GROUP_ACTIVITIES} order. Expects {@link doneGroupEvents}' output
 * (newest date given first).
 */
export function latestDonePerActivity(
  events: GroupEvent[],
): LatestDoneActivity[] {
  return GROUP_ACTIVITIES.map((activity) => ({
    activity,
    event: events.find((event) => event.recordType === activity) ?? null,
  }));
}

/** The Archive's optional activity filter. */
export function filterByActivity(
  events: GroupEvent[],
  activity: GroupActivity | null,
): GroupEvent[] {
  return activity
    ? events.filter((event) => event.recordType === activity)
    : events;
}

/**
 * The Upcoming Archive's order: newest first, i.e. the latest next due date at
 * the top and the oldest (longest overdue) at the bottom.
 */
export function newestDueFirst(events: GroupEvent[]): GroupEvent[] {
  return [...events].sort(
    (a, b) =>
      (b.nextDueDate ?? "").localeCompare(a.nextDueDate ?? "") ||
      b.batchId - a.batchId,
  );
}

/**
 * Which goats were left out of each bulk action, resolved to goats: batch id →
 * the excluded goats, in tag order. A batch with no exclusions (or whose
 * excluded goats no longer exist) has no entry.
 */
export function excludedGoatsByBatch(
  batches: { id: number; excluded_goat_ids: number[] | null }[],
  goats: GroupEventGoat[],
): Map<number, GroupEventGoat[]> {
  const goatById = new Map(goats.map((goat) => [goat.id, goat]));
  const byBatch = new Map<number, GroupEventGoat[]>();

  for (const batch of batches) {
    const excluded = (batch.excluded_goat_ids ?? [])
      .map((id) => goatById.get(id))
      .filter((goat): goat is GroupEventGoat => goat !== undefined)
      .sort(byTag);
    if (excluded.length > 0) byBatch.set(batch.id, excluded);
  }
  return byBatch;
}

/** A batch row as the Done tab's query returns it. */
export interface BatchWithRecords {
  id: number;
  label: string;
  health_records: {
    record_type: HealthRecordType;
    title: string;
    medication_name: string | null;
    date_occurred: string;
    next_due_date: string | null;
    goats: GroupEventGoat;
  }[];
}

/**
 * The Done tab: one row per batch, newest date given first.
 *
 * A batch with no records left (every record deleted, or a batch whose records
 * never landed) has nothing to report and is dropped. Fields take the value
 * most of the batch's records share, as in {@link upcomingGroupEvents}.
 */
export function doneGroupEvents(batches: BatchWithRecords[]): GroupEvent[] {
  const events: GroupEvent[] = [];

  for (const batch of batches) {
    const records = batch.health_records;
    if (records.length === 0) continue;

    events.push({
      batchId: batch.id,
      recordType: mostCommon(records.map((r) => r.record_type)),
      title: mostCommon(records.map((r) => r.title)),
      product: mostCommon(records.map((r) => cleanProduct(r.medication_name))),
      dateGiven: mostCommon(records.map((r) => r.date_occurred)),
      nextDueDate: mostCommon(records.map((r) => r.next_due_date)),
      label: batch.label,
      goats: records.map((r) => r.goats).sort(byTag),
      dueStatus: null,
    });
  }

  // Newest date given first; the newer batch wins a tie.
  return events.sort(
    (a, b) =>
      (b.dateGiven ?? "").localeCompare(a.dateGiven ?? "") ||
      b.batchId - a.batchId,
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * `2026-09-02` → `2 Sep 2026`. Read straight off the ISO string rather than
 * through `Date`, so the server's timezone can never shift the day.
 */
export function formatIsoDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return "—";
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : "—";
}
