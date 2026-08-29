"use client";

import { useMemo, useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import type { InventoryItem } from "@/app/(app)/inventory/actions";

// Always-present "+ Add new" row. Leading space keeps it out of any real name.
const ADD_NEW = " add-new";

interface MedicationComboboxProps {
  id?: string;
  /**
   * The inventory items to offer — already filtered by the caller to the right
   * context (non-dewormers for Treatment, dewormers only for Deworming).
   */
  medicines: InventoryItem[];
  /** Word for the thing being picked, used in placeholder / empty text. */
  noun?: string;
  /** Current medication text. */
  value: string;
  /**
   * Called when the medication changes. `isCustom` is true when the text was
   * typed via "+ Add new" (so the server creates a new inventory row for it).
   */
  onChange: (name: string, isCustom: boolean) => void;
}

function hasNoStock(item: InventoryItem): boolean {
  return item.quantity == null || Number(item.quantity) === 0;
}

/**
 * UPD-005 — the health-record Treatment step's medication field. A searchable
 * combobox over `inventory_items` (medicine-only), each option showing the drug
 * name and its recorded quantity, with a visible "No stock recorded" warning
 * when the quantity is 0 — informational only, the drug stays selectable. A
 * "+ Add new" row reveals a plain text input; on submit the server inserts a
 * new medicine row at quantity 0.
 *
 * Built on the same `components/ui/combobox` primitive as UPD-004's title
 * combobox — no new pattern.
 */
export function MedicationCombobox({
  id,
  medicines,
  noun = "medicine",
  value,
  onChange,
}: MedicationComboboxProps) {
  const byName = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of medicines) {
      if (!map.has(item.name)) map.set(item.name, item);
    }
    return map;
  }, [medicines]);

  const names = useMemo(
    () => [...byName.keys()].sort((a, b) => a.localeCompare(b)),
    [byName],
  );

  // Editing a record whose stored medication isn't in the catalogue behaves
  // like a custom entry.
  const [addingNew, setAddingNew] = useState(
    value !== "" && !byName.has(value),
  );

  const items = useMemo(() => [...names, ADD_NEW], [names]);

  if (addingNew) {
    return (
      <div className="flex flex-col gap-1.5">
        <Input
          id={id}
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value, true)}
          placeholder={`Type a new ${noun} name`}
        />
        {names.length > 0 && (
          <button
            type="button"
            className="self-start text-xs text-copy-muted underline underline-offset-2 hover:text-copy-secondary"
            onClick={() => {
              setAddingNew(false);
              onChange("", false);
            }}
          >
            Choose from the list instead
          </button>
        )}
      </div>
    );
  }

  const selected = value === "" ? null : byName.get(value);

  return (
    <div className="flex flex-col gap-1.5">
      <Combobox
        items={items}
        value={value === "" ? null : value}
        onValueChange={(next: string | null) => {
          if (next === ADD_NEW) {
            setAddingNew(true);
            onChange("", true);
            return;
          }
          onChange(next ?? "", false);
        }}
        filter={(itemValue, query) => {
          if (itemValue === ADD_NEW) return true;
          return String(itemValue)
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase());
        }}
      >
        <ComboboxInput
          id={id}
          placeholder={
            names.length > 0
              ? `Search or add a ${noun}…`
              : `Add a ${noun}…`
          }
        />
        <ComboboxContent>
          <ComboboxEmpty>No matching {noun}s.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) =>
              item === ADD_NEW ? (
                <ComboboxItem
                  key="__add_new__"
                  value={ADD_NEW}
                  className="text-copy-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Add new…
                </ComboboxItem>
              ) : (
                <ComboboxItem key={item} value={item}>
                  <span className="flex flex-1 items-center justify-between gap-2">
                    <span>{item}</span>
                    <span className="flex items-center gap-1.5 text-xs text-copy-muted">
                      {byName.get(item) && hasNoStock(byName.get(item)!) ? (
                        <span className="flex items-center gap-1 text-warning">
                          <TriangleAlert className="h-3.5 w-3.5" />
                          No stock recorded
                        </span>
                      ) : (
                        <>
                          {Number(byName.get(item)?.quantity ?? 0)}
                          {byName.get(item)?.unit
                            ? ` ${byName.get(item)?.unit}`
                            : ""}
                        </>
                      )}
                    </span>
                  </span>
                </ComboboxItem>
              )
            }
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {selected && hasNoStock(selected) && (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert className="h-3.5 w-3.5" />
          No stock recorded for {selected.name}. You can still use it here — set
          real stock levels later in Inventory.
        </p>
      )}
    </div>
  );
}
