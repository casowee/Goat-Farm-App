import Link from "next/link";
import type { CurrentSeasonStatus } from "@/lib/breeding/status";

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMonth(date: Date, now: Date): string {
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", {
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Feature 09 (Task 6) — the dashboard's compact current-season line. Not the
 * full timeline (that lives on the Breeding page) — just enough to glance at.
 */
export function BreedingStatus({
  status,
  now,
}: {
  status: CurrentSeasonStatus;
  now: Date;
}) {
  let line: string;
  if (status.active) {
    const buck = status.buckLabel ? ` (${status.buckLabel})` : "";
    const since = status.startedOn
      ? ` since ${formatDay(status.startedOn)}`
      : "";
    line = `Season active — bucks in${buck}${since}.`;
  } else if (status.nextSeasonEstimate) {
    const which = status.nextSeasonLabel ? `${status.nextSeasonLabel} ` : "";
    line = `Off-season — ${which}~${formatMonth(
      status.nextSeasonEstimate,
      now,
    )}.`;
  } else {
    line = "Off-season — no season templates set.";
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-copy-secondary">{line}</p>
      <Link
        href="/breeding"
        className="text-xs font-medium text-brand hover:underline"
      >
        View breeding →
      </Link>
    </div>
  );
}
