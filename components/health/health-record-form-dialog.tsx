"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import {
  createHealthRecord,
  updateHealthRecord,
  type HealthConditionPreset,
  type HealthRecord,
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
import type { InventoryItem } from "@/app/(app)/inventory/actions";
import { StepIndicator } from "@/components/forms/step-indicator";
import { WizardNav } from "@/components/forms/wizard-nav";
import {
  useWizardSteps,
  type WizardStepDef,
} from "@/components/forms/use-wizard-steps";
import {
  HEALTH_RECORD_STATUSES,
  HEALTH_RECORD_STATUS_LABELS,
  HEALTH_RECORD_TYPES,
  HEALTH_RECORD_TYPE_LABELS,
  type HealthRecordStatus,
  defaultStatusForType,
  isCourseType,
  isFollowUpType,
  isHealthRecordStatus,
} from "@/lib/health/records";

interface HealthRecordFormDialogProps {
  goatId: number;
  record?: HealthRecord;
  /** Every preset visible to the owner (global + own) — for the Title combobox. */
  presets: HealthConditionPreset[];
  /** The owner's medicine inventory — for the Treatment step's Medication combobox (UPD-005). */
  medicines: InventoryItem[];
  triggerLabel: string;
  triggerIcon?: boolean;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
}

const TYPE_ITEMS = HEALTH_RECORD_TYPES.map((t) => ({
  label: HEALTH_RECORD_TYPE_LABELS[t],
  value: t,
}));

const STATUS_ITEMS = HEALTH_RECORD_STATUSES.map((s) => ({
  label: HEALTH_RECORD_STATUS_LABELS[s],
  value: s,
}));

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

function isValidDate(value: string): boolean {
  return value !== "" && !Number.isNaN(new Date(value).getTime());
}

export function HealthRecordFormDialog({
  goatId,
  record,
  presets,
  medicines,
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerSize = "default",
}: HealthRecordFormDialogProps) {
  const isEdit = Boolean(record);
  const [open, setOpen] = useState(false);

  // Fields that gate a step, or drive the conditional fields, are held in
  // state. They still carry `name` attributes, so the single final submit
  // collects them.
  const [recordType, setRecordType] = useState<string>(record?.record_type ?? "");
  const [title, setTitle] = useState(record?.title ?? "");
  // UPD-004 — true while the title came from the "+ Add new" free-text input,
  // so the server saves it as a new owner-scoped preset on submit.
  const [titleIsCustom, setTitleIsCustom] = useState(false);
  // UPD-005 — the Medication field is a combobox over the owner's medicine
  // inventory; `medicationIsCustom` marks a name typed via "+ Add new" so the
  // server creates a new inventory row for it on submit.
  const [medicationName, setMedicationName] = useState(
    record?.medication_name ?? "",
  );
  const [medicationIsCustom, setMedicationIsCustom] = useState(false);
  const [dateOccurred, setDateOccurred] = useState(
    record?.date_occurred ?? "",
  );
  // "" means "use the default for the record type"; a value means the owner
  // picked one explicitly.
  const [status, setStatus] = useState<string>(record?.status ?? "");

  const submit = isEdit
    ? updateHealthRecord.bind(null, record!.id)
    : createHealthRecord;

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

  function resetFromRecord() {
    setRecordType(record?.record_type ?? "");
    setTitle(record?.title ?? "");
    setTitleIsCustom(false);
    setMedicationName(record?.medication_name ?? "");
    setMedicationIsCustom(false);
    setDateOccurred(record?.date_occurred ?? "");
    setStatus(record?.status ?? "");
  }

  const course = isCourseType(recordType);
  const followUp = isFollowUpType(recordType);
  const isDeworming = recordType === "deworming";

  // UPD-005 amendment — the medication/product combobox is filtered by context:
  // Deworming offers only dewormer-category items; the Treatment step offers
  // everything else (antibiotics, vitamins, anti-inflammatories, uncategorised).
  const medicinesForContext = useMemo(
    () =>
      isDeworming
        ? medicines.filter((m) => m.category === "dewormer")
        : medicines.filter((m) => m.category !== "dewormer"),
    [medicines, isDeworming],
  );
  const effectiveStatus: HealthRecordStatus = isHealthRecordStatus(status)
    ? status
    : defaultStatusForType(recordType || "checkup");

  const step0Valid =
    recordType !== "" && title.trim() !== "" && isValidDate(dateOccurred);

  const steps: WizardStepDef[] = [
    { id: "event", label: "Event", complete: step0Valid },
    {
      id: "details",
      label: isDeworming
        ? "Deworming details"
        : followUp
          ? "Follow-up"
          : "Treatment details",
      complete: true,
      optional: true,
    },
    { id: "review", label: "Notes & status", complete: true },
  ];
  const wizard = useWizardSteps(steps, { allowJump: isEdit });

  const stepClass = (n: number) =>
    wizard.index === n ? "flex flex-col gap-4" : "hidden";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          resetFromRecord();
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
            {isEdit ? "Edit health record" : "Add health record"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this health event."
              : "Log a health event for this goat."}
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
          <input type="hidden" name="goat_id" value={goatId} />
          <input type="hidden" name="status" value={effectiveStatus} />

          <div className="flex max-h-[58vh] flex-col gap-4 overflow-y-auto pr-1">
            {/* Step 1 — Event */}
            <div className={stepClass(0)}>
              <div className="flex flex-col gap-2">
                <label htmlFor="record_type" className="text-sm text-copy-secondary">
                  Record type
                </label>
                <Select
                  name="record_type"
                  items={TYPE_ITEMS}
                  value={recordType}
                  onValueChange={(value) => {
                    setRecordType(value ?? "");
                    // The preset list changes with the type, so a title picked
                    // for the old type is cleared (UPD-004 Section 5).
                    setTitle("");
                    setTitleIsCustom(false);
                    // The medication/product list is also context-filtered
                    // (UPD-005 amendment), so clear it too.
                    setMedicationName("");
                    setMedicationIsCustom(false);
                  }}
                >
                  <SelectTrigger id="record_type" className="w-full">
                    <SelectValue placeholder="Select a record type" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEALTH_RECORD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {HEALTH_RECORD_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="title" className="text-sm text-copy-secondary">
                  Title
                </label>
                <input type="hidden" name="title" value={title} />
                <input
                  type="hidden"
                  name="title_is_custom"
                  value={titleIsCustom ? "1" : ""}
                />
                <HealthTitleCombobox
                  key={recordType || "none"}
                  id="title"
                  recordType={recordType}
                  presets={presets}
                  value={title}
                  onChange={(next, isCustom) => {
                    setTitle(next);
                    setTitleIsCustom(isCustom);
                  }}
                />
                {recordType === "" && (
                  <p className="text-xs text-copy-muted">
                    Pick a record type first to see its title suggestions.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="date_occurred"
                  className="text-sm text-copy-secondary"
                >
                  Date
                </label>
                <Input
                  id="date_occurred"
                  name="date_occurred"
                  type="date"
                  value={dateOccurred}
                  onChange={(e) => setDateOccurred(e.target.value)}
                  required
                />
                <p className="text-xs text-copy-muted">
                  When the event happened (or was given).
                </p>
              </div>
            </div>

            {/* Step 2 — conditional details */}
            <div className={stepClass(1)}>
              {!course && !followUp && (
                <p className="text-sm text-copy-muted">
                  Pick a record type on the previous step to see the fields for
                  it. Otherwise you can skip this step.
                </p>
              )}

              {course && (
                <>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="medication_name"
                      className="text-sm text-copy-secondary"
                    >
                      Medication
                    </label>
                    <input
                      type="hidden"
                      name="medication_name"
                      value={medicationName}
                    />
                    <input
                      type="hidden"
                      name="medication_is_custom"
                      value={medicationIsCustom ? "1" : ""}
                    />
                    <MedicationCombobox
                      key={recordType}
                      id="medication_name"
                      medicines={medicinesForContext}
                      value={medicationName}
                      onChange={(next, isCustom) => {
                        setMedicationName(next);
                        setMedicationIsCustom(isCustom);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="dosage"
                      className="text-sm text-copy-secondary"
                    >
                      Dosage
                    </label>
                    <Input
                      id="dosage"
                      name="dosage"
                      defaultValue={record?.dosage ?? ""}
                      placeholder="e.g. 10 ml"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="treatment_start_date"
                      className="text-sm text-copy-secondary"
                    >
                      Course start date
                    </label>
                    <Input
                      id="treatment_start_date"
                      name="treatment_start_date"
                      type="date"
                      defaultValue={record?.treatment_start_date ?? ""}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-1 flex-col gap-2">
                      <label
                        htmlFor="treatment_duration_days"
                        className="text-sm text-copy-secondary"
                      >
                        Length (days)
                      </label>
                      <Input
                        id="treatment_duration_days"
                        name="treatment_duration_days"
                        type="number"
                        min={1}
                        step={1}
                        defaultValue={record?.treatment_duration_days ?? ""}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <label
                        htmlFor="treatment_times_per_day"
                        className="text-sm text-copy-secondary"
                      >
                        Doses per day
                      </label>
                      <Input
                        id="treatment_times_per_day"
                        name="treatment_times_per_day"
                        type="number"
                        min={1}
                        step={1}
                        defaultValue={record?.treatment_times_per_day ?? ""}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-copy-muted">
                    Fill the course in to keep the record marked{" "}
                    <span className="text-copy-secondary">Active</span> until it
                    is finished.
                  </p>
                </>
              )}

              {isDeworming && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="medication_name"
                    className="text-sm text-copy-secondary"
                  >
                    Dewormer product
                  </label>
                  <input
                    type="hidden"
                    name="medication_name"
                    value={medicationName}
                  />
                  <input
                    type="hidden"
                    name="medication_is_custom"
                    value={medicationIsCustom ? "1" : ""}
                  />
                  <MedicationCombobox
                    key={recordType}
                    id="medication_name"
                    noun="dewormer"
                    medicines={medicinesForContext}
                    value={medicationName}
                    onChange={(next, isCustom) => {
                      setMedicationName(next);
                      setMedicationIsCustom(isCustom);
                    }}
                  />
                  <p className="text-xs text-copy-muted">
                    Optional. New products added here are filed under dewormers.
                  </p>
                </div>
              )}

              {followUp && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="next_due_date"
                    className="text-sm text-copy-secondary"
                  >
                    Next due date
                  </label>
                  <Input
                    id="next_due_date"
                    name="next_due_date"
                    type="date"
                    defaultValue={record?.next_due_date ?? ""}
                  />
                  <p className="text-xs text-copy-muted">
                    When this is due again (e.g. the next booster or deworming).
                    Leave blank if there is no follow-up.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3 — Notes & status */}
            <div className={stepClass(2)}>
              <div className="flex flex-col gap-2">
                <label htmlFor="vet_name" className="text-sm text-copy-secondary">
                  Vet name
                </label>
                <Input
                  id="vet_name"
                  name="vet_name"
                  defaultValue={record?.vet_name ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="cost" className="text-sm text-copy-secondary">
                  Cost
                </label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={record?.cost ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="status" className="text-sm text-copy-secondary">
                  Status
                </label>
                <Select
                  items={STATUS_ITEMS}
                  value={effectiveStatus}
                  onValueChange={(value) => setStatus(value ?? "")}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEALTH_RECORD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {HEALTH_RECORD_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-copy-muted">
                  {course
                    ? "Active while the course is ongoing; mark Completed once it is done."
                    : "One-off events are usually Completed."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="notes" className="text-sm text-copy-secondary">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={record?.notes ?? ""}
                />
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl border border-surface-border bg-subtle p-3">
                <p className="text-xs font-medium tracking-wide text-copy-muted uppercase">
                  Review
                </p>
                <ReviewRow
                  label="Type"
                  value={
                    recordType
                      ? HEALTH_RECORD_TYPE_LABELS[
                          recordType as keyof typeof HEALTH_RECORD_TYPE_LABELS
                        ]
                      : "—"
                  }
                />
                <ReviewRow label="Title" value={title.trim() || "—"} />
                <ReviewRow label="Date" value={dateOccurred || "—"} />
                <ReviewRow
                  label="Status"
                  value={HEALTH_RECORD_STATUS_LABELS[effectiveStatus]}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="border-t border-surface-border pt-4">
            {wizard.isLast ? (
              <WizardNav onBack={wizard.back}>
                <SubmitButton label={isEdit ? "Save" : "Add record"} />
              </WizardNav>
            ) : (
              <WizardNav
                onBack={wizard.isFirst ? undefined : wizard.back}
                onNext={wizard.next}
                nextDisabled={!wizard.canAdvance}
                onSkip={wizard.index === 1 ? wizard.next : undefined}
              />
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
