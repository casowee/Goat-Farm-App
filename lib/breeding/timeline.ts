// Feature 09 — Breeding (Seasonal, Farm-Wide). Pure "which of the next ~12
// months are 'bucks in' and which fall in an expected kidding window" maths for
// the seasonal timeline widget (09-breeding.md Section 7). No React, no
// Supabase.

import type { BreedingSettings } from "@/lib/breeding/settings";
import { computeKiddingWindow } from "@/lib/breeding/kidding-window";
import { monthName } from "@/lib/breeding/settings";
import {
  addMonths,
  parseDateOnly,
  type BreedingSeasonOccurrenceRow,
} from "@/lib/breeding/season";
import type { SeasonTemplate } from "@/lib/breeding/templates";

export interface SeasonTimelineMonth {
  year: number;
  /** 1-12. */
  month: number;
  /** "March 2026". */
  label: string;
  /** "Mar". */
  shortLabel: string;
  /** A logged season has the bucks with the herd during this month. */
  malesIn: boolean;
  /** The template label of the season covering this month, when it has one. */
  malesInLabel?: string;
  /** This month falls inside an expected kidding window. */
  kidding: boolean;
  /**
   * The only kidding windows touching this month are estimated (their season
   * has no logged end date yet). `false` when at least one confirmed window
   * also covers the month.
   */
  kiddingEstimate: boolean;
  /**
   * No logged season covers this month, but it is one of the farm's template
   * start months — a faint "you usually start a season now" hint.
   */
  suggested: boolean;
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function computeSeasonalTimeline(
  settings: Pick<BreedingSettings, "gestation_days">,
  templates: SeasonTemplate[],
  occurrences: BreedingSeasonOccurrenceRow[],
  now: Date,
  months = 12,
): SeasonTimelineMonth[] {
  const templateLabelById = new Map(templates.map((t) => [t.id, t.label]));
  const startMonths = new Set(
    templates
      .map((t) => t.start_month)
      .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12),
  );

  const parsed = occurrences
    .map((occ) => {
      const start = parseDateOnly(occ.start_date);
      if (!start) return null;
      const end = parseDateOnly(occ.end_date);
      const window = computeKiddingWindow(start, end, settings.gestation_days);
      const linkedLength =
        occ.season_template_id != null
          ? (templates.find((t) => t.id === occ.season_template_id)
              ?.length_months ?? null)
          : null;
      // A confirmed season's kidding window ends at `window.end`. An OPEN season
      // linked to a template is capped by that template's length; an open
      // ad-hoc season (no template, no length anywhere) is treated as
      // open-ended — no fabricated fallback.
      const kidEnd = end
        ? window.end!.getTime()
        : linkedLength != null
          ? computeKiddingWindow(
              addMonths(start, linkedLength),
              null,
              settings.gestation_days,
            ).start.getTime()
          : Number.MAX_SAFE_INTEGER;
      return {
        start: start.getTime(),
        end: (end ?? start).getTime(),
        openEnded: end === null,
        kidStart: window.start.getTime(),
        kidEnd,
        confirmed: end !== null,
        templateLabel:
          occ.season_template_id != null
            ? templateLabelById.get(occ.season_template_id)
            : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const result: SeasonTimelineMonth[] = [];
  const base = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let i = 0; i < months; i += 1) {
    const first = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const last = new Date(base.getFullYear(), base.getMonth() + i + 1, 0);
    const mStart = first.getTime();
    const mEnd = last.getTime();
    const month = first.getMonth() + 1;

    let malesIn = false;
    let malesInLabel: string | undefined;
    let kidding = false;
    let kiddingConfirmed = false;

    for (const occ of parsed) {
      const occEnd = occ.openEnded ? mEnd : occ.end;
      if (overlaps(occ.start, occEnd, mStart, mEnd)) {
        malesIn = true;
        if (occ.templateLabel && !malesInLabel) malesInLabel = occ.templateLabel;
      }
      if (overlaps(occ.kidStart, occ.kidEnd, mStart, mEnd)) {
        kidding = true;
        if (occ.confirmed) kiddingConfirmed = true;
      }
    }

    result.push({
      year: first.getFullYear(),
      month,
      label: `${monthName(month)} ${first.getFullYear()}`,
      shortLabel: monthName(month).slice(0, 3),
      malesIn,
      malesInLabel,
      kidding,
      kiddingEstimate: kidding && !kiddingConfirmed,
      suggested: !malesIn && startMonths.has(month),
    });
  }

  return result;
}
