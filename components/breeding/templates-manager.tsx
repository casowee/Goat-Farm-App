"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createSeasonTemplate,
  updateSeasonTemplate,
  deleteSeasonTemplate,
} from "@/app/(app)/breeding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/breeding/settings";
import type { SeasonTemplate } from "@/lib/breeding/templates";

const MONTH_ITEMS = MONTH_NAMES.map((name, index) => ({
  label: name,
  value: String(index + 1),
}));

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : label}
    </Button>
  );
}

function TemplateRow({ template }: { template: SeasonTemplate }) {
  const [startMonth, setStartMonth] = useState(String(template.start_month));

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) =>
      updateSeasonTemplate(template.id, formData),
    undefined,
  );
  const [deleteError, deleteAction] = useActionState(
    async () => deleteSeasonTemplate(template.id),
    undefined,
  );

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-border p-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="start_month" value={startMonth} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-copy-muted">Name</label>
          <Input
            name="label"
            defaultValue={template.label}
            className="w-40"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-copy-muted">Starts</label>
          <Select
            items={MONTH_ITEMS}
            value={startMonth}
            onValueChange={(value) => setStartMonth(value ?? startMonth)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-copy-muted">Length (months)</label>
          <Input
            name="length_months"
            type="number"
            min="1"
            max="12"
            inputMode="numeric"
            defaultValue={String(template.length_months)}
            className="w-20"
            required
          />
        </div>
        <SaveButton label="Save" />
      </form>

      <form action={deleteAction}>
        <Button type="submit" variant="ghost" size="sm">
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </form>

      {(error || deleteError) && (
        <p className="text-sm text-error">{error ?? deleteError}</p>
      )}
    </div>
  );
}

function NewTemplateForm() {
  const [startMonth, setStartMonth] = useState("3");
  const [open, setOpen] = useState(false);

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await createSeasonTemplate(formData);
      if (!result) {
        setOpen(false);
        setStartMonth("3");
      }
      return result;
    },
    undefined,
  );

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add a season
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-surface-border p-3"
    >
      <input type="hidden" name="start_month" value={startMonth} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-copy-muted">Name</label>
        <Input name="label" placeholder="Season 3" className="w-40" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-copy-muted">Starts</label>
        <Select
          items={MONTH_ITEMS}
          value={startMonth}
          onValueChange={(value) => setStartMonth(value ?? startMonth)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-copy-muted">Length (months)</label>
        <Input
          name="length_months"
          type="number"
          min="1"
          max="12"
          inputMode="numeric"
          defaultValue="3"
          className="w-20"
          required
        />
      </div>
      <SaveButton label="Add" />
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-error">{error}</p>}
    </form>
  );
}

export function TemplatesManager({ templates }: { templates: SeasonTemplate[] }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      {templates.length === 0 && (
        <p className="text-sm text-copy-muted">
          No season templates yet. Add one so the app can remind you when a
          breeding season is coming up.
        </p>
      )}
      {templates.map((template) => (
        <TemplateRow key={template.id} template={template} />
      ))}
      <NewTemplateForm />
    </div>
  );
}
