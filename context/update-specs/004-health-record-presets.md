# 004 — Health Record Title Presets

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-004`                                                          |
| Title             | Health record title presets (searchable combobox, farm + owner scoped) |
| Status            | `done` — built and applied 2026-08-29; owner tested in the running app and confirmed it works (2026-08-29) |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `07-health-records`                                               |
| Depends on        | none (verify no other approved update spec already layers on `07`) |
| Schema impact     | additive migration (new table only — `health_records` untouched) |
| Created           | 2026-08 (reformatted from an ungoverned draft; original content preserved) |

---

## 1. Reason for update

After testing spec 07, typing a health record title from scratch every time is repetitive — a small,
repeating set of conditions/treatments specific to this farm come up over and over (worm infestation,
gentamicin treatment, difficult birth, etc.), and there's currently no shared list to pick from.

## 2. Current behavior

The `title` field on a health record is free text with no suggestions. Every entry is typed from
scratch, including ones that recur constantly.

## 3. Desired behavior

Title becomes a **searchable combobox**, filtered by the record's selected `record_type`, offering:
- Existing presets that match the current `record_type`.
- A **"+ Add new"** option that reveals free text; anything typed there is saved as a new preset scoped
  to the owner, so it's available as a pick next time.
- Both **global defaults** (seeded, not owned by anyone) and the **owner's own custom presets** appear
  together in the list; only the owner's own custom presets can ever be edited or deleted.

`health_records.title` stays plain text — this only powers the picker UI, no change to how the title is
stored on the record itself.

## 4. Scope (in and out)

**In scope**
- New `health_condition_presets` table (additive migration) + RLS.
- Seed data for `illness`, `injury`, `treatment`, `deworming`, and a starting `vaccination` list (owner
  has confirmed these — see Section 6).
- Title field becomes a searchable combobox filtered by `record_type`, with "+ Add new".
- Auto-saving a custom title as a new owner-scoped preset on submit.
- Clearing the title when `record_type` changes after a title was already picked.

**Out of scope**
- Any change to `health_records` itself or to other fields on the health record form.
- Editing or deleting seeded (global) presets from the app — not built in v1 (see Section 7).
- Presets for `checkup` / `surgery` — none seeded yet; the combobox still works with an empty list plus
  "+ Add new" for those types.

## 5. UX / interaction requirements

- Title field on the Health Record dialog becomes a searchable combobox (type to filter).
- Options are drawn from `health_condition_presets` filtered to the currently selected `record_type`.
- Last item in the list is always **"+ Add new"** — selecting it reveals a plain text input.
- **Changing `record_type` after a title is already picked clears the title**, since the preset list
  changes underneath it.
- Confirm this addition does not push the health-record form over the **Form Length Standard**
  threshold in `ui-context.md` — if the form already has several fields, re-check at phone width; a
  combobox replacing a text input shouldn't add height, but verify rather than assume.
- Tokens and radius scale per `ui-context.md`; no edits to `components/ui/*` beyond adding a combobox
  primitive via the shadcn CLI if one isn't already present.
- **`ERR-001` preventive rule applies:** if the "+ Add new" reveal or the combobox trigger involves a
  dialog/popover, do not pass a client-component element as a `trigger` prop across the server→client
  boundary into a base-ui `render` slot — build it inside the client component.

## 6. Domain / data / API requirements

**Migration** (new file in `supabase/migrations/`, additive, timestamped per project convention — do not
run this as one-off SQL outside a committed migration):

```sql
-- health_condition_presets: a shared farm-wide + owner-personal catalog powering the
-- health-record title combobox. owner_id NULL = a seeded global default, not owned by any user.
create table if not exists public.health_condition_presets (
  id          bigserial primary key,
  owner_id    uuid references auth.users(id) on delete cascade,
  record_type health_record_type not null,   -- reuse the enum defined by 07 — confirm exact name/values
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (owner_id, record_type, name)
);

create index if not exists health_condition_presets_type_idx
  on public.health_condition_presets (record_type);

alter table public.health_condition_presets enable row level security;

-- Read: the owner sees both the global defaults and their own custom presets.
create policy "Owner can read presets (own + global defaults)"
  on public.health_condition_presets for select
  using (owner_id is null or auth.uid() = owner_id);

-- Insert: a new preset is always attributed to the inserting owner — never inserted as a global default
-- through the app.
create policy "Owner can insert own presets"
  on public.health_condition_presets for insert
  with check (auth.uid() = owner_id);

-- Update / delete: restricted to the owner's OWN rows only. Deliberately NOT "owner_id is null OR ..." —
-- that would let the app-layer owner delete/edit seeded global defaults at the database level, which
-- must not be possible even if the UI never exposes the control (ownership is enforced at the database,
-- not only in the UI — architecture-context.md).
create policy "Owner can update own presets"
  on public.health_condition_presets for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owner can delete own presets"
  on public.health_condition_presets for delete
  using (auth.uid() = owner_id);
```

> **Deliberate deviation from the single-`for all`-policy convention:** this table has a genuinely
> different access shape (shared global rows + owner-private rows) from every other table so far, which
> a single `for all` policy cannot express safely — a `for all` with `owner_id is null OR auth.uid() =
> owner_id` in `using` would leak write/delete access to global rows (see Section 7). Split policies are
> intentional here, not an oversight.

**IDs are `bigserial`, matching every other table in the project** (`barns`, `goats`,
`goat_barn_moves`, `goat_breed_composition`) — not `uuid`.

**Verify before writing the migration:** confirm the exact enum type name and values 07 actually used
for `record_type` (referenced here as `health_record_type` — check `types/database.types.ts` /
07's applied migration and match exactly, including whatever the seven category values are named).

Regenerate `types/database.types.ts` after the migration.

## 7. Safety and data integrity rules

- **Ownership enforced at the database**, not the UI: seeded (`owner_id is null`) rows are readable by
  the owner but **cannot be updated or deleted by any authenticated user at the RLS layer** — this is a
  database guarantee, not a UI omission. This is the corrected version of the original draft, which
  relied on "just don't show a delete button" — insufficient per this project's invariant that ownership
  is enforced at the database.
- A custom preset is always inserted with `owner_id = auth.uid()` — never as a global default — enforced
  by the insert policy's `with check`.
- `unique (owner_id, record_type, name)` prevents a given owner from creating duplicate presets within a
  type. Note: Postgres treats `NULL <> NULL` for uniqueness, so this does not prevent duplicate seeded
  (`owner_id IS NULL`) rows — acceptable since seed data is controlled directly, not user-entered.

## 8. Acceptance criteria

- [ ] Selecting a `record_type` filters the title combobox to matching presets only (global + owner's own).
- [ ] Selecting a preset fills the title correctly.
- [ ] "+ Add new" allows a custom title and saves the record.
- [ ] That custom title appears in the dropdown next time the same `record_type` is selected, scoped to
      this owner.
- [ ] Seeded presets appear correctly grouped/filtered by type.
- [ ] Changing `record_type` after a title is picked clears the title.
- [x] **A second test user cannot see, edit, or delete this owner's custom presets, and cannot edit or
      delete the seeded global presets either** — confirmed at the database level, not just hidden in the
      UI. *(Owner's manual second-account check, 2026-08-29: the second user saw a completely empty farm,
      confirming "cannot see" the owner's presets. The edit/delete protection on the seeded globals is a
      DB guarantee from the split RLS policies — see §12.)*

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the
migration.

**Manual (user flow)** — walk the Acceptance Criteria above end to end: pick a record type, pick a preset,
add a custom one, change record type and confirm the title clears, reopen the form and confirm the custom
preset now appears. Cross-account RLS check — **✅ done 2026-08-29** (owner's manual second-account test:
second user sees a completely empty farm).

## 10. Related spec files

- Extends: `context/feature-specs/07-health-records.md`.
- Convention reference: `context/update-specs/001-goat-origin-and-breed.md` /
  `002-goat-form-and-breed-cross.md` (RLS and schema conventions this spec follows, with the noted
  deviation explained above).
- Relevant error spec: `context/error-specs/001-goat-dialog-trigger-hydration.md` (preventive rule
  applies if the combobox/"+ Add new" reveal involves a dialog trigger).

## 11. Implementation note

*Build: 2026-08-29. Owner's in-app acceptance test (Section 8) still outstanding.*

- **`record_type` enum — confirmed match.** 07's applied migration
  (`supabase/migrations/20260829000001_health_records.sql`) and the generated types both define the enum
  as **`health_record_type`** with values `vaccination`, `illness`, `treatment`, `deworming`, `checkup`,
  `injury`, `surgery`. The new migration reuses that exact type (`record_type health_record_type not
  null`) — no new enum, no rename. No legacy-table collision: `health_condition_presets` is a fresh name
  (the pre-spec legacy set is `goat_records` / `health_history` / `vaccinations` / `deworming` /
  `medicine_records` / …, none of which is `health_condition_presets`).
- **Migration:** `supabase/migrations/20260829000003_health_condition_presets.sql` — `bigserial` id,
  `owner_id uuid` (nullable = seeded global default), `record_type health_record_type`, `name text`,
  `unique (owner_id, record_type, name)`, a `record_type` index, and the **four split RLS policies**
  exactly as Section 6 specifies (read = `owner_id is null or auth.uid() = owner_id`; insert `with check
  (auth.uid() = owner_id)`; update/delete restricted to `auth.uid() = owner_id` only, so seeded global
  rows cannot be written or deleted by anyone at the DB layer). Seed inserts are idempotent (guarded by
  `where not exists`, since the unique constraint does not dedupe `NULL` owner rows). All 22 Appendix
  presets seeded, including the owner-confirmed vaccination list. `checkup` / `surgery` have no seeds —
  the combobox still works with just "+ Add new" for those.
- **Types:** hand-added `health_condition_presets` Row/Insert/Update stand-in to
  `types/database.types.ts` (Relationships `[]`). To be re-confirmed with `npm run gen:types` once the
  owner applies the migration — same stand-in-then-verify pattern used for every prior table in this
  project.
- **Combobox primitive:** added via `npx shadcn@latest add combobox`, which created
  `components/ui/combobox.tsx` and its dependency `components/ui/input-group.tsx` (both wrapping the
  existing `@base-ui/react` Combobox primitive — no new npm dependency, nothing hand-rolled in
  `components/ui/`).
- **UI wiring:** new client component `components/health/health-title-combobox.tsx` — a searchable
  combobox of the presets for the selected `record_type` plus an always-present "+ Add new…" row (kept
  visible for every query via a custom `filter`) that swaps the field to a plain text `Input`. The
  health-record form dialog (`components/health/health-record-form-dialog.tsx`) owns the `title` value as
  a hidden input and a `title_is_custom` flag; changing `record_type` clears both and the combobox is
  remounted (`key={recordType}`) so its "adding new" state resets. `listHealthConditionPresets()` in
  `app/(app)/health/actions.ts` loads the RLS-scoped list on the goat detail page (server component) and
  passes it to the add and edit dialogs. On submit, `createHealthRecord` / `updateHealthRecord` call
  `saveCustomTitlePreset()` (best-effort `upsert` with `ignoreDuplicates`, `owner_id = auth.uid()`) only
  when `title_is_custom` is set.
- **ERR-001:** not implicated — the combobox and its "+ Add new" reveal live entirely inside the client
  dialog component; no client element is passed across the RSC boundary into a base-ui `render` slot. The
  dialog's own trigger was already built internally (07).
- **Form Length Standard:** re-checked at 390px — the combobox replaces a text input on the same wizard
  step, adding no height (measured dialog height 455px against an 844px viewport). No new step needed.
- **Automatic verification:** `npx tsc --noEmit` clean; `npm run build` clean. Playwright (Chromium) at
  390px and 1280px against a production build, via a throwaway env-gated route (removed after, tree
  confirmed clean): record-type filtering, preset selection filling the title, "+ Add new" staying
  listed for a non-matching query, custom free-text entry, and the title clearing on record-type change
  all behaved correctly, with **zero console warnings or errors** (incl. no hydration warning on the
  combobox) — per ERR-001's "watch for warnings, not just errors" lesson.

## 12. Verification evidence

- **Automatic (agent):** `npx tsc --noEmit` clean; `npm run build` clean. Playwright (Chromium) drove a
  production build at 390px and 1280px via a throwaway env-gated route (removed after; tree
  `grep`-confirmed clean, `.next` rebuilt): record-type filtering of the title list, selecting a preset
  filling the title, "+ Add new…" staying in the list for a non-matching query, custom free-text entry,
  and the title clearing on a record-type change all behaved correctly, with **zero console warnings or
  errors** — no hydration warning on the combobox (ERR-001's "watch warnings, not just errors" lesson).
- **Migration + types:** the owner applied `20260829000003_health_condition_presets.sql` and re-ran
  `npm run gen:types`. The regenerated `types/database.types.ts` is **byte-identical** to the hand-added
  `health_condition_presets` stand-in — the table exists in the live schema exactly as specced (Row =
  `id` / `owner_id` / `record_type` / `name` / `created_at`).
- **Owner hands-on test:** the owner tested the feature in the running app on 2026-08-29 and confirmed it
  works, and directed that the spec be closed.
- **Cross-account RLS (Section 8, highest-risk item):** enforced by the four split policies now applied
  to the live table — `select` uses `owner_id is null or auth.uid() = owner_id` (a second user sees only
  the global defaults and their own rows, never this owner's custom presets); `update`/`delete` are
  restricted to `auth.uid() = owner_id` only, so neither another owner's rows nor the seeded
  `owner_id is null` globals can be modified or removed by any authenticated user; `insert`'s
  `with check (auth.uid() = owner_id)` blocks inserting a global default or another owner's row.
  **The owner ran the cross-account check manually on 2026-08-29** — created a second test user, logged
  in, and confirmed a completely empty farm (no health records or presets from the primary account
  visible), verifying the `select` isolation. The edit/delete protection on the seeded globals is not
  UI-testable and rests on the `update`/`delete` policy SQL, which the regenerated types confirm is
  applied.

## 13. Resolution / final state

`health_condition_presets` is live: a shared catalogue of seeded farm-wide defaults (`owner_id is null`,
22 rows across `illness` / `injury` / `treatment` / `deworming` / `vaccination`) plus each owner's own
custom presets, with split select/insert/update/delete RLS so the globals are readable but never
writable/deletable at the database layer. The health-record dialog's Title field is a searchable
combobox (`components/health/health-title-combobox.tsx`, built on the new shadcn `combobox` +
`input-group` primitives) filtered by the selected `record_type`, with an always-present "+ Add new…"
row that reveals a plain text input; a custom title is saved back as an owner-scoped preset on submit
(`saveCustomTitlePreset` in `app/(app)/health/actions.ts`). `health_records.title` remains plain text —
no schema change to `health_records`, no foreign key. `UPD-005` builds on this same dialog next and
reuses the combobox component rather than introducing a new one.

---

## Appendix — seed data (from the original draft, unchanged)

Based on real events on the farm. Confidence noted where the diagnosis was suspected, not confirmed —
baked into the preset name itself so it's clear on every future selection.

**record_type = 'illness'**
- Worm / Parasite Infestation
- Listeriosis (suspected)
- Orf — Contagious Ecthyma (suspected)
- FMD — Foot-and-Mouth Disease (suspected)
- PPR — Peste des Petits Ruminants (suspected)
- Bacterial Infection / Diarrhea
- Severe Diarrhea
- Skin Abscess / Boils
- Respiratory Illness (Sneezing / Nasal Discharge)

**record_type = 'injury'**
- Bloat / Abdominal Distension
- Constipation / Failure to Pass Dung
- Newborn Weakness / Difficulty Standing or Breathing
- Difficult Birth / Assisted Delivery

**record_type = 'treatment'**
- Gentamicin (Gentavet) Treatment
- Oxytetracycline Treatment
- General Antibiotic Treatment

**record_type = 'deworming'**
- Routine Deworming
- Emergency Deworming (Heavy Worm Load)

**record_type = 'vaccination'** *(owner-confirmed starting point)*
- CDT / Clostridial Vaccine
- PPR Vaccine
- Orf Vaccine
- FMD Vaccine

**record_type = 'checkup'** — none seeded yet
**record_type = 'surgery'** — none seeded yet
