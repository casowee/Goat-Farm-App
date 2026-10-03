# 018 — Kid Loss Count on the Newborn Kids Card

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-018`                                                          |
| Title             | Show kids lost in early life (incl. at kidding) on the Newborn Kids card, for the selected range |
| Status            | `done` — built and confirmed by the user 2026-10-03                |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `12-dashboard-analytics` (Newborn Kids card)                       |
| Depends on        | `UPD-007` / `UPD-011` (Newborn Kids card, window + end-date controls); `UPD-008` (`recordGoatDeparture` — writes the death date); `UPD-010` / `UPD-013` (newborn registration) |
| Schema impact     | **none** — reads data that already exists                          |
| Created           | 2026-10                                                           |

---

## 1. Reason for update

Kids sometimes die during or shortly after kidding. The owner wants that loss visible next to the births
it relates to, so the Newborn Kids card tells the whole story for a period: how many kids were born, and
how many were lost.

## 2. Current behavior

The Newborn Kids card (`UPD-007`, redesigned in `UPD-011`) shows births per month for a selected window
(3/6/12 months) ending at a selected end date. It counts every born-on-farm goat by `date_of_birth`,
including ones that later died. Nothing shows how many of those kids were lost.

**How a kidding death is recorded (owner-confirmed, no change):** the kid is registered like any newborn
(`UPD-010`/`UPD-013` — temp tag, linked to its dam), then marked **Death** through `UPD-008`'s reasoned
removal flow. That flow already sets `goats.status = 'deceased'`, writes a `herd_events` row with
`event_type = 'death'` and the death date, and records a cause from the existing presets (which already
include "Difficult Birth / Assisted Delivery" and "Newborn Weakness / Difficulty Standing or Breathing").

## 3. Desired behavior

The Newborn Kids card shows a compact stat for the **same window and end date the chart already uses**:
the number of kids lost, with small secondary context **"of 20 born"** *(wording and placement amended
2026-10-03 — see Section 5)*. It updates whenever the owner changes
the window or the end date.

**Definition of "kid lost"** *(changed 2026-10-03, third amendment)*: a goat with
`origin = 'born_here'` whose `date_of_birth` falls in the selected window and whose status is
`deceased`. That is the whole rule — no days-after-birth threshold and no death date needed. "Kids lost"
follows the selected chart range only. Sold and stolen kids are not lost.

*(Original definition, superseded: additionally required a recorded death date within
`EARLY_LOSS_DAYS` = 30 days of birth.)*

## 4. Scope (in and out)

**In scope**
- A pure `lib` function computing the loss count (and the matching born count) for a window.
- The compact stat on the Newborn Kids card, as a one-line badge at the right end of the card's title
  line *(amended 2026-10-03; originally the left, above the chart)*.
- A persistent "selected" style for the card's 3 / 6 / 12-month range buttons *(added 2026-10-03, third
  amendment)*.

**Out of scope**
- Any change to how a kid or a death is recorded. The existing newborn and removal flows stay exactly
  as they are.
- A new chart, series, or overlay on the bars. This is one number, not a second visualization.
- Any change to kidding events, Total kids, Doe Performance, Top Performers, or litter-size labels
  (`UPD-010`, `UPD-012`, `UPD-013`, `UPD-014`). A stillbirth is still a kidding event for the doe.
- A cause-of-death breakdown on the card (the cause is already stored; a breakdown can be a follow-on).
- ~~Any change to which kids the bars count. Births still include kids that later died.~~ **Reversed
  2026-10-03:** the bars now exclude the kids counted as lost — since the third amendment, every
  born-here kid in the window whose status is `deceased`. See Section 5.

## 5. UX / interaction requirements

*(Amended three times on 2026-10-03 after the user's iPhone tests. This section states the current
requirements; the history is in Section 11's amendments. Originally: a plain-text "Kids lost: N" stat on
the left above the chart; then a two-line badge on the right of the header.)*

- **Placement:** at the **right end of the "Newborn Kids" title line**, vertically centred with the
  title, and **no taller than the title line**. The description sits on its own line below the title,
  spanning the full card width. It never sits beside the badge.
- **Layout is back to pre-`UPD-018`:** the end-date input, the range buttons and the chart are exactly
  where they were before this update. At iPhone 13 size: card header 66px tall, chart top edge 212px
  from the card top, chart 334 × 144px. Any change to these is a bug. No horizontal scrolling anywhere
  on the card (`UPD-011`).
- **Content — one line:** **"N lost of M born"**, e.g. "1 lost of 21 born". The number lost is the most
  prominent element. If N is 0, show "0 lost of M born". Do not hide the badge, since a zero is useful
  information. No second line.
- **Visual design — a badge/pill, not plain text:**
  - **Lost > 0:** warning style from the existing tokens — `--state-error` for the number, on a dimmed
    `--state-error` background with a matching soft border.
  - **Lost = 0:** calm, neutral style (`--bg-subtle` background, default border, primary text) — it is
    not bad news. Same box as the warning state, so nothing shifts between the two.
  - `rounded-xl` (`ui-context.md`'s inline / small-UI radius). Tokens only — no raw hex, no raw
    Tailwind colour classes.
- **Bars exclude lost kids:** the Newborn Kids bars leave out exactly the kids the badge counts as lost
  (born-here, in the window, status `deceased`) — one shared rule, not a second copy. Sold and stolen
  kids stay in the bars; they did not die. "of M born" remains the TOTAL born in the window, lost kids
  included, so **sum of bars + kids lost = M**, always. A month whose only birth was a lost kid shows as
  a zero bar, not a gap (`UPD-007`/`UPD-011` rule unchanged). The card description reads "Kids born on
  the farm each month (excluding kids that died)."
- **One source for the range:** the bars and the badge are computed together from the card's single
  window + end-date state. They can never show different ranges.
- **Selected range stays highlighted:** the chosen 3 / 6 / 12-month button has a persistent selected
  style — accent border, accent-dim background, accent text — driven by its pressed state, not by focus.
  It stays visible after focus moves elsewhere. The keyboard focus ring remains a separate style.
- **Reactivity:** recomputes from the card's existing window selector (3/6/12) and end-date picker. No
  new controls.
- Tokens and the established dashboard card styling. No change to the bar chart's own rendering.

## 6. Domain / data / API requirements

**No migration.** In `lib/dashboard/newborn-periods.ts` *(signatures as of the third amendment,
2026-10-03 — the original took a `deathDateByGoatId` map and an `EARLY_LOSS_DAYS` constant, both
removed)*:

```ts
export interface KidLossSummary {
  born: number        // born_here kids with date_of_birth in the window, lost ones included
  lost: number        // of those: status = 'deceased'
}

export function computeKidLosses(
  goats: GoatRow[],
  windowMonths: 3 | 6 | 12,
  endDate: Date,
): KidLossSummary

// What the card reads: bars (lost kids excluded) and the totals, from one window.
export function computeNewbornSummary(
  goats: GoatRow[],
  windowMonths: 3 | 6 | 12,
  endDate: Date,
): { buckets: NewbornPeriodBucket[]; losses: KidLossSummary }
```

- Use the **same window boundaries** as `computeNewbornsByPeriod`. Share the boundary logic. Do not
  copy it.
- The "lost" rule is written once and used for both the count and the bar filter, so
  `sum(buckets) + lost = born` by construction.
- No `herd_events` read. A kid's `status` on the `goats` row is the only input, so a kid marked
  `deceased` by any route (removal flow or a direct edit) counts.
- Pure function, no Supabase or React import, matching every other `lib` function in this project.

## 7. Safety and data integrity rules

Read-only. No writes, no RLS change, no change to existing tables or flows. The herd composition counts
stay active-only (`UPD-009`) and are not affected.

## 8. Acceptance criteria

- [x] The Newborn Kids card shows a one-line badge reading "N lost of M born" at the right end of the
      title line, warning-styled when N > 0 and neutral when N = 0.
- [x] Sum of the bars + kids lost = M, for every window and end date.
- [x] A born-here kid in the window with status `deceased` is counted as lost and is absent from the
      bars, however long after birth it died.
- [x] A sold or stolen kid still shows in the bars and is not counted as lost.
- [x] A month whose only birth was a lost kid still shows as a zero bar.
- [x] A doe whose kid was lost still shows that kidding event on her own card, unchanged.
- [x] Changing the window or the end date updates the badge.
- [x] The selected range button stays highlighted after tapping elsewhere.
- [x] Header, controls and chart are at their pre-`UPD-018` positions and sizes, with no horizontal
      scroll on iPhone.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow), on iPhone** — register a newborn, then mark it Death with a date the same day and
the cause "Difficult Birth / Assisted Delivery". Confirm "Kids lost" goes up by one for a window that
includes its birth date. Move the end date so its birth falls outside the window and confirm it drops
out. *(Superseded 2026-10-03: there is no 30-day rule any more — a deceased kid counts whenever it died;
confirm instead that a sold kid still shows in the bars.)* Confirm
the chart's width and layout are unchanged.

## 10. Related spec files

- Extends: `context/update-specs/007-newborn-period-chart-and-event-simplification.md`,
  `context/update-specs/011-dashboard-performance-and-app-shell.md` (card layout rules).
- Reads data written by: `context/update-specs/008-goat-search-filter-duplicate-and-reasoned-removal.md`.

## 11. Implementation note

*(Chronological: the first build, then three amendments made on the same day after the user's tests.
The final state is summarised in Section 13.)*

**Built 2026-10-03 (awaiting the owner's hands-on iPhone test).**

- **`lib/dashboard/newborn-periods.ts`** — `EARLY_LOSS_DAYS = 30` and `computeKidLosses(goats,
  deathDateByGoatId, windowMonths, endDate)`, pure. The window logic was pulled out of
  `computeNewbornsByPeriod` into two private helpers (`windowMonthKeys`, `birthMonthKey`) that both
  functions now call, so `born` equals the chart's total by construction. `computeNewbornsByPeriod`'s
  output is unchanged. `indexDeathDates(events)` builds the death-date map (earliest event per goat).
- **Day counting** is whole calendar days between `date_of_birth` and the death event's `event_date`;
  0 (same day) through 30 inclusive counts as lost.
- **`lib/dashboard/queries.ts`** — `listDeathEvents()` reads `goat_id, event_date` from `herd_events`
  where `event_type = 'death'` (RLS-scoped). One extra small query, run in parallel with the goat read.
- **`components/dashboard/newborn-periods-chart.tsx`** — the stat is its own left-aligned row above the
  End date / window controls: "Kids lost: N" + "of M born", with the caption "Lost in first 30 days"
  under it. The chart markup is untouched and keeps the full card width.
- **Deceased kids with no usable death date.** `KidLossSummary` carries a third field, `unverifiable`:
  born-in-window kids that are `deceased` but have no death event (or one dated before the birth date).
  They are never counted as lost. **Addition beyond the spec text, flagged for the user:** when that
  number is above zero the card shows one extra muted line, "Not counted: N deceased kid(s) with no
  usable death date." This environment has no database access, so the actual count in the live data is
  **not yet known** — it is whatever that line shows on the user's dashboard at the 12-month window (no
  line means zero). To be recorded here at the verification gate.
- **No migration, no schema change, no writes.**

### Amendment — 2026-10-03 (user request after the first iPhone test, folded in while still `in progress`)

- **Placement changed from left to right after testing.** The first build put the stat in its own row
  on the left, above the End date / window controls. On the iPhone that row sat inside the card's
  content area and pushed the controls and chart down. The stat is now a badge on the **right of the
  card header**, opposite the title, using the `Card` component's existing `CardAction` slot (the same
  slot the Herd Growth card uses for its button).
- **How the chart is kept identical.** The badge depends on the window / end-date state held in the
  client component, so `NewbornPeriodsChart` now renders the card's `CardHeader` and `CardContent`
  itself; `NewbornKidsSection` passes the title + description (`heading`) and the caption in as props.
  The content area's structure and classes are what they were before `UPD-018` (controls row, `h-36`
  full-width chart, caption), so the chart's width and height are unchanged by construction.
- **Known trade-off, flagged for the user:** on a narrow phone the description shares the header row
  with the badge and wraps onto more lines than before, which makes the header taller and so moves the
  chart down by those extra lines. The chart's own size does not change. If that shift is not
  acceptable, the fix is a shorter description, not a smaller chart.
- **Badge design.** `rounded-xl`, one box in both states. Lost > 0: `text-error` number on
  `bg-error/15` with `border-error/30`. Lost = 0: `text-copy-primary` number on `bg-subtle` with
  `border-surface-border`. All are token-backed utilities already used elsewhere in the app. Both
  lines are `whitespace-nowrap` and `text-xs`; the number is `text-lg` bold.
- **"1of 21 born" spacing bug fixed.** The number and "of M born" are now inline text separated by an
  explicit space, rather than two flex items relying on a gap.
- **The "Not counted: N deceased kid(s) with no usable death date" line** moved out of the stat to the
  very bottom of the card, under the caption, so it cannot move the chart. Still shown only when N > 0.

### Amendment 2 — 2026-10-03 (three items from the user's second iPhone test, still `in progress`)

**1. "The stat doesn't follow the selected window" — investigated; no code defect found.**
- In the build the user tested, the bars and the stat already read the same `windowMonths` / `endDate`
  React state inside one client component. Nothing was computed server-side with a default window and
  nothing came from URL params, so the suspected cause does not apply.
- Reproduced in WebKit at iPhone 13 size on a temporary fake-data page: with births spread over eight
  months the badge read "1 of 19 born" (6 months), "1 of 12 born" (3 months), "1 of 21 born"
  (12 months), and "0 of 9 born" after moving the end date back three months. It follows every change.
- With a second fake herd whose 21 births all fall inside the last three calendar months, the badge
  reads "1 of 21 born" at 3, 6 and 12 months — correctly, because all three windows contain the same
  births. **Most likely explanation for the report:** the user's own births are similarly recent. This
  is an inference; the live data cannot be read from this environment. The user can check it by
  comparing the 3- and 12-month bars: if no bar outside the last three months is above zero, the
  identical number is right.
- Hardening applied anyway: the bars and the badge now come out of **one** call,
  `computeNewbornSummary(goats, deathDateByGoatId, windowMonths, endDate)`, so there is structurally one
  source of window + end date.

**2. "The bars changed size" — measured; the chart did not change size.**
- Measured with `getBoundingClientRect()` in WebKit (iPhone 13 profile, 390px viewport), the pre-
  `UPD-018` component from git against the current one, same fake data:

  | | Before `UPD-018` | Now |
  | --- | --- | --- |
  | Chart area | 334 × 144 px | 334 × 144 px |
  | Card width | 358 px | 358 px |
  | Bar width, 3 and 6 months | 28 px | 28 px |
  | Bar width, 12 months | 22 px | 22 px |
  | Page scroll width / viewport | 390 / 390 | 390 / 390 |
  | Card header height | 66 px | 86 px |
  | Chart top edge, from card top | 212 px | 232 px |

- **Root cause of what was seen:** the chart's size never depended on the header — its height is a
  fixed `h-36` (144px) and its width is the card's full content width, both before and after. What
  changed is the chart's **vertical position**: the header grew. In the first build the stat was an
  extra row inside the content area, above the controls; in the second, the description wraps to three
  lines beside the badge instead of two (+20px). No size fix was needed, so none was made.
- **Bar heights** scale to the tallest bar in view (`dataMax + 1`), so they change whenever the data or
  the window changes — that was true before `UPD-018`. With identical data, every bar height matched
  to the hundredth of a pixel, except the one month that held the lost kid (item 3).
- **Does the stat's position affect the bars?** No. Right-aligned or centred, the badge lives in the
  header and cannot change the chart's width, height or bar sizes; it only affects how tall the header
  is. **Recommendation: keep it on the right.** A centred badge needs its own row, which makes the
  header taller than the current layout. The remaining 20px downward shift can be removed only by a
  description short enough to fit two lines beside the badge.

**3. Bars exclude kids lost in the first 30 days.**
- `lib/dashboard/newborn-periods.ts`: the rule now lives in one private function, `earlyLossStatus`
  (`live` / `lost` / `unverifiable`). `computeKidLosses` counts with it; the new
  `computeNewbornSummary` filters the goats with it and passes the survivors to the unchanged
  `computeNewbornsByPeriod`. Returns `{ buckets, losses }`.
- **Sum check:** a unit script over six window / end-date combinations confirmed
  `sum(buckets) + losses.lost === losses.born` every time, and that `born` still equals the unfiltered
  birth count. In the browser run: 6 months → bars 18 + 1 lost = 19; 12 months → 20 + 1 = 21.
- **Zero-bar rule holds:** with a month whose only birth was a lost kid, that month still rendered as
  the 2px zero sliver (12 bars present at 12 months, none missing).
- Kids that died later than 30 days, and deceased kids with no usable death date, stay in the bars.
- Card description changed to "Kids born on the farm each month (excluding kids lost in the first
  30 days)." — the number comes from the `EARLY_LOSS_DAYS` constant.
- **Not touched:** kidding events, Total kids, Doe Performance, Top Performers, litter-size labels.
  `computeNewbornsByPeriod` and the new function are imported only by the Newborn Kids card.

**Verification method, disclosed:** the browser measurements used a temporary route with invented goats,
served without login, and deleted straight after; no auth guard was changed and no real farm data was
read. It is WebKit emulation, not a physical iPhone, and it does not exercise the real register → mark
Death flow or the doe's own card. Those remain the user's hands-on test.

### Amendment 3 — 2026-10-03 (three changes from the user's third round, still `in progress`)

**1. The 30-day rule is removed. "Kids lost" follows the selected range only.**
- A kid is lost if it was born here, its `date_of_birth` is in the window, and its status is
  `deceased`. The rule is one private function, `isLostKid`, used by both `computeKidLosses` and the
  bar filter in `computeNewbornSummary`.
- **Removed outright, not left as dead code:** `EARLY_LOSS_DAYS`, `indexDeathDates`, the `DeathEvent`
  type, the `deathDateByGoatId` parameter, the date-parsing helpers, the `unverifiable` field and its
  "Not counted…" line on the card, and the `listDeathEvents()` query (`lib/dashboard/queries.ts` is
  back to its pre-`UPD-018` content). The card no longer reads `herd_events` at all.
- **This settles the earlier open point** about deceased kids with no recorded death date: with no
  death date needed, every deceased kid counts, so there is nothing left to exclude or report.
- Sold and stolen kids stay in the bars.
- **Sum check re-run:** a unit script over eight window / end-date combinations (including sold, stolen,
  purchased, no-birth-date and year-boundary cases) confirmed `sum(buckets) + lost === born` every time.
  In the browser run: 6 months → bars 17 + 2 lost = 19; 3 months → 11 + 1 = 12; 12 months → 19 + 2 = 21;
  12 months with the end date moved back three months → 8 + 1 = 9.
- Description is now "Kids born on the farm each month (excluding kids that died)." — two lines at
  iPhone width, the same as the original description.
- **Not touched:** kidding events, Total kids, Doe Performance, Top Performers, litter-size labels.

**2. Selected range button keeps its highlight; badge is one line.**
- **Cause:** the toggle's built-in selected style is only a faint `bg-muted` fill, so the one clearly
  visible cue was the focus ring, which disappears when focus moves. The selection itself was never
  lost.
- **Fix:** each range button gets `aria-pressed:border-brand aria-pressed:bg-accent-dim
  aria-pressed:text-brand` at its call site in `newborn-periods-chart.tsx` (no edit to
  `components/ui/*`). The focus ring (`focus-visible:`) is untouched and still separate.
- **Checked in the browser:** after tapping "3 months" and then tapping elsewhere so the button is no
  longer focused, its computed style was still accent border, accent-dim background and accent text;
  the other two buttons stayed neutral.
- The badge is one line, "N lost of M born", with the number bold and (when above zero) in the error
  colour. The "Lost in first 30 days" line is gone.

**3. Badge moved into the title row; layout is back to pre-`UPD-018`.**
- The header is a title row (title left, badge right, vertically centred) with the description on its
  own full-width line below. `NewbornPeriodsChart` now takes `title` and `description` strings instead
  of a `heading` node; `CardAction` is no longer used.
- Measured in WebKit (iPhone 13 profile, 390px viewport), pre-`UPD-018` component from git against the
  current one:

  | | Before `UPD-018` | Now |
  | --- | --- | --- |
  | Card header height | 66 px | 66 px |
  | End-date input top, from card top | 120 px | 120 px |
  | Range buttons top, from card top | 164 px | 164 px |
  | Chart top edge, from card top | 212 px | 212 px |
  | Chart area | 334 × 144 px | 334 × 144 px |
  | Bar width (3 and 6 months / 12 months) | 28 / 22 px | 28 / 22 px |
  | Card width | 358 px | 358 px |
  | Page scroll width / viewport | 390 / 390 | 390 / 390 |
  | Title line height | 22 px | 22 px |
  | Badge height | — | 22 px |

  Identical at 3, 6 and 12 months and in both badge states (lost = 0 and lost > 0).

**Verification method, disclosed:** same as Amendment 2 — a temporary fake-data route, served without
login, deleted afterwards; WebKit emulation, not a physical iPhone; no real farm data read. The real
register → mark Death flow, a real sold kid, and the doe's own card remain the user's hands-on test.

## 12. Verification evidence

**Automatic.** `tsc --noEmit` clean and `npm run build` passing after every round, including the
final one.

**Pure-function check.** A throwaway script over eight window / end-date combinations (deceased, sold,
stolen, purchased, no-birth-date and year-boundary cases) confirmed `sum(buckets) + lost === born` every
time, with every month of the window present as a bucket.

**Browser check (WebKit, iPhone 13 profile, fake data on a temporary route, since deleted).**
- Badge follows the selection: 6 months "2 lost of 19 born", 3 months "1 lost of 12 born", 12 months
  "2 lost of 21 born", end date moved back three months "1 lost of 9 born".
- Layout identical to the pre-`UPD-018` component from git: header 66px, end-date input at 120px,
  range buttons at 164px, chart top at 212px, chart 334 × 144px, bars 28px / 22px wide, page scroll
  width 390 / 390 (no horizontal scroll).
- Selected range button keeps its accent border, background and text after focus moves away.
- A month whose only birth was a kid that died renders as a zero bar; a sold kid stays in the bars.

**Manual (the user).** The user tested each round in the running app, which is what produced the three
amendments, and on 2026-10-03 confirmed the final build as good and asked for it to be marked `done`.
The individual manual checks were not itemised in that confirmation. One console warning the user
reported from the final build (a missing React `key` on the caption passed from the server component)
was fixed before closing: the caption is now passed as plain text and its `<p>` is created in the
client component.

**Not verified by the agent:** a physical iPhone, the real register → mark Death flow against live
data, and a doe's own card. Those rest on the user's own testing.

## 13. Resolution / final state

**Done 2026-10-03.** No migration, no schema change, no writes.

- **What the card shows.** A one-line badge at the right end of the "Newborn Kids" title line:
  "N lost of M born" — warning-styled when N > 0, neutral when N = 0. It follows the card's existing
  3 / 6 / 12-month selector and end-date picker.
- **The rule.** A kid is lost if it was born here, its `date_of_birth` is in the selected range, and
  its status is `deceased`. No day threshold, no death date. Sold and stolen kids are not lost.
- **The bars** exclude exactly the lost kids, so bars + lost = M. Zero-count months still render.
  Description: "Kids born on the farm each month (excluding kids that died)."
- **Selected range button** has a persistent accent style, separate from the focus ring.
- **Layout** is identical to before this update at iPhone 13 size.
- **Code.** `lib/dashboard/newborn-periods.ts` (`computeKidLosses`, `computeNewbornSummary`, shared
  window helpers, `isLostKid`); `components/dashboard/newborn-periods-chart.tsx` (renders the card's
  header and content); `components/dashboard/sections/newborn-kids-section.tsx` (passes status and the
  static text). `lib/dashboard/queries.ts` ended unchanged.
- **Differs from the original spec:** the 30-day early-loss window and the `herd_events` death-date
  read were both dropped; the bars changed (originally out of scope); the stat moved from the left to
  the title row.
- **Carried forward:** the "Born dead" shortcut in Section 14 is still an open question, not built.

## 14. Open questions (resolve, don't guess)

- **Early-loss window.** ✅ **Resolved by the user, 2026-10-03: no window at all.** The 30-day rule was
  removed; any born-here kid in the selected range whose status is `deceased` counts as lost.
- **Faster entry for a kid born dead.** Today this takes two steps: register the kid, then mark it Death
  from its card. A "Born dead" toggle in the newborn/litter flow could do both at once by calling the
  existing `recordGoatDeparture` with the death date set to the birth date. Not built now. Confirm if
  wanted as a follow-on.
