import type { ReactNode } from "react";
import { computeKiddingWindow } from "@/lib/breeding/kidding-window";
import { addMonths, parseDateOnly } from "@/lib/breeding/season";
import type { EligibleMale } from "@/lib/breeding/eligible-males";
import type { SeasonTemplate } from "@/lib/breeding/templates";

// The read-only summary of one breeding season occurrence — heading, dates,
// linked bucks, computed kidding window, suggested buck-out, and note. Shared by
// the Breeding page's own season list (with edit/delete in `actions`) and a
// buck's Breeding tab on the goat detail page (no actions). One rendering, not
// two (UPD-012 amendment 2026-09-05 — integration of 09 + 012 into the goat
// profile).

export interface SeasonSummary {
  id: number;
  start_date: string;
  end_date: string | null;
  note: string | null;
  season_template_id: number | null;
  barn_id: number | null;
}

function fmtDate(value: string | Date | null): string {
  const parsed = value instanceof Date ? value : parseDateOnly(value);
  if (!parsed) return "—";
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtWindow(start: Date, end: Date | null): string {
  return end
    ? `${fmtDate(start)} – ${fmtDate(end)}`
    : `from ${fmtDate(start)} (open-ended)`;
}

/** "TAG — Name", or just "TAG" when there is no name. */
export function seasonBuckLabel(male: EligibleMale): string {
  return male.name ? `${male.tag} — ${male.name}` : male.tag;
}

export function SeasonSummaryCard({
  season,
  bucks,
  template,
  barnName,
  gestationDays,
  actions,
}: {
  season: SeasonSummary;
  bucks: EligibleMale[];
  template?: SeasonTemplate;
  barnName?: string | null;
  gestationDays: number;
  actions?: ReactNode;
}) {
  const start = parseDateOnly(season.start_date);
  const end = parseDateOnly(season.end_date);
  const window = start
    ? computeKiddingWindow(start, end, gestationDays)
    : null;
  const bucksLabel =
    bucks.length > 0
      ? bucks.map(seasonBuckLabel).join(", ")
      : "No bucks on record";
  const heading = template
    ? `${template.label}${start ? ` — ${start.getFullYear()}` : ""}`
    : bucksLabel;
  const suggestedBuckOut =
    season.end_date === null && template && start
      ? fmtDate(addMonths(start, template.length_months))
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-copy-primary">
            {heading}
            {season.end_date === null && (
              <span className="ml-2 rounded-lg bg-accent-dim px-2 py-0.5 text-xs text-brand">
                Bucks in
              </span>
            )}
          </p>
          <p className="text-xs text-copy-muted">
            {template ? `${bucksLabel} · ` : ""}
            {fmtDate(season.start_date)} →{" "}
            {season.end_date ? fmtDate(season.end_date) : "still with the herd"}
            {barnName ? ` · ${barnName}` : ""}
          </p>
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
      {window && (
        <p className="text-xs text-copy-secondary">
          Kidding expected:{" "}
          <span className="text-copy-primary">
            {fmtWindow(window.start, window.end)}
          </span>
        </p>
      )}
      {suggestedBuckOut && (
        <p className="text-xs text-copy-muted">
          Suggested buck-out:{" "}
          <span className="text-copy-secondary">{suggestedBuckOut}</span> (add
          the real date when they come out)
        </p>
      )}
      {season.note && (
        <p className="text-xs text-copy-muted">{season.note}</p>
      )}
    </div>
  );
}
