"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKg } from "@/lib/weight/weights";
import type { MonthlyWeightAverage } from "@/lib/dashboard/weight-trend";

// Colours come from the design tokens (app/globals.css :root), same as
// components/weight/weight-growth-chart.tsx — SVG stroke/fill take CSS custom
// properties directly.
const LINE = "var(--accent-primary)";
const GRID = "var(--border-default)";
const AXIS = "var(--text-muted)";

/**
 * Farm-wide average recorded weight per month. Expects months oldest-first (as
 * `computeMonthlyWeightAverages` returns them). Renders nothing when empty — the
 * dashboard shows its own empty state instead.
 */
export function WeightTrendChart({ data }: { data: MonthlyWeightAverage[] }) {
  if (data.length === 0) return null;

  const rows = data.map((point) => ({ label: point.label, kg: point.averageKg }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke={AXIS}
            tick={{ fill: AXIS, fontSize: 11 }}
            tickMargin={8}
            minTickGap={20}
          />
          <YAxis
            stroke={AXIS}
            tick={{ fill: AXIS, fontSize: 11 }}
            width={48}
            domain={["dataMin - 2", "dataMax + 2"]}
            tickFormatter={(v: number) => formatKg(Number(v))}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: 12,
              color: "var(--text-primary)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text-muted)" }}
            formatter={(value: unknown) => [
              `${formatKg(Number(value))} kg`,
              "Average weight",
            ]}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke={LINE}
            strokeWidth={2}
            dot={{ r: 3, fill: LINE, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
