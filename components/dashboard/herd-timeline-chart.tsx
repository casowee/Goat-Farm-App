"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HerdTimelinePoint } from "@/lib/dashboard/herd-timeline";

const LINE = "var(--accent-primary)";
const GRID = "var(--border-default)";
const AXIS = "var(--text-muted)";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

/**
 * UPD-006 (6b) — cumulative herd size over time. Combines derived
 * birth/purchase additions with manually logged sale/death/other events (all
 * merged by `computeHerdTimeline`). Area chart, one point per day the herd size
 * changed. Colours come from design tokens, same pattern as the weight chart.
 */
export function HerdTimelineChart({ data }: { data: HerdTimelinePoint[] }) {
  if (data.length === 0) return null;

  const rows = data.map((point) => ({
    label: formatDate(point.date),
    total: point.runningTotal,
  }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
        >
          <defs>
            <linearGradient id="herd-timeline-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE} stopOpacity={0.35} />
              <stop offset="100%" stopColor={LINE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke={AXIS}
            tick={{ fill: AXIS, fontSize: 11 }}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            stroke={AXIS}
            tick={{ fill: AXIS, fontSize: 11 }}
            width={40}
            allowDecimals={false}
            domain={[0, "dataMax + 1"]}
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
            formatter={(value: unknown) => [`${Number(value)} goats`, "Herd size"]}
          />
          <Area
            type="stepAfter"
            dataKey="total"
            stroke={LINE}
            strokeWidth={2}
            fill="url(#herd-timeline-fill)"
            dot={{ r: 3, fill: LINE, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
