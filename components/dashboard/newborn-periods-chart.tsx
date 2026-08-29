"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
const GRID = "var(--border-default)";
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

/**
 * UPD-007 — "Newborn Kids" bar chart, bucketed by calendar month, with a 3 / 6 /
 * 12-month window selector (default 6) applied backward from a selectable end
 * date (default today; UPD-007 amendment 2026-08-29). Kids born here per month;
 * months with no births render as a visible zero bar, not a gap (that's the
 * whole point). Everything is recomputed client-side from the goat data already
 * on the page, so no reload is needed. Colours come from design tokens, same as
 * the other charts.
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

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
          >
            <CartesianGrid
              stroke={GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="periodLabel"
              stroke={AXIS}
              tick={{ fill: AXIS, fontSize: 11 }}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={AXIS}
              tick={{ fill: AXIS, fontSize: 11 }}
              width={40}
              allowDecimals={false}
              domain={[0, "dataMax + 1"]}
            />
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
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
              // A zero-birth month still draws a 3px sliver so it reads as a
              // visible "0" on the axis, not a gap (UPD-007 acceptance).
              minPointSize={3}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
