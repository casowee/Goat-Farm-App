# 06 — Family Tree & Pedigree

| Field       | Value                                                                         |
| ----------- | ------------------------------------------------------------------------------ |
| Phase       | 2 — Core records                                                              |
| Aspect      | Both (schema + RLS + shared logic + UI)                                       |
| Status      | `done` (all four increments 6a–6d built and browser-verified 2026-08-28)       |
| Depends on  | 05 — goat-profiles, `UPD-001` goat-origin-and-breed, `UPD-002` goat-form-and-breed-cross (all done) |
| Unblocks    | 09 — breeding-and-inbreeding (the relatedness check reuses the pedigree walk) |

> **Agent:** before writing code, follow the Implementation Workflow in `ai-workflow-rules.md`:
> 1. Read this **feature spec**.
> 2. Read the **approved update specs** that govern the current goat feature — `UPD-001` and `UPD-002` —
>    since the true current shape of `goats` is **feature spec 05 + UPD-001 + UPD-002**, not 05 alone.
> 3. Read the **error specs** for this area — `ERR-001` (resolved) — so the fix's Preventive Rule isn't
>    undone by this build (don't reintroduce a client-component element as a `trigger` prop anywhere new).
> 4. Then implement, and pass the verification gate before marking this `done`.
> Also read `architecture-context.md`, `code-standards.md`, and `ui-context.md`.

---

## 1. Goal

Give each goat a **lineage**: links to its sire (father) and dam (mother) — each either an in-system
goat or an external animal recorded by name — and a **pedigree view** that traces ancestry back through
several generations. Also add **barn-move history**: moving a goat to another barn updates its current
barn and records the move.

This spec also closes out two things `UPD-001`/`UPD-002` deliberately deferred here:

- **Parent-based breed auto-computation** for born-here goats (the "add parents later" UX and the
  averaging math).
- The resulting **multi-breed schema migration** — averaging real parents' compositions can produce
  three or more breeds, which the current two-breed columns can't hold.

The pedigree walk is a **pure, portable function in `lib`** because **spec 09's inbreeding check** walks
the same ancestry — build it so 09 can reuse it rather than re-implementing it (invariant 6).

## 2. Match what's actually built (05 + UPD-001 + UPD-002)

- **IDs are `bigserial` (bigint), not uuid.** Every new foreign key to `goats` or `barns` is bigint.
- **RLS uses a single `for all` policy** per table (owner check in `using` + `with check`).
- **`tag` is required, `name` is optional.** Label goats by **tag** in pickers and the pedigree view,
  falling back to `name` when a tag is somehow absent.
- **Breed is a composition**, not a single string: `breed` (primary), `breed_secondary` (nullable ⇔
  purebred when null), `breed_primary_pct` (`numeric`, so 87.5/93.75 are exact). Helpers live in
  `lib/goats/breeds.ts` (`GOAT_BREEDS`, `formatBreed`, `isPurebred`, `crossOfPureBreeds`).
- **The goat form is origin-driven**, via a **segmented control** (Born on the farm / Purchased) with
  conditional field sets (`goat-form-dialog.tsx`). Purchased goats default breed to 100% purebred;
  born-here goats can be Purebred or Crossed.
- **`origin`** (`born_here` / `purchased`) and **`purchase_date`** already exist on `goats`.
- **Reconcile before creating.** The project has legacy pre-spec tables (flagged in
  `progress-tracker.md`) that collide with 07/09/11. `goat_barn_moves` was not called out as colliding,
  but still **inspect `types/database.types.ts` first** and only migrate what's genuinely missing.
- **Watch for `ERR-001`'s pattern.** Any new trigger/dialog composition in this spec must not pass a
  client-component element as a `trigger` prop across the server→client boundary into a base-ui `render`
  slot — build triggers inside the client component instead.

## 3. Scope

**In scope for 06**

- Ensure the parent columns exist on `goats` (`sire_id`, `dam_id`, `sire_name`, `dam_name`).
- **Parent capture** in the existing goat form: pick an in-system goat *or* type an external name, for
  each of sire and dam — with the origin-aware default described in Task 6b.
- **Pedigree walk** as a pure `lib` function, cycle-safe, reused by 09.
- **Pedigree view** filling the "Lineage" placeholder tab on the goat detail page.
- **Multi-breed composition migration** — replace the two-breed columns with a model that can express
  3+ breeds, needed for real parent-averaging (Task 7).
- **Parent-based breed auto-computation** for born-here goats (Task 8).
- **`goat_barn_moves`** table (owner + RLS), a **Move to another barn** action, and move history on the
  detail page.

**Out of scope for 06 (do not build here)**

- The **inbreeding / relatedness check** and any mating records → **09**. 06 only provides the ancestry
  data and the reusable walk it will consume.
- **Offspring auto-inheriting** sire/dam from a breeding record → **09** (breeding module).
- Anything under "Out of Scope" / "Planned for Later" in `project-overview.md`.

## 4. Suggested split (this feature is large)

Per `ai-workflow-rules.md`, build in verifiable increments — four are proposed; the agent may adjust at
build time and should update this section if it does:

- **6a — Parents & pedigree:** parent columns → form pickers (origin-aware default) → pedigree walk →
  Lineage view. Two-breed model still in place; breed stays manual for now.
- **6b — Multi-breed composition migration:** replace `breed_secondary` / `breed_primary_pct` with a
  model that expresses 3+ breeds; migrate existing pure/50-50 rows losslessly; update `lib/goats/breeds.ts`.
- **6c — Parent-based breed auto-computation:** `composeFromParents(dam, sire)`; wire into the born-here
  path of the goat form once a goat has both parents linked.
- **6d — Barn-move history:** `goat_barn_moves` table → move action → history on the detail page.

6a should ship first (it's the dependency for 6c). 6d is independent and can ship any time. Verify each
increment in the running app before moving to the next.

---

## 5. Task — Parent columns (add only if missing)

`sire_id` / `dam_id` are nullable bigint self-references; `sire_name` / `dam_name` are nullable text for
parents not in the system.

```sql
alter table public.goats
  add column if not exists sire_id   bigint references public.goats(id) on delete set null,
  add column if not exists dam_id    bigint references public.goats(id) on delete set null,
  add column if not exists sire_name text,
  add column if not exists dam_name  text;
```

Run `npm run gen:types` afterward and commit `types/database.types.ts`.

## 6. Task — Parent capture in the goat form (origin-aware)

Extend `components/goats/goat-form-dialog.tsx` with a **sire** and a **dam** control. Factor the shared
behavior into `components/goats/parent-picker.tsx`:

- Two modes the owner toggles between: **"In the system"** (a searchable select of the owner's goats,
  labelled by **tag**) or **"External"** (a free-text name → `sire_name` / `dam_name`).
- The in-system select filters by sex where known — sire → `sex = male`, dam → `sex = female`. *(Confirm
  this filter — open question.)*
- Both parents are optional (an unknown-lineage goat is valid) — **parents can always be added later**,
  regardless of origin.

**6b — Origin-aware default** (this is what `UPD-001`/`UPD-002` deferred here): read the goat's `origin`
to set the picker's *starting* mode, not a hard rule:
- `born_here` → default both pickers to **in-system**, since its parents are likely already in the herd.
- `purchased` → default both pickers to **external / none**, with a clear "you can add this later"
  affordance, since a bought-in goat's parents usually aren't in the system.
- The owner can always override the default in either direction.

Extend `createGoat` / `updateGoat` in `app/(app)/goats/actions.ts` to **accept** these fields (05/`UPD-*`
deliberately rejected them) and validate:

- A goat may not be its **own** parent (`sire_id`/`dam_id` ≠ this goat's id).
- For a given parent, either an id **or** a name may be set, not both — clear the name when an id is chosen.
- A referenced parent id must be one of the owner's goats (RLS enforces it; validate for a clean error).
- Nice-to-have (may defer): warn if a chosen parent is already a **descendant** of this goat (would
  create a loop). The pedigree walk is cycle-safe regardless, so this is a UX guard, not correctness.

## 7. Task — Multi-breed composition migration (6b)

**Why:** `UPD-001`/`UPD-002` modeled breed as two columns (primary + secondary + one percentage) because
everything built so far — pure breeds, and a manual 50/50 cross — fits in two. But **Task 8** computes a
born-here goat's breed as the **average of its two parents' real compositions**, and averaging two
compositions that are themselves crosses can require **three or more breeds** (e.g. a 50/50 Boer/Somali
goat crossed with a purebred Savanna → 25% Boer / 25% Somali / 50% Savanna). The two-column model cannot
represent that, so it must be replaced before Task 8 is wired up.

**Recommended shape:** a child table, one row per breed component of a goat — simplest to query, extend,
and keep RLS-consistent with the rest of the project (vs. a JSON column, which would be the leaner
alternative if the project prefers fewer tables; pick one and note the choice in Implementation Note).

```sql
create table if not exists public.goat_breed_composition (
  id         bigserial primary key,
  owner_id   uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  goat_id    bigint not null references public.goats(id) on delete cascade,
  breed      text   not null,
  pct        numeric(6,3) not null check (pct > 0 and pct <= 100),
  created_at timestamptz not null default now()
);

create index if not exists goat_breed_composition_goat_id_idx on public.goat_breed_composition (goat_id);

alter table public.goat_breed_composition enable row level security;

create policy "Owner manages own goat breed composition"
  on public.goat_breed_composition for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

- A goat's percentages across its rows must sum to 100 — enforce in the server action (a DB-level `sum`
  check across rows needs a trigger; a simple app-level check is enough for v1, note the trade-off).
- **Migrate existing data losslessly**: for every goat, insert one row from `breed`/`pct=breed_primary_pct`
  (or `pct=100` if `breed_secondary` is null) and, if present, one row from `breed_secondary`/`pct = 100 -
  breed_primary_pct`. Do this in the same migration or an immediately-following data-migration script —
  verify counts before dropping the old columns.
- **Drop** `breed_secondary` and `breed_primary_pct` from `goats` once the data is migrated and verified;
  `goats.breed` may be dropped too if fully superseded, or kept as a denormalized "primary breed" label
  for quick display — decide and note it.
- Update `lib/goats/breeds.ts`: replace `BreedComposition` (2-breed shape) with a list shape, e.g.
  `type BreedComposition = { breed: string; pct: number }[]`. Update `formatBreed`, `isPurebred`,
  `crossOfPureBreeds` to the new shape (they should still read naturally: purebred = one row at 100%;
  the manual 50/50 cross from `UPD-002` = two rows at 50 each).
- **Update the goat form** (`goat-form-dialog.tsx`) to read/write the new shape — the born-here Crossed
  path and the purchased purebred-default path both still work, just against the list model.

## 8. Task — Parent-based breed auto-computation (6c)

**File:** `lib/goats/breed-composition.ts` (or extend `lib/goats/breeds.ts` — pick one, be consistent).

```ts
export function composeFromParents(
  dam: BreedComposition,
  sire: BreedComposition,
): BreedComposition
```

- Average the two parents' compositions: for every breed present in either parent, its resulting share
  is `(damShare + sireShare) / 2` (0 if a parent doesn't carry that breed). Result rows must sum to 100.
- Pure input example: `[{Boer:100}] × [{Somali:100}]` → `[{Boer:50},{Somali:50}]`.
- Grading example: `[{Boer:100}] × [{Boer:50},{Somali:50}]` → `[{Boer:75},{Somali:25}]`.
- Three-breed example: `[{Boer:50},{Somali:50}] × [{Savanna:100}]` →
  `[{Boer:25},{Somali:25},{Savanna:50}]` — this is exactly why Task 7 was needed first.

**Wire into the born-here form path:** when a born-here goat has **both** sire and dam linked to
in-system goats, offer to **compute breed from parents** (a button/toggle: "Use parents' breed" vs
"Enter manually") rather than silently overriding the owner's manual entry. If either parent is external
or unlinked, fall back to the manual breed input from `UPD-002` — no blocking.

## 9. Task — Pedigree walk (pure domain logic, reused by 09)

**File:** `lib/goats/pedigree.ts` — no Supabase import, no React. Pure and testable.

```ts
export const PEDIGREE_MAX_GENERATIONS = 4 // one place to tune; 09's inbreeding check reads this too

export interface PedigreeNode {
  kind: 'goat' | 'external' | 'unknown'
  goatId?: number            // set when kind === 'goat'
  label: string              // tag (fallback to name) for goats; the recorded name for external
  sire?: PedigreeNode
  dam?: PedigreeNode
}

// Build an ancestry tree from an in-memory map of the owner's goats.
export function buildPedigree(
  rootGoatId: number,
  goatsById: Map<number, GoatRow>,
  maxGenerations?: number,
): PedigreeNode

// Flat set of in-system ancestor ids — what 09 intersects to find shared ancestors.
export function collectAncestorIds(
  goatId: number,
  goatsById: Map<number, GoatRow>,
  maxGenerations?: number,
): Set<number>
```

Rules:

- Walk `sire_id` / `dam_id` up to `maxGenerations`. An in-system parent → a `goat` node that recurses.
- A parent recorded only by name (`sire_name` / `dam_name`, no id) → a leaf `external` node.
- No parent recorded → an `unknown` leaf (or omit — pick one and be consistent).
- **Cycle-safe:** track visited ids on each path and stop if one repeats, so bad data can't infinite-loop.
- Keep it independent of how goats are fetched — callers pass the map — so 09 (and a future mobile/DB
  function) can reuse it unchanged.

## 10. Task — Pedigree view (Lineage tab)

Fill the **Lineage** placeholder tab on `app/(app)/goats/[id]/page.tsx` (a Server Component fetches the
owner's goats, builds the map, calls `buildPedigree`):

- Show the **sire line** and **dam line** back through grandparents (depth = `PEDIGREE_MAX_GENERATIONS`).
- In-system ancestors link to their own detail page, labelled by **tag**; external parents show as plain
  labels; unknown slots read "Unknown".
- Component `components/goats/pedigree-view.tsx` renders the tree — desktop-first, but it must stay
  readable at phone width (stack or scroll rather than overflow). Use design tokens and the radius scale.
- Where a node shows a goat's breed, use the multi-breed `formatBreed()` from Task 7.

## 11. Task — Barn-move history (6d)

**Table:**

```sql
create table if not exists public.goat_barn_moves (
  id           bigserial primary key,
  owner_id     uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  goat_id      bigint not null references public.goats(id) on delete cascade,
  from_barn_id bigint references public.barns(id) on delete set null,
  to_barn_id   bigint references public.barns(id) on delete set null,
  moved_on     date   not null default current_date,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists goat_barn_moves_goat_id_idx on public.goat_barn_moves (goat_id);

alter table public.goat_barn_moves enable row level security;

create policy "Owner manages own goat barn moves"
  on public.goat_barn_moves for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

**Move action** — `moveGoatToBarn(goatId, toBarnId, movedOn?, note?)` in the goats actions:

- Reads the goat's current `barn_id` (that becomes `from_barn_id`), updates `goats.barn_id` to the new
  barn, and inserts a `goat_barn_moves` row. `revalidatePath` the detail page.
- The update and the insert should not half-apply. Cleanest is a Postgres function
  `move_goat(...)` called via `.rpc()` so it's atomic and reusable by mobile (invariant 6). A two-step
  server action (update then insert) is acceptable for v1 if simpler — note the trade-off and pick one.
- **UI:** `components/goats/move-barn-dialog.tsx` (select a different barn, optional date/note) launched
  from the goat detail page; `components/goats/barn-move-history.tsx` lists past moves (from → to, date)
  in the detail page. Build the trigger inside the client dialog per `ERR-001`'s Preventive Rule — do not
  pass a `<Button>` element in from a Server Component. Moving is optional — a goat keeps its
  registration barn until moved.

## 12. Files this unit touches

```
supabase/migrations/xxxx_goat_parents.sql            # add parent cols IF missing (6a)
supabase/migrations/xxxx_goat_breed_composition.sql  # new child table + data migration + drop old cols (6b)
supabase/migrations/xxxx_goat_barn_moves.sql         # new table + RLS (6d)
types/database.types.ts                               # regenerated after each migration
lib/goats/breeds.ts                                   # updated to the list-based BreedComposition shape
lib/goats/breed-composition.ts                         # composeFromParents() (6c) — or folded into breeds.ts
lib/goats/pedigree.ts                                  # pure ancestry walk + PEDIGREE_MAX_GENERATIONS (6a)
app/(app)/goats/actions.ts                             # extend create/updateGoat (parents, breed rows); add moveGoatToBarn
app/(app)/goats/[id]/page.tsx                          # fill Lineage tab + move history
components/goats/parent-picker.tsx                     # in-system-or-external, origin-aware default (6a)
components/goats/goat-form-dialog.tsx                  # wire in parent pickers + "use parents' breed" (6a/6c)
components/goats/pedigree-view.tsx                     # ancestry tree (6a)
components/goats/move-barn-dialog.tsx                  # move action (6d) — trigger built inside the client comp
components/goats/barn-move-history.tsx                 # move list (6d)
```

Do not edit `components/ui/*`.

## 13. Verification (must pass before 06 is `done`)

Build & types: `npm run build` passes; `tsc` clean (no `any`); a deliberately wrong column selection
fails type-check, then revert.

Click-through (plain-language checks):

1. Editing a goat lets you set a **sire and dam** — either an existing goat or a typed external name —
   and it saves. A born-here goat's pickers default to in-system; a purchased goat's default to external.
2. A goat cannot be set as its **own** parent (rejected with a clear message).
3. The goat's **Lineage** tab shows sire and dam lines; in-system ancestors are clickable, external
   parents show by name, unknown slots read "Unknown". *(Success criterion 5.)*
4. A parent recorded a few generations up appears at the right depth; deeply/circular data does not hang
   the page (cycle-safe walk).
5. **Breed composition holds 3+ breeds correctly.** Verify with the three-breed example from Task 8:
   linking a goat to a 50/50 dam and a purebred-third-breed sire and computing from parents yields the
   correct three-way split, displayed correctly via `formatBreed()`.
6. Existing goats (pure and the `UPD-002` 50/50 crosses) still show the correct breed after the migration.
7. **Move to another barn** changes the goat's current barn and adds a history entry (from → to, date);
   the goat list's barn filter reflects the new barn. *(Success criterion 3.)*
8. Goats are labelled by **tag** throughout. Dark-desert theme, usable at iPhone width, no console errors
   — including **no hydration warnings** on first paint of any new dialog (per `ERR-001`'s lesson: check
   warnings, not just errors).

Owner-only: cross-account RLS on the new tables (needs the owner's real login) — note as a manual step.

## 14. Roadmap & progress updates — the agent must do these

**On starting 06:** set feature **06** to `in progress` in both the "At a glance" table and the
`### 06 — family-tree` header of `feature-specs-roadmap.md` (remove the `◀ next` marker), and update
`progress-tracker.md` (Current / In Progress) to show 06 is active.

**As each sub-feature (6a/6b/6c/6d) completes:** flip its row in the 06 section from `planned` to `done`.

**On completing 06** (build passes and verified): set feature **06** to `done`, move the `◀ next`
marker to **07**, and record the work in `progress-tracker.md` (Completed entry + dated Session Notes).
**Never move on to 07 while 06 is still `in progress`.** Update the roadmap and progress tracker in the
**same commit** as the code — these files track reality, not intent.

## 15. Open questions (resolve, don't guess)

- **Parent-picker sex filter.** This spec filters sire→male, dam→female in the in-system picker. Confirm
  the owner wants that (edge cases: unknown-sex imports).
- **Pedigree depth.** `PEDIGREE_MAX_GENERATIONS = 4` is a starting value; confirm how many generations
  the owner wants shown. 09's inbreeding check will use the same constant.
- **Breed composition storage: child table vs JSON column.** This spec recommends a child table for RLS
  consistency and easy querying; confirm, or choose JSON if the owner prefers fewer tables.
- **Keep or drop `goats.breed` after the migration.** Denormalized display convenience vs. single source
  of truth in `goat_breed_composition`. Decide before dropping columns.
- **"Use parents' breed" — offer or auto-apply?** This spec has it as an explicit owner choice (never
  silently overwrite a manual entry). Confirm.
- **Move atomicity.** RPC (`move_goat`, atomic, mobile-reusable) vs a two-step server action. Pick per
  the owner's preference; default to whichever the project's current patterns keep simplest.
- **Legacy tables.** Confirm no pre-spec table already occupies `goat_barn_moves` or the new breed table
  name; reconcile if so.

---

## 16. Implementation Note — decisions (agent, 2026-08-28)

The owner asked the agent to resolve Section 15's open questions itself (rather than pre-deciding) so the
built app can be tested and any choice overridden afterward. Each choice was made toward the smallest,
most reversible change, consistent with existing conventions. **None require another migration to undo.**

**Owner sign-off (2026-08-28):** the owner tested all four sub-features directly in the running app and
confirmed they work. Feature 06 is `done`. The owner has noted that minor refinements to the family-tree
/ breed-composition UX may follow later — no new spec filed yet (see `progress-tracker.md`). The only
standing item is the cross-account RLS check on the two new tables, which needs a second real login
(the same outstanding item as every prior owner-scoped table).

| # | Open question | Decision | One-line reason |
|---|---------------|----------|-----------------|
| 1 | Parent-picker sex filter | Keep sire→male / dam→female as the **default** filter, with a "Showing males/females only ⇄ Showing all goats" toggle button in each picker that lifts it. Not hard-blocked. | Matches breeding terminology (spec's own preference) but the rare cross-sex / mis-tagged case is still reachable in two clicks. `goats.sex` is a non-null enum so there is no "unknown sex" row to worry about. |
| 2 | Pedigree depth | `PEDIGREE_MAX_GENERATIONS = 4` (goat + 4 ancestor rows). One constant in `lib/goats/pedigree.ts`; 09 reads the same. | Spec's starting value; trivially changed in one place, no data impact. |
| 3 | Breed composition storage (6b) | **Child table** `goat_breed_composition` (not a JSON column). Shipped as decided. | Matches how every other owned table in the project is modelled; consistent RLS (`for all` owner policy); easy to query/extend. The sum-to-100 rule is an app-level check (`validateComposition` in `lib/goats/breeds.ts`), not a DB trigger — sufficient for v1. |
| 4 | Keep or drop `goats.breed` after 6b | **Kept** `goats.breed` as a denormalised "primary breed" label (set to the highest-share breed on every write); `goat_breed_composition` is the source of truth for shares. Dropped `breed_secondary` + `breed_primary_pct` and their three check constraints (`20260828000003`). Shipped as decided. | Cheap quick-display in list/table views without a join; reversible (can drop later if it drifts). |
| 5 | "Use parents' breed" — offer or auto-apply (6c) | **Offered** as an explicit toggle in the born-here form path ("Use parents' breed" ⇄ "Enter manually"), visible only when both parents are linked to in-system goats; never auto-applied, never overwrites a stored composition (a 3+ breed goat shows read-only until a new breed is picked). Shipped as decided. | Spec's own preference; non-destructive. |
| 6 | Move atomicity (6d) | **Two-step server action** (update `goats.barn_id`, then insert the `goat_barn_moves` row), not an RPC. Same two-step (delete + re-insert) pattern used for `writeBreedComposition`. Trade-off: a crash between the steps could half-apply — acceptable for a single-owner app; revisit with an RPC if it ever matters. Shipped as decided. | Matches the project's current all-server-action pattern; no Postgres function to maintain yet. |
| 7 | Legacy table name collision | Inspected `types/database.types.ts`: the legacy pre-spec tables are `goat_records`, `health_history`, `vaccinations`, `deworming`, `medicine_records`, `breeding_history`, `weight_history`, `sales_purchases`. **Neither `goat_breed_composition` nor `goat_barn_moves` collides.** No reconciliation needed. |

**Also settled by inspection (Task 5 — parent columns):** `sire_id`, `dam_id`, `sire_name`, `dam_name`
already exist on `goats` (added in the 05 migration, `20260826000001_goats.sql`, and present in the
generated types). **6a needs no migration** — only the form, actions, pure walk, and Lineage view.

### Progress

- **6a — parents & pedigree: DONE.** `lib/goats/pedigree.ts` (pure walk +
  `PEDIGREE_MAX_GENERATIONS`), `components/goats/parent-picker.tsx`, `components/goats/pedigree-view.tsx`,
  parent capture wired into `goat-form-dialog.tsx`, `createGoat` / `updateGoat` extended to accept and
  validate `sire`/`dam` (id XOR name; not-own-parent; referenced id must be one of the owner's goats),
  Lineage tab filled on the goat detail page. `npm run build` + `tsc --noEmit` pass. Browser-verified
  against a temporary auth-bypass + stub-data server (fully reverted after, `grep`-confirmed): the Add
  Goat dialog's Parents section renders, the in-system ⇄ external toggle works, the pedigree tree renders
  goat / external / unknown nodes and breed labels, an intentional cycle did not hang the page, and there
  were **zero console warnings or errors** on first paint at 1280px and 390px. Owner's authenticated
  save/RLS test still outstanding (same as every prior goat session).
- **6d — barn-move history: DONE.** Owner ran `20260828000002_goat_barn_moves.sql`. Added
  `moveGoatToBarn(goatId, formData)` to `app/(app)/goats/actions.ts` (two-step: update `goats.barn_id`,
  then insert the `goat_barn_moves` row — non-atomic per §16 decision 6; rejects a move to the same barn,
  a future date, or a missing barn), `components/goats/move-barn-dialog.tsx` (trigger built inside the
  client component per `ERR-001`; barn `Select` excludes the current barn; optional date/note), and
  `components/goats/barn-move-history.tsx` (from → to → date list), wired into the goat detail page
  header + a "Barn move history" card. `npm run build` + `tsc` pass; browser-verified against a temporary
  bypass server (reverted, `grep`-confirmed): the move dialog opens with barn select + date + note and
  the history list renders, **zero console warnings/errors** at 1280px and 390px; the 6a Lineage tab
  still renders correctly after the shared-file edits. Owner's authenticated move test outstanding.

- **6b — multi-breed composition: DONE.** Owner ran all three migrations
  (`20260828000001` child table + RLS + lossless backfill; `20260828000003` dropped `breed_secondary` /
  `breed_primary_pct` and their three check constraints after the verify query returned no rows) and
  refreshed `SUPABASE_ACCESS_TOKEN`, so `types/database.types.ts` was regenerated for real. `goats.breed`
  is kept as the denormalised primary-breed label. `lib/goats/breeds.ts` rewritten: `BreedComposition`
  is now `{ breed: string; pct: number }[]`; `formatBreed` / `isPurebred` / `crossOfPureBreeds` updated;
  added `normalizeComposition`, `validateComposition`, `primaryBreed`. `createGoat` / `updateGoat` accept
  a `breed_composition` JSON field, validate it, write `goats.breed` = primary label and replace the
  goat's `goat_breed_composition` rows (delete + insert; non-atomic, single-owner-app acceptable). The
  goat form submits the list shape; the list, detail, and pedigree views read it via an embedded
  `goat_breed_composition` select. `npm run build` + `tsc` pass; `formatBreed` shows on the list.

  **Storage choice (open question 3): child table**, not a JSON column — RLS-consistent with the rest of
  the project, one `"owner full access"` policy. **App-level sum check** (`validateComposition`), no DB
  trigger, per the spec's v1 allowance.

- **6c — parent-based breed auto-computation: DONE.** `composeFromParents(dam, sire)` added to
  `lib/goats/breeds.ts` — averages the two parents' compositions, `(damShare + sireShare) / 2` per breed,
  normalised to sum 100. Unit-checked against all three spec examples (incl. the 50/25/25 three-breed
  case) plus an odd-thirds case (sums to exactly 100). Wired into the goat form: when a **born-here** goat
  has **both** sire and dam set to **in-system goats**, a "Use parents' breed" ⇄ "Enter manually"
  `ToggleGroup` appears; picking "Use parents' breed" shows the live computed preview and submits that
  composition. It is **never auto-applied** (open question 5) — the manual breed input stays the default,
  and an existing goat's stored composition is preserved unless the owner deliberately changes it (a 3+
  breed goat shows read-only as "Current: …" until a new breed is picked). Browser-verified: Boer(100) ×
  Boer/Somali(50/50) computed to `75% Boer × 25% Somali (Galla)` live in the dialog, zero console
  warnings at 1280px / 390px.

### Verification summary (Section 13 gate — PASS)

- `npm run build` passes; `tsc --noEmit` clean; no `any`.
- `lib/goats/pedigree.ts` and `lib/goats/breeds.ts` are pure (no React / Supabase) and reusable by 09.
- Browser click-through (temporary auth-bypass + stub-data server, per prior sessions; fully reverted and
  `grep`-confirmed absent, clean `npm run build` after): parent capture (in-system + external, origin-aware
  default), self-parent rejection (server-side), the Lineage tab (clickable in-system ancestors, external
  names, "Unknown" slots), a cycle that does not hang, the 3-breed composition example via
  `composeFromParents`, existing pure / 50-50 goats still formatting correctly after the migration, the
  Move-to-another-barn flow + history, tag labels throughout, dark-desert theme at iPhone width, and
  **zero console warnings or errors** (not just errors) on first paint of every new dialog.
- **Owner-only, still outstanding:** an authenticated save and cross-account RLS check on the two new
  tables (`goat_breed_composition`, `goat_barn_moves`) — needs the owner's real login, same as barns/goats.
