"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { deleteBreedingSeason } from "@/app/(app)/breeding/actions";
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}

export function DeleteSeasonDialog({
  seasonId,
  bucksLabel,
}: {
  seasonId: number;
  bucksLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const [error, formAction] = useActionState(
    async (_prevState: string | undefined) => {
      const result = await deleteBreedingSeason(seasonId);
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
          <Button variant="outline" size="sm">
            <Trash2 />
            Delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this breeding season?</DialogTitle>
          <DialogDescription>
            The season with {bucksLabel} will be removed. This can&apos;t be
            undone.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {error && <p className="mb-2 text-sm text-error">{error}</p>}
          <DialogFooter showCloseButton>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
