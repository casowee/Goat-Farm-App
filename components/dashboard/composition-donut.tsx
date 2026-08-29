"use client";

import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";

// The project's chart palette (app/globals.css --chart-1..5), plus one mixed
// tint so all six goat stages stay distinguishable. Tokens only — no raw hex.
const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "color-mix(in oklch, var(--chart-1) 45%, var(--bg-surface))",
];

export interface DonutSlice {
  name: string;
  value: number;
}

interface CompositionDonutProps {
  data: DonutSlice[];
  /** Small caption under the big number in the middle of the ring. */
  centerLabel: string;
}

/**
 * UPD-006 6a — a donut chart (Recharts `PieChart` with an inner radius) with the
 * total shown in the centre and a legend underneath. Used for herd composition
 * by stage and for the sex ratio. Zero-value slices are dropped so the legend
 * stays short.
 */
export function CompositionDonut({ data, centerLabel }: CompositionDonutProps) {
  const slices = data.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-copy-muted">
        No goats in this view yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--bg-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice, index) => (
                <Cell
                  key={slice.name}
                  fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                color: "var(--text-primary)",
                fontSize: 12,
              }}
              itemStyle={{ color: "var(--text-primary)" }}
              formatter={(value: unknown, name: unknown) => [
                `${Number(value)} (${Math.round((Number(value) / total) * 100)}%)`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-copy-primary">
            {total}
          </span>
          <span className="text-[0.65rem] tracking-wide text-copy-muted uppercase">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {slices.map((slice, index) => (
          <li
            key={slice.name}
            className="flex items-center gap-1.5 text-xs text-copy-secondary"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
            />
            {slice.name}
            <span className="tabular-nums text-copy-muted">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
