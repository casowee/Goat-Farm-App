"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { upsertDoePerformanceSettings } from "@/app/(app)/breeding/doe-performance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_DOE_PERFORMANCE_SETTINGS,
  type DoePerformanceSettings,
} from "@/lib/breeding/doe-performance";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : "Save settings"}
    </Button>
  );
}

export function DoePerformanceSettingsForm({
  settings,
}: {
  settings: DoePerformanceSettings | null;
}) {
  const initial = settings ?? DEFAULT_DOE_PERFORMANCE_SETTINGS;
  const [saved, setSaved] = useState(false);

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      setSaved(false);
      const result = await upsertDoePerformanceSettings(formData);
      if (!result) setSaved(true);
      return result;
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <label
            htmlFor="max_expected_interval_months"
            className="text-sm text-copy-secondary"
          >
            Max expected kidding interval (months)
          </label>
          <Input
            id="max_expected_interval_months"
            name="max_expected_interval_months"
            type="number"
            min="1"
            max="36"
            inputMode="numeric"
            defaultValue={String(initial.maxExpectedIntervalMonths)}
            required
          />
          <p className="text-xs text-copy-muted">
            A doe is flagged if she is past this many months since her last
            kidding, or if her historical average interval is longer than this.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label
            htmlFor="breeding_eligible_age_months"
            className="text-sm text-copy-secondary"
          >
            Breeding-eligible age (months)
          </label>
          <Input
            id="breeding_eligible_age_months"
            name="breeding_eligible_age_months"
            type="number"
            min="1"
            max="36"
            inputMode="numeric"
            defaultValue={String(initial.breedingEligibleAgeMonths)}
            required
          />
          <p className="text-xs text-copy-muted">
            Compared against the doe&apos;s actual age, not her life-stage
            label. A doe past this age with no kiddings is flagged; a younger
            doe with no kiddings is simply not judged yet. Default is 12 months
            (about a year); adjust it for your breed and practice.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {saved && !error && (
        <p className="text-sm text-success">Doe performance settings saved.</p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
