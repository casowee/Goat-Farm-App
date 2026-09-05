// UPD-012 — the serialised view model the Doe Performance UI renders, plus the
// pure mapper that builds it from a computed `DoePerformance` + the doe's notes
// and health records. No React, no Supabase — shared by the Doe Performance tab
// (`/breeding/doe-performance`) and a doe's Breeding tab on the goat detail page
// (2026-09-05 amendment), so both assemble the exact same shape and render the
// exact same `DoeCard`.
//
// Every duration is formatted with `formatAge()` (years + months) — never a
// bare month count — matching the display fix from the 2026-09-05 amendment.

import { formatAge } from "@/lib/goats/age";
import {
  DOE_PERFORMANCE_CATEGORY_LABELS,
  type DoePerformance,
  type DoePerformanceCategory,
  type DoePerformanceFlag,
} from "@/lib/breeding/doe-performance";
import {
  HEALTH_RECORD_TYPE_LABELS,
  type HealthRecordType,
} from "@/lib/health/records";

/** How many of a doe's most recent health records to show for context. */
export const RECENT_HEALTH_LIMIT = 5;

export interface DoePerformanceRow {
  doeId: number;
  doeLabel: string;
  tag: string;
  name: string | null;
  ageMonths: number;
  ageLabel: string;
  flags: DoePerformanceFlag[];
  lastKiddingLabel: string | null;
  monthsSinceLastKidding: number | null;
  lastKiddingAgoLabel: string | null;
  averageIntervalMonths: number | null;
  averageIntervalLabel: string | null;
  kiddingEvents: { dateLabel: string; kidCount: number }[];
  healthRecords: {
    id: number;
    typeLabel: string;
    title: string;
    dateLabel: string;
    status: string;
  }[];
  notes: {
    id: number;
    categoryLabel: string;
    note: string | null;
    createdAtLabel: string;
  }[];
}

export interface DoePerformanceNoteInput {
  id: number;
  category: DoePerformanceCategory;
  note: string | null;
  created_at: string;
}

export interface DoePerformanceHealthInput {
  id: number;
  record_type: string;
  title: string;
  date_occurred: string;
  status: string;
}

function fmtDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Build the row from a computed `DoePerformance`, the doe's tag/name, her notes
 * (already ordered newest-first) and her health records (already ordered
 * newest-first — the first `RECENT_HEALTH_LIMIT` are kept).
 */
export function toDoePerformanceRow(
  performance: DoePerformance,
  goat: { tag: string; name: string | null },
  noteRows: DoePerformanceNoteInput[],
  healthRecords: DoePerformanceHealthInput[],
): DoePerformanceRow {
  const lastEvent =
    performance.kiddingEvents.length > 0
      ? performance.kiddingEvents[performance.kiddingEvents.length - 1]
      : null;

  return {
    doeId: performance.doeId,
    doeLabel: performance.doeLabel,
    tag: goat.tag,
    name: goat.name,
    ageMonths: performance.ageMonths,
    ageLabel: formatAge(performance.ageMonths),
    flags: performance.flags,
    lastKiddingLabel: lastEvent ? fmtDate(lastEvent.date) : null,
    monthsSinceLastKidding: performance.monthsSinceLastKidding,
    lastKiddingAgoLabel:
      performance.monthsSinceLastKidding !== null
        ? formatAge(performance.monthsSinceLastKidding)
        : null,
    averageIntervalMonths: performance.averageIntervalMonths,
    averageIntervalLabel:
      performance.averageIntervalMonths !== null
        ? formatAge(performance.averageIntervalMonths)
        : null,
    kiddingEvents: performance.kiddingEvents.map((e) => ({
      dateLabel: fmtDate(e.date),
      kidCount: e.kidCount,
    })),
    healthRecords: healthRecords.slice(0, RECENT_HEALTH_LIMIT).map((h) => ({
      id: h.id,
      typeLabel:
        HEALTH_RECORD_TYPE_LABELS[h.record_type as HealthRecordType] ??
        h.record_type,
      title: h.title,
      dateLabel: fmtDate(h.date_occurred),
      status: h.status,
    })),
    notes: noteRows.map((n) => ({
      id: n.id,
      categoryLabel: DOE_PERFORMANCE_CATEGORY_LABELS[n.category],
      note: n.note,
      createdAtLabel: fmtDate(n.created_at),
    })),
  };
}
