"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { createHerdEvent } from "@/app/(app)/actions";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoatCombobox, type GoatOption } from "@/components/dashboard/goat-combobox";

// UPD-007 — Sale and Death are the common, primary choices; "Other addition" /
// "Other removal" stay fully functional but are grouped below as secondary
// options. This is presentation only — the herd_event_type enum and the server
// action's validation are unchanged.
const PRIMARY_EVENT_TYPE_OPTIONS = [
  { value: "sale", label: "Sale" },
  { value: "death", label: "Death" },
];
const SECONDARY_EVENT_TYPE_OPTIONS = [
  { value: "other_addition", label: "Other addition" },
  { value: "other_removal", label: "Other removal" },
];
const EVENT_TYPE_OPTIONS = [
  ...PRIMARY_EVENT_TYPE_OPTIONS,
  ...SECONDARY_EVENT_TYPE_OPTIONS,
];

function requiresGoat(eventType: string): boolean {
  return eventType === "sale" || eventType === "death";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : "Log event"}
    </Button>
  );
}

/**
 * UPD-006 (6b) — a short form to log a herd event (sale / death / other
 * addition / other removal). Birth and purchase are NOT logged here — they're
 * derived from goat records. Trigger built inside the client component per
 * ERR-001's preventive rule.
 */
export function LogHerdEventDialog({ goats }: { goats: GoatOption[] }) {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState("");
  const [goatId, setGoatId] = useState<number | null>(null);
  const [eventDate, setEventDate] = useState(todayIso());

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await createHerdEvent(formData);
      if (!result) {
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  function reset() {
    setEventType("");
    setGoatId(null);
    setEventDate(todayIso());
  }

  const goatRequired = requiresGoat(eventType);
  const canSubmit =
    eventType !== "" && eventDate !== "" && (!goatRequired || goatId !== null);

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
            <Plus className="h-4 w-4" />
            Log herd event
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log herd event</DialogTitle>
          <DialogDescription>
            Record a sale, death, or other one-off change to the herd size.
            Births and purchases are added automatically from goat records.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="event_type" value={eventType} />
          <input
            type="hidden"
            name="goat_id"
            value={goatId === null ? "" : String(goatId)}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="event_type" className="text-sm text-copy-secondary">
              Event type
            </label>
            <Select
              items={EVENT_TYPE_OPTIONS}
              value={eventType || null}
              onValueChange={(value) => setEventType(value ?? "")}
            >
              <SelectTrigger id="event_type" className="w-full">
                <SelectValue placeholder="Select an event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRIMARY_EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Other changes</SelectLabel>
                  {SECONDARY_EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="goat_id_picker" className="text-sm text-copy-secondary">
              Goat{goatRequired ? "" : " (optional)"}
            </label>
            <GoatCombobox
              id="goat_id_picker"
              goats={goats}
              value={goatId}
              onChange={setGoatId}
            />
            <p className="text-xs text-copy-muted">
              {goatRequired
                ? "Required for a sale or death — the goat's status is updated to match."
                : "Link a goat if this change relates to one. Leave blank otherwise."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="event_date" className="text-sm text-copy-secondary">
              Date
            </label>
            <Input
              id="event_date"
              name="event_date"
              type="date"
              max={todayIso()}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="text-sm text-copy-secondary">
              Note (optional)
            </label>
            <Textarea id="note" name="note" />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton disabled={!canSubmit} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
