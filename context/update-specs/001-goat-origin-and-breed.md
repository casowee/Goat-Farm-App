# 001 — Goat Origin & Breed Composition

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-001` (migrated from the former `05a` follow-up spec)         |
| Title             | Goat origin (born-here / purchased) & breed composition           |
| Status            | `done`                                                            |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `05-goat-profiles`                                                |
| Depends on        | none                                                             |
| Schema impact     | additive migration (05's migration untouched)                    |
| Created           | 2026-08 (migrated into update-specs on adoption of this folder)   |

---

## 1. Reason for update

The registration form couldn't record two things the owner needs: whether a goat was **born on the farm
or purchased** (and when it was purchased), and a goat's **breed composition** — pure vs a cross of two
breeds, to track grading up toward an improved breed. Both are core record-keeping the original 05 goat
profile lacked.

## 2. Current behavior

Before this update, `goats` had a single free-text `breed` column and no notion of origin or purchase
date. Breed was typed freely; there was no way to express "50% Boer × 50% Somali" or "purchased on a
date".

## 3. Desired behavior

- Every goat records an **origin** (`born_here` / `purchased`); purchased goats can record a
  **purchase date**.
- Breed is expressed as a **composition**: either purebred (100% of one breed) or a cross of two breeds
  with a percentage of the primary (50–99.99%), the secondary being the remainder.
- The form guides breed entry with a dropdown and computes/echoes the composition.

## 4. Scope (in and out)

**In scope**
- Additive columns: `origin`, `purchase_date`, `breed_secondary`, `breed_primary_pct`.
- DB check constraints enforcing purebred-or-cross consistency.
- Breed dropdown + composition input; origin control revealing purchase date; portable breed helpers.

**Out of scope**
- Auto-computing a born-here goat's breed from its parents → needs family tree (`06`); tracked there.
- The later form restructure and the "Crossed" dropdown rework → tracked as a separate update spec.
- Seller / purchased-from column → left as an open question for a future update.

## 5. UX / interaction requirements

- **Breed** dropdown from a fixed list (Somali (Galla), Boer, Savanna, Kalahari, Local) plus **Other…**.
- A **purebred / crossbred** control; crossbred reveals a **secondary breed** and a **percentage**, with
  a **live preview** (e.g. "87.5% Boer × 12.5% Somali (Galla)").
- **Origin** control (*Born on the farm* / *Purchased*); **Purchased** reveals **Purchase date**.
- Dark-desert theme, usable at phone width, tokens and radius scale per `ui-context.md`.

## 6. Domain / data / API requirements

Additive migration (new file — 05's applied migration untouched):

```sql
do $$ begin
  create type goat_origin as enum ('born_here','purchased');
exception when duplicate_object then null;
end $$;

alter table public.goats
  add column if not exists origin            goat_origin   not null default 'born_here',
  add column if not exists purchase_date     date,
  add column if not exists breed_secondary   text,
  add column if not exists breed_primary_pct numeric(6,3)  not null default 100;
```

- `lib/goats/breeds.ts` — breed list, grading percentages, and `formatBreed()` / `isPurebred()` (pure,
  portable, no React/Supabase).
- `createGoat` / `updateGoat` validate breed composition, origin, and purchase date server-side to match
  the DB constraints. `origin='born_here'` forces `purchase_date = null`; a purchase date may not be in
  the future or before `date_of_birth`.
- Regenerate `types/database.types.ts` after the migration.

## 7. Safety and data integrity rules

- RLS/ownership unchanged — additive columns on the already-owner-scoped `goats` table.
- Three check constraints guarantee composition integrity at the database:
  purebred ⇔ (`breed_secondary IS NULL AND breed_primary_pct = 100`); cross ⇔ (`breed_secondary` set,
  `50 ≤ breed_primary_pct < 100`); and `breed_secondary <> breed`.
- Existing rows backfill safely (purebred, born-here) via the column defaults — no data loss.
- `numeric(6,3)` (not integer) so grading fractions like 87.5 / 93.75 are stored exactly.

## 8. Acceptance criteria

- [x] Origin can be set; purchased goats can store a purchase date; born-here goats cannot.
- [x] Breed can be purebred (100%, no secondary) or a two-breed cross with a percentage.
- [x] Invalid states (future/pre-DOB purchase date; secondary = primary; out-of-range %) are rejected.
- [x] Existing goats still load and edit.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed.

**Manual (user flow)** — open Add goat: choose Purchased → purchase date appears and saves; choose Born
on the farm → it's hidden. Choose a pure breed → saved as 100%. Choose crossbred → secondary + % appear,
preview updates, saves. Confirm a future/pre-DOB purchase date and secondary = primary are rejected.
Re-open existing goats and confirm they still load and edit.

## 10. Related spec files

- Extends: `context/feature-specs/05-goat-profiles.md`.
- Followed by: the goat-form restructure & breed-cross update (separate update spec) and a
  dialog-trigger hydration fix (error spec).
- Informs: `context/feature-specs/06-family-tree.md` (parent-based breed computation).

## 11. Implementation note

Origin modeled as an enum matching how `sex` / `status` are defined on `goats`. Breed kept as the
two-column composition model (`breed` primary + `breed_secondary` + `breed_primary_pct`) rather than an
enum, so breeds stay editable via `lib/goats/breeds.ts` without a migration. Percentage stored as
`numeric(6,3)` specifically to hold exact grading fractions.

## 12. Verification evidence

Shipped and verified: build passed; browser-tested with zero console errors; temporary test scaffolding
reverted. Two real bugs were caught and fixed during verification: the breed/percentage dropdowns
displayed raw internal sentinel values (e.g. `__other__`) instead of readable labels, and (pre-existing
from 05) the Barn dropdown showed a barn's numeric id instead of its name once selected — both fixed via
an `items` prop on the Select.

## 13. Resolution / final state

`goats` now carries `origin`, `purchase_date`, `breed_secondary`, and `breed_primary_pct` with
integrity constraints; the form captures origin (with conditional purchase date) and a purebred/cross
breed composition with a live preview. **Follow-ons:** the breed *input* was subsequently reworked (a
"Crossed" dropdown option and removal of the manual grading-percentage picker) and the form was
restructured around origin — tracked as a later update spec; a dialog-trigger hydration mismatch found
on the Goats page is tracked as an error spec. Parent-based breed auto-computation for born-here goats
remains deferred to `06`, where the two-breed model will likely be migrated to a multi-breed composition
(averaging real parents can yield three or more breeds).
