"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarPlus, Check, Search } from "lucide-react";
import {
  bulkCreateHealthRecords,
  type BulkHealthRecordResult,
  type HealthConditionPreset,
} from "@/app/(app)/health/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HealthTitleCombobox } from "@/components/health/health-title-combobox";
import { MedicationCombobox } from "@/components/health/medication-combobox";
import { SubmitButton } from "@/components/forms/submit-button";
import { StepIndicator } from "@/components/forms/step-indicator";
import { WizardNav } from "@/components/forms/wizard-nav";
import {
  useWizardSteps,
  type WizardStepDef,
} from "@/components/forms/use-wizard-steps";
import {
  medicinesForRecordType,
  productFieldFor,
} from "@/lib/health/products";
import {
  HEALTH_RECORD_TYPE_LABELS,
  type HealthRecordType,
} from "@/lib/health/records";
import { filterGoats, type FilterableGoat } from "@/lib/goats/search";
import { deriveGoatStage, type GoatStage } from "@/lib/goats/stage";
import type { InventoryItem } from "@/app/(app)/inventory/actions";

// UPD-017 — the Health page's "Bulk schedule" flow.
//
// It is a dialog launched from the Health page's header, NOT a third tab:
// UPD-016 had just established History / Schedule and this is an action, not a
// third kind of content (spec Section 5).
//
// Nothing about a single-goat record is rebuilt here. The title field is
// UPD-004's `HealthTitleCombobox`, the product field is UPD-005's
// `MedicationCombobox` (pointed at the category `lib/health/products.ts` gives
// the chosen type), the goat filtering is UPD-008/009's own `filterGoats`, and
// the submitted values go through the same server-side validation a per-goat
// create uses. What is new is only the target-selection step and the
// one-statement bulk insert behind it.

/** The three routine, whole-group treatments this flow covers (spec Section 5). */
const BULK_RECORD_TYPES: HealthRecordType[] = [
  "deworming",
  "dip_wash",
  "vaccination",
];

const STAGE_OPTIONS: GoatStage[] = [
  "Kid",
  "Doeling",
  "Buckling",
  "Doe",
  "Buck",
  "Wether",
];

const ALL = "all";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(value: string): boolean {
  return value !== "" && !Number.isNaN(new Date(value).getTime());
}

function formatDate(value: string): string {
  if (!isValidDate(value)) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** What the picker needs from a goat: `filterGoats`' input plus an id and label. */
export type BulkGoat = FilterableGoat & {
  id: number;
  barn_id: number | null;
};

function goatLabel(goat: BulkGoat): string {
  return goat.name ? `${goat.tag} — ${goat.name}` : goat.tag;
}

interface BulkHealthDialogProps {
  /** The owner's herd, already RLS-scoped by the server component above. */
  goats: BulkGoat[];
  barns: { id: number; name: string }[];
  presets: HealthConditionPreset[];
  medicines: InventoryItem[];
}

export function BulkHealthDialog({
  goats,
  barns,
  presets,
  medicines,
}: BulkHealthDialogProps) {
  const [open, setOpen] = useState(false);

  // Step 1 — record type.
  const [recordType, setRecordType] = useState<string>("");

  // Step 2 — target goats. The filters mirror the goats list's own controls;
  // `selected` is the fine-tuned answer and is deliberately independent of
  // them, so narrowing the filters to check something never drops a goat that
  // was already ticked.
  const [search, setSearch] = useState("");
  const [sex, setSex] = useState<string>(ALL);
  const [stage, setStage] = useState<string>(ALL);
  const [barn, setBarn] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Step 3 — the shared details, the same fields a single-goat entry has.
  const [title, setTitle] = useState("");
  const [titleIsCustom, setTitleIsCustom] = useState(false);
  const [medicationName, setMedicationName] = useState("");
  const [medicationIsCustom, setMedicationIsCustom] = useState(false);
  const [dateOccurred, setDateOccurred] = useState(todayIso());
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [result, formAction] = useActionState(
    async (
      _prev: BulkHealthRecordResult | undefined,
      formData: FormData,
    ): Promise<BulkHealthRecordResult | undefined> => {
      const outcome = await bulkCreateHealthRecords(formData);
      // A success leaves the dialog open on a summary of what was created —
      // this writes many records at once, so "it closed" is not enough
      // confirmation.
      return outcome;
    },
    undefined,
  );

  function reset() {
    setRecordType("");
    setSearch("");
    setSex(ALL);
    setStage(ALL);
    setBarn(ALL);
    setSelected(new Set());
    setTitle("");
    setTitleIsCustom(false);
    setMedicationName("");
    setMedicationIsCustom(false);
    setDateOccurred(todayIso());
    setNextDueDate("");
    setNotes("");
  }

  const productField = productFieldFor(recordType);

  const medicinesForContext = useMemo(
    () => medicinesForRecordType(medicines, recordType),
    [medicines, recordType],
  );

  // UPD-008/009's own filter, not a second copy of it. Status is pinned to
  // `active`: a sold, deceased or stolen goat is not something to schedule a
  // treatment for, so it is never offered here (their records stay visible in
  // the History tab, which does show every status).
  const filtered = useMemo(
    () =>
      filterGoats(goats, {
        search,
        sex: sex === ALL ? undefined : (sex as "male" | "female"),
        stage: stage === ALL ? undefined : (stage as GoatStage),
        barnId: barn === ALL ? undefined : Number(barn),
        status: "active",
      }),
    [goats, search, sex, stage, barn],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((goat) => selected.has(goat.id));

  function toggleGoat(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const goat of filtered) {
        if (allFilteredSelected) next.delete(goat.id);
        else next.add(goat.id);
      }
      return next;
    });
  }

  const selectedGoats = useMemo(
    () => goats.filter((goat) => selected.has(goat.id)),
    [goats, selected],
  );

  // Selected goats the current filters are hiding — called out so the count in
  // the confirmation can never be a surprise.
  const hiddenSelectedCount =
    selectedGoats.length -
    filtered.filter((goat) => selected.has(goat.id)).length;

  const detailsValid = title.trim() !== "" && isValidDate(dateOccurred);

  const steps: WizardStepDef[] = [
    { id: "type", label: "Type", complete: recordType !== "" },
    { id: "goats", label: "Goats", complete: selected.size > 0 },
    { id: "details", label: "Details", complete: detailsValid },
    { id: "confirm", label: "Confirm", complete: true },
  ];
  const wizard = useWizardSteps(steps);

  const stepClass = (n: number) =>
    wizard.index === n ? "flex flex-col gap-4" : "hidden";

  const typeLabel = recordType
    ? HEALTH_RECORD_TYPE_LABELS[recordType as HealthRecordType]
    : "—";

  const typeItems = BULK_RECORD_TYPES.map((type) => ({
    label: HEALTH_RECORD_TYPE_LABELS[type],
    value: type,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset();
          wizard.reset(0);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <CalendarPlus className="h-5 w-5" />
            Bulk schedule
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk schedule</DialogTitle>
          <DialogDescription>
            Log one deworming, dip wash or vaccination for a whole group of
            goats at once.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator
          steps={steps}
          index={wizard.index}
          onStepSelect={wizard.goTo}
          maxSelectable={wizard.maxReached}
        />

        <form
          action={formAction}
          className="flex flex-col gap-4"
          onKeyDown={(e) => {
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
          {/* Everything the server needs travels as hidden fields, so the same
              parse that reads a single-goat form reads this one. */}
          <input type="hidden" name="record_type" value={recordType} />
          <input
            type="hidden"
            name="goat_ids"
            value={[...selected].join(",")}
          />
          <input type="hidden" name="title" value={title} />
          <input
            type="hidden"
            name="title_is_custom"
            value={titleIsCustom ? "1" : ""}
          />
          <input
            type="hidden"
            name="medication_name"
            value={productField ? medicationName : ""}
          />
          <input
            type="hidden"
            name="medication_is_custom"
            value={productField && medicationIsCustom ? "1" : ""}
          />
          <input type="hidden" name="date_occurred" value={dateOccurred} />
          <input type="hidden" name="next_due_date" value={nextDueDate} />
          <input type="hidden" name="notes" value={notes} />

          <div className="flex max-h-[58vh] flex-col gap-4 overflow-y-auto pr-1">
            {/* Step 1 — record type */}
            <div className={stepClass(0)}>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="bulk_record_type"
                  className="text-sm text-copy-secondary"
                >
                  Record type
                </label>
                <Select
                  items={typeItems}
                  value={recordType}
                  onValueChange={(value) => {
                    setRecordType(value ?? "");
                    // Both the title presets and the product list are filtered
                    // by type, so a value picked for the old type is cleared —
                    // the same rule the single-goat form follows.
                    setTitle("");
                    setTitleIsCustom(false);
                    setMedicationName("");
                    setMedicationIsCustom(false);
                  }}
                >
                  <SelectTrigger id="bulk_record_type" className="w-full">
                    <SelectValue placeholder="Select a record type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-copy-muted">
                  These are the routine treatments usually given to a whole
                  group on the same day. Anything else is logged on the goat’s
                  own Health tab.
                </p>
              </div>
            </div>

            {/* Step 2 — target goats */}
            <div className={stepClass(1)}>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <div className="relative w-full sm:w-52">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-copy-muted" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tag or name"
                    className="pl-8"
                    aria-label="Search goats by tag or name"
                  />
                </div>

                <Select value={sex} onValueChange={(v) => setSex(v ?? ALL)}>
                  <SelectTrigger
                    className="w-full sm:w-32"
                    aria-label="Filter by sex"
                  >
                    <SelectValue placeholder="All sexes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All sexes</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={stage} onValueChange={(v) => setStage(v ?? ALL)}>
                  <SelectTrigger
                    className="w-full sm:w-36"
                    aria-label="Filter by stage"
                  >
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All stages</SelectItem>
                    {STAGE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={barn} onValueChange={(v) => setBarn(v ?? ALL)}>
                  <SelectTrigger
                    className="w-full sm:w-40"
                    aria-label="Filter by barn"
                  >
                    <SelectValue placeholder="All barns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All barns</SelectItem>
                    {barns.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  disabled={filtered.length === 0}
                  className="inline-flex items-center gap-2 text-sm text-copy-secondary hover:text-copy-primary disabled:opacity-50"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      allFilteredSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-surface-border"
                    }`}
                  >
                    {allFilteredSelected && <Check className="h-3 w-3" />}
                  </span>
                  Select all {filtered.length} shown
                </button>
                <span className="text-sm text-copy-primary">
                  {selected.size} goat{selected.size === 1 ? "" : "s"} selected
                </span>
              </div>

              {hiddenSelectedCount > 0 && (
                <p className="text-xs text-copy-muted">
                  {hiddenSelectedCount} selected goat
                  {hiddenSelectedCount === 1 ? " is" : "s are"} hidden by the
                  current filters — they are still included.
                </p>
              )}

              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-surface-border p-1">
                {filtered.length === 0 ? (
                  <p className="p-3 text-sm text-copy-muted">
                    No active goats match these filters.
                  </p>
                ) : (
                  filtered.map((goat) => {
                    const isSelected = selected.has(goat.id);
                    return (
                      <button
                        key={goat.id}
                        type="button"
                        onClick={() => toggleGoat(goat.id)}
                        aria-pressed={isSelected}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-subtle"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-surface-border"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </span>
                          {goatLabel(goat)}
                        </span>
                        <span className="text-xs text-copy-muted">
                          {deriveGoatStage({
                            sex: goat.sex,
                            reproductiveState: goat.reproductive_state,
                            dateOfBirth: goat.date_of_birth,
                          })}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 3 — shared details */}
            <div className={stepClass(2)}>
              <p className="text-sm text-copy-muted">
                These details apply to every one of the {selected.size} selected
                goat{selected.size === 1 ? "" : "s"}.
              </p>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="bulk_title"
                  className="text-sm text-copy-secondary"
                >
                  Title
                </label>
                <HealthTitleCombobox
                  key={recordType || "none"}
                  id="bulk_title"
                  recordType={recordType}
                  presets={presets}
                  value={title}
                  onChange={(next, isCustom) => {
                    setTitle(next);
                    setTitleIsCustom(isCustom);
                  }}
                />
              </div>

              {productField && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="bulk_medication_name"
                    className="text-sm text-copy-secondary"
                  >
                    {productField.label}
                  </label>
                  <MedicationCombobox
                    key={recordType}
                    id="bulk_medication_name"
                    noun={productField.noun}
                    medicines={medicinesForContext}
                    value={medicationName}
                    onChange={(next, isCustom) => {
                      setMedicationName(next);
                      setMedicationIsCustom(isCustom);
                    }}
                  />
                  <p className="text-xs text-copy-muted">{productField.hint}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="bulk_date_occurred"
                  className="text-sm text-copy-secondary"
                >
                  Date given
                </label>
                <Input
                  id="bulk_date_occurred"
                  type="date"
                  value={dateOccurred}
                  onChange={(e) => setDateOccurred(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="bulk_next_due_date"
                  className="text-sm text-copy-secondary"
                >
                  Next due date
                </label>
                <Input
                  id="bulk_next_due_date"
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
                <p className="text-xs text-copy-muted">
                  When this is due again. Leave blank if there is no follow-up.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="bulk_notes"
                  className="text-sm text-copy-secondary"
                >
                  Note
                </label>
                <Textarea
                  id="bulk_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional — saved on every record"
                />
              </div>
            </div>

            {/* Step 4 — confirm */}
            <div className={stepClass(3)}>
              <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-subtle p-3">
                <p className="text-sm text-copy-primary">
                  Log{" "}
                  <span className="font-medium">
                    {medicationName ? `${medicationName} ` : ""}
                    {typeLabel.toLowerCase()}
                  </span>{" "}
                  ({title.trim() || "—"}) on{" "}
                  <span className="font-medium">{formatDate(dateOccurred)}</span>{" "}
                  for{" "}
                  <span className="font-medium">
                    {selected.size} goat{selected.size === 1 ? "" : "s"}
                  </span>
                  {nextDueDate
                    ? `, due again ${formatDate(nextDueDate)}?`
                    : ", with no follow-up date?"}
                </p>
                <p className="text-xs text-copy-muted">
                  This creates one health record per goat — the same record you
                  would add on each goat’s own Health tab.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border p-3">
                <p className="text-xs font-medium tracking-wide text-copy-muted uppercase">
                  Goats ({selectedGoats.length})
                </p>
                <p className="text-sm text-copy-secondary">
                  {selectedGoats.map(goatLabel).join(", ") || "—"}
                </p>
              </div>

              {result?.error && (
                <p className="text-sm text-error">{result.error}</p>
              )}

              {result?.created ? (
                <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border bg-subtle p-3">
                  <p className="text-sm text-copy-primary">
                    Created {result.created} record
                    {result.created === 1 ? "" : "s"}:{" "}
                    {result.createdGoats?.join(", ")}.
                  </p>
                  {result.missingGoats && result.missingGoats.length > 0 && (
                    <p className="text-sm text-warning">
                      Skipped {result.missingGoats.length} goat
                      {result.missingGoats.length === 1 ? "" : "s"} that could
                      not be found ({result.missingGoats.join(", ")}) — nothing
                      was created for {result.missingGoats.length === 1
                        ? "it"
                        : "them"}
                      .
                    </p>
                  )}
                  <p className="text-xs text-copy-muted">
                    Check them in the History tab, or on each goat’s own Health
                    tab.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-surface-border pt-4">
            {wizard.isLast ? (
              /*
                Once the records exist there is nothing to go back and change,
                and stepping back to edit a submitted batch would only invite a
                second, accidental one — so a successful run ends here, on its
                summary, with Done as the only way out.
              */
              <WizardNav onBack={result?.created ? undefined : wizard.back}>
                {result?.created ? (
                  <Button type="button" onClick={() => setOpen(false)}>
                    Done
                  </Button>
                ) : (
                  <SubmitButton
                    disabled={selected.size === 0 || !detailsValid}
                    pendingLabel="Creating…"
                  >
                    Create {selected.size} record
                    {selected.size === 1 ? "" : "s"}
                  </SubmitButton>
                )}
              </WizardNav>
            ) : (
              <WizardNav
                onBack={wizard.isFirst ? undefined : wizard.back}
                onNext={wizard.next}
                nextDisabled={!wizard.canAdvance}
              />
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
