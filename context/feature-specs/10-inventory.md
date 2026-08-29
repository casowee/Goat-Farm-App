# 10 — Inventory

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Phase       | 3 — Operations                                                                 |
| Aspect      | Both (mostly UI — the core table already exists)                              |
| Status      | `done` — built 2026-08-29 **ahead of 08/09 at the owner's request** (out of normal roadmap order); the owner tested it in the running app and confirmed it works (2026-08-29). Task 1 was a no-op (no migration). Expected to need refinement once real stock data is collected — see §14. |
| Depends on  | 03 — app-shell (nav/route scaffold); **`UPD-005`** (creates `inventory_items`, medicine-only, done) |
| Unblocks    | 12 — dashboard-analytics (stock-levels widget reads this table)               |

> **Agent:** before writing code, follow the Implementation Workflow in `ai-workflow-rules.md`:
> 1. Read this feature spec.
> 2. Read **`UPD-004`** and **`UPD-005`** — `inventory_items` (medicine-only, with `type` and
>    `category` enums), its RLS policy, and the 13 seeded drugs **already exist**. **Do not recreate
>    this table.** This spec *extends* it — read `UPD-005` Section 13 (Resolution / Final State) first;
>    it restates the exact shape for whoever picks up this spec.
> 3. Read `context/error-specs/001-goat-dialog-trigger-hydration.md` — apply its preventive rule to any
>    new dialog/trigger built here.
> 4. Read `progress-tracker.md` for the forward-provisioning note and any legacy-table flags.
> 5. Read `architecture-context.md`, `code-standards.md`, `ui-context.md` (including the **Form Length
>    Standard** and this project's segmented-control pattern from `UPD-003`).

---

## 1. Goal

Give the owner a real **Inventory** screen: see current medicine and feed stock, add/edit items, adjust
quantities, and see a clear warning when something is low or out of stock. Almost all of the hard part
(the table, RLS, the medicine category split, 13 real seeded drugs) is **already built** by `UPD-005` —
this spec is mostly the missing **UI and feed support**, not new schema.

## 2. What already exists (don't rebuild it)

- `inventory_items` — `id bigserial`, `owner_id`, `type` (`inventory_item_type`: `medicine` | `feed`),
  `name`, `quantity numeric(10,2)`, `unit text` (nullable), `low_stock_threshold numeric(10,2)`
  (nullable), `category` (`medicine_category`: `antibiotic` | `vitamin_support` |
  `anti_inflammatory` | `dewormer` | `other`, medicine only), single `for all` RLS policy, owner-only.
- 13 real drugs seeded at `quantity = 0`, each correctly categorized.
- Spec 07's Treatment and Deworming steps already read this table (via `UPD-004`/`UPD-005`'s combobox),
  filtered by category, showing a "⚠ No stock recorded" warning when quantity is 0. **Do not change that
  combobox's behavior** — this spec is additive, and a regression check (Task 6) confirms it still works.

## 3. Scope

**In scope for 10**

- Reconcile/confirm the schema above via generated types — no migration expected unless a genuine gap
  is found (see Task 1).
- A dedicated **`/inventory`** list page (medicine + feed, filterable), add/edit dialog, delete confirm.
- **Feed items** — same table (`type = 'feed'`), no `category` needed (see open questions).
- **Low-stock indicator** — a pure `lib` helper + a visible badge wherever `quantity ≤
  low_stock_threshold` (when a threshold is set).
- **Nav / route reconciliation** (Task 2 — see below): the app-shell step created stub routes that don't
  match how the app actually turned out; this spec is the right place to fix that for inventory.

**Out of scope for 10**

- **Automatic stock deduction** when a treatment/deworming is recorded. `project-overview.md`'s success
  criterion for this module is showing current stock levels, not a transaction ledger — quantity is
  **directly edited** by the owner (e.g. after a physical count or a purchase), not auto-decremented.
  A real `health_records ↔ inventory_items` link was deliberately avoided in `UPD-005` to keep risk low;
  revisit only as a future update spec if the owner wants it.
- Dashboard/stock-level **widgets and cross-module rollups** → **12 — dashboard-analytics**. This spec
  only builds Inventory's own list and its own low-stock badge.
- Sales/purchases of inventory items → **11**.
- Anything under "Out of Scope" / "Planned for Later" in `project-overview.md`.

## 4. Task 1 — Reconcile schema (should be a no-op)

Inspect `types/database.types.ts` and confirm `inventory_items`, `inventory_item_type`, and
`medicine_category` match `UPD-005` exactly. If they do, **no migration is needed for this task.** Only
write an additive migration if a genuine gap is found (e.g. a column this spec needs that `UPD-005`
didn't anticipate) — note it clearly in Implementation Note if so.

## 5. Task 2 — Nav / route reconciliation

The app-shell step (`03`) scaffolded stub routes for `/medicine`, `/vaccinations`, `/deworming`, and
`/sales` before later specs decided the real structure: vaccinations and deworming ended up as **records
under a goat's Health tab** (spec 07), not top-level pages, and medicine tracking became this
**farm-wide Inventory** module, not goat-scoped.

- **Rename/repurpose the `/medicine` stub into `/inventory`** (top-level nav item, farm-wide — not
  per-goat), matching `lib/nav.ts`'s existing pattern.
- **Check whether `/vaccinations` and `/deworming` stub pages are still linked from the nav or referenced
  anywhere.** If they are dead ends now that 07 covers that content per-goat, remove them from `lib/nav.ts`
  and delete the stub pages. **Do not delete anything you're not sure is unused** — confirm first, note
  what you found either way.
- This is a small cleanup, not a redesign — don't touch any other nav entries.

## 6. Task 3 — Inventory list page

**File:** `app/(app)/inventory/page.tsx` (Server Component, RLS-scoped).

- Two segments/tabs: **Medicine** and **Feed** (reuse the segmented-control pattern from `UPD-003` if it
  fits; a simple shadcn Tabs is also fine here since there's no multi-step form involved).
- Medicine rows show name, category, quantity, unit, and a **low-stock badge** when applicable.
- Feed rows show name, quantity, unit, and a low-stock badge when applicable (no category column).
- Empty state per segment ("No feed items yet — add one").
- Table on wide screens, stacked cards on phone, per `ui-context.md`.

## 7. Task 4 — CRUD server actions

**File:** `app/(app)/inventory/actions.ts` — `createInventoryItem`, `updateInventoryItem`,
`deleteInventoryItem`, mirroring the barns/goats action pattern (`revalidatePath('/inventory')`, never
set `owner_id` — the column default handles it).

- Validate: `name` non-empty; `type` is `medicine`/`feed`; `quantity` and `low_stock_threshold` (if set)
  are non-negative numbers; `category` only accepted (and only meaningful) when `type = 'medicine'` —
  force it to `null` for feed items server-side regardless of what the form sends.
- Enforce the existing `unique (owner_id, type, name)` constraint with a friendly error, not a raw DB one.

## 8. Task 5 — Add/edit dialog

**File:** `components/inventory/inventory-item-dialog.tsx` — one dialog reused for add/edit, client
component, `useActionState`/`useFormStatus`, built on `components/ui/*`.

Fields: **Type** (Medicine/Feed segmented control or select — this drives whether Category shows),
**Category** (medicine only, from `medicine_category`), **Name**, **Quantity**, **Unit** (free text, e.g.
"ml", "kg", "bags"), **Low-stock threshold** (optional).

This is a short form (≤6 fields) — the **Form Length Standard** does not require a multi-step wizard
here, but still verify it's comfortable at phone width. Build the trigger inside the client dialog, per
`ERR-001`'s preventive rule — don't pass a `<Button>` element in from the Server Component page.

## 9. Task 6 — Low-stock helper + regression check

**File:** `lib/inventory/stock.ts` — pure function:

```ts
export function isLowStock(item: { quantity: number; low_stock_threshold: number | null }): boolean {
  return item.low_stock_threshold != null && item.quantity <= item.low_stock_threshold
}
```

Use this everywhere a low-stock badge is shown (the list here, and later the spec 12 dashboard widget —
keep it in `lib` so 12 reuses it rather than re-deriving the same logic).

**Regression check (must pass):** after this spec ships, open a health record's Treatment and Deworming
steps and confirm the medication combobox from `UPD-004`/`UPD-005` still works exactly as before —
correct category filtering, the stock-empty warning, and "+ Add new" still creating a row with the right
`type`/`category`. This spec must not change that behavior.

## 10. Files this unit touches

```
supabase/migrations/xxxx_inventory_reconcile.sql   # ONLY if Task 1 finds a genuine gap — otherwise none
types/database.types.ts                             # regenerate if a migration was needed
lib/inventory/stock.ts                              # isLowStock()
lib/nav.ts                                           # /medicine → /inventory; remove dead stub entries if confirmed unused
app/(app)/inventory/page.tsx                         # list (Server Component), Medicine/Feed tabs
app/(app)/inventory/actions.ts                       # create/update/deleteInventoryItem
components/inventory/inventory-item-dialog.tsx       # add/edit (client)
components/inventory/delete-inventory-item-dialog.tsx # confirm (client)
```

Do not edit `components/ui/*`.

## 11. Verification (must pass before 10 is `done`)

Build & types: `npm run build` passes; `tsc` clean.

Click-through:

1. `/inventory` shows the 13 seeded medicine items (correct names, categories, quantity 0, low-stock
   badge showing since threshold/quantity make them low or unset-but-zero — confirm the exact display
   rule looks right) under the Medicine tab.
2. Add a feed item; it appears under the Feed tab with no category shown.
3. Edit an item's quantity above its low-stock threshold → badge disappears; drop it back down → badge
   reappears.
4. Delete an item; it's gone from the list.
5. **Regression:** open a Treatment record — medication combobox still filters correctly and shows the
   stock warning as before. Same for a Deworming record.
6. `/medicine` no longer exists as a separate stub (or redirects/renamed); `/inventory` is in the nav.
7. Dark theme, phone width, no console errors or hydration warnings.

Owner-only: cross-account RLS on `inventory_items` was already confirmed under `UPD-005`; no need to
repeat unless this spec adds new tables (it shouldn't).

## 12. Roadmap & progress updates — the agent must do these

**On starting 10:** set feature **10** to `in progress` in both the "At a glance" table and its section
of `feature-specs-roadmap.md`, and update `progress-tracker.md` (Current / In Progress).

**On completing 10** (build passes and verified): set feature **10** to `done`, and record the work in
`progress-tracker.md` (Completed entry + dated Session Notes) — explicitly note that this was built
**ahead of `08`/`09`** at the owner's request, and that `08` (awaiting the owner's manual test) and `09`
(deferred) remain the actual next items, not `11`. **Do not move the `◀ next` marker to `11`** — leave it
noting `08`/`09` as the real next-up until the owner says otherwise.

## 13. Open questions (resolve, don't guess)

**All four resolved by the owner on 2026-08-29 (asked up front, not guessed):**

- **Feed category?** → **No.** Feed items have no category. Only medicine carries `category` (needed for
  the health-record combobox filtering). A feed category can be added later as a small additive change.
- **Quantity as a ledger vs. a directly-edited number.** → **Directly-edited number.** The owner types
  the current amount after a stock count or purchase; no transaction history; nothing auto-decrements it.
  A ledger stays a possible future spec.
- **Unit field: free text or a fixed list?** → **Fixed list** (owner chose consistency over free text).
  Implemented as a type-aware dropdown: `lib/inventory/units.ts` (`MEDICINE_UNITS` / `FEED_UNITS`),
  validated server-side. Unit stays optional (the 13 seeded drugs have none).
- **`/vaccinations` and `/deworming` stub removal.** → **Removed.** Confirmed genuinely unused —
  referenced only in `lib/nav.ts` and their own placeholder pages; nothing in `components/` or `app/`
  links to them, and spec 07 made both record types per-goat Health-tab entries. Nav entries + stub
  pages deleted.

## 14. Implementation Note / Decisions

*Build: 2026-08-29, ahead of 08 (paused) and 09 (deferred) at the owner's request.*

- **Task 1 — schema reconcile was a no-op.** `types/database.types.ts` already has `inventory_items`
  with nullable `unit`, nullable `low_stock_threshold`, nullable `category`, and the `feed` value in
  `inventory_item_type` — exactly `UPD-005`'s final state. **No migration was written.**
- **Nav / routes (Task 2).** `lib/nav.ts`: `Medicine Records → /medicine` became `Inventory →
  /inventory` (icon `Package`). The `Vaccinations` / `Deworming` entries and `app/(app)/vaccinations/`,
  `app/(app)/deworming/`, `app/(app)/medicine/` were deleted (confirmed unused, see §13). Other nav
  entries untouched.
- **`lib/inventory/stock.ts`** — `isLowStock({ quantity, low_stock_threshold })` exactly as the spec
  wrote it, plus `isOutOfStock()` (quantity ≤ 0, catches the seeded drugs which have no threshold) and
  `stockStatus()` returning `'out' | 'low' | 'ok'` (`out` wins when both). `components/inventory/
  stock-badge.tsx` renders one badge from `stockStatus()` — "Out of stock" (error) / "Low stock"
  (warning) / nothing. The 13 seeded medicines (quantity 0, no threshold) show "Out of stock".
- **`lib/inventory/items.ts`** — type/category constants, labels, and guards. **`lib/inventory/
  units.ts`** — the fixed unit lists + `isKnownUnit`.
- **Server actions (Task 4).** `app/(app)/inventory/actions.ts` — `listMedicineItems` and the
  `InventoryItem` type export (both depended on by `UPD-005`'s medication combobox) were **left
  exactly as they were**; added `listInventoryItems`, `createInventoryItem`, `updateInventoryItem`,
  `deleteInventoryItem` on the barns pattern (`revalidatePath('/inventory')`, never set `owner_id`).
  `category` is forced to `null` for feed regardless of form input. The `unique (owner_id, type, name)`
  violation (Postgres `23505`) is caught and returned as a friendly message.
- **Dialog (Task 5).** `components/inventory/inventory-item-dialog.tsx` — one client dialog for
  add/edit, 6 controls (Type toggle, Category [medicine only], Name, Quantity, Unit, Low-stock
  threshold). No wizard (short form, per the Form Length Standard). Trigger built **inside** the client
  component via `<DialogTrigger render={<Button>}>` per `ERR-001`; `Select`s use the `items` prop so the
  closed trigger shows a label not a sentinel (per the project's Base UI `Select` note). Type drives
  Category visibility and the Unit list.
- **Regression (Task 6).** No health-record file was touched. `listMedicineItems()` and `InventoryItem`
  are byte-identical, so the Treatment/Deworming medication combobox behaviour is unchanged by
  construction.
- **Verification:** `npx tsc --noEmit` clean; `npm run build` clean (`/inventory` present; `/medicine`,
  `/vaccinations`, `/deworming` gone). `npm run lint` — only the same pre-existing `_prev` unused-arg
  warning the other two delete dialogs already carry. The agent's Playwright click-through was not run
  this session.
- **Owner sign-off (2026-08-29):** the owner tested the Section 11 checklist directly in the running app
  — the `/inventory` list and seeded medicines, adding a feed item, the low-stock badge toggling with
  quantity vs. threshold, delete, and the Treatment/Deworming **medication-combobox regression** — and
  confirmed it all works. Spec closed on the owner's instruction. Cross-account RLS on `inventory_items`
  was already confirmed under `UPD-005` (no new table).
- **Expected refinement (flagged, not specced):** 10 was built before any real stock data existed. Once
  the owner has used it through real farm cycles, the low-stock threshold model, the quantity handling
  (a purchase/usage ledger was deferred and may be wanted), and the fixed unit list may need tuning.
  Recorded in `progress-tracker.md` Open Questions; no update spec filed.
