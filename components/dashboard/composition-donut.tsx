"use client";

import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type PieLabelRenderProps,
} from "recharts";

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

// UPD-011 (refinement round 3) — below this share of the total, a slice's
// arc is too thin to hold readable text inside it, so its count is drawn
// outside the ring with a short leader line instead.
const OUTSIDE_LABEL_THRESHOLD = 0.12;
const RADIAN = Math.PI / 180;

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
 * Renders each slice's count directly on the chart — no click/hover/tap
 * needed to read it (UPD-011 refinement round 3). Slices big enough to hold
 * text render the count inside the arc; thin slices (e.g. a 4-goat Wethers
 * sliver next to a 58-goat Does majority) render it just outside the ring
 * with a short leader line, the standard readable pattern for small pie
 * segments — cramming text into a sliver that thin just overlaps the
 * neighbouring slice.
 */
function renderSliceLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = props.midAngle ?? 0;
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = props.percent ?? 0;
  const value = Number(props.value ?? 0);
  if (!value) return null;

  const angle = -midAngle * RADIAN;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  if (percent < OUTSIDE_LABEL_THRESHOLD) {
    const bendRadius = outerRadius + 10;
    const labelRadius = outerRadius + 18;
    const sx = cx + (outerRadius + 2) * cos;
    const sy = cy + (outerRadius + 2) * sin;
    const bx = cx + bendRadius * cos;
    const by = cy + bendRadius * sin;
    const lx = cx + labelRadius * cos;
    const ly = cy + labelRadius * sin;
    const textAnchor = cos >= 0 ? "start" : "end";

    return (
      <g>
        <path
          d={`M${sx},${sy}L${bx},${by}L${lx},${ly}`}
          stroke="var(--border-subtle)"
          fill="none"
        />
        <text
          x={lx + (textAnchor === "start" ? 3 : -3)}
          y={ly}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fontSize={11}
          fill="var(--text-secondary)"
        >
          {value}
        </text>
      </g>
    );
  }

  const insideRadius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + insideRadius * cos;
  const y = cy + insideRadius * sin;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={600}
      fill="var(--bg-base)"
    >
      {value}
    </text>
  );
}

/**
 * UPD-006 6a — a donut chart (Recharts `PieChart` with an inner radius) with
 * the total shown in the centre and a legend underneath. Used for herd
 * composition by stage and for the sex ratio. Zero-value slices are dropped
 * so the legend stays short. Sized larger (UPD-011 refinement round 3) now
 * that the summary-stats row above it is gone, freeing the vertical space —
 * `outerRadius` is pulled in from the container edge to leave room for the
 * thin-slice leader-line labels without clipping against the card's rounded
 * corners.
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
    <div className="flex min-w-0 flex-col items-center gap-4">
      <div className="relative h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="52%"
              outerRadius="72%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--bg-surface)"
              strokeWidth={2}
              isAnimationActive={false}
              label={renderSliceLabel}
              labelLine={false}
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
          <span className="text-2xl font-semibold tabular-nums text-copy-primary">
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
