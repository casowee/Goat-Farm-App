import type { SeasonTimelineMonth } from "@/lib/breeding/timeline";

/**
 * Feature 09 (Task 4) — the seasonal timeline, Breeding page only. A compact,
 * vertical, no-horizontal-scroll list of the next ~12 months: which are
 * "buck in" (from logged seasons, or a faint suggestion from the typical
 * season-start months) and which fall inside an expected kidding window.
 *
 * Vertical by construction — one row per month, wrapping chips — so it never
 * needs sideways scrolling on a phone, matching the visual language of the
 * dashboard's compact charts.
 */
export function SeasonTimeline({ months }: { months: SeasonTimelineMonth[] }) {
  const hasAnything = months.some(
    (m) => m.malesIn || m.kidding || m.suggested,
  );

  return (
    <div className="flex min-w-0 flex-col">
      {months.map((m) => (
        <div
          key={`${m.year}-${m.month}`}
          className="flex items-center gap-3 border-t border-surface-border py-2 first:border-t-0 first:pt-0"
        >
          <span className="w-24 shrink-0 text-sm text-copy-secondary">
            {m.shortLabel} {m.year}
          </span>
          <div className="flex flex-1 flex-wrap gap-1.5">
            {m.malesIn && (
              <span className="rounded-lg bg-accent-dim px-2 py-0.5 text-xs text-brand">
                {m.malesInLabel ?? "Bucks in"}
              </span>
            )}
            {m.suggested && (
              <span className="rounded-lg border border-dashed border-surface-border px-2 py-0.5 text-xs text-copy-muted">
                Season usually starts
              </span>
            )}
            {m.kidding && (
              <span className="rounded-lg bg-accent-secondary-dim px-2 py-0.5 text-xs text-copy-secondary">
                {m.kiddingEstimate ? "Kidding expected (est.)" : "Kidding expected"}
              </span>
            )}
            {!m.malesIn && !m.kidding && !m.suggested && (
              <span className="text-xs text-copy-faint">—</span>
            )}
          </div>
        </div>
      ))}

      {!hasAnything && (
        <p className="pt-3 text-sm text-copy-muted">
          Nothing scheduled yet. Log a breeding season, or set your typical
          season months in settings, to fill in the next 12 months.
        </p>
      )}
    </div>
  );
}
