// Feature 13 — Calendar. The one function that gathers every dated event the
// app already records into a single list (architecture-context.md — Calendar
// and reminders). Pure: no React, no Supabase.
//
// It only COMBINES the existing helpers. Every date here was worked out
// somewhere else:
//
//   health, done      doneGroupEvents()                     lib/health/group-events.ts
//   health, due       dueSoon() → upcomingGroupEvents()
//                     → supersededBatchIds() / currentUpcoming()
//   single-goat due   dueSoon()                             lib/dashboard/due-soon.ts
//   season estimates  computeBreedingReminders()            lib/breeding/reminders.ts
//   kidding window    computeKiddingWindow()                lib/breeding/kidding-window.ts
//   litters           computeKiddingEvents(), labelLitterSize()
//
// So there is no due-date, kidding-window, batch-grouping or kidding-event
// logic in this file, and there must never be: a rule changed in one of those
// helpers has to show up here without anyone remembering the calendar exists.
//
// Spec 14 adds tasks and the feeding schedule by adding a source and one more
// block below.

import {
  dueSoon,
  type DueSoonItem,
  type DueSoonSourceRecord,
} from "@/lib/dashboard/due-soon";
import {
  GROUP_ACTIVITIES,
  currentUpcoming,
  doneGroupEvents,
  supersededBatchIds,
  upcomingGroupEvents,
  type BatchWithRecords,
} from "@/lib/health/group-events";
import {
  HEALTH_RECORD_TYPE_LABELS,
  type HealthRecordType,
} from "@/lib/health/records";
import { computeKiddingWindow } from "@/lib/breeding/kidding-window";
import { computeBreedingReminders } from "@/lib/breeding/reminders";
import {
  parseDateOnly,
  startOfDay,
  type BreedingSeasonOccurrenceRow,
} from "@/lib/breeding/season";
import type { SeasonTemplate } from "@/lib/breeding/templates";
import {
  computeKiddingEvents,
  labelLitterSize,
  type DoePerformanceGoat,
} from "@/lib/breeding/doe-performance";

export const CALENDAR_CATEGORIES = [
  "health",
  "breeding",
  "births",
  "herd",
] as const;

export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number];

export const CALENDAR_CATEGORY_LABELS: Record<CalendarCategory, string> = {
  health: "Health",
  breeding: "Breeding",
  births: "Births",
  herd: "Herd",
};

export interface CalendarEvent {
  /** Stable and unique across sources, e.g. "batch-12-due". */
  id: string;
  category: CalendarCategory;
  title: string;
  subtitle?: string;
  start: Date;
  /** Only for ranges — the expected kidding window. */
  end?: Date;
  /** A suggestion worked out from a template, not a logged date. */
  isEstimate?: boolean;
  status?: "done" | "due" | "overdue";
  /** Where tapping the event goes. Absent when the entry expands instead. */
  href?: string;
  /**
   * Set only on an entry that folds several single goats together
   * ("Vaccination · 3 goats"), in tag order. The row expands to show them as
   * goat links — collapsed by default, so no tag list shows until tapped.
   */
  goats?: CalendarGoatRef[];
}

/** Just enough of a goat to name it and link to it. */
export interface CalendarGoatRef {
  id: number;
  tag: string;
  name: string | null;
}

/** A `herd_events` row for a goat that left the herd. */
export interface CalendarHerdEvent {
  id: number;
  eventType: "sale" | "death" | "other_removal";
  /** ISO `YYYY-MM-DD`. */
  eventDate: string;
  goat: CalendarGoatRef | null;
}

/** The already-fetched rows, each in the shape its own helper takes. */
export interface CalendarSources {
  /** Bulk health actions with their records — `doneGroupEvents()`'s input. */
  batches: BatchWithRecords[];
  /** Batched records with a next due date — `dueSoon()`'s input. */
  batchDueRecords: DueSoonSourceRecord[];
  /** Single-goat records (no batch) with a next due date. */
  singleDueRecords: DueSoonSourceRecord[];
  templates: SeasonTemplate[];
  occurrences: BreedingSeasonOccurrenceRow[];
  gestationDays: number;
  /** Goats with a recorded dam — `computeKiddingEvents()`'s input. */
  kids: DoePerformanceGoat[];
  /** The dams of those kids, to name them. */
  dams: CalendarGoatRef[];
  herdEvents: CalendarHerdEvent[];
}

/** UPD-008 writes a stolen goat's departure as `other_removal`. */
const HERD_EVENT_TITLES: Record<CalendarHerdEvent["eventType"], string> = {
  sale: "Sale",
  death: "Death",
  other_removal: "Stolen",
};

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** "Deworming · Routine Deworming"; just "Deworming" when the title adds nothing. */
function healthTitle(recordType: HealthRecordType, title: string): string {
  const label = HEALTH_RECORD_TYPE_LABELS[recordType];
  const trimmed = title.trim();
  return !trimmed || trimmed.toLowerCase() === label.toLowerCase()
    ? label
    : `${label} · ${trimmed}`;
}

/** Only deworming, dip wash and vaccination are calendar material. */
function isRoutineActivity(recordType: HealthRecordType): boolean {
  return (GROUP_ACTIVITIES as readonly string[]).includes(recordType);
}

export function buildCalendarEvents(
  sources: CalendarSources,
  rangeStart: Date,
  rangeEnd: Date,
  now: Date,
): CalendarEvent[] {
  const from = startOfDay(rangeStart).getTime();
  const to = startOfDay(rangeEnd).getTime();
  const inRange = (date: Date) => {
    const time = date.getTime();
    return time >= from && time <= to;
  };

  const events: CalendarEvent[] = [];

  // --- Health: group events done ------------------------------------------
  const everyGroupEvent = doneGroupEvents(sources.batches);
  for (const event of everyGroupEvent) {
    if (!isRoutineActivity(event.recordType)) continue;
    const start = parseDateOnly(event.dateGiven);
    if (!start || !inRange(start)) continue;
    events.push({
      id: `batch-${event.batchId}-done`,
      category: "health",
      title: healthTitle(event.recordType, event.title),
      subtitle: `${event.label} · ${plural(event.goats.length, "goat")}`,
      start,
      status: "done",
      href: "/health?tab=done&view=archive",
    });
  }

  // --- Health: group events due — a superseded one is never due -----------
  const everyDue = { now, windowDays: Number.POSITIVE_INFINITY };
  const due = currentUpcoming(
    upcomingGroupEvents(dueSoon(sources.batchDueRecords, everyDue)),
    supersededBatchIds(everyGroupEvent),
  ).filter((event) => isRoutineActivity(event.recordType));
  for (const event of due) {
    const start = parseDateOnly(event.nextDueDate);
    if (!start || !inRange(start)) continue;
    events.push({
      id: `batch-${event.batchId}-due`,
      category: "health",
      title: healthTitle(event.recordType, event.title),
      subtitle: `${event.label} · ${plural(event.goats.length, "goat")}`,
      start,
      status: event.dueStatus === "overdue" ? "overdue" : "due",
      href: "/health?tab=upcoming",
    });
  }

  // --- Health: single-goat routine due dates, one entry per day/type/title -
  const singles = new Map<string, DueSoonItem[]>();
  for (const item of dueSoon(sources.singleDueRecords, everyDue)) {
    if (item.batchId != null || !isRoutineActivity(item.recordType)) continue;
    const key = `${item.dueDate}|${item.recordType}|${item.title.trim().toLowerCase()}`;
    singles.set(key, [...(singles.get(key) ?? []), item]);
  }
  for (const [key, items] of singles) {
    const [first] = items;
    const start = parseDateOnly(first.dueDate);
    if (!start || !inRange(start)) continue;
    const goatIds = new Set(items.map((item) => item.goatId));
    // `dueSoon()` returns its items in tag order; keep each goat once.
    const goats: CalendarGoatRef[] = [...goatIds].map((id) => {
      const item = items.find((candidate) => candidate.goatId === id) ?? first;
      return { id, tag: item.goatTag, name: item.goatName };
    });
    events.push({
      id: `single-due-${key}`,
      category: "health",
      title: healthTitle(first.recordType, first.title),
      subtitle:
        goatIds.size === 1
          ? `Goat ${first.goatTag}`
          : plural(goatIds.size, "goat"),
      start,
      status: first.daysUntilDue < 0 ? "overdue" : "due",
      // One goat links straight to its own card. Several have no page that
      // lists them together, so the entry carries them and expands in place.
      ...(goats.length === 1 ? { href: `/goats/${first.goatId}` } : { goats }),
    });
  }

  // --- Breeding: logged seasons and their expected kidding window ---------
  const templateLabels = new Map(sources.templates.map((t) => [t.id, t.label]));
  for (const season of sources.occurrences) {
    const start = parseDateOnly(season.start_date);
    if (!start) continue;
    const end = parseDateOnly(season.end_date);
    const label =
      season.season_template_id != null
        ? templateLabels.get(season.season_template_id)
        : undefined;
    const bucks =
      season.buck_ids.length > 0
        ? plural(season.buck_ids.length, "buck")
        : undefined;

    if (inRange(start)) {
      events.push({
        id: `season-${season.id}-in`,
        category: "breeding",
        title: label ? `Males in · ${label}` : "Males in",
        subtitle: bucks,
        start,
        href: "/breeding",
      });
    }
    if (end && inRange(end)) {
      events.push({
        id: `season-${season.id}-out`,
        category: "breeding",
        title: label ? `Males out · ${label}` : "Males out",
        subtitle: bucks,
        start: end,
        href: "/breeding",
      });
    }

    const window = computeKiddingWindow(start, end, sources.gestationDays);
    if (window.end) {
      if (window.start.getTime() <= to && window.end.getTime() >= from) {
        events.push({
          id: `season-${season.id}-kidding`,
          category: "breeding",
          title: "Expected kidding window",
          subtitle: label,
          start: window.start,
          end: window.end,
          href: "/breeding",
        });
      }
    } else if (inRange(window.start)) {
      // The bucks are still in, so the window has no end yet.
      events.push({
        id: `season-${season.id}-kidding`,
        category: "breeding",
        title: "Expected kidding begins",
        subtitle: label,
        start: window.start,
        isEstimate: true,
        href: "/breeding",
      });
    }
  }

  // --- Breeding: estimates. A reminder with a real logged date is already
  // on the calendar as that season's "Males out".
  const reminders = computeBreedingReminders(
    sources.templates,
    sources.occurrences,
    now,
  );
  for (const reminder of reminders) {
    if (!reminder.isEstimate || !inRange(reminder.dueDate)) continue;
    events.push({
      id: `reminder-${reminder.type}-${reminder.templateId ?? "adhoc"}`,
      category: "breeding",
      title: reminder.label,
      start: reminder.dueDate,
      isEstimate: true,
      href: "/breeding",
    });
  }

  // --- Births: one entry per dam per kidding ------------------------------
  const dams = new Map(sources.dams.map((dam) => [dam.id, dam]));
  const damIds = new Set<number>();
  for (const kid of sources.kids) {
    if (kid.dam_id != null) damIds.add(kid.dam_id);
  }
  for (const damId of damIds) {
    const dam = dams.get(damId);
    for (const kidding of computeKiddingEvents(sources.kids, damId)) {
      if (!inRange(kidding.date)) continue;
      const size = labelLitterSize(kidding.kidCount);
      events.push({
        id: `kidding-${damId}-${kidding.date.getTime()}`,
        category: "births",
        title: "Kids born",
        subtitle: dam ? `${size} · dam ${dam.tag}` : size,
        start: kidding.date,
        href: `/goats/${damId}`,
      });
    }
  }

  // --- Herd: sale, death, stolen ------------------------------------------
  for (const herdEvent of sources.herdEvents) {
    const start = parseDateOnly(herdEvent.eventDate);
    if (!start || !inRange(start)) continue;
    events.push({
      id: `herd-${herdEvent.id}`,
      category: "herd",
      title: HERD_EVENT_TITLES[herdEvent.eventType],
      subtitle: herdEvent.goat ? `Goat ${herdEvent.goat.tag}` : undefined,
      start,
      href: herdEvent.goat ? `/goats/${herdEvent.goat.id}` : "/",
    });
  }

  return events.sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() ||
      CALENDAR_CATEGORIES.indexOf(a.category) -
        CALENDAR_CATEGORIES.indexOf(b.category) ||
      a.id.localeCompare(b.id),
  );
}
