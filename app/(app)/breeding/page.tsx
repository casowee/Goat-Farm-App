import Link from "next/link";
import { Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BreedingTabs } from "@/components/breeding/breeding-tabs";
import { SeasonFormDialog } from "@/components/breeding/season-form-dialog";
import { DeleteSeasonDialog } from "@/components/breeding/delete-season-dialog";
import { ApproveSeasonButton } from "@/components/breeding/approve-season-button";
import { SeasonTimeline } from "@/components/breeding/season-timeline";
import { BuckCapacityStat } from "@/components/breeding/buck-capacity-stat";
import { computeHerdComposition } from "@/lib/dashboard/herd-composition";
import { computeBuckCapacity } from "@/lib/breeding/capacity";
import { computeKiddingWindow } from "@/lib/breeding/kidding-window";
import { computeSeasonalTimeline } from "@/lib/breeding/timeline";
import { computeBreedingReminders } from "@/lib/breeding/reminders";
import {
  eligibleBreedingMales,
  type EligibleMale,
} from "@/lib/breeding/eligible-males";
import {
  DEFAULT_BREEDING_SETTINGS,
  type BreedingSettings,
} from "@/lib/breeding/settings";
import { addMonths, parseDateOnly } from "@/lib/breeding/season";
import {
  relevantTemplateId,
  type SeasonTemplate,
} from "@/lib/breeding/templates";

const PROMPT_LOOKAHEAD_DAYS = 150;

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDate(value: string | null): string {
  const parsed = parseDateOnly(value);
  if (!parsed) return "—";
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWindow(start: Date, end: Date | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return end ? `${fmt(start)} – ${fmt(end)}` : `from ${fmt(start)} (open-ended)`;
}

function maleLabel(male: EligibleMale): string {
  return male.name ? `${male.tag} — ${male.name}` : male.tag;
}

export default async function BreedingPage() {
  const supabase = await createClient();
  const now = new Date();

  const [
    { data: settingsRow },
    { data: occurrenceRows },
    { data: seasonBuckRows },
    { data: templateRows },
    { data: goats },
    { data: barns },
  ] = await Promise.all([
    supabase
      .from("breeding_settings")
      .select("bucks_per_group, does_per_group, gestation_days")
      .maybeSingle(),
    supabase
      .from("breeding_season_occurrences")
      .select("id, barn_id, season_template_id, start_date, end_date, note")
      .order("start_date", { ascending: false }),
    supabase.from("breeding_season_bucks").select("season_id, buck_id"),
    supabase
      .from("breeding_season_templates")
      .select("id, label, start_month, length_months")
      .order("start_month"),
    supabase
      .from("goats")
      .select("id, tag, name, sex, reproductive_state, date_of_birth, status"),
    supabase.from("barns").select("id, name").order("name"),
  ]);

  const settings: BreedingSettings = settingsRow
    ? {
        bucks_per_group: settingsRow.bucks_per_group,
        does_per_group: settingsRow.does_per_group,
        gestation_days: settingsRow.gestation_days,
      }
    : DEFAULT_BREEDING_SETTINGS;

  const templates: SeasonTemplate[] = templateRows ?? [];
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const goatRows = goats ?? [];
  const goatById = new Map(goatRows.map((g) => [g.id, g]));
  const { bucks, bucklings } = eligibleBreedingMales(goatRows, now);

  const composition = computeHerdComposition(goatRows, now);
  const capacity = computeBuckCapacity(composition, settings);

  const occurrences = occurrenceRows ?? [];

  const seasonBucks = new Map<number, EligibleMale[]>();
  for (const row of seasonBuckRows ?? []) {
    const goat = goatById.get(row.buck_id);
    if (!goat) continue;
    const list = seasonBucks.get(row.season_id) ?? [];
    list.push({ id: goat.id, tag: goat.tag, name: goat.name });
    seasonBucks.set(row.season_id, list);
  }

  const occurrenceRowsForLib = occurrences.map((o) => ({
    id: o.id,
    buck_ids: (seasonBucks.get(o.id) ?? []).map((b) => b.id),
    season_template_id: o.season_template_id,
    start_date: o.start_date,
    end_date: o.end_date,
  }));

  const timeline = computeSeasonalTimeline(
    settings,
    templates,
    occurrenceRowsForLib,
    now,
  );

  const prompts = computeBreedingReminders(templates, occurrenceRowsForLib, now)
    .filter(
      (r) =>
        r.type === "introduce_males" &&
        r.templateId != null &&
        r.dueDate.getTime() - now.getTime() <
          PROMPT_LOOKAHEAD_DAYS * 86_400_000,
    )
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // The Season selector defaults to the currently relevant template when the
  // "Log new season" dialog opens (2026-09-05 amendment).
  const defaultTemplateId =
    relevantTemplateId(templates, occurrenceRowsForLib, now) ?? undefined;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-copy-primary">Breeding</h1>
        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/breeding/settings" />}
            variant="outline"
            size="sm"
            nativeButton={false}
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Button>
          <SeasonFormDialog
            bucks={bucks}
            bucklings={bucklings}
            barns={barns ?? []}
            templates={templates}
            templateId={defaultTemplateId}
            defaultStartDate={toIso(now)}
            triggerLabel="Log new season"
            triggerIcon
          />
        </div>
      </div>

      <BreedingTabs />

      {prompts.length > 0 && (
        <Card className="rounded-2xl border-brand/30">
          <CardHeader>
            <CardTitle>Upcoming seasons</CardTitle>
            <CardDescription>
              A breeding season is coming up. Approving opens the log form
              pre-filled — you still pick the bucks and can change the date.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {prompts.map((prompt) => (
              <div
                key={prompt.templateId}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <p className="text-sm text-copy-secondary">
                  {prompt.label} —{" "}
                  <span className="text-copy-primary">
                    {formatDate(toIso(prompt.dueDate))}
                  </span>
                </p>
                <ApproveSeasonButton
                  templateId={prompt.templateId!}
                  suggestedStart={toIso(prompt.dueDate)}
                  bucks={bucks}
                  bucklings={bucklings}
                  barns={barns ?? []}
                  templates={templates}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Buck capacity</CardTitle>
            <CardDescription>
              Based on your group ratio in settings. Informational only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BuckCapacityStat capacity={capacity} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Gestation</CardTitle>
            <CardDescription>Used to work out kidding windows.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-copy-secondary">
              <span className="font-medium text-copy-primary">
                {settings.gestation_days} days
              </span>{" "}
              from the day the bucks go in.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Next 12 months</CardTitle>
            <CardDescription>
              When the bucks are with the herd, and when kids are expected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeasonTimeline months={timeline} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Breeding seasons</CardTitle>
            <CardDescription>
              Every season you&apos;ve logged, newest first. The kidding window
              is worked out from the dates — it isn&apos;t stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {occurrences.length === 0 ? (
              <p className="text-sm text-copy-muted">
                No breeding seasons logged yet. Use &ldquo;Log new season&rdquo;
                when a buck goes in with the herd.
              </p>
            ) : (
              occurrences.map((occ) => {
                const start = parseDateOnly(occ.start_date);
                const end = parseDateOnly(occ.end_date);
                const window = start
                  ? computeKiddingWindow(start, end, settings.gestation_days)
                  : null;
                const linkedBucks = seasonBucks.get(occ.id) ?? [];
                const bucksLabel =
                  linkedBucks.length > 0
                    ? linkedBucks.map(maleLabel).join(", ")
                    : "No bucks on record";
                const template =
                  occ.season_template_id != null
                    ? templateById.get(occ.season_template_id)
                    : undefined;
                const heading = template
                  ? `${template.label}${start ? ` — ${start.getFullYear()}` : ""}`
                  : bucksLabel;
                const suggestedBuckOut =
                  occ.end_date === null && template && start
                    ? formatDate(toIso(addMonths(start, template.length_months)))
                    : null;
                const barnName = occ.barn_id
                  ? ((barns ?? []).find((b) => b.id === occ.barn_id)?.name ??
                    null)
                  : null;

                return (
                  <div
                    key={occ.id}
                    className="flex flex-col gap-2 rounded-xl border border-surface-border p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-copy-primary">
                          {heading}
                          {occ.end_date === null && (
                            <span className="ml-2 rounded-lg bg-accent-dim px-2 py-0.5 text-xs text-brand">
                              Bucks in
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-copy-muted">
                          {template ? `${bucksLabel} · ` : ""}
                          {formatDate(occ.start_date)} →{" "}
                          {occ.end_date
                            ? formatDate(occ.end_date)
                            : "still with the herd"}
                          {barnName ? ` · ${barnName}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <SeasonFormDialog
                          bucks={bucks}
                          bucklings={bucklings}
                          barns={barns ?? []}
                          templates={templates}
                          defaultStartDate={toIso(now)}
                          season={{
                            id: occ.id,
                            barn_id: occ.barn_id,
                            season_template_id: occ.season_template_id,
                            start_date: occ.start_date,
                            end_date: occ.end_date,
                            note: occ.note,
                            bucks: linkedBucks,
                          }}
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                        <DeleteSeasonDialog
                          seasonId={occ.id}
                          bucksLabel={bucksLabel}
                        />
                      </div>
                    </div>
                    {window && (
                      <p className="text-xs text-copy-secondary">
                        Kidding expected:{" "}
                        <span className="text-copy-primary">
                          {formatWindow(window.start, window.end)}
                        </span>
                      </p>
                    )}
                    {suggestedBuckOut && (
                      <p className="text-xs text-copy-muted">
                        Suggested buck-out:{" "}
                        <span className="text-copy-secondary">
                          {suggestedBuckOut}
                        </span>{" "}
                        (add the real date when they come out)
                      </p>
                    )}
                    {occ.note && (
                      <p className="text-xs text-copy-muted">{occ.note}</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
