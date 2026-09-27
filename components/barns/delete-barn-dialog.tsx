"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { Trash2 } from "lucide-react";
import { deleteBarn } from "@/app/(app)/barns/actions";
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

export function DeleteBarnDialog({
  barnId,
  barnName,
}: {
  barnId: number;
  barnName: string;
}) {
  const [open, setOpen] = useState(false);

  const [error, formAction] = useActionState(
    async (_prevState: string | undefined) => {
      const result = await deleteBarn(barnId);
      if (!result) {
        setOpen(false);
      }
      return result;
    },
    undefined
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
          <DialogTitle>Delete {barnName}?</DialogTitle>
          <DialogDescription>This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {error && <p className="mb-2 text-sm text-error">{error}</p>}
          <DialogFooter showCloseButton>
            <SubmitButton variant="destructive" pendingLabel="Deleting…">
              Delete
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
