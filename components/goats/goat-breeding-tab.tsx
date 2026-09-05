import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoeCard } from "@/components/breeding/doe-performance-list";
import {
  SeasonSummaryCard,
  type SeasonSummary,
} from "@/components/breeding/season-summary-card";
import {
  computeDoePerformance,
  DEFAULT_DOE_PERFORMANCE_SETTINGS,
  type DoePerformanceGoat,
  type DoePerformanceSettings,
} from "@/lib/breeding/doe-performance";
import {
  toDoePerformanceRow,
  type DoePerformanceHealthInput,
  type DoePerformanceRow,
} from "@/lib/breeding/doe-performance-row";
import { DEFAULT_BREEDING_SETTINGS } from "@/lib/breeding/settings";
import { deriveGoatStage } from "@/lib/goats/stage";
import type { EligibleMale } from "@/lib/breeding/eligible-males";
import type { SeasonTemplate } from "@/lib/breeding/templates";

// UPD-012 / Feature 09 integration (2026-09-05). The goat detail page's Breeding
// tab, wired to real data — a buck's season history (09) or a doe's kidding
// performance (012), assembled entirely from pieces already built for the
// Breeding page and the Doe Performance tab. No new domain logic here.

export interface BreedingTabGoat {
  id: number;
  sex: "male" | "female";
  reproductive_state: "intact" | "castrated";
  date_of_birth: string;
  status: string;
  tag: string;
  name: string | null;
}

interface BuckSeasonEntry {
  season: SeasonSummary;
  bucks: EligibleMale[];
  template?: SeasonTemplate;
  barnName: string | null;
}

export type GoatBreedingTabData =
  | { kind: "not_applicable"; message: string }
  | { kind: "buck_no_seasons"; label: string }
  | { kind: "buck_seasons"; seasons: BuckSeasonEntry[]; gestationDays: number }
  | { kind: "doe_not_yet"; message: string }
  | { kind: "doe"; row: DoePerformanceRow; flagged: boolean; showCrossLink: boolean };

/**
 * Fetch + compute everything the Breeding tab needs. Called at the goat detail
 * page's top level (the page fetches all tab data up front and passes it into
 * synchronous tab components — matching the existing Health / Weight / Lineage
 * tabs).
 */
export async function loadGoatBreedingTabData(
  goat: BreedingTabGoat,
  healthRecords: DoePerformanceHealthInput[],
): Promise<GoatBreedingTabData> {
  const stage = deriveGoatStage({
    sex: goat.sex,
    reproductiveState: goat.reproductive_state,
    dateOfBirth: goat.date_of_birth,
  });

  if (stage === "Wether") {
    return {
      kind: "not_applicable",
      message:
        "Not applicable — wethers are castrated males and are not part of breeding.",
    };
  }

  const supabase = await createClient();

  if (goat.sex === "male") {
    const { data: buckLinks } = await supabase
      .from("breeding_season_bucks")
      .select("season_id")
      .eq("buck_id", goat.id);

    const seasonIds = [
      ...new Set((buckLinks ?? []).map((r) => r.season_id)),
    ];
    if (seasonIds.length === 0) {
      return {
        kind: "buck_no_seasons",
        label: goat.name ? `${goat.tag} (${goat.name})` : goat.tag,
      };
    }

    const [
      { data: occRows },
      { data: allBuckLinks },
      { data: templateRows },
      { data: settingsRow },
      { data: barnRows },
    ] = await Promise.all([
      supabase
        .from("breeding_season_occurrences")
        .select("id, barn_id, season_template_id, start_date, end_date, note")
        .in("id", seasonIds)
        .order("start_date", { ascending: false }),
      supabase
        .from("breeding_season_bucks")
        .select("season_id, buck_id")
        .in("season_id", seasonIds),
      supabase
        .from("breeding_season_templates")
        .select("id, label, start_month, length_months"),
      supabase.from("breeding_settings").select("gestation_days").maybeSingle(),
      supabase.from("barns").select("id, name"),
    ]);

    const buckIds = [
      ...new Set((allBuckLinks ?? []).map((r) => r.buck_id)),
    ];
    const { data: buckGoats } = buckIds.length
      ? await supabase.from("goats").select("id, tag, name").in("id", buckIds)
      : { data: [] as { id: number; tag: string; name: string | null }[] };
    const buckById = new Map((buckGoats ?? []).map((g) => [g.id, g]));

    const bucksBySeason = new Map<number, EligibleMale[]>();
    for (const link of allBuckLinks ?? []) {
      const g = buckById.get(link.buck_id);
      if (!g) continue;
      const list = bucksBySeason.get(link.season_id) ?? [];
      list.push({ id: g.id, tag: g.tag, name: g.name });
      bucksBySeason.set(link.season_id, list);
    }

    const templateById = new Map(
      (templateRows ?? []).map((t) => [t.id, t as SeasonTemplate]),
    );
    const barnById = new Map((barnRows ?? []).map((b) => [b.id, b.name]));
    const gestationDays =
      settingsRow?.gestation_days ?? DEFAULT_BREEDING_SETTINGS.gestation_days;

    const seasons: BuckSeasonEntry[] = (occRows ?? []).map((occ) => ({
      season: {
        id: occ.id,
        start_date: occ.start_date,
        end_date: occ.end_date,
        note: occ.note,
        season_template_id: occ.season_template_id,
        barn_id: occ.barn_id,
      },
      bucks: bucksBySeason.get(occ.id) ?? [],
      template:
        occ.season_template_id != null
          ? templateById.get(occ.season_template_id)
          : undefined,
      barnName: occ.barn_id ? (barnById.get(occ.barn_id) ?? null) : null,
    }));

    return { kind: "buck_seasons", seasons, gestationDays };
  }

  // Doe.
  const [{ data: settingsRow }, { data: allGoats }, { data: noteRows }] =
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
        .select("id, category, note, created_at")
        .eq("doe_id", goat.id)
        .order("created_at", { ascending: false }),
    ]);

  const settings: DoePerformanceSettings = settingsRow
    ? {
        maxExpectedIntervalMonths: settingsRow.max_expected_interval_months,
        breedingEligibleAgeMonths: settingsRow.breeding_eligible_age_months,
      }
    : DEFAULT_DOE_PERFORMANCE_SETTINGS;

  const herd = (allGoats ?? []) as DoePerformanceGoat[];
  const thisDoe: DoePerformanceGoat = {
    id: goat.id,
    tag: goat.tag,
    name: goat.name,
    sex: "female",
    reproductive_state: goat.reproductive_state,
    date_of_birth: goat.date_of_birth,
    status: goat.status,
    dam_id: null,
  };

  const performance = computeDoePerformance(thisDoe, herd, settings, new Date());

  if (!performance) {
    return {
      kind: "doe_not_yet",
      message: `Nothing to show yet — ${goat.tag} is younger than the breeding-eligible age (${settings.breedingEligibleAgeMonths} months) and has no kiddings recorded. She'll appear here once she's old enough to judge, or after her first kidding.`,
    };
  }

  const row = toDoePerformanceRow(
    performance,
    { tag: goat.tag, name: goat.name },
    noteRows ?? [],
    healthRecords,
  );

  return {
    kind: "doe",
    row,
    flagged: performance.flags.length > 0,
    showCrossLink: goat.status === "active" && performance.flags.length > 0,
  };
}

function TabCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-copy-secondary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

export function GoatBreedingTab({ data }: { data: GoatBreedingTabData }) {
  if (data.kind === "not_applicable") {
    return (
      <TabCard title="Breeding">
        <p className="text-sm text-copy-muted">{data.message}</p>
      </TabCard>
    );
  }

  if (data.kind === "buck_no_seasons") {
    return (
      <TabCard title="Breeding seasons">
        <p className="text-sm text-copy-muted">
          {data.label} hasn&apos;t been assigned to any breeding season yet.
          Assign him from the{" "}
          <Link href="/breeding" className="text-brand underline">
            Breeding
          </Link>{" "}
          page when he goes in with a group.
        </p>
      </TabCard>
    );
  }

  if (data.kind === "buck_seasons") {
    return (
      <TabCard title="Breeding seasons">
        {data.seasons.map((entry) => (
          <SeasonSummaryCard
            key={entry.season.id}
            season={entry.season}
            bucks={entry.bucks}
            template={entry.template}
            barnName={entry.barnName}
            gestationDays={data.gestationDays}
          />
        ))}
      </TabCard>
    );
  }

  if (data.kind === "doe_not_yet") {
    return (
      <TabCard title="Kidding performance">
        <p className="text-sm text-copy-muted">{data.message}</p>
      </TabCard>
    );
  }

  return (
    <TabCard title="Kidding performance">
      <DoeCard row={data.row} defaultOpen />
      {data.showCrossLink && (
        <p className="text-xs text-copy-muted">
          She&apos;s currently flagged on the{" "}
          <Link
            href="/breeding/doe-performance"
            className="text-brand underline"
          >
            Doe Performance
          </Link>{" "}
          list. Use the note box above to record what you conclude.
        </p>
      )}
    </TabCard>
  );
}
