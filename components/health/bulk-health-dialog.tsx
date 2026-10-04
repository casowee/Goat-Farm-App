"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarPlus, X } from "lucide-react";
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
import type { GoatStage } from "@/lib/goats/stage";
import { normalizeTag } from "@/lib/goats/tag";
import {
  GOAT_STAGES,
  batchLabel,
  type BatchGroupFilters,
} from "@/lib/health/batch-label";
import type { InventoryItem } from "@/app/(app)/inventory/actions";

// UPD-017 — the Health page's "Bulk schedule" flow.
//
// It is a dialog launched from the Health page's header, NOT a tab of its own:
// it is an action, not a kind of content (spec Section 5).
//
// Amended 2026-10-04: the target is a GROUP, chosen with the sex / stage / barn
// filters, and the dialog shows how many goats match — not who they are. There
// is no goat list at all. To leave a few goats out, the owner types a tag into
// the "Exclude goats" field; the only tags ever on screen are the ones the
// owner typed, shown as removable chips.
//
// Nothing about a single-goat record is rebuilt here. The title field is
// UPD-004's `HealthTitleCombobox`, the product field is UPD-005's
// `MedicationCombobox` (pointed at the category `lib/health/products.ts` gives
// the chosen type), the goat filtering is UPD-008/009's own `filterGoats`, and
// the submitted values go through the same server-side validation a per-goat
// create uses. What is new is only the target-selection step and the bulk
// insert (one batch row + one multi-row statement) behind it.

/** The three routine, whole-group treatments this flow covers (spec Section 5). */
const BULK_RECORD_TYPES: HealthRecordType[] = [
  "deworming",
  "dip_wash",
  "vaccination",
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

  // Step 2 — target group. The three group filters ARE the selection: every
  // active goat they match is targeted. `excluded` holds the few the owner
  // dropped by typing their tag, and only matters for goats the filters
  // currently match.
  const [sex, setSex] = useState<string>(ALL);
  const [stage, setStage] = useState<string>(ALL);
  const [barn, setBarn] = useState<string>(ALL);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [excludeInput, setExcludeInput] = useState("");
  const [excludeMessage, setExcludeMessage] = useState("");

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
    setSex(ALL);
    setStage(ALL);
    setBarn(ALL);
    setExcluded(new Set());
    setExcludeInput("");
    setExcludeMessage("");
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
  // treatment for, so it is never part of a group.
  const matched = useMemo(
    () =>
      filterGoats(goats, {
        sex: sex === ALL ? undefined : (sex as "male" | "female"),
        stage: stage === ALL ? undefined : (stage as GoatStage),
        barnId: barn === ALL ? undefined : Number(barn),
        status: "active",
      }),
    [goats, sex, stage, barn],
  );

  // Who actually gets a record: the group, minus anyone excluded by hand.
  const targets = useMemo(
    () => matched.filter((goat) => !excluded.has(goat.id)),
    [matched, excluded],
  );
  // The chips: excluded goats that are in the current group. A goat excluded
  // under one set of filters and no longer matched simply stops counting.
  const excludedGoats = useMemo(
    () => matched.filter((goat) => excluded.has(goat.id)),
    [matched, excluded],
  );

  // The same generator the server uses for the stored batch label, so the
  // group named here is the group that gets saved.
  const groupFilters: BatchGroupFilters = {
    sex: sex === ALL ? undefined : (sex as "male" | "female"),
    stage: stage === ALL ? undefined : (stage as GoatStage),
    barnName:
      barn === ALL
        ? undefined
        : barns.find((b) => String(b.id) === barn)?.name,
  };
  const groupLabel = batchLabel(groupFilters, targets.length, matched.length);

  /**
   * Exclude the goat whose tag was typed. Matched against the CURRENT GROUP
   * only, with UPD-008's `normalizeTag` — the same "is this the same tag?"
   * rule duplicate detection uses — so "21", "021" and "Mj2" / "MJ02" find the
   * same goat. A tag that is not in the group is reported, never added.
   */
  function addExclusion() {
    const typed = excludeInput.trim();
    const key = normalizeTag(typed);
    if (!key) return;

    const hits = matched.filter((goat) => normalizeTag(goat.tag) === key);
    if (hits.length === 0) {
      setExcludeMessage(`No goat with tag ${typed} in this group`);
      return;
    }
    if (hits.every((goat) => excluded.has(goat.id))) {
      setExcludeMessage(`Tag ${typed} is already excluded`);
      return;
    }

    setExcluded((prev) => {
      const next = new Set(prev);
      for (const goat of hits) next.add(goat.id);
      return next;
    });
    setExcludeInput("");
    setExcludeMessage("");
  }

  function removeExclusion(id: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const detailsValid = title.trim() !== "" && isValidDate(dateOccurred);

  const steps: WizardStepDef[] = [
    { id: "type", label: "Type", complete: recordType !== "" },
    { id: "goats", label: "Group", complete: targets.length > 0 },
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
            value={targets.map((goat) => goat.id).join(",")}
          />
          {/* The group itself, so the server can generate the batch label. */}
          <input type="hidden" name="group_sex" value={sex === ALL ? "" : sex} />
          <input
            type="hidden"
            name="group_stage"
            value={stage === ALL ? "" : stage}
          />
          <input
            type="hidden"
            name="group_barn_id"
            value={barn === ALL ? "" : barn}
          />
          <input type="hidden" name="group_total" value={matched.length} />
          {/* Which goats were left out, so the Health page can name them. */}
          <input
            type="hidden"
            name="excluded_goat_ids"
            value={excludedGoats.map((goat) => goat.id).join(",")}
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

            {/* Step 2 — target group */}
            <div className={stepClass(1)}>
              <p className="text-sm text-copy-muted">
                Choose the group. Leave everything on “All” for the whole herd.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Select
                  value={sex}
                  onValueChange={(v) => {
                    setSex(v ?? ALL);
                    setExcludeMessage("");
                  }}
                >
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

                <Select
                  value={stage}
                  onValueChange={(v) => {
                    setStage(v ?? ALL);
                    setExcludeMessage("");
                  }}
                >
                  <SelectTrigger
                    className="w-full sm:w-36"
                    aria-label="Filter by stage"
                  >
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All stages</SelectItem>
                    {GOAT_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={barn}
                  onValueChange={(v) => {
                    setBarn(v ?? ALL);
                    setExcludeMessage("");
                  }}
                >
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

              <div
                className="flex flex-col gap-1 rounded-xl border border-surface-border bg-subtle p-3"
                aria-live="polite"
              >
                <p className="text-sm font-medium text-copy-primary">
                  {groupLabel}
                </p>
                <p className="text-sm text-copy-secondary">
                  {matched.length === 0
                    ? "No active goats match."
                    : excludedGoats.length > 0
                      ? `${targets.length} of ${matched.length} goats`
                      : matched.length === 1
                        ? "1 goat matches"
                        : `${matched.length} goats match`}
                </p>
              </div>

              {matched.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="bulk_exclude_tag"
                    className="text-sm text-copy-secondary"
                  >
                    Exclude goats (optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="bulk_exclude_tag"
                      value={excludeInput}
                      onChange={(e) => {
                        setExcludeInput(e.target.value);
                        setExcludeMessage("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addExclusion();
                        }
                      }}
                      placeholder="Type a tag"
                      autoComplete="off"
                      autoCapitalize="off"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addExclusion}
                      disabled={excludeInput.trim() === ""}
                    >
                      Exclude
                    </Button>
                  </div>

                  <p className="text-xs text-copy-muted" aria-live="polite">
                    {excludeMessage ||
                      "Type a goat’s tag to leave it out of this action."}
                  </p>

                  {excludedGoats.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {excludedGoats.map((goat) => (
                        <li key={goat.id}>
                          <button
                            type="button"
                            onClick={() => removeExclusion(goat.id)}
                            aria-label={`Stop excluding ${goat.tag}`}
                            className="tappable-inline inline-flex items-center gap-1 rounded-xl border border-surface-border bg-subtle py-1 pr-1.5 pl-2.5 text-sm text-copy-primary hover:text-copy-secondary"
                          >
                            {goat.tag}
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Step 3 — shared details */}
            <div className={stepClass(2)}>
              <p className="text-sm text-copy-muted">
                These details apply to every one of the {targets.length} goat
                {targets.length === 1 ? "" : "s"} in this group.
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
                    {targets.length} goat{targets.length === 1 ? "" : "s"}
                  </span>{" "}
                  ({groupLabel})
                  {nextDueDate
                    ? `, due again ${formatDate(nextDueDate)}?`
                    : ", with no follow-up date?"}
                </p>
                <p className="text-xs text-copy-muted">
                  This creates one health record per goat — the same record you
                  would add on each goat’s own Health tab.
                </p>
              </div>

              {result?.error && (
                <p className="text-sm text-error">{result.error}</p>
              )}

              {result?.created ? (
                <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border bg-subtle p-3">
                  <p className="text-sm text-copy-primary">
                    Created {result.created} record
                    {result.created === 1 ? "" : "s"}
                    {result.groupLabel ? ` for ${result.groupLabel}` : ""}.
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
                    It now shows as one line on the Upcoming and Done tabs,
                    and on each goat’s own Health tab.
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
                    disabled={targets.length === 0 || !detailsValid}
                    pendingLabel="Creating…"
                  >
                    Create {targets.length} record
                    {targets.length === 1 ? "" : "s"}
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
