# 007 — Newborn Kids Period Chart & Event Type Simplification

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-007`                                                          |
| Title             | Selectable-period newborn kids bar chart; deprioritize Other addition/removal |
| Status            | `in progress` — owner requested directly; build started 2026-08-29 |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `12-dashboard-analytics`                                          |
| Depends on        | `UPD-006` (must be `done` first)                                  |
| Schema impact     | **none** — pure `lib` function + UI over existing goat data       |
| Created           | 2026-08                                                           |

---

## 1. Reason for update

The Herd Growth chart from `UPD-006` works but doesn't tell the owner much on its own — a running total
doesn't surface *when* births are clustering. The owner wants a dedicated view of **newborn kid counts
over a selectable period** (3 / 6 / 12 months), so gaps and clusters are visible at a glance (e.g. "10
kids Mar–Jun, 0 Jul–Oct"). Since spec `09` (real breeding/mating records) doesn't exist yet, this chart
is an **early visual proxy for spotting breeding-season patterns** from birth dates alone — not a
replacement for `09`'s eventual real analysis.

Separately, of the four event types in `UPD-006`'s Log Herd Event form, only **Sale** and **Death** are
actually useful right now — Other addition / Other removal aren't needed at this time.

## 2. Current behavior

`UPD-006` built a single cumulative **Herd Growth** line/area chart (running total over time) and a Log
Herd Event form offering four equally-weighted event types: Sale, Death, Other addition, Other removal.
There is no period-bucketed newborn-specific view.

## 3. Desired behavior

- A new **"Newborn Kids"** bar chart, bucketed by month, with a **period selector** (3 / 6 / 12 months,
  default 6) — showing kid counts per month within the selected window, **including zero-count months**
  so gaps are visible, not just months with births.
- In the Log Herd Event form, **Sale and Death** are the primary, default-visible options. **Other
  addition / Other removal remain functional** (not removed from the schema — kept for future
  flexibility) but are moved to a lower-priority position in the picker so they don't clutter the common
  case.
- **Open item, not yet actioned:** the owner flagged something about the Log Herd Event form feeling
  "not optimal" beyond the event-type ordering, but the specifics weren't clear. This spec does **not**
  guess at a broader redesign — if the owner clarifies before this is marked `done`, fold the fix in here;
  otherwise note it as a follow-up in `progress-tracker.md` rather than leaving it silently dropped.

## 4. Scope (in and out)

**In scope**
- `lib` function bucketing newborn kids by month within a selectable window.
- A new "Newborn Kids" card/chart on the dashboard with a period selector.
- Reordering the Log Herd Event type picker so Sale/Death are primary and Other addition/removal are
  secondary — **UI ordering only, no schema change.**

**Out of scope**
- Removing `other_addition` / `other_removal` from the `herd_event_type` enum — kept, just deprioritized.
- Any change to the Sale/Death flow itself (already confirmed working).
- Real breeding-season computation from actual mating dates — that's spec `09`. This chart is explicitly
  a placeholder proxy using birth-date clustering, not a substitute for `09`'s eventual analysis; note
  this forward-relationship in `progress-tracker.md`.
- Whatever the unresolved "Log herd event... not optimal" concern turns out to mean beyond event-type
  ordering — pending owner clarification (see Section 3).

## 5. UX / interaction requirements

- New card: **"Newborn Kids"** with a period selector (segmented control or simple select: **3 / 6 / 12
  months**, default **6**).
- Recharts `BarChart`: x-axis = calendar-month buckets within the selected window, y-axis = count of kids
  born (`origin = 'born_here'`, `date_of_birth` in that bucket). **Months with zero births render as a
  zero bar, not a gap** — this is the whole point per the owner's own example (a visible "0" tells a
  different story than a missing bar).
- Add a short, plainly-worded caption under the chart: something like *"Shows when kids have been born —
  useful for spotting your farm's natural breeding season until real breeding records exist."* Keep it
  factual, not a diagnostic claim.
- **Log Herd Event dialog:** reorder the event-type options so **Sale** and **Death** appear first /
  are the default-highlighted choices; **Other addition** and **Other removal** remain selectable,
  positioned after (e.g. visually grouped as secondary options within the same control — no new control
  needed). This is a small, reversible UI change, not a schema or validation change.
- Tokens, rounded cards, mobile-first per `ui-context.md` and the redesign established in `UPD-006`.

## 6. Domain / data / API requirements

**No schema change and no migration.** New pure function in
`lib/dashboard/newborn-periods.ts`:

```ts
export interface NewbornPeriodBucket {
  periodLabel: string   // e.g. "Mar 2026"
  count: number
}

export function computeNewbornsByPeriod(
  goats: GoatRow[],
  windowMonths: 3 | 6 | 12,
  now: Date = new Date(),
): NewbornPeriodBucket[]
```

- Filter to `origin = 'born_here'` goats with `date_of_birth` falling within
  `[now - windowMonths, now]`.
- Bucket by calendar month; **emit every month in the window in order, including zero-count months** —
  do not skip empty buckets.
- Pure, no Supabase/React import — same convention as every other `lib` function in this project
  (`deriveGoatStage`, `computeHerdComposition`, `computeHerdTimeline`).
- No change to `herd_events`, `herd_event_type`, or any create/update action from `UPD-006` — the
  event-type reordering is presentation-only, in the same dialog component, not the schema or the
  server action's validation logic.

## 7. Safety and data integrity rules

None beyond what already applies — this is a read-only chart over existing data plus a UI reordering.
No new writes, no RLS change, no risk to existing rows.

## 8. Acceptance criteria

- [ ] The Newborn Kids chart renders as a bar chart bucketed by month.
- [ ] The period selector (3/6/12 months) changes the visible window correctly.
- [ ] Months with zero births show as a visible zero bar, not a gap.
- [ ] The chart caption is present and factual, not diagnostic.
- [ ] The Log Herd Event form shows Sale/Death as the primary options; Other addition/removal are still
      selectable and still work exactly as before if chosen.
- [ ] No schema/migration was introduced by this update.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow)** — open the dashboard, confirm the Newborn Kids chart matches what the owner knows
to be true about recent births (including any month with genuinely zero births showing as zero, not
missing); toggle between 3/6/12 months and confirm the window changes correctly; open Log Herd Event and
confirm Sale/Death are the prominent choices while Other addition/removal still function if selected.

## 10. Related spec files

- Extends: `context/update-specs/006-dashboard-redesign-and-herd-population.md` (must be `done` first).
- Forward note for: `context/feature-specs/09-breeding-and-inbreeding.md` (not yet written) — this chart
  is a placeholder proxy for breeding-season patterns; `09` should eventually provide the real analysis
  from actual mating dates, and may supersede or supplement this chart at that point.

## 11. Implementation note

**Built 2026-08-29 (awaiting the owner's hands-on test).**

- **`lib/dashboard/newborn-periods.ts`** — `computeNewbornsByPeriod(goats, windowMonths, now = new Date())`,
  pure (no React/Supabase), matching the shape of `computeHerdTimeline` / `computeMonthlyWeightAverages`.
  It seeds a `Map` with every month in `[now - (windowMonths - 1), now]` set to `0`, then increments only
  `origin === 'born_here'` goats with a parseable `date_of_birth` that lands in a seeded month. Returns the
  buckets oldest-first as `{ periodLabel: "Mar 2026", count }`, **every month present, zero-count months
  included**. Unit-checked (Aug 2026 `now`, 6-month window → `Mar:2, Apr:0, May:0, Jun:1, Jul:0, Aug:1`;
  purchased + null-DOB + out-of-window rows excluded).
- **`components/dashboard/newborn-periods-chart.tsx`** — `"use client"`. A `ToggleGroup` segmented control
  (`3 / 6 / 12 months`, default `6`) drives local state; the window is recomputed client-side from the
  goat rows already on the page (`useMemo`), so switching is instant with no reload. Recharts `BarChart`,
  colours from `--accent-primary` / `--border-default` / `--text-muted` tokens (same pattern as the herd
  timeline + weight charts). `minPointSize={3}` so a zero-birth month still draws a visible sliver on its
  axis tick rather than reading as a gap.
- **`app/(app)/page.tsx`** — new full-width (`lg:col-span-2`) **"Newborn Kids"** card above Herd
  composition, with the factual caption ("Shows when kids have been born — useful for spotting your farm's
  natural breeding season until real breeding records exist."). Fed from the existing farm-wide `allGoats`
  query (already selects `origin` + `date_of_birth`) — **no new query, no barn scoping** (a whole-farm
  view, consistent with the herd timeline).
- **`components/dashboard/log-herd-event-dialog.tsx`** — event-type picker split into
  `PRIMARY_EVENT_TYPE_OPTIONS` (Sale, Death) and `SECONDARY_EVENT_TYPE_OPTIONS` (Other addition, Other
  removal), rendered as two `SelectGroup`s divided by a `SelectSeparator` with an "Other changes"
  `SelectLabel` on the secondary group. `EVENT_TYPE_OPTIONS` (the flat array the `Select`'s `items` prop
  needs for trigger-label resolution) is just the two spread together. **No change** to the
  `herd_event_type` enum, the migration, or `createHerdEvent`'s validation — Other addition/removal submit
  and behave exactly as before.
- **No migration.** `supabase/migrations/` is untouched by this update.
- **The "Log herd event form is not optimal" concern (Section 3) was *not* clarified before this build**,
  so no broader redesign was attempted. It is recorded as an open follow-up in `progress-tracker.md`
  (Open Questions) — fold into this spec if the owner clarifies while it is still `in progress`,
  otherwise it needs its own small update spec.

### Amendment — 2026-08-29 (owner request, folded in while still `in progress`)

- **Selectable end date for the Newborn Kids chart.** Previously the chart was always anchored to
  today. `components/dashboard/newborn-periods-chart.tsx` now has an **End date** `<Input type="date">`
  (default today, `max` today), and the 3 / 6 / 12-month window is applied *backward* from the chosen
  end date. `computeNewbornsByPeriod`'s existing third parameter (`now`) already supported this — **the
  lib function was not changed**; the UI had simply always passed `new Date()`. The window-length
  selector is unchanged and the **maximum window is still 12 months** (`NewbornWindowMonths = 3 | 6 |
  12`); only the end date became adjustable.
- **Confirmed newborn-count filter behavior (owner asked explicitly):** `computeNewbornsByPeriod`
  counts **every goat with `origin === 'born_here'` by its `date_of_birth`, regardless of current life
  stage** (Kid / Doeling / Doe / Buck / …). The only exclusions are non-`born_here` origin, a missing
  or unparseable `date_of_birth`, and a birth month outside the selected window. No stage, sex, status,
  or barn filter is applied. This is the intended behavior.

## 12. Verification evidence

*(fill at the verification gate)*

## 13. Resolution / final state

*(fill when done)*
