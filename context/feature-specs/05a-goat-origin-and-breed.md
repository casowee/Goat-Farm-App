# 05a — Goat Origin & Breed Composition (follow-up to 05)

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| Phase       | 1 — Foundation (follow-up to 05 — goat-profiles)                                    |
| Aspect      | Both (additive schema + UI)                                                         |
| Status      | `planned` → set to `in progress` when work starts                                  |
| Depends on  | 05 — goat-profiles (goats table + form dialog, already `done`)                     |
| Relates to  | 06 — family-tree (origin drives parent defaults), 09 — breeding (offspring composition, later), 11 — sales-and-purchases (later) |

> **Agent:** this amends an already-`done`, already-applied feature. Do **not** edit 05's applied
> migration — add a **new** additive migration. Match the 05 build's conventions (bigserial/bigint
> ids, single `for all` RLS policy, how `sex`/`status` are defined). Follow the roadmap status rules
> at the end of this file.

---

## 1. Goal

Three additions the registration form was missing:

1. **Breed as a dropdown** from a defined, editable list, with an "Other" option.
2. **Breed composition / purity** — a goat is either **purebred** (100% of one breed) or a **cross of
   two breeds** with a percentage (e.g. 75% Boer × 25% Somali). This tracks *grading up*: improving a
   breed by crossing it toward a better one over generations (50% → 75% → 87.5% → 93.75% → pure).
3. **Origin: born on the farm vs purchased**, and a **purchase date** when purchased. The form adapts:
   the purchase-date field only appears when "Purchased" is selected.

## 2. What changes

| Change                                    | Schema?        | Notes                                                     |
| ----------------------------------------- | -------------- | -------------------------------------------------------- |
| Breed → dropdown                          | No new column  | uses the existing `breed` text column (= primary breed)  |
| Breed composition (secondary + %)         | **Migration**  | `breed_secondary`, `breed_primary_pct`                   |
| Origin (born here / purchased)            | **Migration**  | `origin`                                                 |
| Purchase date                             | **Migration**  | `purchase_date`                                          |
| Form: purebred-vs-cross + show/hide fields| UI only        | client behavior in the goat form dialog                  |

All new columns land in **one** additive migration.

---

## 3. Data model (additive columns on `goats`)

The existing `breed` column becomes the **primary (dominant) breed**. Two columns are added for the cross.

| Column               | Type                          | Meaning                                                        |
| -------------------- | ----------------------------- | ------------------------------------------------------------- |
| `breed` (existing)   | `text`                        | primary / dominant breed                                      |
| `breed_secondary`    | `text` nullable               | the second breed in a cross; **NULL ⇔ purebred**              |
| `breed_primary_pct`  | `numeric(6,3) not null default 100` | % of the **primary** breed (50–100). Secondary = 100 − this. |

Purebred is the case `breed_secondary IS NULL AND breed_primary_pct = 100`.
`numeric` (not integer) is deliberate so grading fractions like **87.5** and **93.75** are exact.

### Migration (new file — do not touch 05's migration)

```sql
-- Origin: closed, stable set — mirror how sex/status are defined on goats (enum shown; use text+check if that's the project convention).
do $$ begin
  create type goat_origin as enum ('born_here','purchased');
exception when duplicate_object then null;
end $$;

alter table public.goats
  add column if not exists origin            goat_origin   not null default 'born_here',
  add column if not exists purchase_date     date,
  add column if not exists breed_secondary   text,
  add column if not exists breed_primary_pct numeric(6,3)  not null default 100;

-- Integrity (migrations run once, so plain ADD CONSTRAINT is fine):
alter table public.goats
  add constraint goats_breed_pct_range
    check (breed_primary_pct >= 50 and breed_primary_pct <= 100),
  add constraint goats_breed_cross_consistency
    check (
      (breed_secondary is null     and breed_primary_pct = 100) or        -- purebred
      (breed_secondary is not null and breed_primary_pct >= 50
                                   and breed_primary_pct <  100)           -- cross
    ),
  add constraint goats_breed_distinct
    check (breed_secondary is null or breed_secondary <> breed);
```

Existing goats backfill to purebred (`pct = 100`, `secondary = null`) and born-here — all constraints
hold. Run `npm run gen:types` and commit `types/database.types.ts`.

---

## 4. Task — Breed dropdown + composition

**File:** `lib/goats/breeds.ts` — the single place breeds and grading steps live (portable, no React).

```ts
export const GOAT_BREEDS = [
  'Somali (Galla)',
  'Boer',
  'Savanna',
  'Kalahari',
  'Local',
] as const
export type GoatBreed = (typeof GOAT_BREEDS)[number]

// Standard grading-up shares for the primary breed (each generation halves the gap to 100%).
export const GRADING_PERCENTAGES = [50, 75, 87.5, 93.75] as const

export interface BreedComposition {
  primary: string
  primaryPct: number          // 50–100
  secondary?: string | null
}

export function isPurebred(c: BreedComposition): boolean {
  return c.secondary == null || c.primaryPct >= 100
}

// "Boer (purebred)"  |  "75% Boer × 25% Somali (Galla)"
export function formatBreed(c: BreedComposition): string
```

**Form** (`components/goats/goat-form-dialog.tsx`):

1. **Primary breed** — a Select built from `GOAT_BREEDS`, plus a final **"Other…"** option that reveals
   a text input. The chosen value saves to `goats.breed`.
2. **Purebred or crossbred?** — a toggle / radio.
   - **Purebred** → `breed_primary_pct = 100`, `breed_secondary = null`. No further fields.
   - **Crossbred** → reveal:
     - **Secondary breed** — a Select (same list + Other), **must differ from the primary**.
     - **Percentage of the primary** — a Select of `GRADING_PERCENTAGES` plus a **Custom** entry
       (50–99.99). Show a live read-only helper: e.g. "= 75% Boer × 25% Somali (Galla)".

**Validation** (`createGoat` / `updateGoat`), matching the DB constraints so errors are friendly not raw:

- Primary breed required (per 05a); if "Other", non-empty trimmed text.
- Purebred → force `breed_primary_pct = 100` and `breed_secondary = null`.
- Crossbred → `breed_secondary` set and `≠ breed`; `breed_primary_pct` in `[50, 100)`.

> **Extensibility:** this models a **two-breed** cross (one percentage fully describes it, since the
> secondary is the remainder). If 3+ breed grading is ever needed, migrate `breed_*` to a JSON
> composition array later — designed for, not built now.

---

## 5. Task — Origin & purchase date

**Form** (`components/goats/goat-form-dialog.tsx`):

- **Origin** select: *Born on the farm* / *Purchased*.
- **Purchased** → reveal a **Purchase date** field. **Born on the farm** → hide it.

**Validation** (`createGoat` / `updateGoat`):

- `origin` must be valid.
- `born_here` → force `purchase_date = null`.
- `purchased` → `purchase_date` allowed; if given, not in the future and **not before `date_of_birth`**
  (a goat can't be bought before it was born). Whether it's *required* when purchased → open question.

---

## 6. Interaction with 06 (parents) — the "add parents later" concern

Already handled by design; 05a just informs it:

- **Parents are optional and editable anytime** in 06, so a goat can be registered with none and have
  them added later — nothing forces parent records at registration.
- 06's parent pickers should **read `origin` for sensible defaults**: `born_here` → default to
  **in-system** parents; `purchased` → default to **external name / none** with an "add later"
  affordance. A hint, never a hard rule.

Add this to 06's parent-picker task, or honor it when 06 is built.

> **Future (09 — breeding):** offspring composition can be **auto-computed** as the average of the two
> parents' compositions (100% Boer × 100% Somali → 50/50; 100% Boer × 50/50 Boer/Somali → 75% Boer).
> That's the grading-up math. Designed for here; the breeding module can suggest it later. Not built now.

## 7. Files this unit touches

```
supabase/migrations/xxxx_goat_origin_breed.sql   # NEW additive migration (origin, purchase_date, breed_secondary, breed_primary_pct)
types/database.types.ts                           # regenerated
lib/goats/breeds.ts                               # breed list + grading steps + BreedComposition helpers
components/goats/goat-form-dialog.tsx             # breed Select + Other; purebred/cross UI; Origin + conditional purchase date
app/(app)/goats/actions.ts                        # validate breed composition, origin, purchase_date
app/(app)/goats/page.tsx , [id]/page.tsx          # show formatted breed (formatBreed) + origin
```

Do not edit `components/ui/*`.

## 8. Verification (must pass before 05a is `done`)

Build & types: `npm run build` passes; `tsc` clean (no `any`).

Click-through:

1. Breed is a **dropdown** (Somali (Galla), Boer, Savanna, Kalahari, Local, Other…); Other reveals a text box.
2. **Purebred** stores just the one breed (100%, no secondary). Detail shows e.g. "Boer (purebred)".
3. **Crossbred** reveals a second breed + percentage; picking 75% shows "= 75% Boer × 25% Somali" and
   saves; detail shows "75% Boer × 25% Somali". An 87.5% value is stored exactly (not rounded).
4. Secondary breed cannot equal the primary (rejected clearly).
5. Choosing **Purchased** reveals **Purchase date**; **Born on the farm** hides it. A future date, or a
   date before DOB, is rejected.
6. Existing goats still load (purebred, born-here) and can be edited to a cross / purchased.
7. Dark theme, phone width, no console errors.

## 9. Roadmap & progress updates — the agent must do these

**On starting 05a:** add a **05a — goat-origin-and-breed** row under Phase 1 (right after 05) in
`feature-specs-roadmap.md` if absent, set it to `in progress` in both the "At a glance" table and its
section, and update `progress-tracker.md` (Current / In Progress).

**On completing 05a** (build passes and verified): set **05a** to `done` in `feature-specs-roadmap.md`,
keep the `◀ next` marker on **06** unless the owner reorders, and record it in `progress-tracker.md`
(Completed + a dated Session Notes line). Update the roadmap and progress tracker in the **same commit**
as the code.

## 10. Open questions (resolve, don't guess)

- **Is breed required?** Made required in the form (Local/Other as fallbacks), nullable in DB for imports. Confirm.
- **Grading percentages offered.** Standard set is 50 / 75 / 87.5 / 93.75 (+ custom). Confirm this covers
  the owner's crossing practice, or adjust the list in `GRADING_PERCENTAGES`.
- **Is purchase date required when purchased?** Encouraged, but allowed blank if unknown. Confirm.
- **Seller / purchased-from.** Not added. If the owner wants to record who a goat was bought from (and
  later link to a purchase record in module 11), add `purchased_from text` in this same migration.
- **Origin column style.** Enum vs `text` + check — match whatever `sex`/`status` already use on goats.
- **>2-breed composition.** Out of scope (two breeds). Revisit only if the owner ever needs three-way grading.
