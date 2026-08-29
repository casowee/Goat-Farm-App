# 006 — Dashboard Redesign & Herd Population Timeline

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-006`                                                          |
| Title             | Mobile-first card/donut dashboard redesign + a new herd population timeline |
| Status            | `done` — verified by the owner in the running app 2026-08-29       |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `12-dashboard-analytics` (confirm it's `done` first — see note below) |
| Depends on        | `12` (done), `10` (done), `UPD-005` (done)                        |
| Schema impact     | additive migration — one new table (`herd_events`), 6b only        |
| Created           | 2026-08                                                           |

> **Before starting:** confirm `12-dashboard-analytics` is marked `done` in `feature-specs-roadmap.md`.
> If it's still `in progress`, close it out first (owner has confirmed it works) — an update spec should
> layer on a finished feature, not an open one.

---

## 1. Reason for update

The dashboard from `12` works, but the owner wants it visually upgraded to a cleaner, mobile-first,
card-based design with donut charts — and wants a genuinely new capability: a chart showing how the herd
size has changed over time (newborns, purchases, sales, deaths, other additions/removals), with an easy
way to log those events as they happen.

## 2. Current behavior

`12` built a dashboard with herd composition counts, a weight-growth line chart, a due-soon list, and a
stock-levels widget, using whatever chart/layout style was default at the time — not the mobile-first
card/donut treatment described here. There is no population-over-time view, and no way to log a sale,
death, or other herd-size-changing event.

## 3. Desired behavior

**A. Visual redesign of the existing dashboard** (Section 5, sub-unit 6a):
- Mobile-first, card-based layout throughout.
- An extended top header: title, a filter dropdown (the existing barn filter), and an action icon — plus
  an *optional* back button, only meaningful on pages reached from elsewhere (see UX notes — the
  dashboard itself is the home page, so it has nowhere to go "back" to).
- A large, easy-to-scan **summary row**: total goat count + key category counts.
- **Donut charts** (herd composition by stage, and sex ratio) with the total in the center and a legend
  underneath.
- Consistent tokens, rounded cards, clear typography and spacing throughout — no visual change to the
  underlying data these widgets show, only how they're presented.

**B. A new herd population timeline** (Section 6, sub-unit 6b):
- A chart showing cumulative herd size over time, moving up on additions (birth, purchase, "other
  addition") and down on removals (sale, death, "other removal").
- Births and purchases are **derived automatically** from existing goat records (`origin`,
  `date_of_birth`, `purchase_date`) — no new manual entry needed for those, since the data already
  exists.
- Sales, deaths, and anything else are **logged manually** through a short, fast form — this is the new
  capability, since the app currently has no way to record *when* a goat left the herd.

## 4. Scope (in and out)

**In scope**
- Redesign the dashboard's layout, header, summary row, and composition charts (donut style).
- New `herd_events` table (sale / death / other-addition / other-removal only — not birth/purchase,
  which stay derived) + RLS.
- A pure `lib` function combining derived + manual events into one chronological timeline with a running
  total.
- A short "Log herd event" form/dialog.
- **Logging a Sale or Death event for a specific goat also updates that goat's `status`** to `sold` /
  `deceased` in the same action — this is a safety requirement (Section 7), not optional polish.

**Out of scope**
- Real sales bookkeeping (price, buyer, party) — that's spec `11`. This update's "sale" event is just a
  lightweight herd-size marker with a date; **when `11` is eventually built, it should write into (or
  read from) this same event log rather than creating a second, parallel concept of "a goat left the
  herd."** Flag this forward-compatibility note in `progress-tracker.md`, same pattern as `UPD-005`'s
  inventory note.
- Breeding/mating records and the inbreeding check — that's spec `09`, untouched by this update.
- A full PDF/report export — spec `16`. The "export/action icon" in this redesign is a lightweight
  stand-in (see Section 5's open question), not the real reports module.

## 5. UX / interaction requirements — 6a: redesign

- **Header:** extend the existing `components/top-bar.tsx` from spec `03` rather than building a
  parallel header component — add optional slots for a back button, a filter/dropdown area (reuse the
  existing barn-filter component), and an action icon. **On the dashboard itself, omit the back
  button** — it's the home page, there's nothing to go back to. Build the slot so a future drill-down
  page can use it, but don't force it to render here.
- **Action icon:** since spec `16` (PDF reports) doesn't exist yet, this can't be the real export
  feature. Default to a simple **CSV download of the currently displayed summary/composition numbers**
  as a lightweight v1 — pick this unless a simpler option is obviously better, and record the choice
  made in Implementation Note; don't block on it.
- **Summary row:** large, scannable numbers — total goats, and key category counts (e.g. does, bucks,
  kids) — styled as a horizontal row of stat cards, not a table.
- **Donut charts:** Recharts `PieChart` with an inner radius (donut, not full pie), a custom center label
  showing the total, and a legend below the chart — one for stage composition, one for sex ratio.
  Rounded cards (`rounded-2xl`), tokens only, no hardcoded hex.
- **Cards throughout:** consistent spacing, rounded corners, clear hierarchy (title → number/chart →
  supporting detail), matching `ui-context.md`.
- Stack to a single column on phone width; verify this is the primary target, not an afterthought.

## 6. UX / interaction requirements — 6b: herd population timeline

- A new dashboard section (name it something like **"Herd Population"** or **"Herd Growth"** — not
  "Breeding," to avoid confusion with spec `09`'s actual breeding/mating records; confirm the exact
  label with the owner, default to a neutral name if not answered before build).
- **Chart:** a line or area chart of cumulative herd size over time, combining derived birth/purchase
  events with manually logged sale/death/other events.
- **"Log herd event" control:** a short form/dialog (well under the Form Length Standard's threshold —
  no wizard needed) with:
  - **Event type:** Sale / Death / Other addition / Other removal.
  - **Goat** (a searchable picker, labelled by tag) — **required for Sale and Death**, optional for
    Other addition/removal.
  - **Date** (defaults to today, not in the future).
  - **Note** (optional).
- Build the trigger inside the client dialog per `ERR-001`'s preventive rule.

## 7. Domain / data / API requirements

**Migration** (new file, additive, `supabase/migrations/`, timestamped):

```sql
do $$ begin
  create type herd_event_type as enum ('sale','death','other_addition','other_removal');
exception when duplicate_object then null;
end $$;

create table if not exists public.herd_events (
  id          bigserial primary key,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goat_id     bigint references public.goats(id) on delete set null,
  event_type  herd_event_type not null,
  event_date  date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists herd_events_date_idx    on public.herd_events (event_date);
create index if not exists herd_events_goat_id_idx on public.herd_events (goat_id);

alter table public.herd_events enable row level security;

create policy "Owner manages own herd events"
  on public.herd_events for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

- `bigserial` id, single `for all` policy — standard convention, no global rows here (unlike `UPD-004`).
- `lib/dashboard/herd-timeline.ts`:
  ```ts
  export interface HerdTimelinePoint { date: string; delta: number; runningTotal: number }

  export function computeHerdTimeline(
    goats: GoatRow[],
    events: HerdEventRow[],
  ): HerdTimelinePoint[]
  ```
  Derive `+1` at `date_of_birth` for `origin = 'born_here'` goats and at `purchase_date` for
  `origin = 'purchased'` goats; derive `+1`/`-1` from `herd_events` per type (`other_addition` = +1;
  `sale`/`death`/`other_removal` = -1); sort chronologically; compute a running total. Pure, no
  Supabase/React — reusable elsewhere later (e.g. spec `11`).
- **`createHerdEvent` server action:** validates `event_date` not in the future; requires `goat_id` when
  `event_type` is `sale` or `death`. **When `event_type` is `sale` or `death` and a goat is linked, also
  update that goat's `status`** to `sold` / `deceased` in the same action. Prefer a Postgres function
  called via `.rpc()` for atomicity (matching how `06`'s `move_goat` handled the same trade-off); a
  two-step update+insert is acceptable for v1 if simpler — pick one and note the trade-off, consistent
  with how `06` documented this same decision.

## 8. Safety and data integrity rules

- Standard owner-only RLS — no novel access pattern here (contrast with `UPD-004`'s global rows).
- **The goat-status side effect is a hard requirement, not optional:** a Sale or Death event referencing
  a goat must leave that goat's `status` consistent with the event — never let the event log and the
  goat's own status disagree. If the two-step (non-RPC) approach is used, ensure it can't half-apply in
  a way that leaves them out of sync; note how this was handled in Implementation Note.
- Deleting a `herd_events` row should not silently revert the goat's status (out of scope for this
  update) — if a mistaken event needs undoing, the owner corrects the goat's status manually; don't
  build automatic reversal now.
- No change to any existing table (`goats`, `weights`, `health_records`, `inventory_items`) beyond the
  status write described above.

## 9. Acceptance criteria

- [ ] The dashboard renders as a mobile-first card layout with the redesigned header, summary row, and
      donut charts, matching Section 5.
- [ ] Donut charts show the correct totals in the center and a legend underneath.
- [ ] A new **Herd Population** (or equivalent, non-"Breeding"-named) section shows a timeline chart.
- [ ] Logging a Sale or Death event for a specific goat updates that goat's status and appears on the
      timeline as a drop in herd size on the correct date.
- [ ] Logging Other addition/removal (with or without a linked goat) updates the timeline correctly.
- [ ] Births and purchases already in the system appear on the timeline **without any new manual entry**.
- [ ] The action icon performs the chosen v1 behavior (e.g. CSV export) without error.
- [ ] Phone-width verified as the primary layout, not desktop-only.
- [ ] A second test account cannot see this owner's herd events (RLS).

## 10. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the
migration.

**Manual (user flow)** — reload the dashboard and visually confirm the redesign; log a Sale for a real
goat and confirm both the goat's status changed and the timeline dropped by one on that date; log a Death
similarly; log an Other addition/removal with no linked goat; confirm the timeline's starting shape
matches existing birth/purchase history without any manual backfill. Cross-account RLS check on
`herd_events` if a second test account is available.

## 11. Related spec files

- Redesigns: `context/feature-specs/12-dashboard-analytics.md` (must be `done` first).
- Reuses: `components/top-bar.tsx` (spec `03`), the barn-filter pattern (spec `05`/`12`),
  `lib/goats/stage.ts` (stage derivation).
- Forward note for: `context/feature-specs/11-sales-and-purchases.md` (not yet written) — when drafted,
  it should read this update and integrate with `herd_events` rather than duplicating "a goat left the
  herd" as a separate concept.
- Applies: `context/error-specs/001-goat-dialog-trigger-hydration.md` preventive rule to any new dialog.

## 12. Implementation note

- **Action icon (6a) — the exact behavior shipped:** a **client-side CSV download** of the summary +
  composition numbers currently on screen (`components/dashboard/dashboard-csv-button.tsx`). The file
  contains total goats, female/male, adult does/bucks, the adult buck-to-doe ratio, the current
  herd-size-now figure from the timeline, and the per-stage counts (Doe / Buck / Doeling / Buckling /
  Wether / Kid). It reflects the active barn filter (barn name is written into the file). Rendered as a
  `Download` icon button in the top bar's new `trail` slot. No server round-trip. Spec 16 (real
  PDF/report export) will replace it; recorded here per Section 5's instruction.
- **Population timeline section label — the final choice:** **"Herd growth"** — owner-confirmed
  2026-08-29 (deliberately not "Breeding", which is spec 09's mating/kidding domain). The card is
  full-width, with the "Log herd event" trigger in its `CardAction`.
- **Goat-status sync (6b) — RPC, not a two-step action:** `log_herd_event(p_event_type, p_event_date,
  p_goat_id, p_note)` in `supabase/migrations/20260829000006_herd_events.sql`. It inserts the
  `herd_events` row and, for a `sale` / `death` naming a goat, updates that goat's `status` to `sold` /
  `deceased` **in the same function body**, so the event log and the goat status can never half-apply
  out of sync (Section 8's hard rule). `security invoker` (the default), so RLS on both `herd_events`
  and `goats` still applies; `grant execute … to authenticated`. This is a deliberate departure from
  spec 06's two-step (non-atomic) barn move — that trade-off tips toward the RPC here because the
  integrity rule is stronger. The server action (`createHerdEvent` in `app/(app)/actions.ts`) validates
  (event type, goat required for Sale/Death, date present and not in the future) and then calls the RPC.
- **Top-bar slots (6a):** `components/top-bar.tsx` gained `lead` / `trail` portal slots via
  `<TopBarSlot>` (plus a `<TopBarBackButton>` convenience). Implemented with `useSyncExternalStore`
  (server snapshot `null`) rather than a mount effect, so there's no hydration mismatch, no post-mount
  flash, and no new lint errors. The dashboard fills only the `trail` slot (barn filter + CSV button);
  the `lead` back-button slot is built but unused here, ready for future drill-down pages.
- **`computeHerdTimeline` (`lib/dashboard/herd-timeline.ts`):** pure, no React/Supabase. Derives `+1` at
  `date_of_birth` for `origin = 'born_here'` goats and at `purchase_date` for `origin = 'purchased'`
  goats (falling back to `date_of_birth` when a purchased goat has no recorded purchase date, so the
  running total still reconciles with the goat count), applies `+1` for `other_addition` and `-1` for
  `sale` / `death` / `other_removal`, sorts by date, and returns one point per changed day with a
  running total. Reusable by spec 11.
- **Timeline scope:** farm-wide, **not** barn-filtered — a goat moving barns is not a herd
  addition/removal, so a barn filter on the population total would be misleading.
- **Charts:** Recharts, colours from the existing `--chart-1..5` design tokens (plus one `color-mix`
  tint so all six stages stay distinct). Donuts are `PieChart` with `innerRadius`, total in the centre,
  legend underneath. The timeline is an `AreaChart` with a `stepAfter` line.
- `components/dashboard/herd-composition-widget.tsx` was deleted — the two donut charts (stage
  composition, sex ratio) replace its bar-and-stat breakdown.
- **Form Length Standard:** the "Log herd event" form has 4 controls (event type, goat, date, note) —
  under the wizard threshold, so it's a single dialog form, verified comfortable at phone width.

## 13. Verification evidence

**Automatic (agent):**
- `npx tsc --noEmit` clean.
- `npm run build` (Next 16.3.2 / Turbopack) passes — all routes compile, `/` included.
- `npm run lint` at the project baseline (1 pre-existing `hooks/use-mobile.ts` error + 5 pre-existing
  `_prev` unused-arg warnings) — **no new errors or warnings in any UPD-006 file**.
- Production server (`next start`) serves `/` (307 → `/login` unauthenticated) and `/login` (200) with
  no server-side errors.
- `computeHerdTimeline` unit-checked with a mixed fixture (born-here + purchased-with-date +
  purchased-without-date + same-day sale & death + a later other-addition) — running total reconciled
  as expected.
- After the owner applied the migration and re-ran `npm run gen:types`, the regenerated
  `types/database.types.ts` matched the hand-added stand-in (real gen types `p_goat_id` / `p_note` as
  optional non-null and adds `SetofOptions` — the server action passes `undefined` for the omitted
  optionals accordingly; `tsc` + `build` re-confirmed clean afterward).

**Manual (owner, in the running app, 2026-08-29):** the owner applied
`supabase/migrations/20260829000006_herd_events.sql`, re-generated types, and confirmed:
- the redesigned dashboard renders correctly, mobile-first (card layout, summary stat row, both donut
  charts with centre totals + legends, extended top bar with the barn filter and CSV action icon);
- logging a **Sale** for a specific goat updated that goat's `status` to `sold` **and** dropped the
  herd-growth timeline by one on that date;
- logging a **Death** behaved the same (`status` → `deceased`);
- logging an **Other addition / Other removal** with no linked goat moved the timeline correctly;
- existing births and purchases already appeared on the timeline with **no manual backfill**;
- the CSV action icon downloaded the summary without error;
- no console hydration warnings on the new "Log herd event" dialog.

## 14. Resolution / final state

`UPD-006` is **`done`** (owner-verified 2026-08-29). Feature 12's current behavior is now "feature 12 +
UPD-006". Shipped:

- **6a — redesign (no schema):** `components/top-bar.tsx` (portal `lead` / `trail` slots +
  `TopBarBackButton`); `components/dashboard/` — `dashboard-csv-button.tsx`, `summary-stats.tsx`,
  `composition-donut.tsx`; `app/(app)/page.tsx` reworked to the mobile-first card/donut layout;
  `herd-composition-widget.tsx` deleted.
- **6b — herd timeline (new schema):** `supabase/migrations/20260829000006_herd_events.sql`
  (`herd_events` table + `herd_event_type` enum + `for all` owner RLS + `log_herd_event` RPC);
  `types/database.types.ts` regenerated; `lib/dashboard/herd-timeline.ts` (`computeHerdTimeline`);
  `app/(app)/actions.ts` (`createHerdEvent`); `components/dashboard/` — `log-herd-event-dialog.tsx`,
  `goat-combobox.tsx`, `herd-timeline-chart.tsx`; the "Herd growth" section in `app/(app)/page.tsx`.
- **Docs:** `architecture-context.md` (Data Model + derived-timeline note), `progress-tracker.md`
  (Completed + Session Notes + Architecture Decisions + spec-11 forward note),
  `feature-specs-roadmap.md` (UPD-006 note under feature 12).

**Outstanding (not blocking `done`):** the **cross-account RLS check on `herd_events`** — like every new
owner-scoped table, it still needs the owner's own second-account confirmation as a standing item (the
standard `for all` owner policy is applied; the guarantee rests on that until the owner runs the check).

**Forward note for spec 11 (sales & purchases):** when drafted it must read this update and **integrate
with `herd_events`** (write into / read from it) rather than creating a second, parallel "a goat left
the herd" concept — same forward-provisioning pattern as `UPD-005`'s inventory note. Recorded in
`progress-tracker.md` Open Questions.

### Amendment — 2026-08-29 (owner request): "Herd growth" section deactivated, not removed

Per the owner, the **entire "Herd growth" dashboard section is deactivated** — the cumulative
running-total chart wasn't useful (a straight increasing line) and the section took too much space on
the dashboard. This is a **deactivation, not a deletion.**

- **What is hidden (as one unit):** the "Herd growth" card in `app/(app)/page.tsx` — its header, the
  `HerdTimelineChart`, **and** the "Log herd event" trigger (`LogHerdEventDialog`) that lived in its
  `CardAction`. Gated behind `const SHOW_HERD_GROWTH_SECTION = false;` at the top of the page module;
  flip to `true` to restore the whole section exactly as it was.
- **What is kept fully intact** (nothing deleted): the `herd_events` table + `log_herd_event` RPC
  (`supabase/migrations/20260829000006_herd_events.sql`), `lib/dashboard/herd-timeline.ts`
  (`computeHerdTimeline`), the `createHerdEvent` server action in `app/(app)/actions.ts`, and the
  `log-herd-event-dialog.tsx` / `goat-combobox.tsx` / `herd-timeline-chart.tsx` components. The timeline
  is still computed on the dashboard because the CSV export (`DashboardCsvButton`) reports the current
  herd size.
- **Log Herd Event availability:** per the owner's corrected instruction, the Log Herd Event action is
  hidden *together with* the rest of the section — it is **not** relocated elsewhere on the dashboard
  for now. The underlying data-entry capability (which also flips a linked goat's `status` to
  `sold` / `deceased`) is unchanged in the codebase and returns whenever the section is re-enabled.
- This amendment does not reopen `UPD-006`; it stays `done`. Recorded here and in `progress-tracker.md`
  (dated 2026-08-29).
