"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoatLink } from "@/components/goats/goat-link";
import { formatIsoDate } from "@/lib/health/group-events";
import type { CalendarCategory } from "@/lib/calendar/events";
import type { CalendarEventView } from "@/lib/calendar/view-state";

// Feature 13 — the one row design the day detail and the list view share, and
// the category colours the grid's dots and the filter chips reuse. The box and
// the status labels are the Health page's group-event row
// (`health-group-event-list.tsx`), so a due deworming looks the same in both
// places.
//
// A row is a link to where its event lives — except an entry that folds
// several single goats together ("Vaccination · 3 goats"). That one has no
// single place to go, so it expands instead (the Doe Performance list's
// chevron + `aria-expanded` pattern) to show those goats as goat links. It is
// collapsed by default: no tag list is on screen until the owner asks for it.

/** Tokens only. The colour is never the only signal — every dot sits by a label. */
export const CATEGORY_DOT_CLASS: Record<CalendarCategory, string> = {
  health: "bg-success",
  breeding: "bg-brand",
  births: "bg-brand-secondary",
  herd: "bg-copy-secondary",
};

const LABEL_BASE = "shrink-0 rounded-md border px-1.5 py-0.5 text-xs";

function StatusLabel({ event }: { event: CalendarEventView }) {
  if (event.status === "overdue") {
    return (
      <span className={cn(LABEL_BASE, "border-error font-medium text-error")}>
        Overdue
      </span>
    );
  }
  if (event.status === "due") {
    return (
      <span className={cn(LABEL_BASE, "border-warning font-medium text-warning")}>
        Due
      </span>
    );
  }
  if (event.status === "done") {
    return (
      <span className={cn(LABEL_BASE, "border-success text-success")}>Done</span>
    );
  }
  if (event.isEstimate) {
    return (
      <span className={cn(LABEL_BASE, "border-surface-border text-copy-muted")}>
        Estimate
      </span>
    );
  }
  return null;
}

/** The dot, the text lines and the status label — the same in every variant. */
function RowBody({
  event,
  showDay,
  trailing,
}: {
  event: CalendarEventView;
  showDay: boolean;
  trailing?: ReactNode;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          CATEGORY_DOT_CLASS[event.category],
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-copy-primary">
          {event.title}
        </span>
        {event.subtitle && (
          <span className="text-sm text-copy-secondary">{event.subtitle}</span>
        )}
        {event.endDay ? (
          <span className="text-sm text-copy-muted">
            {formatIsoDate(event.day)} – {formatIsoDate(event.endDay)}
          </span>
        ) : (
          showDay && (
            <span className="text-sm text-copy-muted">
              Was due {formatIsoDate(event.day)}
            </span>
          )
        )}
      </span>
      <StatusLabel event={event} />
      {trailing}
    </>
  );
}

export function EventRow({
  event,
  showDay = false,
}: {
  event: CalendarEventView;
  /** Say the event's date in the row — for a list not grouped by day. */
  showDay?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const box = cn(
    "rounded-xl border bg-subtle",
    event.status === "overdue" ? "border-error" : "border-surface-border",
  );
  const line = "flex w-full items-start gap-3 px-3 py-3 text-left";

  if (event.goats) {
    return (
      <li className={box}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn("tappable rounded-xl", line)}
        >
          <RowBody
            event={event}
            showDay={showDay}
            trailing={
              <ChevronDown
                className={cn(
                  "mt-1 h-4 w-4 shrink-0 text-copy-muted transition-transform",
                  open && "rotate-180",
                )}
              />
            }
          />
        </button>
        {open && (
          <p className="flex flex-wrap gap-x-3 gap-y-2 px-3 pb-3 pl-8 text-sm">
            {event.goats.map((goat) => (
              <GoatLink key={goat.id} goat={goat} />
            ))}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className={box}>
      {event.href ? (
        <Link href={event.href} className={cn("tappable rounded-xl", line)}>
          <RowBody event={event} showDay={showDay} />
        </Link>
      ) : (
        <div className={line}>
          <RowBody event={event} showDay={showDay} />
        </div>
      )}
    </li>
  );
}
