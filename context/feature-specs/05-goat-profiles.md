# 05 — Goat Profiles

| Field       | Value                                                                 |
| ----------- | --------------------------------------------------------------------- |
| Phase       | 1 — Foundation                                                        |
| Aspect      | Both (schema + RLS + storage + shared logic + UI)                     |
| Status      | `planned` → set to `in progress` when work starts                     |
| Depends on  | 04 — barns (a goat must be assigned a barn at registration)           |
| Unblocks    | 06 — family-tree, 07 — health, 08 — weight, 09 — breeding, 11 — sales |

> **Agent:** before writing any code, read `project-overview.md`, `architecture-context.md`,
> `code-standards.md`, `ui-context.md`, and `ai-workflow-rules.md`. Implement against this spec —
> do not infer behavior from scratch. Follow the roadmap status rules in the last section of this file.

---

## 1. Goal

Register and manage individual goats. Each goat is assigned to a barn at registration, carries its
core details (name/tag, breed, sex, date of birth, reproductive state, status, photo, notes), and
shows a **stage** (Doe / Doeling / Buck / Buckling / Wether / Kid) that is **computed**, never stored.
The owner can list goats, filter by barn, open a goat's detail page, and add / edit / delete goats.

This is the second real CRUD module. It copies the **barns** pattern (Server Component list, server
actions with `revalidatePath`, one reused form dialog, one confirm dialog) and extends it with a
foreign key (barn), a self-referencing shape (parents), derived domain logic (stage), and file upload.

## 2. Scope

**In scope for 05**

- `goats` table (owner + RLS) confirmed or created, with generated types regenerated.
- Goat CRUD (create / read / update / delete) as server actions.
- Barn assignment **required in the form**, `barn_id` nullable in the database.
- Derived **goat stage** as a pure function in `lib`.
- List page with a **barn filter** and empty state; goat **detail** page; add / edit form dialog; delete confirm.
- Photo upload to Supabase Storage (last task — splittable; goats work without it).

**Out of scope for 05 (do not build here)**

- Parent **selection UI** and the **pedigree / family-tree view** → **06**. The parent *columns*
  (`sire_id`, `dam_id`, `sire_name`, `dam_name`) are created here as nullable so 06 needs no goat-table migration, but the 05 form does **not** collect parents.
- Barn-move history (`goat_barn_moves`) → **06**.
- Health / weight / breeding history tabs → their own modules. The detail page renders **empty placeholders** for these sections only.
- Anything under "Out of Scope" / "Planned for Later" in `project-overview.md`.

## 3. Constraints that apply (from the context files)

- **RLS is mandatory.** The `goats` table has row-level security enabled with owner policies using `auth.uid()` **before any feature reads or writes it** (`ai-workflow-rules.md`, invariant 1).
- **Schema via migrations.** The migration lives in `supabase/migrations/`, so the DB is rebuildable from version control — even if the owner already applied equivalent SQL in the dashboard, commit the migration and reconcile (`ai-workflow-rules.md`).
- **Server components for reads**, client components only where interactive (`code-standards.md`).
- **Design tokens only** — no raw Tailwind colors, no hex. Radius scale: `rounded-xl` inline, `rounded-2xl` cards, `rounded-3xl` modals. Build from `components/ui/*`; do **not** edit those foundation files.
- **Generated types** for all reads/writes; no hand-written duplicates; strict TypeScript, no `any`.
- **Stage logic is a pure, portable function in `lib`** so it can later move into a Supabase function for mobile (invariant 6).
- **Photos go in Supabase Storage; the DB stores only a reference**, never the file.

---

## 4. Task 0 — Confirm the schema before creating it

The generated `types/database.types.ts` already covers multiple tables. **First inspect it** (or run
`npm run gen:types`) to see whether a `goats` table already exists and what shape the owner gave it.

- **If `goats` already exists:** treat the generated type as the source of truth. Reconcile this
  spec's shape against it, add a migration only for what is genuinely missing, and confirm RLS +
  owner policies are present. Do **not** recreate the table.
- **If it does not exist:** create it with the migration below.

Either way, end this task with `npm run gen:types` run and `types/database.types.ts` committed.

## 5. Data model

`goats` — one row per animal. Every column that is a closed set uses a Postgres enum so the generated
types carry a real union (preferred over `text` + check for this reason). If the barns migration
established a different convention, match whichever the owner already uses — but stay consistent.

| Column               | Type                                   | Notes                                                            |
| -------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `id`                 | `uuid` PK `default gen_random_uuid()`  |                                                                 |
| `owner_id`           | `uuid not null default auth.uid()`     | FK → `auth.users`; RLS key. Actions never set this — the default does (barns pattern). |
| `name`               | `text not null`                        | name or tag — the primary label                                 |
| `tag`                | `text`                                 | optional secondary tag / ear-tag ID (see open question)         |
| `breed`              | `text`                                 |                                                                 |
| `sex`                | `goat_sex` (`male` \| `female`) `not null` |                                                             |
| `date_of_birth`      | `date not null`                        | required so stage always derives (see open question)            |
| `reproductive_state` | `reproductive_state` (`intact` \| `castrated`) `not null default 'intact'` | females stay `intact`      |
| `status`             | `goat_status` (`active` \| `sold` \| `deceased`) `not null default 'active'` |                       |
| `barn_id`            | `uuid` FK → `barns(id)` `on delete set null` | **nullable** (invariant 7); the form always sets it       |
| `photo_url`          | `text`                                 | Storage object path / URL reference; nullable                   |
| `notes`              | `text`                                 |                                                                 |
| `sire_id`            | `uuid` FK → `goats(id)` `on delete set null` | nullable; **UI deferred to 06**                            |
| `dam_id`             | `uuid` FK → `goats(id)` `on delete set null` | nullable; **UI deferred to 06**                            |
| `sire_name`          | `text`                                 | external father not in the system; **UI deferred to 06**        |
| `dam_name`           | `text`                                 | external mother not in the system; **UI deferred to 06**        |
| `created_at`         | `timestamptz not null default now()`   |                                                                 |

### Migration (only if `goats` does not already exist)

```sql
-- Enums (guard against re-creation if partially applied)
do $$ begin create type goat_sex as enum ('male','female'); exception when duplicate_object then null; end $$;
do $$ begin create type reproductive_state as enum ('intact','castrated'); exception when duplicate_object then null; end $$;
do $$ begin create type goat_status as enum ('active','sold','deceased'); exception when duplicate_object then null; end $$;

create table if not exists public.goats (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name               text not null,
  tag                text,
  breed              text,
  sex                goat_sex not null,
  date_of_birth      date not null,
  reproductive_state reproductive_state not null default 'intact',
  status             goat_status not null default 'active',
  barn_id            uuid references public.barns(id) on delete set null,
  photo_url          text,
  notes              text,
  sire_id            uuid references public.goats(id) on delete set null,
  dam_id             uuid references public.goats(id) on delete set null,
  sire_name          text,
  dam_name           text,
  created_at         timestamptz not null default now()
);

create index if not exists goats_owner_id_idx on public.goats (owner_id);
create index if not exists goats_barn_id_idx  on public.goats (barn_id);

alter table public.goats enable row level security;

create policy "Owner can read own goats"   on public.goats for select using (auth.uid() = owner_id);
create policy "Owner can insert own goats"  on public.goats for insert with check (auth.uid() = owner_id);
create policy "Owner can update own goats"  on public.goats for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can delete own goats"  on public.goats for delete using (auth.uid() = owner_id);
```

Match the exact policy **naming style** the barns migration used so the project stays uniform.

---

## 6. Task — Goat stage (pure domain logic)

Build this as a pure, testable function in `lib` — no DB, no React. It can be built first, before the UI.

**File:** `lib/goats/stage.ts`

```ts
export type GoatSex = 'male' | 'female'
export type ReproductiveState = 'intact' | 'castrated'
export type GoatStage = 'Kid' | 'Doeling' | 'Buckling' | 'Doe' | 'Buck' | 'Wether'

// PLACEHOLDER thresholds in months — confirm with the owner; may vary by breed.
// Kept in one place so they are trivial to tune (architecture-context.md, stage derivation).
export const STAGE_THRESHOLDS_MONTHS = {
  kidMax: 6,         // age < 6 months           → Kid
  youngStockMax: 12, // 6 ≤ age < 12 months       → Doeling / Buckling ; age ≥ 12 → Doe / Buck
} as const

export function ageInMonths(dateOfBirth: string | Date, now: Date = new Date()): number { /* full months elapsed */ }

export function deriveGoatStage(input: {
  sex: GoatSex
  reproductiveState: ReproductiveState
  dateOfBirth: string | Date
  now?: Date
}): GoatStage
```

**Rules (apply in this order):**

1. A **castrated male → `Wether`**, regardless of age (architecture-context.md, explicit).
2. Otherwise compute age. Age `< kidMax` → **`Kid`** (either sex).
3. Age `< youngStockMax` → female **`Doeling`**, male **`Buckling`**.
4. Age `≥ youngStockMax` → female **`Doe`**, male **`Buck`**.

Keep it total (never throws for valid inputs). Because `date_of_birth` is `not null`, the function
always has an age to work with. Add a small unit test if the project has a test runner; otherwise the
function must at least be exercised by the detail page and the stage badge.

**Do not scatter the thresholds** — every caller reads `STAGE_THRESHOLDS_MONTHS`.

---

## 7. Task — Server actions

**File:** `app/(app)/goats/actions.ts` — `createGoat`, `updateGoat`, `deleteGoat`.

- Mirror the barns actions: validate/parse input before the write, return predictable shapes, and
  `revalidatePath('/goats')` (and the detail path on update).
- **Never set `owner_id`** — the column default (`auth.uid()`) handles it.
- Validate: `name` non-empty (trimmed); `sex`, `reproductive_state`, `status` are valid enum values;
  `date_of_birth` is a real date not in the future; `barn_id`, if present, is one of the owner's barns
  (RLS already blocks cross-owner writes, but validate for a clean error rather than a DB error).
- Females: force `reproductive_state = 'intact'` server-side even if the form omits it.
- Do **not** accept `sire_id` / `dam_id` / `sire_name` / `dam_name` from the 05 form (deferred to 06).

## 8. Task — List page + barn filter

**File:** `app/(app)/goats/page.tsx` (Server Component).

- Read the owner's goats (RLS-scoped) joined to their barn name; read the owner's barns for the filter.
- **Barn filter:** a control that sets `?barn=<id>` (or `all`). Default is **all barns**. Filtering is
  done in the query from `searchParams`. The filter control itself is a small client component
  (`components/goats/barn-filter.tsx`); the page stays a Server Component.
- **Empty states:**
  - No barns yet → don't show an "Add goat" form. Show a message pointing to Barns first
    ("Create a barn before registering a goat"), linking to `/barns` (invariant 7).
  - Barns exist but no goats → show the standard empty state with an **Add goat** button.
- **List rendering:** table on wide screens, stacked cards on phone (`ui-context.md`, list views).
  Each row/card shows name/tag, breed, sex, the **stage badge**, status, and barn.

## 9. Task — Add / edit form dialog

**File:** `components/goats/goat-form-dialog.tsx` — one dialog reused for add and edit via an optional
`goat` prop (barns pattern). Client component, `useActionState` + `useFormStatus` for pending/errors,
built on `components/ui/*` (`Dialog` `rounded-3xl`, `Input`, `Select`, `Textarea`, `Button`).

Fields:

- **Name** (required), **Tag** (optional), **Breed** (optional).
- **Sex** (select: Male / Female).
- **Date of birth** (date input, required; label note: "approximate is fine if exact DOB is unknown").
- **Reproductive state** — only shown/enabled when Sex = Male (Intact / Castrated). Hidden for females.
- **Status** (Active / Sold / Deceased), default Active.
- **Barn** (select of the owner's barns) — **required in the form**.
- **Notes** (textarea, optional).
- **Photo** (optional) — see the photo task; if that task is deferred, omit this field for now.

No `<form>`-tag submission quirks — use the action + `useFormStatus`, consistent with barns/login.

## 10. Task — Detail page

**File:** `app/(app)/goats/[id]/page.tsx` (Server Component, RLS-scoped; 404 if not the owner's goat).

- Header: name/tag, photo (or placeholder), **stage badge** (from `deriveGoatStage`), status, breed, barn.
- Core details block: sex, date of birth (+ derived age), reproductive state, notes.
- **Placeholder sections** (empty, clearly labelled "coming soon") for Health, Weight, Breeding, and
  Lineage — these are filled by 06–09. Group them as tabs or sections per `ui-context.md`.
- Edit and Delete actions (open the same form dialog / a `components/goats/delete-goat-dialog.tsx`).

**Stage badge:** `components/goats/goat-stage-badge.tsx` — small badge using accent tokens; renders the
string from `deriveGoatStage`. Reused by the list and the detail page.

## 11. Task — Photo upload (last; splittable)

`photo_url` is nullable and goats are fully usable without a photo, so **this task may ship as its own
increment**. If it grows, deliver goats first and add photos in a follow-up commit.

- **Bucket:** private `goat-photos` (do **not** make it public unless the owner chooses to). Store
  objects under an owner-scoped path, e.g. `{owner_id}/{goat_id}/{filename}`.
- **Storage policies:** owner can only read/write objects whose first path segment is their `auth.uid()`:

```sql
insert into storage.buckets (id, name, public) values ('goat-photos','goat-photos', false)
on conflict (id) do nothing;

create policy "Owner reads own goat photos"   on storage.objects for select
  using (bucket_id = 'goat-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner writes own goat photos"   on storage.objects for insert
  with check (bucket_id = 'goat-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner updates own goat photos"  on storage.objects for update
  using (bucket_id = 'goat-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner deletes own goat photos"  on storage.objects for delete
  using (bucket_id = 'goat-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

- Store the **object path** in `goats.photo_url` and generate a **signed URL** server-side when
  rendering (bucket is private). Simpler alternative the owner may prefer: a public bucket storing the
  public URL directly — note the trade-off (anyone with the link can view) and let the owner decide.
- Uploader is a small client component (`components/goats/goat-photo-upload.tsx`).

---

## 12. Files this unit touches

```
supabase/migrations/xxxx_goats.sql          # table + RLS (+ storage bucket/policies for photos)
types/database.types.ts                      # regenerated after the migration
lib/goats/stage.ts                           # pure stage-derivation logic + thresholds
app/(app)/goats/page.tsx                     # list (Server Component) + barn filter
app/(app)/goats/[id]/page.tsx                # detail (Server Component)
app/(app)/goats/actions.ts                   # create/update/deleteGoat
components/goats/goat-form-dialog.tsx        # add/edit (client)
components/goats/delete-goat-dialog.tsx      # confirm (client)
components/goats/barn-filter.tsx             # list filter (client)
components/goats/goat-stage-badge.tsx        # stage badge
components/goats/goat-photo-upload.tsx       # photo upload (client) — photo task only
```

`Goats` already exists in `lib/nav.ts` from the app-shell step — do not add a second entry.

## 13. Verification (must pass before 05 is `done`)

Build & type checks:

- `npm run build` passes; `tsc` clean (no `any`, strict).
- Selecting a nonexistent column fails type-check (proves generated types are wired) — then revert.

Click-through in the running app (plain-language checks for the owner):

1. With **no barns**, the Goats page tells you to create a barn first and doesn't let you add a goat.
2. With a barn, **Add goat** opens the dialog; a blank name is rejected with an inline error.
3. Registering a goat assigns it to the chosen barn and it appears in the list. *(Success criterion 2.)*
4. Opening a goat shows its full profile. *(Success criterion 4.)*
5. The **stage badge** is correct for a few cases: a young female → Doeling, an adult female → Doe,
   an adult intact male → Buck, a **castrated male of any age → Wether**, a very young goat → Kid.
   *(Success criterion 10.)*
6. The **barn filter** narrows the list and "all barns" shows everything.
7. Edit changes persist; delete removes the goat after confirmation.
8. Dark-desert theme throughout, usable at iPhone width, no console errors.

Owner-only (needs their real login, like barns): authenticated CRUD and RLS isolation across two
accounts. Note it as the owner's manual step; don't block the code `done` on it.

## 14. Roadmap & progress updates — the agent must do these

**On starting 05:**

- In `feature-specs-roadmap.md`, set feature **05** to `in progress` in **both** the "At a glance"
  table row and the `### 05 — goat-profiles` section header (remove the `◀ next` marker).
- In `progress-tracker.md`, set **Current Goal** / **In Progress** to reflect that 05 is active.

**As each task above completes:** flip that task's sub-feature row (in the 05 section of
`feature-specs-roadmap.md`) from `planned` to `done`.

**On completing 05** (build passes and verified):

- Set feature **05** to `done` in `feature-specs-roadmap.md`, and move the `◀ next` marker to **06**.
- Record the work in `progress-tracker.md` (**Completed** entry + a dated **Session Notes** line),
  and resolve or update the stage-threshold open question with whatever values were used.

**Never move on to 06 while 05 is still marked `in progress`.** Roadmap and progress must be updated
in the **same commit** as the code they describe — this file tracks reality, not intent.

## 15. Open questions (resolve, don't guess)

- **Stage thresholds.** `kidMax` / `youngStockMax` are placeholders. Ask the owner for real values
  (they may differ by breed) and update `STAGE_THRESHOLDS_MONTHS` + the progress-tracker open question.
- **Name vs tag.** This spec uses `name` (required) + optional `tag`. If the owner wants a single
  identifier, collapse to `name` only — decide before the migration is applied.
- **DOB required.** `date_of_birth` is `not null` so stage always derives. If the owner needs to record
  goats of unknown age, relax to nullable and define the stage fallback then — not now.
- **Photo bucket privacy.** Private bucket + signed URLs (default here) vs public bucket + public URL.
  Confirm the owner's preference before implementing the photo task.
