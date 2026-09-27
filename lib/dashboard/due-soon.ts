// Feature 12 — Dashboard & Analytics. Pure "what health follow-ups are coming
// up" logic: no React, no Supabase, no dashboard-specific rendering concerns, so
// spec 13 (calendar) can reuse it verbatim for its unified due-date list
// (architecture-context.md — Derived: Calendar events / Reminders).
//
// Works over the real shape spec 07 built: one `health_records` table with a
// `record_type` enum and a `next_due_date` column (Task 1, confirmed
// 2026-08-29) — not the original sketch's separate vaccinations/dewormings
// tables.

import type { HealthRecordStatus, HealthRecordType } from "@/lib/health/records";

/** Default 30 days — confirmed by the owner 2026-08-29 (Spec 12, Section 13). */
export const DEFAULT_DUE_SOON_WINDOW_DAYS = 30;

/**
 * UPD-016 — the Health page Schedule tab's default window: 90 days, owner-
 * confirmed. The dashboard keeps its 30-day preview ({@link
 * DEFAULT_DUE_SOON_WINDOW_DAYS}); the Schedule tab is the dedicated planning
 * view, so it opens a full quarter ahead. Both call the same {@link dueSoon}
 * below with a different `windowDays` — there is deliberately no second
 * implementation of this computation.
 */
export const SCHEDULE_DUE_WINDOW_DAYS = 90;

/** The lookahead windows the Schedule tab offers (UPD-016, owner-confirmed). */
export const DUE_WINDOW_OPTIONS = [30, 60, 90] as const;

export type DueWindowOption = (typeof DUE_WINDOW_OPTIONS)[number];

/**
 * Narrow a `?window=` search param to one of the offered windows, falling back
 * to {@link SCHEDULE_DUE_WINDOW_DAYS}. Kept here beside the options themselves
 * so the URL can never select a window the selector cannot show.
 */
export function parseDueWindow(value: string | undefined): DueWindowOption {
  const parsed = Number(value);
  return (DUE_WINDOW_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as DueWindowOption)
    : SCHEDULE_DUE_WINDOW_DAYS;
}

/** One health record, flattened with just enough of its goat to render a row. */
export interface DueSoonSourceRecord {
  goatId: number;
  goatTag: string;
  goatName: string | null;
  recordType: HealthRecordType;
  title: string;
  nextDueDate: string | null;
  status: HealthRecordStatus;
}

export interface DueSoonItem {
  goatId: number;
  goatTag: string;
  goatName: string | null;
  recordType: HealthRecordType;
  title: string;
  /** The `next_due_date` value, unchanged (an ISO `YYYY-MM-DD` string). */
  dueDate: string;
  /** Whole days from `now` (date-only) to the due date. Negative = overdue. */
  daysUntilDue: number;
}

export interface DueSoonOptions {
  now?: Date;
  windowDays?: number;
  /**
   * Whether to include items whose due date has already passed. Defaults to
   * `true` — an overdue vaccination is exactly what a dashboard should surface,
   * and the calendar wants past-due events too.
   */
  includeOverdue?: boolean;
}

const MS_PER_DAY = 86_400_000;

/** Parse a `YYYY-MM-DD` (or longer ISO) string to a local-midnight Date. */
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Health follow-ups coming due within `windowDays`, soonest-first.
 *
 * Type-agnostic by design: every record carrying a `next_due_date` is
 * considered, which is why UPD-016's `dip_wash` needed no change here — adding
 * it to `FOLLOW_UP_RECORD_TYPES` (so the form offers the next-due-date field) is
 * enough for dip washes to appear in both the dashboard's Due soon widget and
 * the Health page's Schedule tab. In practice that means vaccination,
 * deworming, dip wash and checkup. Cancelled records are excluded; every other
 * status is kept, because `completed` is the normal state for a one-off event
 * that still has a next-due date. Ties break on the goat's tag.
 */
export function dueSoon(
  records: DueSoonSourceRecord[],
  options: DueSoonOptions = {},
): DueSoonItem[] {
  const {
    now = new Date(),
    windowDays = DEFAULT_DUE_SOON_WINDOW_DAYS,
    includeOverdue = true,
  } = options;

  const today = startOfDay(now);
  const horizon = today.getTime() + windowDays * MS_PER_DAY;

  const items: DueSoonItem[] = [];

  for (const record of records) {
    if (!record.nextDueDate) continue;
    if (record.status === "cancelled") continue;

    const due = parseDateOnly(record.nextDueDate);
    if (!due) continue;

    const dueTime = due.getTime();
    if (dueTime > horizon) continue;
    if (!includeOverdue && dueTime < today.getTime()) continue;

    items.push({
      goatId: record.goatId,
      goatTag: record.goatTag,
      goatName: record.goatName,
      recordType: record.recordType,
      title: record.title,
      dueDate: record.nextDueDate,
      daysUntilDue: Math.round((dueTime - today.getTime()) / MS_PER_DAY),
    });
  }

  items.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) || a.goatTag.localeCompare(b.goatTag),
  );

  return items;
}
