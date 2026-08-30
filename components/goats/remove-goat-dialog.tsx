"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteGoat } from "@/app/(app)/goats/actions";
import {
  recordGoatDeparture,
  type GoatDepartureKind,
} from "@/app/(app)/goats/departure";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CauseOfDeathCombobox,
  type CauseSelection,
} from "@/components/goats/cause-of-death-combobox";
import type { HealthConditionPreset } from "@/app/(app)/health/actions";

type Reason = "wrong_registration" | "sold" | "death" | "stolen";

const REASON_OPTIONS: { value: Reason; label: string }[] = [
  { value: "wrong_registration", label: "Wrong registration" },
  { value: "sold", label: "Sold" },
  { value: "death", label: "Death" },
  { value: "stolen", label: "Stolen" },
];

const REASON_TO_KIND: Record<
  Exclude<Reason, "wrong_registration">,
  GoatDepartureKind
> = {
  sold: "sale",
  death: "death",
  stolen: "stolen",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton({
  label,
  disabled,
  destructive,
}: {
  label: string;
  disabled: boolean;
  destructive?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={destructive ? "destructive" : "default"}
      disabled={disabled || pending}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Working…" : label}
    </Button>
  );
}

/**
 * UPD-008 (8c) — reason-based goat removal, replacing the plain delete confirm.
 *
 *  - "Wrong registration" → a plain confirm and the SAME hard delete as before
 *    (`deleteGoat`) — nothing real happened, safe to erase.
 *  - Sold / Death / Stolen → `recordGoatDeparture`: the goat's row is PRESERVED,
 *    its status changes, and the departure is logged to `herd_events`. Death
 *    also captures a cause and creates a matching health record.
 *
 * Trigger built inside this client component per ERR-001's preventive rule.
 *
 * `returnTo` — where to send the user after a successful removal. Set it on the
 * goat *detail* page (a hard "Wrong registration" delete there would otherwise
 * re-render the profile route into a bare 404, since the goat is gone) and in
 * the duplicates view (so a group card unmounting mid-close can't strand the
 * user). Omitted in the plain goats list, where staying put + a revalidate
 * refresh is the right behaviour.
 */
export function RemoveGoatDialog({
  goatId,
  goatLabel,
  causePresets,
  returnTo,
}: {
  goatId: number;
  goatLabel: string;
  causePresets: HealthConditionPreset[];
  returnTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [cause, setCause] = useState<CauseSelection>({
    title: "",
    category: "illness",
    isCustom: false,
  });

  const [error, formAction] = useActionState(async () => {
    let result: string | undefined;
    if (reason === "wrong_registration") {
      result = await deleteGoat(goatId);
    } else if (reason === "sold" || reason === "death" || reason === "stolen") {
      result = await recordGoatDeparture(
        goatId,
        REASON_TO_KIND[reason],
        date,
        note || undefined,
        reason === "death" ? cause : undefined,
      );
    } else {
      return "Choose a reason for removing this goat.";
    }
    if (!result) {
      setOpen(false);
      if (returnTo) {
        // Leave the (now stale or deleted) current route before it re-renders.
        router.replace(returnTo);
      }
    }
    return result;
  }, undefined);

  function reset() {
    setReason("");
    setDate(todayIso());
    setNote("");
    setCause({ title: "", category: "illness", isCustom: false });
  }

  const isDeparture =
    reason === "sold" || reason === "death" || reason === "stolen";
  const canSubmit =
    reason === "wrong_registration"
      ? true
      : isDeparture
        ? date !== "" && (reason !== "death" || cause.title.trim() !== "")
        : false;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Trash2 />
            Remove
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {goatLabel}</DialogTitle>
          <DialogDescription>
            Choose why this goat is leaving your herd.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="remove_reason" className="text-sm text-copy-secondary">
              Reason
            </label>
            <Select
              value={reason || null}
              onValueChange={(v) => setReason((v as Reason) ?? "")}
            >
              <SelectTrigger id="remove_reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "wrong_registration" && (
            <p className="text-sm text-copy-secondary">
              This will permanently delete this goat and everything attached to
              it (weights, health records, barn moves). This cannot be undone.
              Use this only if the goat was registered by mistake.
            </p>
          )}

          {isDeparture && (
            <>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="remove_date"
                  className="text-sm text-copy-secondary"
                >
                  {reason === "sold"
                    ? "Date sold"
                    : reason === "death"
                      ? "Date of death"
                      : "Date discovered missing"}
                </label>
                <Input
                  id="remove_date"
                  type="date"
                  max={todayIso()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {reason === "death" && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="remove_cause"
                    className="text-sm text-copy-secondary"
                  >
                    Cause of death
                  </label>
                  <CauseOfDeathCombobox
                    id="remove_cause"
                    presets={causePresets}
                    value={cause.title}
                    onChange={setCause}
                  />
                  <p className="text-xs text-copy-muted">
                    A matching health record is added to this goat&apos;s
                    history.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="remove_note"
                  className="text-sm text-copy-secondary"
                >
                  Note (optional)
                </label>
                <Textarea
                  id="remove_note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <p className="text-xs text-copy-muted">
                This goat stays in your records with its history — only its
                status changes.
              </p>
            </>
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          <DialogFooter showCloseButton>
            <SubmitButton
              label={
                reason === "wrong_registration" ? "Delete permanently" : "Confirm"
              }
              destructive={reason === "wrong_registration"}
              disabled={!canSubmit}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
