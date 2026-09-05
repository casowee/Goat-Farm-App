"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { upsertBreedingSettings } from "@/app/(app)/breeding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_BREEDING_SETTINGS,
  gestationMonthsWeeksFromDays,
  gestationDaysFromMonthsWeeks,
  type BreedingSettings,
} from "@/lib/breeding/settings";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : "Save settings"}
    </Button>
  );
}

export function SettingsForm({ settings }: { settings: BreedingSettings | null }) {
  const initial = settings ?? DEFAULT_BREEDING_SETTINGS;
  const initialGestation = gestationMonthsWeeksFromDays(initial.gestation_days);

  const [gestationMonths, setGestationMonths] = useState(
    String(initialGestation.months),
  );
  const [gestationWeeks, setGestationWeeks] = useState(
    String(initialGestation.weeks),
  );
  const [saved, setSaved] = useState(false);

  const gestationDaysPreview = useMemo(() => {
    const months = Number(gestationMonths);
    const weeks = Number(gestationWeeks);
    if (!Number.isFinite(months) || !Number.isFinite(weeks)) return null;
    return gestationDaysFromMonthsWeeks(months, weeks);
  }, [gestationMonths, gestationWeeks]);

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      setSaved(false);
      const result = await upsertBreedingSettings(formData);
      if (!result) setSaved(true);
      return result;
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-copy-primary">Group ratio</h2>
        <p className="text-xs text-copy-muted">
          Informational only — used for the &ldquo;you have N bucks for M
          does&rdquo; guidance, never enforced.
        </p>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor="bucks_per_group"
              className="text-sm text-copy-secondary"
            >
              Bucks per group
            </label>
            <Input
              id="bucks_per_group"
              name="bucks_per_group"
              type="number"
              min="1"
              max="99"
              inputMode="numeric"
              defaultValue={String(initial.bucks_per_group)}
              required
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor="does_per_group"
              className="text-sm text-copy-secondary"
            >
              Does per group
            </label>
            <Input
              id="does_per_group"
              name="does_per_group"
              type="number"
              min="1"
              max="999"
              inputMode="numeric"
              defaultValue={String(initial.does_per_group)}
              required
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-copy-primary">Gestation length</h2>
        <p className="text-xs text-copy-muted">
          About 5 months 3 weeks for goats. Stored as an approximate number of
          days (months &times; 30 + weeks &times; 7).
        </p>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor="gestation_months"
              className="text-sm text-copy-secondary"
            >
              Months
            </label>
            <Input
              id="gestation_months"
              name="gestation_months"
              type="number"
              min="1"
              max="12"
              inputMode="numeric"
              value={gestationMonths}
              onChange={(e) => setGestationMonths(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor="gestation_weeks"
              className="text-sm text-copy-secondary"
            >
              Weeks
            </label>
            <Input
              id="gestation_weeks"
              name="gestation_weeks"
              type="number"
              min="0"
              max="8"
              inputMode="numeric"
              value={gestationWeeks}
              onChange={(e) => setGestationWeeks(e.target.value)}
              required
            />
          </div>
        </div>
        {gestationDaysPreview !== null && (
          <p className="text-xs text-copy-muted">
            ≈ <span className="text-copy-secondary">{gestationDaysPreview} days</span>
          </p>
        )}
      </section>

      {error && <p className="text-sm text-error">{error}</p>}
      {saved && !error && (
        <p className="text-sm text-success">Breeding settings saved.</p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
