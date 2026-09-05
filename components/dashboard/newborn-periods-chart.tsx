"use client";

import { useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  computeNewbornsByPeriod,
  type NewbornPeriodGoat,
  type NewbornWindowMonths,
} from "@/lib/dashboard/newborn-periods";

const WINDOW_OPTIONS: NewbornWindowMonths[] = [3, 6, 12];
const DEFAULT_WINDOW: NewbornWindowMonths = 6;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse a `YYYY-MM-DD` string to a local Date; falls back to today if unusable. */
function parseAnchor(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * UPD-011 (11b) — "Newborn Kids" as a compact vertical list rather than a
 * Recharts bar chart: one row per month, a small inline horizontal bar, and
 * the count. A taller list as more months are selected, but the width never
 * changes — so no horizontal scrolling is possible at any window length or
 * end date, by construction (unlike a bar chart, which gets cramped or needs
 * to scroll as the number of bars grows). Zero-count months still render as a
 * visible row (near-empty bar, explicit "0") — the rule UPD-007 established.
 * Period selector, end-date picker and the factual caption are unchanged from
 * UPD-007.
 */
export function NewbornPeriodsChart({ goats }: { goats: NewbornPeriodGoat[] }) {
  const [windowMonths, setWindowMonths] =
    useState<NewbornWindowMonths>(DEFAULT_WINDOW);
  const [endDate, setEndDate] = useState(todayIso());

  const rows = useMemo(
    () => computeNewbornsByPeriod(goats, windowMonths, parseAnchor(endDate)),
    [goats, windowMonths, endDate],
  );

  // Scale every bar against the largest count currently visible, not a fixed
  // constant — so the list stays legible whether the busiest month had 2 kids
  // or 20. Falls back to 1 when every visible month is zero, so all bars
  // render empty rather than dividing by zero.
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="newborn-end-date"
            className="text-xs text-copy-muted"
          >
            End date
          </label>
          <Input
            id="newborn-end-date"
            type="date"
            className="w-40"
            max={todayIso()}
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value || todayIso())
            }
          />
        </div>

        <ToggleGroup
          value={[String(windowMonths)]}
          onValueChange={(values) => {
            const next = Number(values[0]) as NewbornWindowMonths;
            if (WINDOW_OPTIONS.includes(next)) setWindowMonths(next);
          }}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {WINDOW_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={String(option)}
              className="flex-1 sm:flex-none"
            >
              {option} months
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const widthPct = (row.count / maxCount) * 100;
          return (
            <li
              key={row.periodLabel}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-16 shrink-0 text-xs text-copy-muted">
                {row.periodLabel}
              </span>
              <span className="h-2.5 flex-1 min-w-0 overflow-hidden rounded-full bg-subtle">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${widthPct}%` }}
                  aria-hidden
                />
              </span>
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-copy-secondary">
                {row.count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
