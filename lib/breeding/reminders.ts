// Feature 09 — Breeding (Seasonal, Farm-Wide). Pure "what buck in/out reminders
// are coming up?" logic (09-breeding.md Section 9). No React, no Supabase, no
// rendering concerns — the dashboard merges these into the existing "Due soon"
// widget's combined list, and the Breeding page reuses the `introduce_males`
// ones (with a wider look-ahead) as its "Approve season" prompts.

import {
  addMonths,
  currentSeason,
  parseDateOnly,
  startOfDay,
  type BreedingSeasonOccurrenceRow,
} from "@/lib/breeding/season";
import {
  upcomingTemplateStart,
  type SeasonTemplate,
} from "@/lib/breeding/templates";

export interface BreedingReminder {
  type: "introduce_males" | "remove_males";
  label: string;
  dueDate: Date;
  /** `true` when there is no real logged date yet — only a suggestion. */
  isEstimate: boolean;
  /** Set on every `introduce_males` reminder, and on a templated `remove_males`. */
  templateId?: number;
}

export function computeBreedingReminders(
  templates: SeasonTemplate[],
  occurrences: BreedingSeasonOccurrenceRow[],
  now: Date,
): BreedingReminder[] {
  const reminders: BreedingReminder[] = [];
  const active = currentSeason(occurrences, now);

  if (active) {
    // A season is on. The next thing to do is take the bucks out.
    const linked =
      active.season_template_id != null
        ? templates.find((t) => t.id === active.season_template_id)
        : undefined;
    const removeLabel = linked
      ? `End ${linked.label} — take the bucks out`
      : "Take the bucks out";

    const realEnd = parseDateOnly(active.end_date);
    if (realEnd) {
      // A real end date is logged — prefer it over any estimate (templated or
      // not). Since the season covers `now`, it is today or later.
      reminders.push({
        type: "remove_males",
        label: removeLabel,
        dueDate: realEnd,
        isEstimate: false,
        templateId: active.season_template_id ?? undefined,
      });
    } else if (linked) {
      // No real end date, but linked to a template — estimate from its length.
      const start = parseDateOnly(active.start_date);
      if (start) {
        reminders.push({
          type: "remove_males",
          label: removeLabel,
          dueDate: addMonths(start, linked.length_months),
          isEstimate: true,
          templateId: active.season_template_id ?? undefined,
        });
      }
    }
    // Ad hoc (no template) + no end date → NO remove_males reminder. The schema
    // has no per-occurrence season length, so there is nothing to estimate from
    // and we do not invent a fallback. The owner enters a real end date.

    // While any season is active, no "introduce" reminders (you don't bring a
    // new buck in mid-season).
    return reminders;
  }

  // No season active. One `introduce_males` per template that hasn't already
  // been approved for its upcoming cycle (no linked occurrence with a start
  // date today-or-later).
  const today = startOfDay(now).getTime();
  for (const template of templates) {
    const alreadyApproved = occurrences.some((occ) => {
      if (occ.season_template_id !== template.id) return false;
      const start = parseDateOnly(occ.start_date);
      return start !== null && start.getTime() >= today;
    });
    if (alreadyApproved) continue;

    reminders.push({
      type: "introduce_males",
      label: `Start ${template.label} — bring the bucks in`,
      dueDate: upcomingTemplateStart(template.start_month, now),
      isEstimate: true,
      templateId: template.id,
    });
  }

  return reminders;
}
