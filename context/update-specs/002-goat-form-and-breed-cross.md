# 002 — Goat Form Restructure & Breed Cross Input

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-002` (form/breed portion migrated from the former `05b` spec) |
| Title             | Origin-driven dynamic form (segmented control) & "Crossed" breed input |
| Status            | `done`                                                            |
| Owner approved?   | yes                                                               |
| Feature spec(s)   | `05-goat-profiles`                                                |
| Depends on        | `UPD-001` goat-origin-and-breed (done)                           |
| Schema impact     | **none** — UI + a `lib` helper only                              |
| Created           | 2026-08                                                          |

---

## 1. Reason for update

After `UPD-001` shipped, the goat form is long and shows every field at once, and the breed input asks
for a manual grading percentage. The owner wants the form **driven by origin**: a **segmented control**
(*Born on the farm* / *Purchased*) at the top that switches between two **conditional field sets**, so
the form is short and only shows what's relevant. Breed crosses should be expressed by **picking the two
parent breeds** (computed, not typed), and — for now — **purchased goats default to 100% purebred**.

## 2. Current behavior

The form (from `UPD-001`) shows all fields together. Origin is a field partway down that only toggles the
purchase-date field. Breed uses a purebred/crossbred toggle with a **manual percentage picker**
(50/75/87.5/93.75/custom). There is no meaningful branching between a born-here and a purchased goat.

## 3. Desired behavior

- **A segmented control at the top** picks origin and **reshapes the form** into two conditional paths.
- **Purchased path:** breed defaults to **100% purebred** (a single breed pick); shows **purchase date**.
- **Born-on-farm path:** breed offers **Purebred or Crossed**; Crossed asks for the two parent breeds and
  the composition is **computed** (50/50 under the current "parents are 100% pure" rule). No purchase date.
- The manual grading-percentage picker is **removed**; finer grades come from computed parent data
  (deferred to `06`), not typing.

## 4. Scope (in and out)

**In scope**
- A **segmented control** for origin at the top of the form.
- **Conditional / dynamic fields** per origin (see the table in Section 5).
- Purchased defaults to **100% purebred**; born-here keeps the Purebred/Crossed input.
- Breed dropdown "Crossed…" → two pure-breed selects → 50/50 composition with a live preview.
- Remove the manual grading-percentage picker; add a small pure `crossOfPureBreeds()` helper.

**Out of scope**
- Auto-computing a born-here goat's breed from linked parents → `06` (family tree).
- Migrating breed to a multi-breed composition → `06` (see note in Section 6).
- The dialog-trigger hydration defect → error spec `ERR-001` (ships alongside, tracked separately).

## 5. UX / interaction requirements

**Origin — segmented control.** A two-segment, single-select control (*Born on the farm* / *Purchased*)
at the **top** of the form. Prefer a shadcn/base-ui **ToggleGroup** styled as a segmented control (add via
the CLI if not already present — a foundation component, don't hand-edit); Tabs styled as a segment is an
acceptable fallback. Full-width and touch-friendly on phone, using tokens and the radius scale.

**Conditional fields by origin:**

| Field                                              | Born on the farm            | Purchased                          |
| -------------------------------------------------- | --------------------------- | ---------------------------------- |
| Name / tag, sex, DOB, reproductive state, barn, status, notes | shown            | shown                              |
| **Purchase date**                                  | hidden                      | **shown**                          |
| Seller / purchased-from *(only if that column is ever added)* | hidden           | shown (optional)                   |
| **Breed input**                                    | **Purebred or Crossed**     | **Purebred, 100% by default**      |
| Parents *(06)*                                     | default to **in-system**    | default to **external / none**     |

**Breed input details:**
- **Purchased →** a single breed dropdown (pure breeds + `Other…`), **defaulting to 100% purebred**. The
  `Crossed…` option remains selectable in case a known cross was bought, but purebred is the default and
  expected case for now. *(See open question on whether to lock vs default.)*
- **Born on the farm →** the breed dropdown offers pure breeds, `Crossed…`, and `Other…`.
  - A pure breed → 100%, no secondary.
  - `Crossed…` → two breed selects ("First parent breed" / "Second parent breed"), which **must differ**;
    live preview "= 50% Somali (Galla) × 50% Savanna"; stored as `breed`, `breed_secondary`, `pct = 50`.
  - `Other…` → free-text pure breed (100%).

No edits to `components/ui/*` beyond adding a generated component via the CLI.

## 6. Domain / data / API requirements

- **No schema change** — the `UPD-001` columns already hold pure (100%) and 50/50-cross compositions, and
  `origin` / `purchase_date`.
- `lib/goats/breeds.ts` — add:
  ```ts
  export function crossOfPureBreeds(first: string, second: string): BreedComposition {
    return { primary: first, primaryPct: 50, secondary: second }
  }
  ```
  The manual `GRADING_PERCENTAGES` constant may be dropped from the form (keep or remove — harmless).
- **Form defaults:** when origin = `purchased`, the breed field initialises to purebred
  (`breed_primary_pct = 100`, `breed_secondary = null`). This is a **form default**, not a DB change.
- `createGoat` / `updateGoat` validation rules are unchanged: a cross still validates as `secondary <>
  primary` and `pct = 50`; `origin='born_here'` forces `purchase_date = null`; a purchase date may not be
  in the future or before `date_of_birth`.

> **06 note (carry forward):** born-here breed should be auto-computed as the average of the two linked
> parents' compositions via `composeFromParents(dam, sire)`. That averaging can yield **three or more
> breeds** (a 50/50 goat crossed to a third breed → 25/25/50), which the two-breed columns can't hold —
> so `06` should migrate breed to a **multi-breed composition** (child table or JSON `{breed, pct}[]`).

## 7. Safety and data integrity rules

- RLS/ownership and all `UPD-001` check constraints preserved unchanged (this is UI-only).
- Whichever origin is selected, the submitted state must satisfy the DB constraints (purebred ⇔ 100% /
  no secondary; cross ⇔ distinct secondary, pct = 50).
- Switching the segmented control must not leave stale hidden values that violate a constraint — e.g.
  switching Purchased → Born-on-farm must clear any purchase date; switching to Purchased should reset
  breed toward the purebred default. Only relevant fields are submitted.
- Existing goats must continue to load and edit — including any already saved as a cross.

## 8. Acceptance criteria

- [x] Origin is a **segmented control** at the top; switching it changes which fields show.
- [x] The form is visibly shorter — only the selected origin's fields are shown.
- [x] **Purchased** shows purchase date and defaults breed to **100% purebred**.
- [x] **Born on the farm** hides purchase date and offers Purebred **or** Crossed.
- [x] `Crossed…` reveals two selects that must differ and previews 50/50; saves `pct = 50` + distinct secondary.
- [x] Switching origin clears fields that don't apply (no stale purchase date; breed resets sensibly).
- [x] The manual grading-percentage picker is gone.
- [x] Existing goats still load and edit correctly.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow)** — open Add goat:
1. The origin segmented control is at the top. Select **Purchased** → purchase date appears; breed shows a
   single picker defaulting to purebred; saving stores 100%/no secondary and the purchase date.
2. Select **Born on the farm** → purchase date disappears (and is cleared); breed offers Purebred/Crossed.
   Pick `Crossed…` → two selects, must differ, preview "= 50% X × 50% Y", saves `pct = 50`.
3. Toggle back and forth and confirm no stale values are submitted.
4. Re-open an existing goat (pure and cross) and confirm it still loads/edits. Confirm the form reads
   shorter than before.

## 10. Related spec files

- Extends: `context/feature-specs/05-goat-profiles.md`; builds on `UPD-001`.
- Ships alongside: error spec `ERR-001` (dialog-trigger hydration — same `goat-form-dialog.tsx`).
- Informs: `context/feature-specs/06-family-tree.md` (parent-based breed computation + multi-breed migration).

## 11. Implementation note

Owner confirmed the flagged open question up front: Purchased **defaults** to purebred rather than being
**locked** to it — `Crossed…` stays selectable on the Purchased path, matching the spec's literal §5/§8
text. This meant the breed input didn't need two different components per origin: both paths render the
same unified breed `Select` (pure breeds + `Crossed…` + `Other…`), which replaced `05a`'s separate
purebred/crossbred toggle + secondary-breed `Select` + percentage `Select` entirely. Selecting a plain
breed is 100%/no secondary; `Crossed…` reveals two pure-breed-only selects ("First parent breed" /
"Second parent breed") which must differ, computed via the new `crossOfPureBreeds()` in
`lib/goats/breeds.ts` (always 50/50, per the current "parents are 100% pure" rule — finer/parent-based
grades are deferred to `06`). `GRADING_PERCENTAGES` was left in `lib/goats/breeds.ts` (unused by the form
now, kept per the spec's "harmless either way" allowance since `06`'s later multi-breed work may still
want it).

One data-integrity subtlety not spelled out in the spec's field table: an **existing** cross saved under
the old grading picker (e.g. 87.5%) must not be silently rewritten to 50% just by opening and re-saving
the edit dialog without touching the breed fields. `goat-form-dialog.tsx` tracks a `crossTouched` flag —
the dialog shows the goat's real stored percentage in the live preview and hidden `breed_primary_pct`
input until the owner actively changes either parent-breed select, at which point it becomes a fresh
50/50 cross via `crossOfPureBreeds()`. This preserves old grades on unrelated edits (fixing a typo in
notes, say) while still funneling all *new* crosses through the 50/50 rule.

State hygiene on origin switch (§7): switching to Purchased while `Crossed…` was selected resets the
breed field back to unselected (forcing a deliberate re-pick) rather than silently keeping a cross
composition; switching origin to Born-on-farm simply stops rendering the purchase-date input, so it's
never part of the submitted `FormData` (no explicit clearing needed). The origin segmented control itself
is a shadcn/base-ui `ToggleGroup` (added via the CLI, `variant="outline"`, two `flex-1` items) whose
`onValueChange` ignores an empty array so it always behaves as a required single-select rather than an
unselectable toggle pair.

No changes were needed in `app/(app)/goats/actions.ts` — the `05a` validation (breed required, distinct
secondary, `pct` in `[50, 100)`, origin/purchase-date rules) already covers everything this form submits,
since a computed 50/50 cross is just one more valid point in that existing range.

## 12. Verification evidence

`npm run build` passed and `tsc` was clean, both before and after adding (and after fully reverting)
temporary browser-verification scaffolding. Manual click-through used the same temporary
auth-bypass-and-stub-data technique as prior sessions (a `TEMP_VERIFY_BYPASS` env-gated bypass in
`app/(app)/layout.tsx` and `lib/supabase/middleware.ts`, plus stubbed barns/goats data in
`app/(app)/goats/page.tsx` and `app/(app)/barns/page.tsx` — one stub goat pure-breed, one a pre-existing
87.5% cross), run against a production build (`next build && next start`) and driven with Playwright
(Chromium) at both 390px and 1280px widths. All temporary scaffolding was fully reverted and confirmed
absent via `grep` before finishing, with a final clean `npm run build` afterward.

Confirmed: the origin segmented control renders at the top and is the first thing in the form; selecting
**Purchased** shows Purchase date and defaults breed to an unselected picker (100%/no-secondary once a
breed is picked) with `Crossed…` still selectable in the same dropdown; selecting **Born on the farm**
hides Purchase date and offers the same unified breed dropdown including `Crossed…`; picking `Crossed…`
reveals "First parent breed"/"Second parent breed", shows an inline "must be different" message when both
match and only renders the preview once they differ, and previewed "= 50% Boer × 50% Savanna" for a fresh
cross; switching origin from Born-on-farm/Crossed to Purchased reset the breed picker back to its
placeholder (not left on `Crossed…`) and revealed Purchase date; the form is visibly shorter than the
`05a` version (no purebred/cross toggle + separate percentage picker taking extra rows). Editing the
stubbed existing 87.5% cross goat opened with breed = `Crossed…`, First = Somali (Galla), Second =
Savanna, and preview "= 87.5% Somali (Galla) × 12.5% Savanna" preserved exactly (not silently reset to
50%) until the owner would touch a parent-breed select. Editing the stubbed pure-breed goat opened showing
"Boer (purebred)". Dark-desert theme and phone width (390px) rendered correctly throughout. Zero console
warnings or errors were captured by Playwright across all of the above (see Resolution notes for the
`ERR-001` hydration-specific check). Validation paths (blank tag, same-breed cross) were confirmed by the
agent, since they run before any Supabase call. The authenticated Save path was subsequently covered by
the owner's `UPD-003` sign-off (same goat form). **Cross-account RLS: ✅ confirmed 2026-08-29** — the
owner logged in as a second test user and saw a completely empty farm (manual owner-performed check, not
automated).

## 13. Resolution / final state

The goat form is now origin-driven: a `ToggleGroup` segmented control (Born on the farm / Purchased) at
the top conditionally shows Purchase date and reshapes the breed input, per the field × origin table in
§5. Breed crossing is now "pick two parent breeds," computed via `crossOfPureBreeds()` rather than typed
as a manual percentage; the manual grading-percentage picker is gone from the UI. Existing goats (pure and
cross, including older non-50% grades from `05a`) still load and edit correctly, with an existing cross's
real percentage preserved until the owner deliberately changes a parent-breed pick. Shipped together with
`ERR-001` since both touch `goat-form-dialog.tsx`. **Follow-on carried to `06`:** parent-based breed
auto-computation and the eventual multi-breed composition migration, as noted in §6.
