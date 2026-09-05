"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Plus, X } from "lucide-react";
import {
  createBreedingSeason,
  updateBreedingSeason,
} from "@/app/(app)/breeding/actions";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EligibleMale } from "@/lib/breeding/eligible-males";
import type { SeasonTemplate } from "@/lib/breeding/templates";
import { addMonths, parseDateOnly } from "@/lib/breeding/season";

export interface BarnOption {
  id: number;
  name: string;
}

export interface SeasonRow {
  id: number;
  barn_id: number | null;
  season_template_id: number | null;
  start_date: string;
  end_date: string | null;
  note: string | null;
  /** The bucks already linked to this season (may include now-ineligible ones). */
  bucks: EligibleMale[];
}

interface SeasonFormDialogProps {
  bucks: EligibleMale[];
  bucklings: EligibleMale[];
  barns: BarnOption[];
  templates: SeasonTemplate[];
  season?: SeasonRow;
  /** Pre-selects a template (from an "Approve season" prompt). */
  templateId?: number;
  /** Default start date for a new season (ISO `YYYY-MM-DD`). */
  defaultStartDate: string;
  triggerLabel: string;
  triggerIcon?: boolean;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
}

const NO_BARN = "__none__";
const NO_TEMPLATE = "__none__";

function maleLabel(male: EligibleMale): string {
  return male.name ? `${male.tag} — ${male.name}` : male.tag;
}

function SubmitButton({
  label,
  disabled,
}: {
  label: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function SeasonFormDialog({
  bucks,
  bucklings,
  barns,
  templates,
  season,
  templateId,
  defaultStartDate,
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerSize = "default",
}: SeasonFormDialogProps) {
  const isEdit = Boolean(season);
  const [open, setOpen] = useState(false);

  const initialSelected = useMemo(
    () => (season?.bucks ?? []).map((b) => b.id),
    [season],
  );
  const initialTemplate =
    season?.season_template_id != null
      ? String(season.season_template_id)
      : templateId != null
        ? String(templateId)
        : NO_TEMPLATE;

  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [showBucklings, setShowBucklings] = useState(false);
  const [query, setQuery] = useState("");
  const [barnId, setBarnId] = useState<string>(
    season?.barn_id != null ? String(season.barn_id) : NO_BARN,
  );
  const [templateSel, setTemplateSel] = useState<string>(initialTemplate);
  const [startDate, setStartDate] = useState<string>(
    season?.start_date ?? defaultStartDate,
  );

  // Label lookup covers every male that could show as a chip: eligible bucks,
  // eligible bucklings, and any buck already on this season (even if it is no
  // longer eligible, e.g. later sold).
  const maleById = useMemo(() => {
    const map = new Map<number, EligibleMale>();
    for (const m of [...bucks, ...bucklings, ...(season?.bucks ?? [])]) {
      if (!map.has(m.id)) map.set(m.id, m);
    }
    return map;
  }, [bucks, bucklings, season]);

  const bucklingIds = useMemo(
    () => new Set(bucklings.map((b) => b.id)),
    [bucklings],
  );

  // Options offered in the list: bucks always; bucklings only when the toggle
  // is on. (A selected buckling stays a chip regardless — see the chip row.)
  const listOptions = useMemo(() => {
    const pool = showBucklings ? [...bucks, ...bucklings] : bucks;
    const q = query.trim().toLocaleLowerCase();
    const filtered = q
      ? pool.filter((m) => maleLabel(m).toLocaleLowerCase().includes(q))
      : pool;
    return [...filtered].sort((a, b) =>
      a.tag.localeCompare(b.tag, undefined, { numeric: true }),
    );
  }, [bucks, bucklings, showBucklings, query]);

  const submit = isEdit
    ? updateBreedingSeason.bind(null, season!.id)
    : createBreedingSeason;

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await submit(formData);
      if (!result) setOpen(false);
      return result;
    },
    undefined,
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSelected(initialSelected);
      setShowBucklings(false);
      setQuery("");
      setBarnId(season?.barn_id != null ? String(season.barn_id) : NO_BARN);
      setTemplateSel(initialTemplate);
      setStartDate(season?.start_date ?? defaultStartDate);
    }
  }

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const barnItems = [
    { label: "No barn / whole herd", value: NO_BARN },
    ...barns.map((barn) => ({ label: barn.name, value: String(barn.id) })),
  ];
  const templateItems = [
    { label: "None (ad hoc season)", value: NO_TEMPLATE },
    ...templates.map((t) => ({ label: t.label, value: String(t.id) })),
  ];

  const resolvedBarn = barnId === NO_BARN ? "" : barnId;
  const resolvedTemplate = templateSel === NO_TEMPLATE ? "" : templateSel;
  const noEligible = bucks.length === 0 && bucklings.length === 0;
  const canSubmit = selected.length > 0;

  // Live, read-only "Suggested buck-out date" = start + template.length_months.
  const selectedTemplate =
    templateSel === NO_TEMPLATE
      ? null
      : (templates.find((t) => String(t.id) === templateSel) ?? null);
  const suggestedBuckOut = useMemo(() => {
    if (!selectedTemplate) return null;
    const parsed = parseDateOnly(startDate);
    if (!parsed) return null;
    return addMonths(parsed, selectedTemplate.length_months).toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "short", year: "numeric" },
    );
  }, [selectedTemplate, startDate]);

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
          <DialogTitle>
            {isEdit ? "Edit breeding season" : "Log a breeding season"}
          </DialogTitle>
          <DialogDescription>
            Record when the buck(s) went in with the herd and, once known, when
            they came out. The expected kidding window is worked out from these
            dates.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="buck_ids"
            value={JSON.stringify(selected)}
          />
          <input type="hidden" name="barn_id" value={resolvedBarn} />
          <input
            type="hidden"
            name="season_template_id"
            value={resolvedTemplate}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm text-copy-secondary">Bucks</span>

            {noEligible && !isEdit ? (
              <p className="text-sm text-copy-muted">
                No eligible bucks or bucklings on record. Register an active,
                intact male first.
              </p>
            ) : (
              <>
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((id) => (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-lg bg-subtle px-2 py-0.5 text-xs text-copy-primary"
                      >
                        {maleById.get(id)
                          ? maleLabel(maleById.get(id)!)
                          : `#${id}`}
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          aria-label={`Remove ${
                            maleById.get(id)?.tag ?? id
                          }`}
                          className="text-copy-muted hover:text-copy-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search bucks by tag or name…"
                />

                <div className="max-h-44 overflow-y-auto rounded-xl border border-surface-border">
                  {listOptions.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-copy-muted">
                      {query ? "No matching bucks." : "No bucks to show."}
                    </p>
                  ) : (
                    listOptions.map((m) => {
                      const isSelected = selected.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggle(m.id)}
                          className="flex w-full items-center justify-between gap-2 border-b border-surface-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-subtle"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                isSelected
                                  ? "border-brand bg-accent-dim text-brand"
                                  : "border-surface-border"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </span>
                            {maleLabel(m)}
                          </span>
                          {bucklingIds.has(m.id) && (
                            <span className="text-xs text-copy-muted">
                              buckling
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {bucklings.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-copy-muted">
                    <input
                      type="checkbox"
                      checked={showBucklings}
                      onChange={(e) => setShowBucklings(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Show bucklings too ({bucklings.length})
                  </label>
                )}
              </>
            )}
          </div>

          {templates.length > 0 && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="template_picker"
                className="text-sm text-copy-secondary"
              >
                Season <span className="text-copy-muted">(optional)</span>
              </label>
              <Select
                items={templateItems}
                value={templateSel}
                onValueChange={(value) => setTemplateSel(value ?? NO_TEMPLATE)}
              >
                <SelectTrigger id="template_picker" className="w-full">
                  <SelectValue placeholder="None (ad hoc season)" />
                </SelectTrigger>
                <SelectContent>
                  {templateItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="barn_picker" className="text-sm text-copy-secondary">
              Barn / group <span className="text-copy-muted">(optional)</span>
            </label>
            <Select
              items={barnItems}
              value={barnId}
              onValueChange={(value) => setBarnId(value ?? NO_BARN)}
            >
              <SelectTrigger id="barn_picker" className="w-full">
                <SelectValue placeholder="No barn / whole herd" />
              </SelectTrigger>
              <SelectContent>
                {barnItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label
                htmlFor="start_date"
                className="text-sm text-copy-secondary"
              >
                Bucks went in
              </label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label htmlFor="end_date" className="text-sm text-copy-secondary">
                Bucks came out{" "}
                <span className="text-copy-muted">(optional)</span>
              </label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={season?.end_date ?? ""}
              />
            </div>
          </div>

          {suggestedBuckOut && (
            <p className="text-xs text-copy-muted">
              Suggested buck-out date:{" "}
              <span className="text-copy-secondary">{suggestedBuckOut}</span>{" "}
              <span className="text-copy-faint">
                (from {selectedTemplate?.label} · {selectedTemplate?.length_months}{" "}
                {selectedTemplate?.length_months === 1 ? "month" : "months"} —
                preview only, not saved)
              </span>
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="text-sm text-copy-secondary">
              Note <span className="text-copy-muted">(optional)</span>
            </label>
            <Textarea id="note" name="note" defaultValue={season?.note ?? ""} />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              label={isEdit ? "Save" : "Log season"}
              disabled={!canSubmit}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
