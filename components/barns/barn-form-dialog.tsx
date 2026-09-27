"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { Plus } from "lucide-react";
import { createBarn, updateBarn } from "@/app/(app)/barns/actions";
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
import type { Database } from "@/types/database.types";

// Spec 17.2 (§5A) — the editable fields only; the barns list no longer
// selects `*`.
type Barn = Pick<
  Database["public"]["Tables"]["barns"]["Row"],
  "id" | "name" | "category" | "notes"
>;

interface BarnFormDialogProps {
  barn?: Barn;
  triggerLabel: string;
  triggerIcon?: boolean;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
}

export function BarnFormDialog({
  barn,
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerSize = "default",
}: BarnFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(barn);
  const submit = isEdit ? updateBarn.bind(null, barn!.id) : createBarn;

  const [error, formAction] = useActionState(
    async (_prevState: string | undefined, formData: FormData) => {
      const result = await submit(formData);
      if (!result) {
        setOpen(false);
      }
      return result;
    },
    undefined
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
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
          <DialogTitle>{isEdit ? "Edit Barn" : "Add Barn"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this barn's details."
              : "Add a new barn to your farm."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm text-copy-secondary">
              Name
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={barn?.name}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="text-sm text-copy-secondary">
              Category
            </label>
            <Input
              id="category"
              name="category"
              defaultValue={barn?.category ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-sm text-copy-secondary">
              Notes
            </label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={barn?.notes ?? ""}
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <DialogFooter>
            <SubmitButton>{isEdit ? "Save" : "Add Barn"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
