"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { addDoePerformanceNote } from "@/app/(app)/breeding/doe-performance/actions";
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
import {
  DOE_PERFORMANCE_CATEGORIES,
  DOE_PERFORMANCE_CATEGORY_LABELS,
  DOE_PERFORMANCE_FLAG_LABELS,
  type DoePerformanceFlag,
} from "@/lib/breeding/doe-performance";

export interface DoePerformanceRow {
  doeId: number;
  doeLabel: string;
  tag: string;
  name: string | null;
  ageMonths: number;
  ageLabel: string;
  flags: DoePerformanceFlag[];
  lastKiddingLabel: string | null;
  monthsSinceLastKidding: number | null;
  lastKiddingAgoLabel: string | null;
  averageIntervalMonths: number | null;
  averageIntervalLabel: string | null;
  kiddingEvents: { dateLabel: string; kidCount: number }[];
  healthRecords: {
    id: number;
    typeLabel: string;
    title: string;
    dateLabel: string;
    status: string;
  }[];
  notes: {
    id: number;
    categoryLabel: string;
    note: string | null;
    createdAtLabel: string;
  }[];
}

const CATEGORY_ITEMS = DOE_PERFORMANCE_CATEGORIES.map((value) => ({
  value,
  label: DOE_PERFORMANCE_CATEGORY_LABELS[value],
}));

const ALL = "all";

type SortKey = "overdue" | "flags" | "age" | "tag";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "overdue", label: "Most overdue first" },
  { value: "flags", label: "Most flags first" },
  { value: "age", label: "Oldest first" },
  { value: "tag", label: "Tag (A–Z)" },
];

const FLAG_FILTER_OPTIONS: { value: DoePerformanceFlag | typeof ALL; label: string }[] =
  [
    { value: ALL, label: "All flags" },
    { value: "overdue", label: DOE_PERFORMANCE_FLAG_LABELS.overdue },
    {
      value: "long_average_interval",
      label: DOE_PERFORMANCE_FLAG_LABELS.long_average_interval,
    },
    {
      value: "never_kidded_but_eligible",
      label: DOE_PERFORMANCE_FLAG_LABELS.never_kidded_but_eligible,
    },
  ];

function SaveNoteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : "Add note"}
    </Button>
  );
}

function NoteForm({ doeId }: { doeId: number }) {
  const [category, setCategory] = useState("");
  const [noteKey, setNoteKey] = useState(0);

  const [error, formAction] = useActionState(
    async (_prev: string | undefined, formData: FormData) => {
      const result = await addDoePerformanceNote(formData);
      if (!result) {
        setCategory("");
        setNoteKey((k) => k + 1);
      }
      return result;
    },
    undefined,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-dashed border-surface-border p-3"
    >
      <input type="hidden" name="doe_id" value={doeId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-copy-muted">Your conclusion</label>
        <Select
          name="category"
          items={CATEGORY_ITEMS}
          value={category}
          onValueChange={(value) => setCategory(value ?? "")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-copy-muted">Notes (optional)</label>
        <Textarea
          key={noteKey}
          name="note"
          rows={2}
          placeholder="What did you find? What did you decide?"
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <div>
        <SaveNoteButton />
      </div>
    </form>
  );
}

function DoeCard({ row }: { row: DoePerformanceRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-start justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-copy-primary">
              {row.doeLabel}
            </span>
            {row.flags.map((flag) => (
              <span
                key={flag}
                className="rounded-lg bg-warning/15 px-2 py-0.5 text-xs text-warning"
              >
                {DOE_PERFORMANCE_FLAG_LABELS[flag]}
              </span>
            ))}
          </div>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-copy-muted">
            <div className="flex gap-1">
              <dt>Age:</dt>
              <dd className="text-copy-secondary">{row.ageLabel}</dd>
            </div>
            {row.lastKiddingAgoLabel ? (
              <div className="flex gap-1">
                <dt>Last kidding:</dt>
                <dd className="text-copy-secondary">
                  {row.lastKiddingAgoLabel} ago ({row.lastKiddingLabel})
                </dd>
              </div>
            ) : (
              <div className="flex gap-1">
                <dt>Kiddings:</dt>
                <dd className="text-copy-secondary">Never kidded</dd>
              </div>
            )}
            {row.averageIntervalLabel && (
              <div className="flex gap-1">
                <dt>Avg between kiddings:</dt>
                <dd className="text-copy-secondary">
                  {row.averageIntervalLabel}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-copy-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-surface-border pt-3">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-copy-secondary">
              Kidding history
            </h3>
            {row.kiddingEvents.length === 0 ? (
              <p className="text-xs text-copy-muted">No kiddings on record.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {row.kiddingEvents.map((event, index) => (
                  <li
                    key={`${event.dateLabel}-${index}`}
                    className="text-xs text-copy-secondary"
                  >
                    {event.dateLabel} —{" "}
                    {event.kidCount === 1 ? "1 kid" : `${event.kidCount} kids`}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-copy-secondary">
              Recent health records
            </h3>
            {row.healthRecords.length === 0 ? (
              <p className="text-xs text-copy-muted">
                No health records for this doe.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {row.healthRecords.map((record) => (
                  <li key={record.id} className="text-xs text-copy-secondary">
                    {record.dateLabel} · {record.typeLabel} — {record.title}
                    {record.status === "active" && (
                      <span className="ml-1 text-warning">(active)</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-copy-secondary">
              Investigation notes
            </h3>
            {row.notes.length === 0 ? (
              <p className="text-xs text-copy-muted">
                No notes yet. Record what you conclude below.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {row.notes.map((note) => (
                  <li
                    key={note.id}
                    className="flex flex-col gap-0.5 rounded-xl border border-surface-border bg-subtle px-3 py-2"
                  >
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-copy-primary">
                        {note.categoryLabel}
                      </span>
                      <span className="text-copy-muted">
                        {note.createdAtLabel}
                      </span>
                    </span>
                    {note.note && (
                      <span className="text-xs text-copy-secondary">
                        {note.note}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <NoteForm doeId={row.doeId} />
          </section>
        </div>
      )}
    </div>
  );
}

export function DoePerformanceList({
  rows,
  activeDoeCount,
}: {
  rows: DoePerformanceRow[];
  activeDoeCount: number;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("overdue");
  const [flagFilter, setFlagFilter] = useState<string>(ALL);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    const matched = rows.filter((row) => {
      if (
        flagFilter !== ALL &&
        !row.flags.includes(flagFilter as DoePerformanceFlag)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.tag.toLowerCase().includes(q) ||
        (row.name ?? "").toLowerCase().includes(q)
      );
    });

    const sorted = [...matched];
    if (sort === "overdue") {
      // Never-kidded does (null) sort to the very top — the most concerning.
      sorted.sort(
        (a, b) =>
          (b.monthsSinceLastKidding ?? Number.POSITIVE_INFINITY) -
          (a.monthsSinceLastKidding ?? Number.POSITIVE_INFINITY),
      );
    } else if (sort === "flags") {
      sorted.sort((a, b) => b.flags.length - a.flags.length);
    } else if (sort === "age") {
      sorted.sort((a, b) => b.ageMonths - a.ageMonths);
    } else {
      sorted.sort((a, b) =>
        a.doeLabel.localeCompare(b.doeLabel, undefined, { numeric: true }),
      );
    }
    return sorted;
  }, [rows, search, sort, flagFilter]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-copy-primary">
          0 does currently flagged
        </p>
        <p className="text-sm text-copy-muted">
          {activeDoeCount === 0
            ? "You have no active does yet."
            : "Every active doe is either kidding on rhythm or too young to judge yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-copy-primary">
          {rows.length} {rows.length === 1 ? "doe" : "does"} currently flagged
          {visible.length !== rows.length && (
            <span className="text-copy-muted">
              {" "}
              · showing {visible.length}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-copy-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tag or name"
            className="pl-8"
            aria-label="Search flagged does by tag or name"
          />
        </div>

        <Select
          value={flagFilter}
          onValueChange={(v) => setFlagFilter(v ?? ALL)}
        >
          <SelectTrigger className="w-full lg:w-56" aria-label="Filter by flag">
            <SelectValue placeholder="All flags" />
          </SelectTrigger>
          <SelectContent>
            {FLAG_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(v) => setSort((v as SortKey) ?? "overdue")}
        >
          <SelectTrigger className="w-full lg:w-48" aria-label="Sort does">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-copy-muted">
          No flagged does match your search and filter.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((row) => (
            <DoeCard key={row.doeId} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
