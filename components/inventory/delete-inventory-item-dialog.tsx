"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { Trash2 } from "lucide-react";
import { deleteInventoryItem } from "@/app/(app)/inventory/actions";
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

export function DeleteInventoryItemDialog({
  itemId,
  itemName,
}: {
  itemId: number;
  itemName: string;
}) {
  const [open, setOpen] = useState(false);

  const [error, formAction] = useActionState(
    async (_prev: string | undefined) => {
      const result = await deleteInventoryItem(itemId);
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
          <DialogTitle>Delete {itemName}?</DialogTitle>
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
