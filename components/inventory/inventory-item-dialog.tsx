"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import {
  createInventoryItem,
  updateInventoryItem,
  type InventoryItem,
} from "@/app/(app)/inventory/actions";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MEDICINE_CATEGORIES,
  MEDICINE_CATEGORY_LABELS,
  type InventoryItemType,
} from "@/lib/inventory/items";
import { unitsForType } from "@/lib/inventory/units";

// Sentinel for the "no unit / no category" choice — Base UI Select needs a
// real value, not an empty string.
const NONE = "__none__";

interface InventoryItemDialogProps {
  item?: InventoryItem;
  triggerLabel: string;
  triggerIcon?: boolean;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
  /** Preselects the Type toggle when adding from a specific tab. */
  defaultType?: InventoryItemType;
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

export function InventoryItemDialog({
  item,
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerSize = "default",
  defaultType = "medicine",
}: InventoryItemDialogProps) {
  const isEdit = Boolean(item);
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<InventoryItemType>(
    item?.type ?? defaultType,
  );
  const [category, setCategory] = useState<string>(item?.category ?? NONE);
  const [unit, setUnit] = useState<string>(item?.unit ?? NONE);

  const unitOptions = useMemo(() => unitsForType(type), [type]);

  const submit = isEdit
    ? updateInventoryItem.bind(null, item!.id)
    : createInventoryItem;

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

  function handleTypeChange(next: InventoryItemType) {
    setType(next);
    // A unit valid for the old type may not exist in the new type's list.
    if (unit !== NONE && !unitsForType(next).includes(unit)) {
      setUnit(NONE);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset to the item's stored values (or defaults) for the next open.
      setType(item?.type ?? defaultType);
      setCategory(item?.category ?? NONE);
      setUnit(item?.unit ?? NONE);
    }
  }

  const resolvedCategory = type === "medicine" && category !== NONE ? category : "";
  const resolvedUnit = unit !== NONE ? unit : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <DialogTitle>{isEdit ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this inventory item."
              : "Add a medicine or feed item to your inventory."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="category" value={resolvedCategory} />
          <input type="hidden" name="unit" value={resolvedUnit} />

          <div className="flex flex-col gap-2">
            <label className="text-sm text-copy-secondary">Type</label>
            <ToggleGroup
              value={[type]}
              onValueChange={(values) => {
                const next = values[0] as InventoryItemType | undefined;
                if (next) handleTypeChange(next);
              }}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem value="medicine" className="flex-1">
                Medicine
              </ToggleGroupItem>
              <ToggleGroupItem value="feed" className="flex-1">
                Feed
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {type === "medicine" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="category" className="text-sm text-copy-secondary">
                Category
              </label>
              <Select
                items={[
                  { label: "No category", value: NONE },
                  ...MEDICINE_CATEGORIES.map((c) => ({
                    label: MEDICINE_CATEGORY_LABELS[c],
                    value: c,
                  })),
                ]}
                value={category}
                onValueChange={(value) => setCategory(value ?? NONE)}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No category</SelectItem>
                  {MEDICINE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MEDICINE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm text-copy-secondary">
              Name
            </label>
            <Input id="name" name="name" defaultValue={item?.name} required />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="quantity" className="text-sm text-copy-secondary">
                Quantity
              </label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                defaultValue={item ? String(item.quantity) : "0"}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="unit" className="text-sm text-copy-secondary">
                Unit
              </label>
              <Select
                items={[
                  { label: "No unit", value: NONE },
                  ...unitOptions.map((u) => ({ label: u, value: u })),
                ]}
                value={unit}
                onValueChange={(value) => setUnit(value ?? NONE)}
              >
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue placeholder="No unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No unit</SelectItem>
                  {unitOptions.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="low_stock_threshold"
              className="text-sm text-copy-secondary"
            >
              Low-stock threshold{" "}
              <span className="text-copy-muted">(optional)</span>
            </label>
            <Input
              id="low_stock_threshold"
              name="low_stock_threshold"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={
                item?.low_stock_threshold != null
                  ? String(item.low_stock_threshold)
                  : ""
              }
              placeholder="Warn me when it drops to…"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
          <DialogFooter>
            <SubmitButton label={isEdit ? "Save" : "Add item"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
