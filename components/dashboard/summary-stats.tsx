import type { HerdComposition } from "@/lib/dashboard/herd-composition";

interface SummaryStatsProps {
  composition: HerdComposition;
}

/**
 * UPD-006 6a — the large, scannable summary row: total goats plus the key
 * category counts. A horizontal row of stat cards (scrolls sideways on a narrow
 * phone), not a table. Server-rendered — plain numbers, no interactivity.
 */
export function SummaryStats({ composition }: SummaryStatsProps) {
  const { total, byStage, totalFemale, totalMale } = composition;

  const stats: { label: string; value: number }[] = [
    { label: "Total goats", value: total },
    { label: "Does", value: byStage.Doe },
    { label: "Bucks", value: byStage.Buck },
    { label: "Young stock", value: byStage.Doeling + byStage.Buckling },
    { label: "Kids", value: byStage.Kid },
    { label: "Wethers", value: byStage.Wether },
    { label: "Female", value: totalFemale },
    { label: "Male", value: totalMale },
  ];

  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="grid auto-cols-[minmax(7rem,1fr)] grid-flow-col gap-3 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-4 lg:grid-cols-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-elevated p-4 ring-1 ring-foreground/10"
          >
            <p className="text-2xl font-semibold tabular-nums text-copy-primary">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-copy-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
