"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  computeNewbornSummary,
  type KidLossGoat,
  type NewbornWindowMonths,
} from "@/lib/dashboard/newborn-periods";

const BAR = "var(--accent-primary)";
const AXIS = "var(--text-muted)";

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

/** "Mar 2026" -> "Mar" — the axis only has room for the abbreviated month. */
function shortLabel(periodLabel: string): string {
  return periodLabel.split(" ")[0];
}

/**
 * UPD-011 refinement round (2026-09-05, owner testing) — back to a standard
 * column chart (bars rising from a baseline, months along the bottom axis)
 * rather than UPD-011's original horizontal-list redesign, which the owner
 * found less readable in practice. The chart's height is capped
 * (`h-36`, 144px) regardless of the 3/6/12-month window, so it stays compact.
 *
 * The "no horizontal scrolling" requirement is met structurally, not by
 * trimming content: Recharts' `ResponsiveContainer` always renders its SVG at
 * exactly its parent's measured width and maps every category into that fixed
 * width — it cannot overflow the container, regardless of how many months are
 * in the window. Legibility at 12 months is kept by (a) dropping the Y axis
 * entirely (the Tooltip carries the exact count; the bar height and a visible
 * sliver for zero-count months carry the at-a-glance read), and (b)
 * abbreviating the X axis to the bare month ("Mar" not "Mar 2026") — the
 * Tooltip's label still shows the full "Mar 2026" on hover/tap.
 *
 * UPD-018 — the one-line "N lost of M born" badge sits at the right end of the
 * title line, no taller than the title, so the header, the controls and the
 * chart are exactly where they were before UPD-018. It depends on the window /
 * end-date state held here, so this component renders the card's header and
 * content itself; the server section passes the static text in.
 *
 * The bars and the badge come out of ONE `computeNewbornSummary` call, fed by
 * the one `windowMonths` / `endDate` state below — there is no second window to
 * drift. The bars leave out kids that died; the badge counts exactly those, so
 * bars + lost = "of M born".
 */
export function NewbornPeriodsChart({
  goats,
  title,
  description,
  caption,
}: {
  goats: KidLossGoat[];
  title: string;
  description: string;
  /** The factual caption under the chart (UPD-007). */
  caption: string;
}) {
  const [windowMonths, setWindowMonths] =
    useState<NewbornWindowMonths>(DEFAULT_WINDOW);
  const [endDate, setEndDate] = useState(todayIso());

  const { buckets: rows, losses } = useMemo(
    () => computeNewbornSummary(goats, windowMonths, parseAnchor(endDate)),
    [goats, windowMonths, endDate],
  );

  const hasLosses = losses.lost > 0;

  return (
    <>
      <CardHeader className="px-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {/* Same box either way, so nothing shifts between 0 and >0 — only
              the colours change: warning when kids were lost, neutral at 0. */}
          <p
            className={cn(
              "shrink-0 rounded-xl border px-2 text-xs leading-5 whitespace-nowrap text-copy-secondary tabular-nums",
              hasLosses
                ? "border-error/30 bg-error/15"
                : "border-surface-border bg-subtle",
            )}
          >
            <span
              className={cn(
                "text-sm leading-none font-bold",
                hasLosses ? "text-error" : "text-copy-primary",
              )}
            >
              {losses.lost}
            </span>{" "}
            lost of {losses.born} born
          </p>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-3">
        <div className="flex min-w-0 flex-col gap-4">
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
                  // The selected range keeps its accent style after focus
                  // moves away; the focus ring stays separate (keyboard only).
                  className="flex-1 aria-pressed:border-brand aria-pressed:bg-accent-dim aria-pressed:text-brand sm:flex-none"
                >
                  {option} months
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="h-36 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="periodLabel"
                  tickFormatter={shortLabel}
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border-default)" }}
                  interval={0}
                  tickMargin={6}
                />
                <YAxis hide domain={[0, "dataMax + 1"]} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--bg-subtle)" }}
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-muted)" }}
                  formatter={(value: unknown) => [
                    `${Number(value)} ${Number(value) === 1 ? "kid" : "kids"}`,
                    "Born",
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill={BAR}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                  // A zero-birth month still draws a 2px sliver so it reads as a
                  // visible "0" on the axis, not a gap (UPD-007 acceptance).
                  minPointSize={2}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-xs text-copy-muted">{caption}</p>
      </CardContent>
    </>
  );
}
