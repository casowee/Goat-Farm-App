"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { moveGoatToBarn } from "@/app/(app)/goats/actions";
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

interface MoveBarnDialogProps {
  goatId: number;
  currentBarnId: number | null;
  barns: { id: number; name: string }[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Moving..." : "Move goat"}
    </Button>
  );
}

export function MoveBarnDialog({
  goatId,
  currentBarnId,
  barns,
}: MoveBarnDialogProps) {
  const [open, setOpen] = useState(false);
  const [toBarnId, setToBarnId] = useState("");

  const otherBarns = barns.filter((b) => b.id !== currentBarnId);

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await moveGoatToBarn(goatId, formData);
      if (!result) {
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setToBarnId("");
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <ArrowLeftRight className="h-5 w-5" />
            Move barn
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to another barn</DialogTitle>
          <DialogDescription>
            This updates the goat&apos;s current barn and adds an entry to its
            move history.
          </DialogDescription>
        </DialogHeader>

        {otherBarns.length === 0 ? (
          <p className="text-sm text-copy-muted">
            There are no other barns to move this goat to. Add another barn
            first.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="to_barn_id" className="text-sm text-copy-secondary">
                Move to
              </label>
              <Select
                items={otherBarns.map((b) => ({
                  label: b.name,
                  value: String(b.id),
                }))}
                value={toBarnId}
                onValueChange={(value) => setToBarnId(value ?? "")}
              >
                <SelectTrigger id="to_barn_id" className="w-full">
                  <SelectValue placeholder="Select a barn" />
                </SelectTrigger>
                <SelectContent>
                  {otherBarns.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="to_barn_id" value={toBarnId} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="moved_on" className="text-sm text-copy-secondary">
                Move date
              </label>
              <Input id="moved_on" name="moved_on" type="date" />
              <p className="text-xs text-copy-muted">
                Leave blank to use today.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="note" className="text-sm text-copy-secondary">
                Note
              </label>
              <Textarea id="note" name="note" placeholder="Optional" />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
