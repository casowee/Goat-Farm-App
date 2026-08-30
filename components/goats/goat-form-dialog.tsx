"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { createGoat, updateGoat } from "@/app/(app)/goats/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { StepIndicator } from "@/components/forms/step-indicator";
import { WizardNav } from "@/components/forms/wizard-nav";
import {
  useWizardSteps,
  type WizardStepDef,
} from "@/components/forms/use-wizard-steps";
import type { Database } from "@/types/database.types";
import type { GoatSex } from "@/lib/goats/stage";
import {
  GOAT_BREEDS,
  type BreedComposition,
  composeFromParents,
  crossOfPureBreeds,
  formatBreed,
} from "@/lib/goats/breeds";
import {
  ParentPicker,
  type ParentPickerGoat,
  type ParentSelection,
} from "@/components/goats/parent-picker";
import { findTagMatches } from "@/lib/goats/tag";
import { generateTempTag } from "@/lib/goats/temp-tag";

type Goat = Database["public"]["Tables"]["goats"]["Row"];
type GoatOrigin = Database["public"]["Enums"]["goat_origin"];

const OTHER_BREED = "__other__";
const CROSSED_BREED = "__crossed__";

const BREED_SELECT_ITEMS = [
  ...GOAT_BREEDS.map((b) => ({ label: b, value: b })),
  { label: "Crossed…", value: CROSSED_BREED },
  { label: "Other…", value: OTHER_BREED },
];

const PURE_BREED_ITEMS = GOAT_BREEDS.map((b) => ({ label: b, value: b }));

interface GoatFormDialogProps {
  goat?: Goat;
  /** The goat's current breed composition rows (feature 06, 6b). */
  breedComposition?: BreedComposition;
  barns: { id: number; name: string }[];
  /** The owner's goats, for the sire / dam pickers (feature 06). */
  goats?: ParentPickerGoat[];
  /**
   * UPD-010 — "Add newborn kid" mode. When set, this launches the same wizard
   * from a doe's own detail page with the Dam locked to that goat, Origin locked
   * to "Born on the farm", and the Tag step replaced by a read-only preview of
   * an auto-generated `{dam_tag}-K{n}` temporary tag. Everything else (sex, DOB,
   * sire, breed, notes) behaves exactly as the normal wizard.
   */
  newbornDam?: { id: number; tag: string };
  triggerLabel: string;
  triggerIcon?: boolean;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-copy-muted">{label}</span>
      <span className="text-right text-copy-primary">{value}</span>
    </div>
  );
}

const breedInList = (b: string) =>
  (GOAT_BREEDS as readonly string[]).includes(b);

// Composition sorted by descending share (matches how it is displayed / stored).
function sortedComp(c: BreedComposition): BreedComposition {
  return [...c].sort((a, b) => b.pct - a.pct);
}

function initialBreedChoice(comp: BreedComposition): string {
  if (comp.length === 0) return "";
  if (comp.length === 1) return breedInList(comp[0].breed) ? comp[0].breed : OTHER_BREED;
  if (comp.length === 2) return CROSSED_BREED;
  // 3+ breeds (only from parent computation) — shown read-only until replaced.
  return "";
}

function initialOtherBreed(comp: BreedComposition): string {
  if (comp.length === 1 && !breedInList(comp[0].breed)) return comp[0].breed;
  return "";
}

export function GoatFormDialog({
  goat,
  breedComposition = [],
  barns,
  goats = [],
  newbornDam,
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerSize = "default",
}: GoatFormDialogProps) {
  const isEdit = Boolean(goat);
  const isNewborn = Boolean(newbornDam) && !isEdit;
  const initialComp = sortedComp(breedComposition);

  // UPD-010 — the next unique `{dam_tag}-K{n}` value, recomputed whenever the
  // owner's goat list changes (so adding a second kid in a row gets -K2). The
  // server action regenerates this on save and is the real authority; this is
  // only the read-only preview shown in place of the Tag input.
  const newbornTag = useMemo(
    () =>
      newbornDam
        ? generateTempTag(
            newbornDam.tag,
            goats.map((g) => g.tag),
          )
        : "",
    [newbornDam, goats],
  );
  const initialTag = isNewborn ? newbornTag : (goat?.tag ?? "");

  const [open, setOpen] = useState(false);
  // Bumped every time the dialog opens so the parent pickers (which keep their
  // own state) remount fresh from the goat's saved values.
  const [openNonce, setOpenNonce] = useState(0);
  // Bumped when "Skip for now" clears the parent pickers (create flow only) so
  // they remount empty rather than re-reading the goat's saved values.
  const [parentsResetKey, setParentsResetKey] = useState(0);

  // Step 1 fields held in state so per-step validation can gate "Next". They
  // still carry `name` attributes, so the single final submit collects them.
  const [tag, setTag] = useState(initialTag);
  const [name, setName] = useState(goat?.name ?? "");
  const [dob, setDob] = useState(
    goat?.date_of_birth ?? (isNewborn ? todayIso() : ""),
  );
  const [sex, setSex] = useState<GoatSex>(goat?.sex ?? "female");
  const [origin, setOrigin] = useState<GoatOrigin>(goat?.origin ?? "born_here");
  // UPD-010 — the promote toggle, shown only when editing a temp-tagged goat.
  // On by default; turning it off (with a real tag entered) promotes the goat.
  const [isTempTag, setIsTempTag] = useState(goat?.is_temp_tag ?? false);
  // Step 2 — barn is required, so it also gates its step.
  const [barnId, setBarnId] = useState(
    goat?.barn_id != null ? String(goat.barn_id) : "",
  );

  const [breedChoice, setBreedChoice] = useState(initialBreedChoice(initialComp));
  const [otherBreed, setOtherBreed] = useState(initialOtherBreed(initialComp));
  const [crossFirst, setCrossFirst] = useState(
    initialComp.length >= 2 ? initialComp[0].breed : "",
  );
  const [crossSecond, setCrossSecond] = useState(
    initialComp.length >= 2 ? initialComp[1].breed : "",
  );
  // Preserve an existing cross's real percentages (e.g. an older 87.5% grade)
  // until the owner actively changes one of the parent-breed picks, at which
  // point it becomes a fresh 50/50 cross — editing unrelated fields must not
  // silently rewrite a goat's recorded breed split.
  const [crossTouched, setCrossTouched] = useState(false);

  // 6c — parent-based breed computation.
  const [sireSel, setSireSel] = useState<ParentSelection>({
    goatId: goat?.sire_id ?? null,
    name: goat?.sire_name ?? null,
  });
  const [damSel, setDamSel] = useState<ParentSelection>({
    goatId: newbornDam?.id ?? goat?.dam_id ?? null,
    name: goat?.dam_name ?? null,
  });
  const [useParentsBreed, setUseParentsBreed] = useState(false);

  // UPD-008 (8b) — non-blocking duplicate-tag warning. Other goats whose tag
  // matches the one being typed once case and leading zeros are ignored
  // ("MJ02" / "MJ2" / "mj2"), excluding this goat on an edit. This NEVER blocks
  // save — it is a warning, not a validation rule (spec Section 7).
  const duplicateTagMatches = useMemo(
    () => findTagMatches(tag, goats, goat?.id),
    [tag, goats, goat?.id],
  );

  const submit = isEdit ? updateGoat.bind(null, goat!.id) : createGoat;

  const [error, formAction] = useActionState(
    async (_prevState: string | undefined, formData: FormData) => {
      const result = await submit(formData);
      if (!result) {
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  function resetFromGoat() {
    setTag(isNewborn ? newbornTag : (goat?.tag ?? ""));
    setName(goat?.name ?? "");
    setDob(goat?.date_of_birth ?? (isNewborn ? todayIso() : ""));
    setSex(goat?.sex ?? "female");
    setOrigin(goat?.origin ?? "born_here");
    setIsTempTag(goat?.is_temp_tag ?? false);
    setBarnId(goat?.barn_id != null ? String(goat.barn_id) : "");
    setBreedChoice(initialBreedChoice(initialComp));
    setOtherBreed(initialOtherBreed(initialComp));
    setCrossFirst(initialComp.length >= 2 ? initialComp[0].breed : "");
    setCrossSecond(initialComp.length >= 2 ? initialComp[1].breed : "");
    setCrossTouched(false);
    setSireSel({ goatId: goat?.sire_id ?? null, name: goat?.sire_name ?? null });
    setDamSel({
      goatId: newbornDam?.id ?? goat?.dam_id ?? null,
      name: goat?.dam_name ?? null,
    });
    setUseParentsBreed(false);
    setParentsResetKey(0);
  }

  function handleOriginChange(values: string[]) {
    const next = values[0] as GoatOrigin | undefined;
    if (!next) return;
    setOrigin(next);
    if (next === "purchased" && breedChoice === CROSSED_BREED) {
      setBreedChoice("");
      setCrossFirst("");
      setCrossSecond("");
      setCrossTouched(false);
    }
  }

  const sireGoat =
    sireSel.goatId != null
      ? goats.find((g) => g.id === sireSel.goatId)
      : undefined;
  const damGoat =
    damSel.goatId != null
      ? goats.find((g) => g.id === damSel.goatId)
      : undefined;
  const bothParentsInSystem =
    origin === "born_here" &&
    !!sireGoat &&
    !!damGoat &&
    sireGoat.composition.length > 0 &&
    damGoat.composition.length > 0;

  const breedSource: "manual" | "parents" =
    bothParentsInSystem && useParentsBreed ? "parents" : "manual";

  const parentsComputed: BreedComposition =
    bothParentsInSystem && sireGoat && damGoat
      ? composeFromParents(damGoat.composition, sireGoat.composition)
      : [];

  const isCrossed = breedChoice === CROSSED_BREED;
  const crossValid =
    !!crossFirst && !!crossSecond && crossFirst !== crossSecond;
  const existingIsThisCross =
    initialComp.length === 2 &&
    ((initialComp[0].breed === crossFirst && initialComp[1].breed === crossSecond) ||
      (initialComp[0].breed === crossSecond && initialComp[1].breed === crossFirst));

  function resolvedManual(): BreedComposition | null {
    if (breedChoice === "") {
      // Editing a 3+ breed goat, or nothing chosen yet: keep the stored value.
      return isEdit && initialComp.length > 0 ? initialComp : null;
    }
    if (breedChoice === OTHER_BREED) {
      return otherBreed.trim() ? [{ breed: otherBreed.trim(), pct: 100 }] : null;
    }
    if (breedChoice === CROSSED_BREED) {
      if (!crossValid) return null;
      if (!crossTouched && existingIsThisCross) return initialComp;
      return crossOfPureBreeds(crossFirst, crossSecond);
    }
    return [{ breed: breedChoice, pct: 100 }];
  }

  const resolvedComposition: BreedComposition | null =
    breedSource === "parents"
      ? parentsComputed.length > 0
        ? parentsComputed
        : null
      : resolvedManual();

  const showKeepHint =
    breedSource === "manual" && breedChoice === "" && isEdit && initialComp.length > 0;

  // --- Per-step validation gates (client-side, for UX only — the server action
  // remains the authority on submit). Rules are unchanged from UPD-001/002/06;
  // only the moment they are checked moves from "all at once" to "per step". ---
  const dobDate = dob ? new Date(dob) : null;
  const dobValid =
    !!dobDate && !Number.isNaN(dobDate.getTime()) && dobDate <= new Date();

  // UPD-010 — promoting a temp-tagged goat (toggle off) requires a real tag,
  // different from the auto-generated one, entered in the same save.
  const wasTempTag = isEdit && Boolean(goat?.is_temp_tag);
  const promoting = wasTempTag && !isTempTag;
  const tagIsReal =
    !promoting || (tag.trim() !== "" && tag.trim() !== (goat?.tag ?? "").trim());
  const step1Valid = tag.trim() !== "" && tagIsReal && dobValid;

  const tagReadOnly = isNewborn || (wasTempTag && isTempTag);
  const step2Valid = resolvedComposition != null && barnId !== "";

  const steps: WizardStepDef[] = [
    { id: "identity", label: "Identity & Origin", complete: step1Valid },
    { id: "breed", label: "Breed & Housing", complete: step2Valid },
    { id: "parents", label: "Parents", complete: true, optional: true },
    { id: "review", label: "Notes & Review", complete: true },
  ];
  const wizard = useWizardSteps(steps, { allowJump: isEdit });

  function handleSkipParents() {
    if (!isEdit) {
      setSireSel({ goatId: null, name: null });
      // In newborn mode the dam is locked to the doe this was launched from —
      // skipping only clears the (optional) sire.
      if (!isNewborn) setDamSel({ goatId: null, name: null });
      setParentsResetKey((k) => k + 1);
    }
    wizard.next();
  }

  function parentDisplay(sel: ParentSelection): string {
    if (sel.goatId != null) {
      const g = goats.find((x) => x.id === sel.goatId);
      if (g) return g.name ? `${g.tag} — ${g.name}` : g.tag;
      return "Selected goat";
    }
    return sel.name?.trim() ? sel.name.trim() : "Not set";
  }

  const barnName = barns.find((b) => String(b.id) === barnId)?.name ?? "—";
  const stepClass = (n: number) =>
    wizard.index === n ? "flex flex-col gap-4" : "hidden";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          resetFromGoat();
          setOpenNonce((n) => n + 1);
          wizard.reset(0);
        }
      }}
    >
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
          <DialogTitle>
            {isEdit
              ? "Edit Goat"
              : isNewborn
                ? "Add newborn kid"
                : "Add Goat"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this goat's details."
              : isNewborn
                ? `Record a new kid born to ${newbornDam!.tag}. A temporary tag is assigned now — give it a real tag later.`
                : "Register a new goat to your farm."}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator
          steps={steps}
          index={wizard.index}
          onStepSelect={wizard.goTo}
          maxSelectable={isEdit ? undefined : wizard.maxReached}
        />

        <form
          action={formAction}
          className="flex flex-col gap-4"
          onKeyDown={(e) => {
            // Enter should only submit from the final step; on earlier steps it
            // would otherwise fire the single final submit prematurely.
            if (
              e.key === "Enter" &&
              !wizard.isLast &&
              e.target instanceof HTMLElement &&
              e.target.tagName !== "TEXTAREA"
            ) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex max-h-[58vh] flex-col gap-4 overflow-y-auto pr-1">
            {/* Step 1 — Identity & Origin */}
            <div className={stepClass(0)}>
              <div className="flex flex-col gap-2">
                {isNewborn ? (
                  // UPD-010 — a newborn kid is obviously born on the farm.
                  <p className="text-sm text-copy-secondary">
                    Born on the farm — to{" "}
                    <span className="text-copy-primary">{newbornDam!.tag}</span>
                  </p>
                ) : (
                  <>
                    <label className="text-sm text-copy-secondary">Origin</label>
                    <ToggleGroup
                      value={[origin]}
                      onValueChange={handleOriginChange}
                      variant="outline"
                      className="w-full"
                    >
                      <ToggleGroupItem value="born_here" className="flex-1">
                        Born on the farm
                      </ToggleGroupItem>
                      <ToggleGroupItem value="purchased" className="flex-1">
                        Purchased
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </>
                )}
                <input type="hidden" name="origin" value={origin} />
              </div>

              {!isNewborn && origin === "purchased" && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="purchase_date"
                    className="text-sm text-copy-secondary"
                  >
                    Purchase date
                  </label>
                  <Input
                    id="purchase_date"
                    name="purchase_date"
                    type="date"
                    defaultValue={goat?.purchase_date ?? ""}
                  />
                  <p className="text-xs text-copy-muted">
                    Leave blank if the exact purchase date is unknown.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label htmlFor="tag" className="text-sm text-copy-secondary">
                  Tag
                </label>

                {wasTempTag && (
                  // UPD-010 — promote a temp-tagged kid to a permanent tag.
                  <ToggleGroup
                    value={[isTempTag ? "temp" : "permanent"]}
                    onValueChange={(values) => {
                      const next = values[0];
                      if (next === "temp") setIsTempTag(true);
                      if (next === "permanent") setIsTempTag(false);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <ToggleGroupItem value="temp" className="flex-1">
                      Temporary tag
                    </ToggleGroupItem>
                    <ToggleGroupItem value="permanent" className="flex-1">
                      Permanent tag
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}

                <Input
                  id="tag"
                  name="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  readOnly={tagReadOnly}
                  aria-readonly={tagReadOnly}
                  className={tagReadOnly ? "text-copy-muted" : undefined}
                  required
                />

                {isNewborn && (
                  <p className="text-xs text-copy-muted">
                    Temporary tag: <span className="text-copy-secondary">{tag}</span>{" "}
                    — you can assign a real tag later by editing this goat.
                  </p>
                )}
                {wasTempTag && isTempTag && (
                  <p className="text-xs text-copy-muted">
                    This kid still has a temporary tag. Switch to “Permanent tag”
                    and enter a real one to promote it.
                  </p>
                )}
                {promoting && !tagIsReal && (
                  <p className="text-xs text-warning">
                    Enter a permanent tag (different from the temporary one) to
                    promote this goat.
                  </p>
                )}

                {!isNewborn && !isTempTag && duplicateTagMatches.length > 0 && (
                  <p className="text-xs text-warning">
                    This tag looks the same as an existing goat&apos;s:{" "}
                    {duplicateTagMatches
                      .map((g) => (g.name ? `${g.tag} (${g.name})` : g.tag))
                      .join(", ")}
                    . You can still save if this is a different goat.
                  </p>
                )}

                {(isNewborn ||
                  (wasTempTag && isTempTag)) && (
                  <input type="hidden" name="is_temp_tag" value="true" />
                )}
                {wasTempTag && !isTempTag && (
                  <input type="hidden" name="is_temp_tag" value="false" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm text-copy-secondary">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="sex" className="text-sm text-copy-secondary">
                  Sex
                </label>
                <Select
                  name="sex"
                  value={sex}
                  onValueChange={(value) => setSex(value as GoatSex)}
                >
                  <SelectTrigger id="sex" className="w-full">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="date_of_birth"
                  className="text-sm text-copy-secondary"
                >
                  Date of birth
                </label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
                <p className="text-xs text-copy-muted">
                  Approximate is fine if the exact date of birth is unknown.
                </p>
              </div>

              {sex === "male" && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="reproductive_state"
                    className="text-sm text-copy-secondary"
                  >
                    Reproductive state
                  </label>
                  <Select
                    name="reproductive_state"
                    defaultValue={goat?.reproductive_state ?? "intact"}
                  >
                    <SelectTrigger id="reproductive_state" className="w-full">
                      <SelectValue placeholder="Select reproductive state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intact">Intact</SelectItem>
                      <SelectItem value="castrated">Castrated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Step 2 — Breed & Housing */}
            <div className={stepClass(1)}>
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
                      {parentsComputed.length > 0
                        ? formatBreed(parentsComputed)
                        : "—"}
                    </span>
                  </p>
                ) : (
                  <>
                    <Select
                      items={BREED_SELECT_ITEMS}
                      value={breedChoice}
                      onValueChange={(value) => setBreedChoice(value ?? "")}
                    >
                      <SelectTrigger id="breed" className="w-full">
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
                    {showKeepHint && (
                      <p className="text-xs text-copy-muted">
                        Current: {formatBreed(initialComp)}. Choose a breed above
                        to replace it.
                      </p>
                    )}
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
              </div>

              {breedSource === "manual" && isCrossed && (
                <div className="flex flex-col gap-2 rounded-xl border border-surface-border p-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-copy-secondary">
                      First parent breed
                    </label>
                    <Select
                      items={PURE_BREED_ITEMS}
                      value={crossFirst}
                      onValueChange={(value) => {
                        setCrossFirst(value ?? "");
                        setCrossTouched(true);
                      }}
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
                      onValueChange={(value) => {
                        setCrossSecond(value ?? "");
                        setCrossTouched(true);
                      }}
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

              <div className="flex flex-col gap-2">
                <label htmlFor="status" className="text-sm text-copy-secondary">
                  Status
                </label>
                <Select name="status" defaultValue={goat?.status ?? "active"}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                    <SelectItem value="stolen">Stolen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="barn_id" className="text-sm text-copy-secondary">
                  Barn
                </label>
                <Select
                  name="barn_id"
                  items={barns.map((barn) => ({
                    label: barn.name,
                    value: String(barn.id),
                  }))}
                  value={barnId}
                  onValueChange={(value) => setBarnId(value ?? "")}
                >
                  <SelectTrigger id="barn_id" className="w-full">
                    <SelectValue placeholder="Select a barn" />
                  </SelectTrigger>
                  <SelectContent>
                    {barns.map((barn) => (
                      <SelectItem key={barn.id} value={String(barn.id)}>
                        {barn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 3 — Parents (optional, skippable) */}
            <div className={stepClass(2)}>
              <p className="text-xs text-copy-muted">
                {isNewborn
                  ? "The dam is set to the doe you started from. The sire is optional — pick a goat already in the system or type an outside name."
                  : "Optional — pick a goat already in the system or type an outside name. Lineage can be added or changed any time later."}
              </p>
              <ParentPicker
                key={`sire-${openNonce}-${parentsResetKey}-${origin}`}
                label="Sire"
                fieldPrefix="sire"
                goats={goats}
                preferredSex="male"
                defaultMode={origin === "purchased" ? "external" : "in_system"}
                initialGoatId={parentsResetKey === 0 ? goat?.sire_id : null}
                initialName={parentsResetKey === 0 ? goat?.sire_name : null}
                excludeGoatId={goat?.id}
                onSelectionChange={setSireSel}
              />
              {isNewborn ? (
                // UPD-010 — the dam is locked to the doe this was launched from.
                <div className="flex flex-col gap-2 rounded-xl border border-surface-border p-3">
                  <span className="text-sm text-copy-secondary">Dam</span>
                  <p className="text-sm text-copy-primary">
                    {(() => {
                      const d = goats.find((g) => g.id === newbornDam!.id);
                      return d?.name
                        ? `${d.tag} — ${d.name}`
                        : newbornDam!.tag;
                    })()}
                  </p>
                  <p className="text-xs text-copy-muted">
                    Locked for a newborn kid — this is the doe whose profile you
                    added it from.
                  </p>
                  <input
                    type="hidden"
                    name="dam_id"
                    value={String(newbornDam!.id)}
                  />
                  <input type="hidden" name="dam_name" value="" />
                </div>
              ) : (
                <ParentPicker
                  key={`dam-${openNonce}-${parentsResetKey}-${origin}`}
                  label="Dam"
                  fieldPrefix="dam"
                  goats={goats}
                  preferredSex="female"
                  defaultMode={origin === "purchased" ? "external" : "in_system"}
                  initialGoatId={parentsResetKey === 0 ? goat?.dam_id : null}
                  initialName={parentsResetKey === 0 ? goat?.dam_name : null}
                  excludeGoatId={goat?.id}
                  onSelectionChange={setDamSel}
                />
              )}
            </div>

            {/* Step 4 — Notes & Review */}
            <div className={stepClass(3)}>
              <div className="flex flex-col gap-2">
                <label htmlFor="notes" className="text-sm text-copy-secondary">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={goat?.notes ?? ""}
                />
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border bg-subtle p-3">
                <p className="text-xs font-medium tracking-wide text-copy-muted uppercase">
                  Review
                </p>
                <ReviewRow
                  label="Tag"
                  value={
                    (tag.trim() || "—") +
                    (isNewborn || (wasTempTag && isTempTag)
                      ? " (temporary)"
                      : "")
                  }
                />
                {name.trim() && <ReviewRow label="Name" value={name.trim()} />}
                <ReviewRow
                  label="Origin"
                  value={
                    origin === "purchased" ? "Purchased" : "Born on the farm"
                  }
                />
                <ReviewRow
                  label="Breed"
                  value={
                    resolvedComposition
                      ? formatBreed(resolvedComposition)
                      : "—"
                  }
                />
                <ReviewRow
                  label="Sex"
                  value={sex === "male" ? "Male" : "Female"}
                />
                <ReviewRow label="Date of birth" value={dob || "—"} />
                <ReviewRow label="Barn" value={barnName} />
                <ReviewRow label="Sire" value={parentDisplay(sireSel)} />
                <ReviewRow label="Dam" value={parentDisplay(damSel)} />
              </div>
            </div>
          </div>

          {/* Always mounted so the single final submit carries the breed, no
              matter which step is showing. */}
          <input
            type="hidden"
            name="breed_composition"
            value={JSON.stringify(resolvedComposition ?? [])}
          />

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="border-t border-surface-border pt-4">
            {wizard.isLast ? (
              <WizardNav onBack={wizard.back}>
                <SubmitButton
                  label={
                    isEdit ? "Save" : isNewborn ? "Add kid" : "Add Goat"
                  }
                />
              </WizardNav>
            ) : (
              <WizardNav
                onBack={wizard.isFirst ? undefined : wizard.back}
                onNext={wizard.next}
                nextDisabled={!wizard.canAdvance}
                onSkip={wizard.index === 2 ? handleSkipParents : undefined}
              />
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
