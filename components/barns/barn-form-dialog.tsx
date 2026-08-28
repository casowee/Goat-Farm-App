"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
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

type Barn = Database["public"]["Tables"]["barns"]["Row"];

interface BarnFormDialogProps {
  barn?: Barn;
  triggerLabel: string;
  triggerIcon?: boolean;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
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
            <SubmitButton label={isEdit ? "Save" : "Add Barn"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
