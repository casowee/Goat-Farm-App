# 005 — Treatment Medication From Inventory (Forward-Provisioned)

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-005`                                                          |
| Title             | Treatment medication combobox sourced from `inventory_items`, with a stock-empty warning |
| Status            | `done` — built + amended 2026-08-29 (both migrations applied); owner tested in the running app and confirmed it works (2026-08-29) |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `07-health-records` (primary); **forward-provisions** schema for `10-inventory` |
| Depends on        | `UPD-004` health-record-title-presets — **implement after `UPD-004` is confirmed done**, since both touch the health-record dialog |
| Schema impact     | additive migration — creates `inventory_items` **early** (medicine-only for now); spec 10 will extend it, not recreate it |
| Created           | 2026-08                                                           |

---

## 1. Reason for update

The Treatment step's medication field is free text. The owner has a known, fixed list of drugs actually
used on the farm and wants to pick from it rather than retype it — and wants that list to be the same
data spec 10 (Inventory) will eventually manage, not a throwaway duplicate list that gets discarded when
10 is built.

## 2. Current behavior

The medication field on a Treatment-type health record is a plain text input with no suggestions and no
connection to any inventory concept (inventory doesn't exist yet — it's `planned`, spec 10).

## 3. Desired behavior

- A new `inventory_items` table exists (medicine-only for now, quantities seeded at 0 since actual stock
  is unknown) holding the owner's real drug list.
- The medication field becomes a **searchable combobox** over `inventory_items` (reusing the combobox
  pattern from `UPD-004`), each option showing the drug name and, if quantity is 0/unrecorded, a
  **"⚠ No stock recorded"** warning — selectable regardless, never blocked.
- "+ Add new" creates a new `inventory_items` row (quantity 0) the same way `UPD-004` added new title
  presets.
- **This is intentionally partial.** Full inventory management — editable stock levels, low-stock
  thresholds/alerts, feed items, a dedicated Inventory screen — is spec 10's job, not this update's. This
  update only builds enough of the table and UI to unblock the health-record dropdown.

## 4. Scope (in and out)

**In scope**
- `inventory_items` table (additive migration), medicine-only, RLS.
- Seed the 13 known drugs at quantity 0.
- Medication field → searchable combobox with stock-empty warning + "+ Add new".

**Out of scope — explicitly spec 10's job**
- Feed items.
- Any UI for editing/adjusting quantity, restocking, or setting a low-stock threshold.
- A dedicated Inventory list/detail screen.
- Actually decrementing stock when a treatment is recorded (a real medication↔inventory link) — this
  update keeps `health_records.medication` as **plain text**, not a foreign key, deliberately lower-risk.

## 5. UX / interaction requirements

Two health-record contexts get a medicine/product combobox, each **filtered by `medicine_category`**
(amendment 2026-08-29 — see Section 6):

- **Treatment-details step** (shown for the course types: illness / treatment / injury / surgery) — the
  **Medication** field becomes a searchable combobox over the owner's inventory **excluding
  dewormers** (`category` is anything other than `'dewormer'`, including uncategorised / null).
- **Deworming step** — Deworming is a follow-up type and previously had **only a "Next due date"
  field**; this amendment **adds a new optional "Dewormer product" combobox** to that step, listing
  **only `category = 'dewormer'` items**. Stored in `health_records.medication_name` (plain text, same
  column the Treatment step uses); no dosage / schedule fields are added to Deworming.

Both comboboxes:

- Use the **same** interaction pattern / component as the `UPD-004` title combobox — reused, not
  rebuilt (`components/health/medication-combobox.tsx` on the `components/ui/combobox` primitive).
- List the drug **name** with its current **quantity/unit**; if quantity is 0 (or null), show a visible
  **"⚠ No stock recorded"** marker on the option and a matching inline warning line once such an item is
  selected. The item stays **selectable** — informational, never a block.
- End with a **"+ Add new"** row (kept visible for every query) that reveals free text; on save it
  inserts a new `inventory_items` row (`type = 'medicine'`, typed name, `quantity = 0`). **The new
  item's `category` is set from the context it was added in:** "+ Add new" from the **Deworming** step →
  `category = 'dewormer'` (no picker needed — the context is unambiguous); "+ Add new" from the
  **Treatment** step → `category` left null, to be sorted out in spec 10's inventory screens.
- Changing `record_type` after a product is picked clears the field (the filtered list changes
  underneath it), same as the `UPD-004` title behaviour.

No separate "stock" screen or editing control is built here — the warning is read-only information from
data spec 10 will later manage properly. Tokens/radius per `ui-context.md`; both steps still meet the
Form Length Standard at phone width (verified). `ERR-001` preventive rule applies — no new
dialog/trigger is introduced (the comboboxes live inside the existing client dialog).

## 6. Domain / data / API requirements

**Migration** (new committed file in `supabase/migrations/`, additive, timestamped):

```sql
-- inventory_items: forward-provisioned for spec 10. Built early, medicine-only, so the health-record
-- Treatment step has a real drug list to pick from. Spec 10 extends this table (feed items, quantity
-- editing, low-stock thresholds/alerts) rather than recreating it.
do $$ begin
  create type inventory_item_type as enum ('medicine','feed');
exception when duplicate_object then null;
end $$;

create table if not exists public.inventory_items (
  id                  bigserial primary key,
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type                inventory_item_type not null default 'medicine',
  name                text not null,
  quantity            numeric(10,2) not null default 0,
  unit                text,              -- e.g. "ml", "vials"; nullable for now — spec 10 may require it
  low_stock_threshold numeric(10,2),     -- nullable; spec 10's concern, unused by this update
  created_at          timestamptz not null default now(),
  unique (owner_id, type, name)
);

create index if not exists inventory_items_type_idx on public.inventory_items (type);

alter table public.inventory_items enable row level security;

create policy "Owner manages own inventory items"
  on public.inventory_items for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

- **Standard single `for all` policy** — unlike `UPD-004`'s `health_condition_presets`, this table has no
  global/shared rows, so the usual owner-only convention applies directly.
- `bigserial` id, matching every other table in the project.
- Seed the 13 drugs below at `type = 'medicine'`, `quantity = 0`, once per the current owner.
- `health_records.medication` stays **plain text** — no schema change there, no foreign key.
- Regenerate `types/database.types.ts` after the migration.
- **Record clearly in `progress-tracker.md` and `feature-specs-roadmap.md`** that `inventory_items`
  already exists (medicine-only, forward-provisioned) before spec 10 starts, so 10 reads and extends it
  instead of recreating it — this is the most important documentation step in this update.

### 6a. Amendment (2026-08-29) — `medicine_category` for context-filtered comboboxes

The first cut gave the Treatment step an unfiltered medicine list and gave the Deworming step no
product field at all. To let the Deworming step offer **only dewormers** and the Treatment step offer
**everything except dewormers**, a second **additive** migration adds a category to `inventory_items`.
`20260829000004_inventory_items.sql` (already applied) is **not** touched.

```sql
-- 20260829000005_inventory_items_category.sql
do $$ begin
  create type medicine_category as enum
    ('antibiotic','vitamin_support','anti_inflammatory','dewormer','other');
exception when duplicate_object then null;
end $$;

alter table public.inventory_items
  add column if not exists category medicine_category;   -- nullable; spec 10 owns a real picker

-- Backfill the 13 seeded drugs (see the Appendix for the name→category map).
update public.inventory_items set category = 'antibiotic'
  where name in ('Oxytetracycline 20%','Oxytetracycline 10%','Gentavet (Gentamicin)',
                 'Pen and Strip Antibiotic','Penicillin','Tylosin 200 (20%)');
update public.inventory_items set category = 'vitamin_support'
  where name in ('Iron Dextran','Multivitamin injections');
update public.inventory_items set category = 'anti_inflammatory'
  where name in ('Dexamethasone');
update public.inventory_items set category = 'dewormer'
  where name in ('Ivermectin','Nitroxinil','Nilvasol 1L','AlbeNor 1L');
```

- `category` is **nullable** and has no default. Spec 10 decides whether to require it and will provide
  the UI to set/change it; this update only needs the backfilled values plus the two "+ Add new" rules.
- **Filtering:** Deworming combobox → `category = 'dewormer'`; Treatment combobox → `category` is
  distinct from `'dewormer'` (i.e. `!= 'dewormer'` **or** `is null`).
- **"+ Add new" category:** from Deworming → `'dewormer'`; from Treatment → `null`.
- Regenerate `types/database.types.ts` again after this migration.

## 7. Safety and data integrity rules

- RLS is standard owner-only — no data-integrity novelty here (contrast with `UPD-004`'s global-rows case).
- No existing table or record is modified; `health_records` is untouched.
- Seeding must not silently duplicate rows if run twice — rely on the `unique (owner_id, type, name)`
  constraint and an `on conflict do nothing` in the seed statement.

## 8. Acceptance criteria

- [ ] `inventory_items` exists, medicine-only, seeded with the 13 drugs below at quantity 0.
- [ ] The Treatment step's medication field is a searchable combobox sourced from `inventory_items`.
- [ ] An option with quantity 0 shows a stock-empty warning but remains selectable.
- [ ] "+ Add new" creates a new medicine row at quantity 0 and it appears next time.
- [ ] `health_records.medication` still stores plain text; no foreign key was added.
- [ ] **(amendment)** Deworming's product field only lists `dewormer`-category items; Treatment's
      medication field excludes them. "+ Add new" from Deworming files the item as `dewormer`; "+ Add
      new" from Treatment leaves it uncategorised.
- [ ] `progress-tracker.md` / `feature-specs-roadmap.md` clearly flag that `inventory_items` is
      forward-provisioned, for spec 10 to read before building.
- [x] A second test account cannot see this owner's inventory items (RLS). **✅ confirmed by the owner
      2026-08-29** — logged in as a second test user and saw a completely empty farm (no inventory items
      from the primary account); manual owner-performed check, not automated.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed.

**Manual (user flow)** — open a Treatment record: the medication combobox lists the 13 seeded drugs, each
showing "⚠ No stock recorded" (quantity 0); picking one works; "+ Add new" adds a 14th drug that then
appears on reopen. Cross-account RLS check — **✅ done 2026-08-29** (owner's manual second-account test:
second user sees a completely empty farm).

## 10. Related spec files

- Extends: `context/feature-specs/07-health-records.md`.
- **Forward-provisions for:** `context/feature-specs/10-inventory.md` (not yet written) — when that spec
  is drafted, it must read this update first and extend `inventory_items` rather than recreate it.
- Builds after: `context/update-specs/004-health-record-presets.md` (same dialog, sequenced to avoid
  stacking concurrent changes to one form).
- Reuses the combobox component built for `UPD-004` — no new combobox pattern introduced.

## 11. Implementation note

*Build: 2026-08-29, after `UPD-004` was confirmed `done` by the owner. Owner's in-app acceptance test
(Section 8) still outstanding.*

- **No legacy collision.** `types/database.types.ts` (inspected before writing anything) had no
  `inventory_items` table and no `inventory_item_type` enum; the pre-spec legacy set (`goat_records` /
  `health_history` / `vaccinations` / `deworming` / `medicine_records` / `breeding_history` /
  `weight_history` / `sales_purchases`) contains nothing named `inventory_items`. Created fresh.
- **Migration:** `supabase/migrations/20260829000004_inventory_items.sql` — schema exactly as Section 6:
  `bigserial` id, `owner_id uuid not null default auth.uid()`, `type inventory_item_type` enum
  (`medicine` / `feed`, default `medicine`), `name`, `quantity numeric(10,2) not null default 0`,
  nullable `unit` and `low_stock_threshold` (present but unused — spec 10's concern), `created_at`,
  `unique (owner_id, type, name)`, a `type` index, and the **standard single `for all` owner RLS policy**
  (`using`/`with check` = `auth.uid() = owner_id`) — no split needed, this table has no global rows.
  Added a `drop policy if exists` guard before `create policy` for re-runnability (matches the
  `health_records` migration; not a semantic change from Section 6). Seed: the 13 Appendix drugs at
  `type = 'medicine'`, `quantity = 0`, inserted `from auth.users u cross join (values …)` with
  `on conflict (owner_id, type, name) do nothing` — one set per existing owner, safe to re-run. (A
  migration runs with `auth.uid()` null, so seeding "per current owner" is done via `auth.users` rather
  than the column default.)
- **`health_records` untouched** — `medication_name` stays plain `text`, no foreign key to
  `inventory_items` (Section 4 / 6, deliberate).
- **Category amendment (2026-08-29):** second additive migration
  `supabase/migrations/20260829000005_inventory_items_category.sql` — `medicine_category` enum
  (`antibiotic` / `vitamin_support` / `anti_inflammatory` / `dewormer` / `other`), `add column if not
  exists category medicine_category` (nullable, no default), and four `update` statements backfilling
  the 13 seeded drugs (6 antibiotic, 2 vitamin_support, 1 anti_inflammatory, 4 dewormer — the enum
  covers all 13 cleanly). `20260829000004` is untouched. Wiring: the **Deworming step** previously had
  only a "Next due date" field — this amendment **adds an optional "Dewormer product" combobox** there
  (filtered to `category = 'dewormer'`), and the course-type **Medication** combobox is now filtered to
  `category != 'dewormer'` (null included). Both write to the existing `health_records.medication_name`
  text column; the server (`readHealthRecordFields`) now also reads `medication_name` for
  `record_type = 'deworming'` (no dosage/schedule fields added to Deworming). `saveCustomMedicineItem`
  takes a `category`: `'dewormer'` when the "+ Add new" happened on the Deworming step,
  `null` otherwise (`newMedicineCategoryFor`). Changing `record_type` clears the medication field (the
  filtered list changes). The health-record list row now shows the product for deworming records too.
- **Types:** hand-added `inventory_items` Row/Insert/Update stand-in + the `inventory_item_type` and
  `medicine_category` enums (Enums block and `Constants`, incl. the `category` column) to
  `types/database.types.ts`. To be re-confirmed with `npm run gen:types` once the owner applies **both**
  migrations (same stand-in-then-verify pattern as every prior table; `UPD-004`'s stand-in came back
  byte-identical).
- **Combobox — reused, not rebuilt.** New client component
  `components/health/medication-combobox.tsx` is built on the **same** `components/ui/combobox` primitive
  added for `UPD-004`, mirroring `health-title-combobox.tsx`'s structure (list of names + an
  always-present "+ Add new…" row kept visible via a custom `filter`; swaps to a plain `Input` in
  free-text mode; starts in free-text mode when an edited record's stored medication isn't in the
  catalogue). Each option shows the drug name with its quantity/unit, or a **"⚠ No stock recorded"**
  marker (amber `text-warning` + `TriangleAlert`) when `quantity` is 0/null — **always selectable**; a
  matching inline warning line also shows under the field once a no-stock drug is selected. No new
  `components/ui/*` primitive, no new npm dependency.
- **Wiring:** `listMedicineItems()` in the new `app/(app)/inventory/actions.ts` (RLS-scoped,
  `type = 'medicine'`, `order by name` — the module spec 10 will extend) loads the list on the goat
  detail page (server component) and passes it to the add + edit health-record dialogs. The dialog owns
  `medication_name` + a `medication_is_custom` flag as hidden inputs. On submit,
  `createHealthRecord` / `updateHealthRecord` call `saveCustomMedicineItem()` (best-effort `upsert`,
  `ignoreDuplicates`, `owner_id = auth.uid()`, `type = 'medicine'`, `quantity = 0`, `category` per
  context) only when the medication was typed via "+ Add new" **and** the record type is a course type
  or Deworming.
- **ERR-001:** not implicated — the combobox lives entirely inside the client dialog; no client element
  crosses the RSC boundary into a base-ui `render` slot. No new dialog/trigger introduced.
- **Form Length Standard:** re-checked at 390px — the combobox replaces the medication text input on the
  same Treatment-details step; measured dialog height 613px against an 844px viewport. No new step.
- **Automatic verification:** `npx tsc --noEmit` clean; `npm run build` clean. Playwright (Chromium) at
  390px and 1280px against a production build via a throwaway env-gated route (removed after; tree
  `grep`-confirmed clean; `.next` rebuilt), run twice — for the first cut and again after the category
  amendment:
  - First cut: the medication combobox listing the seeded drugs with correct per-option quantity /
    "No stock recorded" markers, quantity-0 drugs staying selectable, the selected-item warning line,
    "+ Add new…" staying listed for a non-matching query, and custom free-text entry.
  - Amendment: on a **Treatment** record the medication combobox listed
    `Dexamethasone, Gentavet, Mystery Tonic (uncategorised), Oxytetracycline 20%, Penicillin, + Add new`
    — **all four dewormers excluded, the null-category item kept**; on a **Deworming** record the step
    is labelled "Deworming details", shows the new optional "Dewormer product" combobox listing
    **only** `AlbeNor 1L, Ivermectin, Nilvasol 1L, Nitroxinil, + Add new`, keeps its "Next due date"
    field, and "+ Add new" free-text works. Dialog height 493px at 390px width — within the Form Length
    Standard.
  - Both runs: **zero console warnings or errors** — no hydration warning on either combobox (ERR-001's
    "watch warnings, not just errors" lesson).
  - Not agent-runtime-verified (needs a real authenticated DB round-trip): that a "+ Add new" item
    persists with the right `category` and reappears on reopen — covered by the owner's Section 8/9 test.
    The cross-account RLS check is **✅ done** — see §12.

## 12. Verification evidence

- **Automatic (agent):** `npx tsc --noEmit` clean; `npm run build` clean. Playwright (Chromium) drove a
  production build at 390px and 1280px via a throwaway env-gated route (removed after; tree
  `grep`-confirmed clean; `.next` rebuilt), run for both the first cut and the category amendment — see
  Section 11's "Automatic verification" bullet for the detail. Key amendment results: a **Treatment**
  record's medication combobox listed `Dexamethasone, Gentavet, Mystery Tonic (uncategorised),
  Oxytetracycline 20%, Penicillin, + Add new` (all four dewormers excluded, null-category item kept); a
  **Deworming** record showed the new "Dewormer product" combobox with **only** the four dewormers plus
  "+ Add new", kept its "Next due date" field, and free-text entry worked. **Zero console warnings or
  errors** on every run — no hydration warning on either combobox.
- **Migrations + types:** the owner applied both `20260829000004_inventory_items.sql` and
  `20260829000005_inventory_items_category.sql`, and `npm run gen:types` was re-run. The regenerated
  `types/database.types.ts` is **byte-identical** to the hand-added stand-in — `inventory_items` (with
  the nullable `category` column) and the `inventory_item_type` / `medicine_category` enums all exist
  in the live schema exactly as specced, and the 13 seed rows are categorised per the Appendix.
- **Owner hands-on test:** the owner tested the feature in the running app on 2026-08-29 — including the
  amendment (Deworming's dewormer-only product list, Treatment excluding dewormers) — confirmed it
  works, and directed that the spec be closed.
- **`health_records` untouched:** `medication_name` is still plain `text`; no foreign key to
  `inventory_items` was added (Section 4 / 6).
- **Cross-account RLS (Section 8): ✅ confirmed 2026-08-29.** Enforced by the standard single `for all`
  owner policy on `inventory_items` (`using`/`with check` = `auth.uid() = owner_id`) — a second user
  cannot see, edit, or delete this owner's inventory rows. This table has no global/shared rows, so no
  split policy was needed (contrast `UPD-004`). The owner ran the check manually — created a second test
  user, logged in, and confirmed a completely empty farm (no inventory items from the primary account
  visible). Manual owner-performed check, not automated.
- **Not verified (acceptable — spec 10's concern / needs a real multi-user setup):** the exact
  behaviour of a "+ Add new" item's `category` persisting across a full authenticated round-trip was
  reasoned from the code path (`newMedicineCategoryFor` → `saveCustomMedicineItem`), not a live DB
  assertion in the agent's test harness.

## 13. Resolution / final state

**`inventory_items` now exists ahead of spec 10 — whoever picks up spec 10 must read `UPD-005` (this
file) and EXTEND the table with an additive migration, not `create table` it again.** Current live
shape (migrations `20260829000004` + `20260829000005`): `id bigserial`, `owner_id uuid not null default
auth.uid()`, `type inventory_item_type` (`medicine` / `feed`, default `medicine`), `name text`,
`quantity numeric(10,2) not null default 0`, `unit text` (nullable, unused), `low_stock_threshold
numeric(10,2)` (nullable, unused), `category medicine_category` (nullable = `antibiotic` /
`vitamin_support` / `anti_inflammatory` / `dewormer` / `other`), `created_at timestamptz`,
`unique (owner_id, type, name)`, a `type` index, and a single `"Owner manages own inventory items" for
all` RLS policy. Seeded with 13 medicines at `quantity 0`, each backfilled with a `category`. Deferred
to spec 10: feed items in practice, any quantity / restock / low-stock-threshold UI, a real category
picker (to fix `null`-category "+ Add new" items and to let the owner recategorise), and a dedicated
Inventory screen.

On the health-record side: the course-type **Medication** field and the new optional Deworming-step
**Dewormer product** field are both searchable comboboxes over `inventory_items` (medicine-only),
filtered by `category` (Deworming → `dewormer`; Treatment → everything else), each showing a
"⚠ No stock recorded" marker at quantity 0 without blocking selection, with a "+ Add new" that inserts
a new `inventory_items` medicine row (`quantity 0`; `category = 'dewormer'` from Deworming, `null` from
Treatment). `health_records.medication_name` stays plain text — no foreign key. The combobox component
(`components/health/medication-combobox.tsx`) is built on the same `components/ui/combobox` primitive
introduced by `UPD-004`; no new primitive or npm dependency was added.

---

## Appendix — seed data (medicine, quantity 0)

`category` values assigned by the `20260829000005` backfill (see Section 6a).

| # | Name | `category` |
| - | ---- | ---------- |
| 1 | Oxytetracycline 20% | `antibiotic` |
| 2 | Oxytetracycline 10% | `antibiotic` |
| 3 | Gentavet (Gentamicin) | `antibiotic` |
| 4 | Pen and Strip Antibiotic | `antibiotic` |
| 5 | Penicillin | `antibiotic` |
| 6 | Tylosin 200 (20%) | `antibiotic` |
| 7 | Iron Dextran | `vitamin_support` |
| 8 | Multivitamin injections | `vitamin_support` |
| 9 | Dexamethasone | `anti_inflammatory` |
| 10 | Ivermectin | `dewormer` |
| 11 | Nitroxinil | `dewormer` |
| 12 | Nilvasol 1L | `dewormer` |
| 13 | AlbeNor 1L | `dewormer` |

The `medicine_category` enum also has `other`, unused by the seed — available for "+ Add new" items and
for spec 10 to assign.
