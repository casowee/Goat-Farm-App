# 09 — Breeding (Seasonal, Farm-Wide)

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Phase       | 2 — Core records (built out of order, after `10`/`12`, at owner's request)     |
| Aspect      | Both                                                                            |
| Status      | `in progress` (resumed 2026-09-05, built ahead of `11`)                       |
| Depends on  | `05`, `06` (done); `UPD-008` (active/status logic, reused for buck/doe pickers); `lib/dashboard/herd-composition.ts` (reused for buck/doe counts) |
| Unblocks    | `13` — calendar (season/kidding dates become another due-date source later)   |

> **Agent:** before writing code, follow the Implementation Workflow in `ai-workflow-rules.md`: read this
> spec, then `06-family-tree.md` (referenced for context — its pedigree walk is **not** used in this
> pass, since the batch inbreeding check is deferred; see Section 6), `UPD-008` (active-goat filtering
> convention), and `ERR-001`. **This spec deliberately reinterprets `project-overview.md`'s original
> Breeding & Inbreeding description** — the farm runs open-pasture group breeding (1 buck : ~30 does),
> not individually paired matings, so there is no "sire+dam mating record" here. Track **seasons**, not
> pairs. If this ever changes (the owner starts doing controlled individual pairings), that's a future
> update spec, not a reason to over-build this one now.

---

## 1. Goal

Track the farm's real breeding practice: a buck is introduced to the herd for a season (roughly
March–June and September–December), then removed. From the season's actual dates and a configurable
gestation length, the app computes the expected **kidding window**.

## 2. Scope

**In scope**

- **Editable breeding settings** (ratio, gestation length, typical season timing) — a small settings
  screen, since the owner is already actively refining these numbers.
- **Breeding season occurrences** — logging an actual season (buck assigned, start date, end date once
  known), not a recurring abstract template. Real per-year record-keeping.
- **Computed kidding window** per occurrence — a pure function, not a stored/duplicated value.
- **A compact seasonal timeline** (reusing the app's established vertical, no-horizontal-scroll chart
  style from the recent dashboard work) showing the next ~12 months: which are "Males in" and which fall
  in an expected kidding window.
- A **buck-capacity stat** ("you have N active bucks for M active does; recommended: X") reusing the
  buck/doe counts already computed for the dashboard — informational, not a hard rule.
- A **compact "current season" indicator on the main dashboard** — not the full timeline, just a small
  status line (e.g. "Season active — males in since 12 Mar" or "Off-season — next season ~September").
- **Male in/out reminders merged into the existing "Due soon" widget** (spec `12`/`UPD-006`) — this is an
  **in-app reminder**, appearing in the same list as vaccinations/deworming, not a real phone push
  notification. True OS-level push notifications would need a service worker and push subscription
  infrastructure, which `UPD-011` deliberately did not build (cache-staleness risk) — that's a bigger,
  separate future undertaking, not this spec.

**Deferred for now — paused at the owner's request, not removed**

- **Batch inbreeding check.** The owner is managing relatedness manually for now. The design in Section 6
  is kept for reference — reusing `06`'s existing pedigree walk unchanged, so it's a cheap addition
  later — but is **not built in this pass**. Do not implement `lib/breeding/inbreeding-check.ts` or wire
  any warning into the season form in this build.

**Out of scope**

- Individual sire+dam mating records, a per-pair inbreeding check, or offspring auto-linking to a
  specific mating — not how this farm operates; not built now. `06`'s existing parent-picker (dam/sire on
  a kid's own record) already covers actual lineage recording regardless of this module.
- The full unified calendar (spec `13`) — this spec's timeline is deliberately scoped to breeding only;
  `13` merges this with vaccinations/deworming/to-dos once `14` also exists.
- Any change to `06`'s pedigree walk itself — this only calls it, doesn't modify it.

## 3. Data model

**`breeding_settings`** — one row per owner (farm-wide constants):

```sql
create table if not exists public.breeding_settings (
  id                    bigserial primary key,
  owner_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bucks_per_group       integer not null default 1,
  does_per_group        integer not null default 30,
  gestation_days        integer not null default 171,  -- 5 months + 3 weeks, see conversion note below
  updated_at            timestamptz not null default now(),
  unique (owner_id)
);

alter table public.breeding_settings enable row level security;
create policy "Owner manages own breeding settings" on public.breeding_settings for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

> **Amendment (2026-09-05, after real testing).** `breeding_settings` originally also held
> `typical_season_starts integer[]` and `typical_season_length_months integer`. That anonymous array is
> **replaced by the `breeding_season_templates` table below** — named, editable, recurring windows. The
> `20260905000004_breeding_season_templates.sql` migration migrates any existing array values into named
> template rows ("Season 1", "Season 2", in array order, carrying the old length) **before** dropping the
> two columns, so no data is lost; if the columns were never applied it just creates the new table.

**`breeding_season_templates`** — the farm's named, recurring breeding windows (replaces the old flat
array). One or more per owner; fully editable:

```sql
create table if not exists public.breeding_season_templates (
  id            bigserial primary key,
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label         text not null,                                  -- e.g. "Season 1"
  start_month   integer not null check (start_month between 1 and 12),
  length_months integer not null default 3 check (length_months between 1 and 12),
  created_at    timestamptz not null default now()
);

create index if not exists breeding_season_templates_owner_idx on public.breeding_season_templates (owner_id);

alter table public.breeding_season_templates enable row level security;
create policy "Owner manages own breeding season templates" on public.breeding_season_templates for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

> **Seeded defaults.** A new owner gets two rows — **"Season 1" (March, 3 months)** and
> **"Season 2" (September, 3 months)** — matching the farm's real pattern, editable afterward. The
> migration seeds these for every existing `auth.users` row that has no templates yet (same
> `auth.users cross join (values …)` pattern as the `inventory_items` seed); the app also falls back to
> these two defaults in code (`DEFAULT_SEASON_TEMPLATES`) if a farm somehow has no template rows.

> **Gestation conversion:** the settings form collects "months" + "weeks" (matching how the owner
> naturally describes it — "5 months 3 weeks, about 6 months") and converts to
> `gestation_days = months * 30 + weeks * 7` for storage. **The owner has confirmed 5 months + 3 weeks
> (171 days) as the real, correct default** — this is not a placeholder, ship it as the default in the
> migration above. This is an approximation, not a calendar-exact calculation, and can be overridden with
> a direct day count later if more precision is ever wanted.

**`breeding_season_occurrences`** — one row per actual, real season (not a recurring template):

```sql
create table if not exists public.breeding_season_occurrences (
  id                 bigserial primary key,
  owner_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barn_id            bigint references public.barns(id) on delete set null,  -- optional: which group was with the bucks
  season_template_id bigint references public.breeding_season_templates(id) on delete set null,  -- optional: the template this came from
  start_date date not null,
  end_date   date,  -- nullable until the bucks are actually removed
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists breeding_season_occurrences_dates_idx
  on public.breeding_season_occurrences (start_date, end_date);

alter table public.breeding_season_occurrences enable row level security;
create policy "Owner manages own breeding season occurrences" on public.breeding_season_occurrences for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

> **A season can have more than one buck.** The farm sometimes runs two or more bucks with the same
> group. So the buck link is a **join table**, not a `buck_id` column on the occurrence. If an earlier
> draft of the occurrences migration was already applied with a `buck_id` column, the
> `breeding_season_bucks` migration below drops it safely (`drop column if exists`).

**`breeding_season_bucks`** — which bucks ran with a season (many-to-many):

```sql
create table if not exists public.breeding_season_bucks (
  id         bigserial primary key,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  season_id  bigint not null references public.breeding_season_occurrences(id) on delete cascade,
  buck_id    bigint not null references public.goats(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (season_id, buck_id)
);

create index if not exists breeding_season_bucks_season_idx on public.breeding_season_bucks (season_id);
create index if not exists breeding_season_bucks_buck_idx   on public.breeding_season_bucks (buck_id);

alter table public.breeding_season_bucks enable row level security;
create policy "Owner manages own breeding season bucks" on public.breeding_season_bucks for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

> **Season templates ⇄ occurrences.** `season_template_id` is **nullable** — an ad-hoc season logged
> without a template is still valid. Deleting a template sets it to `null` on any linked occurrence
> (`on delete set null`); that occurrence then just shows its plain dates. Only the **link** is stored,
> not a copy of the label, so **renaming a template relabels every past season linked to it** — the list
> and timeline always show a template's *current* name (owner-confirmed 2026-09-05).

`bigserial` ids, single `for all` RLS policy on every table — standard convention, no global rows.
A hard-deleted buck (a "wrong registration") drops its `breeding_season_bucks` rows (`on delete cascade`)
but the season itself stays.

## 4. Task 1 — Breeding settings (9a)

**File:** `app/(app)/breeding/settings/page.tsx` (reuse the existing `/breeding` stub route from spec
`03`). Two independent parts on the one page:

- **Settings form** (`components/breeding/settings-form.tsx`) — bucks-per-group, does-per-group, gestation
  (months + weeks, converted to days on save). One `breeding_settings` row per owner — upsert, no
  duplicates. *(Season timing moved out of here — see below.)*
- **Season templates manager** (`components/breeding/templates-manager.tsx`) — add / edit / remove
  `breeding_season_templates` rows: **label**, **start month** (picker), **length in months**. Per-row
  CRUD (`create/update/deleteSeasonTemplate`) — **not** a delete-all-and-reinsert, so a template's `id`
  stays stable and any `breeding_season_occurrences.season_template_id` links to it survive an edit.
  Removing a template is allowed; linked occurrences fall back to plain-date display.

## 5. Task 2 — Breeding season occurrences (9b)

**File:** `app/(app)/breeding/page.tsx` (list + "Log new season" action).

- **Buck picker — multi-select.** A season can have more than one buck, so the picker is a **multi-select
  combobox** (removable chips, searchable by tag or name), saving one `breeding_season_bucks` row per
  chosen buck — never a single `buck_id`. The season list shows all of a season's bucks (e.g.
  "Thor, Zeus").
- **Eligibility — `lib/breeding/eligible-males.ts`.** The picker's options come from
  `eligibleBreedingMales(goats, now?)`, a pure function (no React / Supabase):

  ```ts
  export interface EligibleMale { id: number; tag: string; name: string | null }
  export interface EligibleBreedingMales { bucks: EligibleMale[]; bucklings: EligibleMale[] }

  export function eligibleBreedingMales(
    goats: EligibleMalesGoat[],
    now?: Date,
  ): EligibleBreedingMales
  ```

  It filters to `sex = 'male'`, `reproductive_state = 'intact'`, `status = 'active'` (the `UPD-008`/`009`
  convention), then splits the survivors by **derived stage** (`deriveGoatStage`, `lib/goats/stage.ts`):
  `Buck` → `bucks`, `Buckling` → `bucklings`. **`Kid`-stage males are dropped entirely and must never
  appear in the picker under any circumstance** (nor may a wether — already excluded by the `intact`
  filter). The server action re-validates this: a submitted buck that isn't an intact male, or whose
  derived stage is `Kid`, is rejected.
- **Bucklings behind a toggle.** The picker shows **bucks by default**. A secondary "Show bucklings too"
  toggle reveals the `bucklings` list. A buckling that has already been selected stays as a chip even if
  the toggle is switched back off (selection is independent of which options are currently listed).
- **Season template — an always-present, defaulted field (2026-09-05 amendment).** The Log Season form
  *always* shows a **Season** select: the owner's templates + "None (ad hoc)". It is **not** only reachable
  through the "Approve season" shortcut. When the dialog opens it defaults to the **currently relevant
  template** (`relevantTemplateId` — the active season's template if one is running, otherwise the
  template with the soonest upcoming start); the owner can override it or pick "None". Most seasons should
  therefore end up linked to a template.
- **Live "Suggested buck-out date" preview.** Whenever a template is selected, the form shows a
  read-only line: *"Suggested buck-out date: <date>"*, computed as `start_date + template.length_months`.
  It updates live as the start date or the selected template changes, and disappears when "None" is
  selected. It is **display-only** — it does not auto-fill the End date field.
- **Other fields:** optional Barn/group, Start date (defaults to today, or the linked template's next
  start date when the dialog is opened from an "Approve season" prompt), End date (optional), Note.
- List shows past/current seasons: bucks, dates, and the **computed** kidding window (never stored) via
  `lib/breeding/kidding-window.ts`:
  ```ts
  export function computeKiddingWindow(
    startDate: Date,
    endDate: Date | null,
    gestationDays: number,
  ): { start: Date; end: Date | null }
  ```
  `start = startDate + gestationDays`; `end = endDate ? endDate + gestationDays : null` (open-ended while
  the season is still active). Pure, no Supabase/React — same convention as every other `lib` function.

### 5a. "Approve season" — a shortcut into the Log Season form (2026-09-05 amendment)

A template describes *when a season should happen*; approving turns that into a real logged season.

- **It is not a separate mechanism.** "Approve season" just opens the **same Log Season dialog** with the
  **same Season selector pre-selected** to that template and the start date pre-filled (the template's
  next start — 1st of its `start_month`). Everything else — buck picker, validation, the
  `createBreedingSeason` action — is identical to logging a season manually. There is no draft / pending
  state.
- **Two entry points:**
  1. The **Due soon** widget's `introduce_males` reminder (which carries a `templateId`) gets an
     **"Approve season"** button.
  2. The **Breeding page** shows its own upcoming-template prompt (`computeBreedingReminders` filtered to
     `introduce_males`, a wider look-ahead than Due soon's 30 days).
- Once a season linked to that template exists with a **start date today or later**, the template's
  `introduce_males` reminder **stops appearing** (see Section 9 rules). When that season later ends and
  the next cycle comes round, the reminder returns for the new cycle.

## 6. Task 3 — Batch inbreeding check (9c) — **DEFERRED, do not build in this pass**

> Kept here for reference only, so the design isn't lost — this task is **not implemented now**. The
> owner is managing relatedness manually and will revisit this as a future addition once the core season
> tracking below is built and tested. It reuses `06`'s existing pedigree walk unchanged, so bringing it
> back later is a small addition, not a redesign.

**File (future):** `lib/breeding/inbreeding-check.ts` — would reuse `06`'s `collectAncestorIds` (or equivalent
pedigree-walk export), does not reimplement ancestry logic:

```ts
export interface InbreedingFlag {
  doeId: number
  doeLabel: string          // tag, per project convention
  relationship: string      // "parent-offspring" | "full sibling" | "half sibling" | "grandparent" | ...
  sharedAncestorLabel: string
}

export function checkBuckAgainstDoes(
  buckId: number,
  doeIds: number[],
  goatsById: Map<number, GoatRow>,
  maxGenerations?: number,   // reuse 06's PEDIGREE_MAX_GENERATIONS constant
): InbreedingFlag[]
```

- For each doe, intersect `collectAncestorIds(buckId, ...)` with `collectAncestorIds(doeId, ...)` (plus a
  direct parent-offspring check between the two) to find a shared ancestor, and classify the relationship
  type — matching `architecture-context.md`'s original description (parent–offspring, full/half sibling,
  grandparent–grandchild, other shared ancestor within N generations).
- **Advisory only.** Show flagged does with the relationship and shared ancestor; saving the season is
  still allowed. This matches `06`'s own inbreeding-check design intent exactly, just applied per-season
  instead of per-pair.
- Scope the doe list to currently-active does (and to the season's barn, if one was specified) — reuse
  the active-goat filtering already established.

## 7. Task 4 — Seasonal timeline widget (9d) — Breeding page only

A compact, vertical, no-horizontal-scroll widget (matching the visual language just established for the
dashboard's Newborn Kids chart) showing the next ~12 months: which months are "Bucks in" (from logged
occurrences, or a template's `start_month` as a fallback suggestion when nothing's logged yet for an
upcoming season) and which months fall inside a computed kidding window. **This lives on the Breeding
page only** — the owner wants the dashboard to show just a lightweight status line instead (Task 6).

When a month's "Bucks in" comes from an occurrence linked to a template, the chip shows the **template's
label** (e.g. "Season 1"); otherwise it shows "Bucks in". The season **list** shows
`"{template label} — {year}"` (e.g. "Season 1 — 2026") for a linked occurrence, falling back to the plain
date range when `season_template_id` is null.

## 8. Task 5 — Buck-capacity stat

A small, informational stat: `recommendedBucks = ceil(activeDoeCount / doesPerGroup * bucksPerGroup)`
compared against the actual active buck count (reuse the counts already computed in
`lib/dashboard/herd-composition.ts` — don't recompute them). Display as a simple sentence, e.g. "5 active
bucks for 58 does — recommended: 2." Purely informational, not a validation rule.

## 9. Task 6 — Dashboard integration (status indicator + Due-soon reminders)

**`lib/breeding/status.ts`** — pure function for the dashboard's compact indicator:

```ts
export interface CurrentSeasonStatus {
  active: boolean
  buckLabel?: string          // the active season's buck tag(s), joined ("Thor, Zeus")
  startedOn?: Date
  nextSeasonEstimate?: Date   // if not active, the soonest template's next start
  nextSeasonLabel?: string    // that template's label
}

export function computeCurrentSeasonStatus(
  templates: SeasonTemplate[],
  occurrences: BreedingSeasonOccurrenceRow[],
  now: Date,
): CurrentSeasonStatus
```

An occurrence covers `now` if `start_date <= now` and (`end_date` is null or `end_date >= now`). Render as
a single small status line on the dashboard — not a card full of detail, just enough to glance at.

**`lib/breeding/reminders.ts`** — pure function producing Due-soon-compatible reminder items:

```ts
export interface BreedingReminder {
  type: 'introduce_males' | 'remove_males'
  label: string
  dueDate: Date
  isEstimate: boolean   // true when no real date is logged yet, only a suggestion
  templateId?: number   // set on every 'introduce_males' reminder (drives "Approve season")
}

export function computeBreedingReminders(
  templates: SeasonTemplate[],
  occurrences: BreedingSeasonOccurrenceRow[],
  now: Date,
): BreedingReminder[]
```

Rules (`occurrences` now carry `season_template_id`):
- **An open season** (an occurrence covers `now`, `end_date` null):
  - If it is **linked to a template** — produce a `remove_males` reminder estimated as
    `start_date + template.length_months`, `isEstimate: true`, with the linked `templateId`.
  - If it is **ad hoc** (`season_template_id` is null) — produce **no** `remove_males` reminder. There is
    **no fabricated fallback length** — the schema has no per-occurrence season length. The owner must
    enter a real `end_date` for an ad-hoc season to get a buck-out reminder. *(This is exactly why the
    Section 5 Season selector defaults to the relevant template rather than "None".)*
- **A logged season with a real end date today-or-later**: use that real date, `isEstimate: false` —
  prefer the real date over any estimate. Applies whether or not a template is linked.
- **`introduce_males` — one per template**, produced only when **no occurrence covers `now`** (no active
  season at all) **and** no occurrence linked to that template has a `start_date` today-or-later
  (i.e. it hasn't already been approved for its upcoming cycle). `dueDate` = the template's next start
  (1st of `start_month` strictly after `now`), `isEstimate: true`, `templateId` set. This is what
  disappears once the owner approves the season.

**Both `introduce_males` and `remove_males` reminders appear in the Due soon widget with equal
visibility** — the owner wants "buck in" *and* "buck out" easy to notice on the dashboard, not just the
start of a season. Each row shows its type in the sub-line ("Breeding · bucks in" / "Breeding · bucks
out", plus "· estimated" when `isEstimate`). The Due soon widget windows both to 30 days like the health
items; the Breeding page's own prompt (introduce-only) uses a wider look-ahead, and each open season in
the Breeding page's season list shows its own "Suggested buck-out" line when linked to a template.

**Wiring:** merge these into the existing "Due soon" widget's combined list (`12`/`UPD-006`) so breeding
reminders appear alongside vaccinations/deworming, sorted chronologically together — extend the existing
due-soon computation, don't build a second, separate "reminders" card.

## 10. Files this unit touches

```
supabase/migrations/xxxx_breeding_settings.sql              # breeding_settings table + RLS
supabase/migrations/xxxx_breeding_season_occurrences.sql    # breeding_season_occurrences table + RLS (no buck_id)
supabase/migrations/xxxx_breeding_season_bucks.sql          # breeding_season_bucks join table + RLS; drops any old buck_id
supabase/migrations/xxxx_breeding_season_templates.sql      # breeding_season_templates + seed + migrate/drop old cols + season_template_id
types/database.types.ts                                      # regenerated
lib/breeding/kidding-window.ts                                # computeKiddingWindow()
lib/breeding/eligible-males.ts                                 # eligibleBreedingMales() — filter + stage split, Kids excluded
lib/breeding/templates.ts                                      # SeasonTemplate, DEFAULT_SEASON_TEMPLATES, upcomingTemplateStart(), relevantTemplateId()
lib/breeding/capacity.ts                                       # buck-capacity stat, reuses herd-composition.ts counts
lib/breeding/status.ts                                         # computeCurrentSeasonStatus() — dashboard indicator (reads templates)
lib/breeding/reminders.ts                                      # computeBreedingReminders() — reads templates, tags introduce_males with templateId
app/(app)/breeding/page.tsx                                    # season list + Log new season + timeline + "Approve season" prompt
app/(app)/breeding/actions.ts                                  # season occurrence (+ bucks + template), settings, template CRUD
app/(app)/page.tsx                                              # dashboard: status line + reminders (with "Approve season") into Due soon
components/breeding/season-form-dialog.tsx                     # multi-buck / template / barn / dates form
components/breeding/settings-form.tsx                          # ratio/gestation settings
components/breeding/templates-manager.tsx                      # add/edit/remove season templates
components/breeding/approve-season-button.tsx                  # "Approve season" → opens the Log Season dialog pre-filled
components/breeding/season-timeline.tsx                        # compact vertical timeline widget (Breeding page only)
components/dashboard/breeding-status.tsx                       # small dashboard status line
```

*(Also present from earlier build increments, not in the original list: `lib/breeding/settings.ts`
[shared `BreedingSettings` shape + gestation ⇄ months/weeks], `lib/breeding/season.ts` [shared occurrence
shape + date helpers], `lib/breeding/timeline.ts` [`computeSeasonalTimeline`, keeps the timeline widget
logic-free], `components/breeding/delete-season-dialog.tsx`.)*

`lib/breeding/inbreeding-check.ts` is intentionally **not** in this list — deferred per Section 6.

`/breeding` already exists as a stub route from spec `03` — replace the placeholder, don't add a
duplicate nav entry. Do not edit `components/ui/*`. Build any dialog trigger inside the client component,
per `ERR-001`'s preventive rule.

## 11. Verification (must pass before 09 is `done`)

Build & types: `npm run build` passes; `tsc` clean.

Click-through:

1. Breeding settings can be edited (ratio, gestation as months+weeks — 5 months 3 weeks is the confirmed
   default) and persist.
1a. **A fresh farm has two season templates** — "Season 1" (March) and "Season 2" (September), both
    3 months — and each can be renamed and retimed in the settings page; renaming one relabels its past
    linked seasons in the list/timeline.
2. Logging a new season with a start date shows the correctly computed (open-ended) kidding
   window; adding an end date later completes the window.
2a. **More than one buck can be selected** for a season, all chosen bucks are saved, and the season list
    shows all of them (e.g. "Thor, Zeus").
2b. **No `Kid`-stage male ever appears in the buck picker**, with or without the "Show bucklings too"
    toggle. Bucklings are hidden until the toggle is used; a buckling already chosen stays as a chip even
    after the toggle is switched back off.
2c. **"Approve season"** appears on both the Due soon `introduce_males` reminder and the Breeding page's
    upcoming-template prompt. Tapping it opens the **same** Log Season dialog with the **same Season
    selector** pre-selected and the start date pre-filled — it is a shortcut into that form, not a
    separate mechanism. Completing the save creates a real season occurrence linked to that template, and
    that template's `introduce_males` reminder then stops appearing.
2d. The season list and timeline show a linked season's **template label** ("Season 1 — 2026" in the
    list, "Season 1" chip in the timeline), falling back to plain dates for an ad-hoc season.
2e. **The Season selector is present every time the Log Season form opens** (manual or via Approve),
    defaulted to the relevant template. Selecting a template shows a live **"Suggested buck-out date"**
    line (= start + `length_months`) that updates when the start date or template changes and hides on
    "None".
2f. A season logged **with a template** produces a `remove_males` reminder later (until a real end date
    is entered). A season logged with **"None"** produces **no** invented `remove_males` reminder.
2g. **Both `introduce_males` and `remove_males`** reminders are equally visible in the Due soon widget.
3. The seasonal timeline (Breeding page) shows upcoming/current "Males in" months and kidding-window
   months, never requiring horizontal scroll on iPhone width.
4. The buck-capacity stat reflects real active buck/doe counts correctly.
5. **The dashboard shows a small, correct current-season status line** — active with buck/start date, or
   off-season with a next-season estimate.
6. **The Due soon widget includes breeding reminders** (introduce/remove males) alongside vaccinations
   and deworming, correctly distinguishing an estimated date from a real logged one, sorted correctly
   with everything else.
7. Dark theme, phone width, no console errors or hydration warnings.

Owner-only: cross-account RLS on both new tables, same pattern as every prior table.

## 12. Roadmap & progress updates — the agent must do these

**On starting 09:** set feature **09** to `in progress` in both the "At a glance" table and its section
of `feature-specs-roadmap.md`, and update `progress-tracker.md` — note this is built ahead of `11`
(sales-and-purchases), which remains open, consistent with how `10`/`12` were sequenced earlier.

**On completing 09** (build passes and verified): set feature **09** to `done`, record it in
`progress-tracker.md` (Completed + dated Session Notes), and leave the roadmap accurately reflecting that
`11` and the full `13` calendar remain the real next open items — don't imply `13` is automatically next.

## 13. Open questions — RESOLVED by the owner 2026-09-05

- **Barn scoping.** ✅ **Record-keeping only for this pass.** `breeding_season_occurrences.barn_id` is
  stored and shown in the season list, but does **not** scope the timeline, the buck-capacity stat, or
  the reminders. It is provisioned now so the deferred inbreeding check can use it later without a
  migration.
- **Reactivating the inbreeding check.** ✅ **Future update spec, no date.** To be written once 09's
  season tracking is built and owner-tested. Section 6 keeps the design (reusing `06`'s pedigree walk
  unchanged), so it stays a cheap addition.
- **Real push notifications.** ✅ **Noted as possible future work, not built.** The reminder stays in-app
  only (the Due soon widget). A real OS-level push (service worker + push subscription) would be its own
  larger update, revisited only if in-app reminders prove insufficient in practice.

## 14. Implementation notes

### 2026-09-05 — goat-profile Breeding tab wired up (shared with `UPD-012`)

The goat detail page's **Breeding tab** (a "coming soon" placeholder left from spec `05`) now shows real
content, differing by sex:

- **Buck:** his past and current breeding seasons, read from `breeding_season_bucks` /
  `breeding_season_occurrences`, rendered with the **same** `SeasonSummaryCard` the Breeding page's own
  season list uses. That per-season card markup was **extracted** out of `app/(app)/breeding/page.tsx`
  into `components/breeding/season-summary-card.tsx` (`SeasonSummaryCard` + `SeasonSummary` type +
  `seasonBuckLabel`); the Breeding page now renders it too, passing its edit/delete dialogs through the
  new `actions` slot — one rendering, not two. Kidding-window / suggested-buck-out / heading logic moved
  into the component unchanged.
- **Wether:** a plain "Not applicable" note.
- **Buckling / young buck with no season yet:** a non-alarming "hasn't been assigned to a season yet".

`components/goats/goat-breeding-tab.tsx` holds `loadGoatBreedingTabData()` (fetch + compute, called at
the goat page's top level like every other tab's data) and the synchronous `GoatBreedingTab` renderer.
No new breeding domain logic — it assembles existing pieces.

The goat-profile Breeding tab itself was **owner-confirmed working 2026-09-05** (and `UPD-012` closed on
that basis). `09` remains **not `done`** for its own separate reason — the full breeding-seasons feature
still awaits the owner's hands-on test of the §11 checklist and the cross-account RLS check.
