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
import { formatKg, type WeightPoint } from "@/lib/weight/weights";

// Colours come from the design tokens (app/globals.css :root), not raw hex or
// the default Recharts palette — Spec 08 Section 8. SVG stroke/fill accept
// CSS custom properties directly.
const LINE = "var(--accent-primary)";
const GRID = "var(--border-default)";
const AXIS = "var(--text-muted)";

/**
 * A goat's weight over time. Expects points oldest-first (as
 * `listWeightsByGoat` returns them). Renders nothing when there are no points —
 * the caller shows an empty state instead.
 */
export function WeightGrowthChart({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) return null;

  const data = points.map((p) => ({
    date: p.weighed_on,
    kg: p.weight_kg,
  }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke={AXIS}
            tick={{ fill: AXIS, fontSize: 11 }}
            tickMargin={8}
            minTickGap={28}
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
              "Weight",
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
