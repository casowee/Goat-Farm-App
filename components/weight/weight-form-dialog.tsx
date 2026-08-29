"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import {
  createWeight,
  updateWeight,
  type Weight,
} from "@/app/(app)/weight/actions";
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

interface WeightFormDialogProps {
  goatId: number;
  weight?: Weight;
  triggerLabel: string;
  triggerIcon?: boolean;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function WeightFormDialog({
  goatId,
  weight,
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerSize = "default",
}: WeightFormDialogProps) {
  const isEdit = Boolean(weight);
  const [open, setOpen] = useState(false);

  const submit = isEdit
    ? updateWeight.bind(null, weight!.id)
    : createWeight;

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await submit(formData);
      if (!result) {
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size={triggerSize}>
            {triggerIcon && <Plus className="h-5 w-5" />}
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit weight" : "Add weight"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this weigh-in."
              : "Record a weigh-in for this goat."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="goat_id" value={goatId} />

          <div className="flex flex-col gap-2">
            <label htmlFor="weighed_on" className="text-sm text-copy-secondary">
              Date
            </label>
            <Input
              id="weighed_on"
              name="weighed_on"
              type="date"
              max={todayIso()}
              defaultValue={weight?.weighed_on ?? todayIso()}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="weight_kg" className="text-sm text-copy-secondary">
              Weight (kg)
            </label>
            <Input
              id="weight_kg"
              name="weight_kg"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              defaultValue={weight?.weight_kg ?? ""}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-sm text-copy-secondary">
              Notes
            </label>
            <Textarea id="notes" name="notes" defaultValue={weight?.notes ?? ""} />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save" : "Add weight"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
