import { createClient } from "@/lib/supabase/server";
import { TopBarBackButton } from "@/components/top-bar";
import { SettingsForm } from "@/components/breeding/settings-form";
import { TemplatesManager } from "@/components/breeding/templates-manager";
import { DoePerformanceSettingsForm } from "@/components/breeding/doe-performance-settings-form";
import type { BreedingSettings } from "@/lib/breeding/settings";
import type { SeasonTemplate } from "@/lib/breeding/templates";
import type { DoePerformanceSettings } from "@/lib/breeding/doe-performance";

export default async function BreedingSettingsPage() {
  const supabase = await createClient();
  // RLS scopes every query to the signed-in owner.
  const [{ data: row }, { data: templateRows }, { data: doePerfRow }] =
    await Promise.all([
      supabase
        .from("breeding_settings")
        .select("bucks_per_group, does_per_group, gestation_days")
        .maybeSingle(),
      supabase
        .from("breeding_season_templates")
        .select("id, label, start_month, length_months")
        .order("start_month"),
      supabase
        .from("doe_performance_settings")
        .select("max_expected_interval_months, breeding_eligible_age_months")
        .maybeSingle(),
    ]);

  const settings: BreedingSettings | null = row
    ? {
        bucks_per_group: row.bucks_per_group,
        does_per_group: row.does_per_group,
        gestation_days: row.gestation_days,
      }
    : null;

  const templates: SeasonTemplate[] = templateRows ?? [];

  const doePerformanceSettings: DoePerformanceSettings | null = doePerfRow
    ? {
        maxExpectedIntervalMonths: doePerfRow.max_expected_interval_months,
        breedingEligibleAgeMonths: doePerfRow.breeding_eligible_age_months,
      }
    : null;

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <TopBarBackButton href="/breeding" label="Back to Breeding" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-copy-primary">
            Breeding settings
          </h1>
          <p className="text-sm text-copy-muted">
            Group ratio and gestation length — used for the kidding-window
            estimate and the buck-capacity guidance.
          </p>
        </div>
        <SettingsForm settings={settings} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-copy-primary">
            Season templates
          </h1>
          <p className="text-sm text-copy-muted">
            Your farm&apos;s recurring breeding windows. These drive the seasonal
            timeline and the &ldquo;Approve season&rdquo; reminders. Renaming a
            season also relabels its past logged occurrences.
          </p>
        </div>
        <TemplatesManager templates={templates} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-copy-primary">
            Doe performance
          </h1>
          <p className="text-sm text-copy-muted">
            Thresholds for the{" "}
            <a href="/breeding/doe-performance" className="text-brand underline">
              Doe Performance
            </a>{" "}
            list — which does get flagged as falling behind on kidding. The flag
            is always worked out live, so a change here takes effect
            immediately.
          </p>
        </div>
        <DoePerformanceSettingsForm settings={doePerformanceSettings} />
      </div>
    </div>
  );
}
