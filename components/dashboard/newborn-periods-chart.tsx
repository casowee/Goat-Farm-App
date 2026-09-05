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
  computeNewbornsByPeriod,
  type NewbornPeriodGoat,
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
 */
export function NewbornPeriodsChart({ goats }: { goats: NewbornPeriodGoat[] }) {
  const [windowMonths, setWindowMonths] =
    useState<NewbornWindowMonths>(DEFAULT_WINDOW);
  const [endDate, setEndDate] = useState(todayIso());

  const rows = useMemo(
    () => computeNewbornsByPeriod(goats, windowMonths, parseAnchor(endDate)),
    [goats, windowMonths, endDate],
  );

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

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
  );
}
