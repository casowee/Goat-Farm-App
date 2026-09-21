"use client";

// UPD-013 — the short "add another kid from this same birth" form shown in a
// loop after the full UPD-010 "Add newborn kid" wizard saves its first kid.
// Dam, Origin, Date of birth, and Barn are locked to match that first kid
// exactly (litter mates share a birth date and, per the owner, a barn — this
// is what keeps UPD-012's same-dam/same-date kidding-event grouping correct).
// Sex is asked fresh every time; Sire is pre-filled from the previous kid but
// editable (via ParentPicker's own uncontrolled state); Breed behaves exactly
// like the original wizard's Breed step (auto-suggested from both parents
// when in-system compositions are known, otherwise the normal manual picker).

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { createGoat } from "@/app/(app)/goats/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ParentPicker,
  type ParentPickerGoat,
  type ParentSelection,
} from "@/components/goats/parent-picker";
import type { GoatSex } from "@/lib/goats/stage";
import {
  GOAT_BREEDS,
  BREED_SELECT_ITEMS,
  PURE_BREED_ITEMS,
  OTHER_BREED,
  CROSSED_BREED,
  type BreedComposition,
  composeFromParents,
  crossOfPureBreeds,
  formatBreed,
} from "@/lib/goats/breeds";
import { generateTempTag } from "@/lib/goats/temp-tag";

interface LitterMateQuickAddFormProps {
  dam: { id: number; tag: string; name: string | null };
  /** Locked to the litter's first kid — read-only here. */
  dateOfBirth: string;
  /** Locked to the litter's first kid — read-only here. */
  barn: { id: string; name: string };
  /** The previous kid's sire selection, pre-filled here but editable. */
  initialSire: ParentSelection;
  goats: ParentPickerGoat[];
  /** The owner's live tag list plus every litter mate already added this session. */
  existingTags: string[];
  onAdded: (kid: { tag: string; sex: GoatSex; sire: ParentSelection }) => void;
  onCancel: () => void;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : "Add kid"}
    </Button>
  );
}

export function LitterMateQuickAddForm({
  dam,
  dateOfBirth,
  barn,
  initialSire,
  goats,
  existingTags,
  onAdded,
  onCancel,
}: LitterMateQuickAddFormProps) {
  // The next `{dam_tag}-K{n}` preview — createGoat regenerates this server-side
  // against the live tag list (the real authority), same as the main wizard.
  const tag = useMemo(
    () => generateTempTag(dam.tag, existingTags),
    [dam.tag, existingTags],
  );

  const [sex, setSex] = useState<GoatSex | "">("");
  const [sireSel, setSireSel] = useState<ParentSelection>(initialSire);
  const [notes, setNotes] = useState("");

  const [breedChoice, setBreedChoice] = useState("");
  const [otherBreed, setOtherBreed] = useState("");
  const [crossFirst, setCrossFirst] = useState("");
  const [crossSecond, setCrossSecond] = useState("");
  const [useParentsBreed, setUseParentsBreed] = useState(false);

  const damGoat = goats.find((g) => g.id === dam.id);
  const sireGoat =
    sireSel.goatId != null
      ? goats.find((g) => g.id === sireSel.goatId)
      : undefined;
  const bothParentsInSystem =
    !!damGoat &&
    damGoat.composition.length > 0 &&
    !!sireGoat &&
    sireGoat.composition.length > 0;

  const breedSource: "manual" | "parents" =
    bothParentsInSystem && useParentsBreed ? "parents" : "manual";

  const parentsComputed: BreedComposition =
    bothParentsInSystem && damGoat && sireGoat
      ? composeFromParents(damGoat.composition, sireGoat.composition)
      : [];

  const isCrossed = breedChoice === CROSSED_BREED;
  const crossValid = !!crossFirst && !!crossSecond && crossFirst !== crossSecond;

  function resolvedManual(): BreedComposition | null {
    if (breedChoice === "") return null;
    if (breedChoice === OTHER_BREED) {
      return otherBreed.trim() ? [{ breed: otherBreed.trim(), pct: 100 }] : null;
    }
    if (breedChoice === CROSSED_BREED) {
      return crossValid ? crossOfPureBreeds(crossFirst, crossSecond) : null;
    }
    return [{ breed: breedChoice, pct: 100 }];
  }

  const resolvedComposition: BreedComposition | null =
    breedSource === "parents"
      ? parentsComputed.length > 0
        ? parentsComputed
        : null
      : resolvedManual();

  const canSubmit = sex !== "" && resolvedComposition != null;

  const [error, formAction] = useActionState(
    async (_prevState: string | undefined, formData: FormData) => {
      const result = await createGoat(formData);
      if (!result) {
        onAdded({ tag, sex: sex as GoatSex, sire: sireSel });
      }
      return result;
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-xl border border-surface-border bg-subtle p-3 text-sm">
        <p className="text-copy-secondary">
          Dam:{" "}
          <span className="text-copy-primary">
            {dam.name ? `${dam.tag} — ${dam.name}` : dam.tag}
          </span>
        </p>
        <p className="text-copy-secondary">
          Origin: <span className="text-copy-primary">Born on the farm</span>
        </p>
        <p className="text-copy-secondary">
          Date of birth: <span className="text-copy-primary">{dateOfBirth}</span>
        </p>
        <p className="text-copy-secondary">
          Barn: <span className="text-copy-primary">{barn.name}</span>
        </p>
        <p className="text-xs text-copy-muted">
          Locked to match the first kid in this litter.
        </p>
      </div>
      <input type="hidden" name="origin" value="born_here" />
      <input type="hidden" name="date_of_birth" value={dateOfBirth} />
      <input type="hidden" name="dam_id" value={String(dam.id)} />
      <input type="hidden" name="dam_name" value="" />
      <input type="hidden" name="tag" value={tag} />
      <input type="hidden" name="is_temp_tag" value="true" />
      <input type="hidden" name="status" value="active" />
      <input type="hidden" name="barn_id" value={barn.id} />
      {/* A newborn kid is obviously intact — matches the main wizard's own
          default; castration is a later, separate decision, not asked here. */}
      <input type="hidden" name="reproductive_state" value="intact" />
      <input
        type="hidden"
        name="breed_composition"
        value={JSON.stringify(resolvedComposition ?? [])}
      />

      <p className="text-xs text-copy-muted">
        Temporary tag: <span className="text-copy-secondary">{tag}</span> — you
        can assign a real tag later by editing this goat.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-copy-secondary">Sex</label>
        <Select
          name="sex"
          value={sex}
          onValueChange={(value) => setSex((value as GoatSex) ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="male">Male</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ParentPicker
        label="Sire"
        fieldPrefix="sire"
        goats={goats}
        preferredSex="male"
        defaultMode="in_system"
        initialGoatId={initialSire.goatId}
        initialName={initialSire.name}
        onSelectionChange={setSireSel}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm text-copy-secondary">Breed</label>

        {bothParentsInSystem && (
          <ToggleGroup
            value={[breedSource]}
            onValueChange={(values) => {
              const next = values[0];
              if (next === "parents") setUseParentsBreed(true);
              if (next === "manual") setUseParentsBreed(false);
            }}
            variant="outline"
            className="w-full"
          >
            <ToggleGroupItem value="manual" className="flex-1">
              Enter manually
            </ToggleGroupItem>
            <ToggleGroupItem value="parents" className="flex-1">
              Use parents&apos; breed
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        {breedSource === "parents" ? (
          <p className="text-sm text-copy-secondary">
            Computed from the sire and dam:{" "}
            <span className="text-copy-primary">
              {parentsComputed.length > 0 ? formatBreed(parentsComputed) : "—"}
            </span>
          </p>
        ) : (
          <>
            <Select
              items={BREED_SELECT_ITEMS}
              value={breedChoice}
              onValueChange={(value) => setBreedChoice(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a breed" />
              </SelectTrigger>
              <SelectContent>
                {GOAT_BREEDS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
                <SelectItem value={CROSSED_BREED}>Crossed…</SelectItem>
                <SelectItem value={OTHER_BREED}>Other…</SelectItem>
              </SelectContent>
            </Select>
            {breedChoice === OTHER_BREED && (
              <Input
                aria-label="Other breed"
                placeholder="Enter breed"
                value={otherBreed}
                onChange={(e) => setOtherBreed(e.target.value)}
              />
            )}
          </>
        )}

        {breedSource === "manual" && isCrossed && (
          <div className="flex flex-col gap-2 rounded-xl border border-surface-border p-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-copy-secondary">
                First parent breed
              </label>
              <Select
                items={PURE_BREED_ITEMS}
                value={crossFirst}
                onValueChange={(value) => setCrossFirst(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a breed" />
                </SelectTrigger>
                <SelectContent>
                  {GOAT_BREEDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-copy-secondary">
                Second parent breed
              </label>
              <Select
                items={PURE_BREED_ITEMS}
                value={crossSecond}
                onValueChange={(value) => setCrossSecond(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a breed" />
                </SelectTrigger>
                <SelectContent>
                  {GOAT_BREEDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {crossFirst && crossSecond && crossFirst === crossSecond && (
              <p className="text-xs text-error">
                The two parent breeds must be different.
              </p>
            )}
          </div>
        )}

        {resolvedComposition && breedSource === "manual" && (
          <p className="text-xs text-copy-muted">
            = {formatBreed(resolvedComposition)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="qa-notes" className="text-sm text-copy-secondary">
          Notes
        </label>
        <Textarea
          id="qa-notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-between gap-2 border-t border-surface-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Back
        </Button>
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}
