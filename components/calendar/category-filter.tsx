"use client";

import { cn } from "@/lib/utils";
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_LABELS,
  type CalendarCategory,
} from "@/lib/calendar/events";
import { CATEGORY_DOT_CLASS } from "@/components/calendar/event-row";

// Feature 13 — the four category chips. All on by default; they double as the
// legend for the grid's dots. The chip box is the Health Archive filter's.

export function CategoryFilter({
  active,
  onToggle,
}: {
  active: CalendarCategory[];
  onToggle: (category: CalendarCategory) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Show categories"
      className="flex flex-wrap gap-2"
    >
      {CALENDAR_CATEGORIES.map((category) => {
        const isActive = active.includes(category);
        return (
          <button
            key={category}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(category)}
            className={cn(
              "tappable flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-brand text-copy-primary"
                : "border-surface-border text-copy-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                CATEGORY_DOT_CLASS[category],
                !isActive && "opacity-40",
              )}
            />
            {CALENDAR_CATEGORY_LABELS[category]}
          </button>
        );
      })}
    </div>
  );
}
