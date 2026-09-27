"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DUE_WINDOW_OPTIONS } from "@/lib/dashboard/due-soon";

// UPD-016 (§5) — the Schedule tab's lookahead-window control. Sets
// `?window=<days>` on `/health?tab=schedule`; the page reads it server-side and
// passes it straight to `dueSoon()` as `windowDays`. URL state, not `useState`,
// per the project's navigable-view-state convention — the chosen window is
// still there after opening a goat from the list and coming back.

export function ScheduleWindowSelect({ value }: { value: number }) {
  const router = useRouter();

  const items = DUE_WINDOW_OPTIONS.map((days) => ({
    label: `Next ${days} days`,
    value: String(days),
  }));

  return (
    <Select
      items={items}
      value={String(value)}
      onValueChange={(next) =>
        router.push(`/health?tab=schedule&window=${next ?? ""}`)
      }
    >
      <SelectTrigger aria-label="Lookahead window" className="w-40 sm:w-44">
        <SelectValue placeholder="Next 90 days" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
