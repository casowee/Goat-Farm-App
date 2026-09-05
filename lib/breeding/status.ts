// Feature 09 — Breeding (Seasonal, Farm-Wide). Pure "is a breeding season on
// right now?" logic for the dashboard's compact status line (09-breeding.md
// Section 9). No React, no Supabase.

import {
  currentSeason,
  parseDateOnly,
  type BreedingSeasonOccurrenceRow,
} from "@/lib/breeding/season";
import {
  upcomingTemplateStart,
  type SeasonTemplate,
} from "@/lib/breeding/templates";

export interface CurrentSeasonStatus {
  active: boolean;
  /**
   * The active season's buck tag(s), joined ("Thor, Zeus"), when a season is
   * currently active and at least one tag is known.
   */
  buckLabel?: string;
  /** The active season's start date. */
  startedOn?: Date;
  /** When no season is active: the soonest template's next start. */
  nextSeasonEstimate?: Date;
  /** That template's label. */
  nextSeasonLabel?: string;
}

export function computeCurrentSeasonStatus(
  templates: SeasonTemplate[],
  occurrences: BreedingSeasonOccurrenceRow[],
  now: Date,
): CurrentSeasonStatus {
  const active = currentSeason(occurrences, now);

  if (active) {
    const startedOn = parseDateOnly(active.start_date);
    const tags = (active.buck_tags ?? []).filter((t) => t.trim().length > 0);
    return {
      active: true,
      buckLabel: tags.length > 0 ? tags.join(", ") : undefined,
      startedOn: startedOn ?? undefined,
    };
  }

  // Soonest upcoming template start.
  let soonest: { date: Date; label: string } | null = null;
  for (const template of templates) {
    const date = upcomingTemplateStart(template.start_month, now);
    if (!soonest || date.getTime() < soonest.date.getTime()) {
      soonest = { date, label: template.label };
    }
  }

  return {
    active: false,
    nextSeasonEstimate: soonest?.date,
    nextSeasonLabel: soonest?.label,
  };
}
