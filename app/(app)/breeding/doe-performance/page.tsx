import Link from "next/link";
import { Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BreedingTabs } from "@/components/breeding/breeding-tabs";
import { listHealthRecordsByGoat } from "@/app/(app)/health/actions";
import { DoePerformanceList } from "@/components/breeding/doe-performance-list";
import {
  computeDoePerformance,
  DEFAULT_DOE_PERFORMANCE_SETTINGS,
  type DoePerformance,
  type DoePerformanceGoat,
  type DoePerformanceSettings,
} from "@/lib/breeding/doe-performance";
import {
  toDoePerformanceRow,
  type DoePerformanceNoteInput,
  type DoePerformanceRow,
} from "@/lib/breeding/doe-performance-row";

export default async function DoePerformancePage() {
  const supabase = await createClient();
  const now = new Date();

  // RLS scopes every query to the signed-in owner.
  const [{ data: settingsRow }, { data: goats }, { data: noteRows }] =
    await Promise.all([
      supabase
        .from("doe_performance_settings")
        .select("max_expected_interval_months, breeding_eligible_age_months")
        .maybeSingle(),
      supabase
        .from("goats")
        .select(
          "id, tag, name, sex, reproductive_state, date_of_birth, status, dam_id",
        ),
      supabase
        .from("doe_performance_notes")
        .select("id, doe_id, category, note, created_at")
        .order("created_at", { ascending: false }),
    ]);

  const settings: DoePerformanceSettings = settingsRow
    ? {
        maxExpectedIntervalMonths: settingsRow.max_expected_interval_months,
        breedingEligibleAgeMonths: settingsRow.breeding_eligible_age_months,
      }
    : DEFAULT_DOE_PERFORMANCE_SETTINGS;

  const allGoats = (goats ?? []) as DoePerformanceGoat[];

  // Only currently-active does are judged, by RAW age (a doe too young to have
  // kidded yet returns null from computeDoePerformance and is dropped here).
  const flagged: DoePerformance[] = allGoats
    .filter((g) => g.sex === "female" && g.status === "active")
    .map((g) => computeDoePerformance(g, allGoats, settings, now))
    .filter((p): p is DoePerformance => p !== null && p.flags.length > 0);

  const goatById = new Map(allGoats.map((g) => [g.id, g]));

  const notesByDoe = new Map<number, DoePerformanceNoteInput[]>();
  for (const n of noteRows ?? []) {
    const list = notesByDoe.get(n.doe_id) ?? [];
    list.push(n);
    notesByDoe.set(n.doe_id, list);
  }

  const rows: DoePerformanceRow[] = await Promise.all(
    flagged.map(async (p): Promise<DoePerformanceRow> => {
      // Reuse feature 07's own query — no duplicated health-record logic.
      const health = await listHealthRecordsByGoat(p.doeId);
      const goat = goatById.get(p.doeId);
      return toDoePerformanceRow(
        p,
        { tag: goat?.tag ?? p.doeLabel, name: goat?.name ?? null },
        notesByDoe.get(p.doeId) ?? [],
        health,
      );
    }),
  );

  // How many active does exist at all — for context on an empty flagged list.
  const activeDoeCount = allGoats.filter(
    (g) => g.sex === "female" && g.status === "active",
  ).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-copy-primary">Breeding</h1>
        <Button
          render={<Link href="/breeding/settings" />}
          variant="outline"
          size="sm"
          nativeButton={false}
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </Button>
      </div>

      <BreedingTabs />

      <div className="flex flex-col gap-1">
        <p className="text-sm text-copy-muted">
          Active does falling behind on kidding — overdue since their last
          kidding, a long historical average interval, or old enough to have
          kidded (past the{" "}
          <Link href="/breeding/settings" className="text-brand underline">
            breeding-eligible age
          </Link>
          ) but never have. Flags are worked out live from your settings; the
          app does not decide the cause — you record your own conclusion per
          doe.
        </p>
      </div>

      <DoePerformanceList rows={rows} activeDoeCount={activeDoeCount} />
    </div>
  );
}
