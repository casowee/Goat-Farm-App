"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HerdComposition } from "@/lib/dashboard/herd-composition";
import type { GoatStage } from "@/lib/goats/stage";

const STAGE_ORDER: GoatStage[] = [
  "Doe",
  "Buck",
  "Doeling",
  "Buckling",
  "Wether",
  "Kid",
];

interface DashboardCsvButtonProps {
  composition: HerdComposition;
  /** Human label for the active barn filter, e.g. "All barns" or a barn name. */
  barnLabel: string;
  /** Current herd size from the timeline running total, if available. */
  herdSizeNow?: number;
}

/** Quote a CSV field when it contains a comma, quote or newline. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvField).join(",");
}

function buildCsv(props: DashboardCsvButtonProps): string {
  const { composition, barnLabel, herdSizeNow } = props;
  const { total, byStage, totalMale, totalFemale, buckToDoeRatio } = composition;

  const ratio =
    buckToDoeRatio.bucks === 0
      ? buckToDoeRatio.does === 0
        ? "—"
        : `0 : ${buckToDoeRatio.does}`
      : `1 : ${Number((buckToDoeRatio.does / buckToDoeRatio.bucks).toFixed(1))}`;

  const lines: string[] = [
    csvRow(["Goat Farm Manager — dashboard summary"]),
    csvRow(["Generated", new Date().toISOString()]),
    csvRow(["Barn filter", barnLabel]),
    "",
    csvRow(["Metric", "Value"]),
    csvRow(["Total goats", total]),
    csvRow(["Female", totalFemale]),
    csvRow(["Male", totalMale]),
    csvRow(["Adult does", buckToDoeRatio.does]),
    csvRow(["Adult bucks", buckToDoeRatio.bucks]),
    csvRow(["Buck-to-doe ratio (adults)", ratio]),
  ];

  if (herdSizeNow !== undefined) {
    lines.push(csvRow(["Herd size now (timeline)", herdSizeNow]));
  }

  lines.push("", csvRow(["Stage", "Count"]));
  for (const stage of STAGE_ORDER) {
    lines.push(csvRow([stage, byStage[stage]]));
  }

  return lines.join("\r\n");
}

/**
 * UPD-006 6a — the top bar's action icon. Spec 16 (real PDF/report export)
 * doesn't exist yet, so v1 is a plain CSV download of the summary and
 * composition numbers currently on screen. No server round-trip.
 */
export function DashboardCsvButton(props: DashboardCsvButtonProps) {
  function handleDownload() {
    const blob = new Blob([buildCsv(props)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={handleDownload}
      aria-label="Download summary as CSV"
      title="Download summary as CSV"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
