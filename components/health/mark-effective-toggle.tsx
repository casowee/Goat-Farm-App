"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { setHealthRecordEffective } from "@/app/(app)/health/actions";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/loading/loading-dots";
import { cn } from "@/lib/utils";

/**
 * Feature 15, Task 4 — the "this treatment worked" toggle.
 *
 * **This is the single control for the flag, used in all three places it
 * appears:** a record's row on a goat's Health tab, that record's edit dialog,
 * and the Doctor condition page's "Your farm's history with this condition"
 * list. All three render this component, which calls the one
 * `setHealthRecordEffective` server action, which writes the one
 * `health_records.marked_effective` column. Spec 15 §6 asks for exactly that —
 * one code path, not two flags that could go out of sync — so marking a record
 * effective from the Doctor page and opening the same record on the goat's card
 * cannot disagree, because there is nothing for them to disagree about.
 *
 * It saves immediately rather than on a form submit. That is deliberate: it is
 * one boolean, instantly reversible by tapping again, and keeping it out of
 * `updateHealthRecord` means editing a record's dosage or notes can never
 * silently clear the flag. The edit dialog labels it as saving right away.
 */
export function MarkEffectiveToggle({
  recordId,
  effective,
  className,
}: {
  recordId: number;
  /** The stored flag, as the server last rendered it. */
  effective: boolean;
  className?: string;
}) {
  // Optimistic state, so the badge flips on tap rather than after the
  // round-trip. `override` holds the local guess; `seenEffective` tracks the
  // prop so that when the revalidated server value arrives the guess is
  // dropped and the server wins again (including when the write failed).
  const [override, setOverride] = useState<boolean | null>(null);
  const [seenEffective, setSeenEffective] = useState(effective);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (seenEffective !== effective) {
    setSeenEffective(effective);
    setOverride(null);
  }

  const on = override ?? effective;

  function toggle() {
    const next = !on;
    setOverride(next);
    setError(null);

    startTransition(async () => {
      const message = await setHealthRecordEffective(recordId, next);
      if (message) {
        // Put the control back where it was and say so — a flag that silently
        // failed to save is worse than no flag.
        setOverride(null);
        setError(message);
      }
    });
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Button
        type="button"
        variant={on ? "secondary" : "outline"}
        size="sm"
        aria-pressed={on}
        aria-busy={pending || undefined}
        disabled={pending}
        onClick={toggle}
        title={
          on
            ? "This treatment is marked as one that worked. Tap to unmark it."
            : "Mark this as a treatment that worked, so it is easy to find next time."
        }
      >
        {pending ? (
          <LoadingDots size="sm" label="Saving…" className="text-current" />
        ) : on ? (
          <Check className="text-brand" aria-hidden />
        ) : (
          <Plus aria-hidden />
        )}
        {on ? "Marked effective" : "Mark effective"}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
