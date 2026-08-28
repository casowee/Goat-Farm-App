"use client";

import { useEffect, useState } from "react";
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

export interface ParentPickerGoat {
  id: number;
  tag: string;
  name: string | null;
  sex: "male" | "female";
  /** Breed composition, so the form can compute a born-here goat's breed (6c). */
  composition: { breed: string; pct: number }[];
}

type Mode = "in_system" | "external";

export interface ParentSelection {
  goatId: number | null;
  name: string | null;
}

interface ParentPickerProps {
  /** "Sire" or "Dam" — shown as the label. */
  label: string;
  /** Form field prefix — emits `${fieldPrefix}_id` and `${fieldPrefix}_name`. */
  fieldPrefix: "sire" | "dam";
  goats: ParentPickerGoat[];
  /** Sex the in-system picker filters to by default (sire → male, dam → female). */
  preferredSex: "male" | "female";
  /** Starting mode when neither an id nor a name is already recorded. */
  defaultMode: Mode;
  initialGoatId?: number | null;
  initialName?: string | null;
  /** The goat being edited — excluded from the picker so it can't be its own parent. */
  excludeGoatId?: number;
  /** Notifies the form of the current selection (for parent-based breed computation). */
  onSelectionChange?: (selection: ParentSelection) => void;
}

function goatLabel(g: ParentPickerGoat): string {
  return g.name ? `${g.tag} — ${g.name}` : g.tag;
}

export function ParentPicker({
  label,
  fieldPrefix,
  goats,
  preferredSex,
  defaultMode,
  initialGoatId,
  initialName,
  excludeGoatId,
  onSelectionChange,
}: ParentPickerProps) {
  const [mode, setMode] = useState<Mode>(
    initialName ? "external" : initialGoatId != null ? "in_system" : defaultMode,
  );
  const [goatId, setGoatId] = useState(
    initialGoatId != null ? String(initialGoatId) : "",
  );
  const [name, setName] = useState(initialName ?? "");
  const [showAll, setShowAll] = useState(false);

  const idNum = goatId ? Number(goatId) : null;
  useEffect(() => {
    onSelectionChange?.(
      mode === "in_system"
        ? { goatId: idNum, name: null }
        : { goatId: null, name: name.trim() || null },
    );
    // onSelectionChange is a stable enough callback from the parent; re-run on
    // the actual selection inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, idNum, name]);

  const selectable = goats.filter(
    (g) => g.id !== excludeGoatId && (showAll || g.sex === preferredSex),
  );
  const items = selectable.map((g) => ({ label: goatLabel(g), value: String(g.id) }));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-copy-secondary">{label}</span>
        <ToggleGroup
          value={[mode]}
          onValueChange={(values) => {
            const next = values[0] as Mode | undefined;
            if (next) setMode(next);
          }}
          variant="outline"
        >
          <ToggleGroupItem value="in_system">In the system</ToggleGroupItem>
          <ToggleGroupItem value="external">External</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === "in_system" ? (
        <div className="flex flex-col gap-2">
          {selectable.length === 0 ? (
            <p className="text-xs text-copy-muted">
              No {showAll ? "" : `${preferredSex} `}goats in the system yet — switch to
              External to record a name, or add this later.
            </p>
          ) : (
            <Select
              items={items}
              value={goatId}
              onValueChange={(value) => setGoatId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${label.toLowerCase()} (optional)`} />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {goatLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Showing all goats" : `Showing ${preferredSex}s only`}
            </Button>
            {goatId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGoatId("")}
              >
                Clear
              </Button>
            )}
          </div>
          <input type="hidden" name={`${fieldPrefix}_id`} value={goatId} />
          <input type="hidden" name={`${fieldPrefix}_name`} value="" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Input
            aria-label={`${label} name`}
            placeholder={`${label}'s name (not in the system)`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input type="hidden" name={`${fieldPrefix}_name`} value={name} />
          <input type="hidden" name={`${fieldPrefix}_id`} value="" />
        </div>
      )}
    </div>
  );
}
