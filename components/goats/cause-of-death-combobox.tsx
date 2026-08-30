"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import type { HealthConditionPreset } from "@/app/(app)/health/actions";

// Control character so it can never collide with a real preset name.
const ADD_NEW = " add-new";

export type CauseCategory = "illness" | "injury";

export interface CauseSelection {
  title: string;
  category: CauseCategory;
  isCustom: boolean;
}

interface CauseOfDeathComboboxProps {
  id?: string;
  /** Every preset visible to the owner; filtered to illness + injury here. */
  presets: HealthConditionPreset[];
  value: string;
  onChange: (cause: CauseSelection) => void;
}

/**
 * UPD-008 (8c) — the removal dialog's "Cause of death" field. Reuses UPD-004's
 * searchable-combobox interaction pattern, sourced from `health_condition_presets`
 * filtered to the `illness` and `injury` categories combined, with an
 * always-present "+ Add new" row that reveals a plain text input. A picked
 * preset carries its own category through so the health record created on a
 * death is typed to match; a typed-in cause defaults to `illness`.
 */
export function CauseOfDeathCombobox({
  id,
  presets,
  value,
  onChange,
}: CauseOfDeathComboboxProps) {
  const { names, categoryByName } = useMemo(() => {
    const categoryByName = new Map<string, CauseCategory>();
    for (const preset of presets) {
      if (preset.record_type !== "illness" && preset.record_type !== "injury") {
        continue;
      }
      if (!categoryByName.has(preset.name)) {
        categoryByName.set(preset.name, preset.record_type);
      }
    }
    const names = [...categoryByName.keys()].sort((a, b) => a.localeCompare(b));
    return { names, categoryByName };
  }, [presets]);

  const [addingNew, setAddingNew] = useState(
    value !== "" && !names.includes(value),
  );

  const items = useMemo(() => [...names, ADD_NEW], [names]);

  if (addingNew) {
    return (
      <div className="flex flex-col gap-1.5">
        <Input
          id={id}
          autoFocus
          value={value}
          onChange={(event) =>
            onChange({
              title: event.target.value,
              category: "illness",
              isCustom: true,
            })
          }
          placeholder="Type the cause of death"
        />
        {names.length > 0 && (
          <button
            type="button"
            className="self-start text-xs text-copy-muted underline underline-offset-2 hover:text-copy-secondary"
            onClick={() => {
              setAddingNew(false);
              onChange({ title: "", category: "illness", isCustom: false });
            }}
          >
            Choose from the list instead
          </button>
        )}
      </div>
    );
  }

  return (
    <Combobox
      items={items}
      value={value === "" ? null : value}
      onValueChange={(next: string | null) => {
        if (next === ADD_NEW) {
          setAddingNew(true);
          onChange({ title: "", category: "illness", isCustom: true });
          return;
        }
        onChange({
          title: next ?? "",
          category: next ? (categoryByName.get(next) ?? "illness") : "illness",
          isCustom: false,
        });
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
        placeholder={names.length > 0 ? "Search or add a cause…" : "Add a cause…"}
      />
      <ComboboxContent>
        <ComboboxEmpty>No matching causes.</ComboboxEmpty>
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
                {item}
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
