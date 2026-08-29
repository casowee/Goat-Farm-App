"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export interface GoatOption {
  id: number;
  tag: string;
  name: string | null;
  status: string;
}

interface GoatComboboxProps {
  id?: string;
  goats: GoatOption[];
  /** Selected goat id, or null. */
  value: number | null;
  onChange: (goatId: number | null) => void;
  placeholder?: string;
}

/** `TAG — Name` (or just the tag when the goat has no name). */
function optionLabel(goat: GoatOption): string {
  return goat.name ? `${goat.tag} — ${goat.name}` : goat.tag;
}

/**
 * UPD-006 (6b) — the "Log herd event" dialog's goat picker: a searchable
 * combobox of the owner's goats, labelled by tag. Built on the same
 * `components/ui/combobox` primitive as the health-record comboboxes. The
 * combobox works in label strings (like the other comboboxes in this project);
 * this component maps the chosen label back to the goat id.
 */
export function GoatCombobox({
  id,
  goats,
  value,
  onChange,
  placeholder,
}: GoatComboboxProps) {
  const { labels, labelToId, idToLabel } = useMemo(() => {
    const labelToId = new Map<string, number>();
    const idToLabel = new Map<number, string>();
    for (const goat of goats) {
      const label = optionLabel(goat);
      if (labelToId.has(label)) continue; // first goat wins on a tag+name clash
      labelToId.set(label, goat.id);
      idToLabel.set(goat.id, label);
    }
    const labels = [...labelToId.keys()].sort((a, b) => a.localeCompare(b));
    return { labels, labelToId, idToLabel };
  }, [goats]);

  const currentLabel = value === null ? null : (idToLabel.get(value) ?? null);

  return (
    <Combobox
      items={labels}
      value={currentLabel}
      onValueChange={(next: string | null) => {
        onChange(next ? (labelToId.get(next) ?? null) : null);
      }}
      filter={(itemValue, query) =>
        String(itemValue)
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase())
      }
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder ?? "Search goats by tag…"}
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No matching goats.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => {
            const goatId = labelToId.get(item);
            const goat = goats.find((g) => g.id === goatId);
            return (
              <ComboboxItem key={item} value={item}>
                <span className="flex flex-1 items-center justify-between gap-2">
                  <span>{item}</span>
                  {goat && goat.status !== "active" && (
                    <span className="text-xs text-copy-muted capitalize">
                      {goat.status}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
