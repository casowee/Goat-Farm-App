# 017 — Bulk Health Scheduling & Dip Wash Product Field

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-017`                                                          |
| Title             | Apply a deworming/dip-wash/vaccination entry to many goats at once, by category or manual selection; add a dip-wash product field |
| Status            | `approved` — owner requested directly, clarifying questions answered |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | extends `07-health-records`, `UPD-016` (Health page, Schedule tab, `FOLLOW_UP_RECORD_TYPES`) |
| Depends on        | `UPD-016` (in progress — this proceeds in parallel, extending the same mechanism); `UPD-008`/`009` (goat filter reuse); `UPD-004`/`UPD-005` (preset/inventory combobox pattern, reused) |
| Schema impact     | additive — one new `medicine_category` enum value (`dip_wash`); no new tables |
| Created           | 2026-09                                                           |

---

## 1. Reason for update

Scheduling routine deworming or dip wash currently means opening every goat's own card individually —
tedious for something that's usually done for a whole group (all does, all kids) on the same day with the
same product. The owner wants to apply one entry to many goats at once, filtered by category or barn,
rather than repeat the same data entry per goat.

## 2. Current behavior

Deworming, dip wash, and vaccination records (`UPD-016`'s `FOLLOW_UP_RECORD_TYPES`) can only be created
one at a time, from a single goat's own Health tab. Deworming's "which product" field pulls from
`inventory_items` filtered to `category = 'dewormer'`. Vaccination's "which one" field pulls from
`health_condition_presets` (title-style, not inventory-backed). **Dip wash currently has neither** — just
the shared date-given/next-due-date fields, with no product identification.

## 3. Desired behavior

- **A "Bulk schedule" action** — reachable from the Health page (`UPD-016`), not a new tab — lets the
  owner: pick a record type (Deworming, Dip wash, or Vaccination), pick a group of target goats (by
  category/filter, or manually fine-tuned from that filtered set), fill in the shared fields **once**
  (whatever fields that record type normally has — reusing the exact same per-type field logic already
  built for single-goat entry), and create that record for every selected goat in one action.
- **Dip wash gains a product field**, matching Deworming's pattern exactly: a searchable combobox sourced
  from `inventory_items`, filtered to a new `dip_wash` category, with "+ Add new" available (empty to
  start — no invented product names, same as every prior drug list in this project).
- This is a **single bulk entry**, not a recurring/auto-generating schedule — the owner repeats the
  action every few months as needed, matching what "plan for months" actually meant when clarified.

## 4. Scope (in and out)

**In scope**
- The Bulk schedule action/dialog: record-type picker, goat selection (reusing `UPD-008`/`009`'s
  sex/stage/barn/search filters, plus a "select all filtered" + individual checkboxes), the shared fields
  for whichever type is chosen (reusing the exact same field configuration as single-goat entry — no
  parallel form logic), and a bulk-create action.
- Adding `dip_wash` to the `medicine_category` enum and wiring dip wash's field set to include the same
  inventory-backed product combobox pattern as Deworming.
- Extending the bulk tool to cover Vaccination too, using its existing preset-backed title field.

**Out of scope**
- Any recurring/auto-generating schedule (e.g. "repeat every 3 months for a year") — explicitly declined
  in favor of a simple, repeatable single bulk action. Note this as a possible future update if the owner
  ever wants it, not built now.
- Any change to how a single-goat record is created, edited, or deleted — this only adds a new **entry
  point** that creates the same kind of rows, in bulk. The per-goat Health tab is untouched.
- Inventing dip-wash product names — the category starts empty, "+ Add new" available.

## 5. UX / interaction requirements

- **Entry point:** a "Bulk schedule" button on the Health page (`UPD-016`), opening a dialog/short flow —
  not a third tab, keeping the History/Schedule structure `UPD-016` just established intact.
- **Step 1 — Record type:** Deworming / Dip wash / Vaccination.
- **Step 2 — Target goats:** the same filter controls already used on the goats list (Sex, Stage, Barn,
  Search) narrow a live list; a **"Select all filtered"** toggle plus individual checkboxes let the owner
  either apply to a whole category (e.g. "all Does") or fine-tune by excluding a couple of individuals
  from that group. Show a running count ("14 goats selected").
- **Step 3 — Shared details:** whatever fields that record type normally uses for a single entry —
  reused exactly, not rebuilt:
  - **Deworming:** product (inventory, `category = 'dewormer'`), date given, next due date, note.
  - **Dip wash:** product (inventory, **new** `category = 'dip_wash'`), date given, next due date, note.
  - **Vaccination:** which vaccine (preset-backed title, as it already works today), date given, next due
    date, note.
- One shared date-given (default today) and next-due-date (editable) apply to every selected goat — this
  is a single point-in-time bulk action, not per-goat customization within the same submission.
- **Confirm & create:** a clear summary before submitting ("Log Ivermectin deworming for 14 goats, due
  again 15 Dec 2026?"), then create the records.
- If any individual creation fails, report clearly which goats succeeded and which didn't — don't silently
  drop failures or roll back successes the owner would reasonably expect to keep (see Section 6 for the
  atomicity approach).

## 6. Domain / data / API requirements

**Migration** (additive, standalone statement — same enum-addition caution as prior ones in this project):

```sql
alter type medicine_category add value if not exists 'dip_wash';
```

- Wire dip wash's product field into the same combobox component/logic already built for Deworming's
  product field (`UPD-004`/`UPD-005`), just pointed at the new category — reuse the component, don't
  duplicate it.
- **`bulkCreateHealthRecords` server action:** accepts a record type, a list of goat ids, and the shared
  field values; creates one `health_records` row per goat. Prefer wrapping this in a single transaction
  (or an RPC) so it's all-or-nothing — if that's not straightforward given the current action structure,
  at minimum collect and report per-goat success/failure clearly rather than failing silently.
- Reuse the exact same validation each single-goat creation already applies (required fields per type,
  date-not-in-the-future rules, etc.) — apply it per goat in the loop, not a separate, looser bulk-only
  validation path.
- Regenerate `types/database.types.ts` after the migration.

## 7. Safety and data integrity rules

- No RLS change — bulk creation still goes through the same owner-scoped `health_records` policy, just
  looped across multiple goat ids the owner already owns.
- The bulk action must not create records for goats outside the owner's own herd — the goat-id list comes
  from the owner's own already-RLS-scoped goat list (via the reused filters), so this should hold
  naturally; confirm rather than assume.
- No change to `UPD-016`'s read-only farm-wide History list, or to per-goat record editing/deletion.

## 8. Acceptance criteria

- [ ] "Bulk schedule" is reachable from the Health page and doesn't disturb the existing tab structure.
- [ ] Selecting a category (e.g. all Does) and applying a deworming entry creates it for every doe, with
      one shared date/next-due-date/product.
- [ ] Individual goats can be excluded from a category selection before submitting.
- [ ] Dip wash now has a working product field, sourced from a new, initially empty `dip_wash` inventory
      category, with "+ Add new" available.
- [ ] Vaccination works through the same bulk flow using its existing preset-backed title field.
- [ ] Every created record is fully correct and equivalent to one created individually — visible in
      `UPD-016`'s aggregated History tab, the Schedule tab, and each affected goat's own Health tab.
- [ ] A failure for one goat during a bulk operation is clearly reported, not silently dropped.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the
migration.

**Manual (user flow)** — bulk-apply a deworming to "all Does," confirm it appears correctly for each on
their own card and in the Health page's History/Schedule tabs; bulk-apply a dip wash with a newly-added
product to a manually-selected small group; bulk-apply a vaccination to "all Kids"; confirm each affected
goat's own Health tab looks exactly as if the record had been entered individually there.

## 10. Related spec files

- Extends: `context/feature-specs/07-health-records.md`,
  `context/update-specs/016-health-schedule-and-dip-wash.md` (`FOLLOW_UP_RECORD_TYPES`, the Health page).
- Reuses: `context/update-specs/008-goat-search-filter-duplicate-and-reasoned-removal.md` /
  `009-goat-list-age-and-breed-filter.md` (goat filtering), `004-health-record-presets.md` /
  `005-treatment-medication-inventory.md` (preset/inventory combobox pattern).

## 11. Implementation note

*(fill during/after build)*

## 12. Verification evidence

*(fill at the verification gate)*

## 13. Resolution / final state

*(fill when done)*

## 14. Open questions (resolve, don't guess)

- **Recurring/auto-generated schedules.** Explicitly declined for this update — the owner wants a single
  repeatable bulk action, not an auto-generating series. Worth revisiting as its own future update if
  that need comes up later.
- **Transaction vs. best-effort atomicity.** Section 6 prefers a true all-or-nothing transaction; confirm
  the agent's actual implementation choice and whether it's acceptable if a true transaction turns out to
  be awkward given the current action structure.
