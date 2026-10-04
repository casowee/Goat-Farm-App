# 017 — Bulk Health Scheduling & Dip Wash Product Field

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-017`                                                          |
| Title             | Apply a deworming/dip-wash/vaccination entry to many goats at once, by category or manual selection; add a dip-wash product field |
| Status            | `in progress` — built 2026-09-27; **amended 2026-10-04** (batch concept; group-only target selection with exclude-by-tag — see the Amendment section); awaiting the owner's hands-on test |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | extends `07-health-records`, `UPD-016` (Health page, Schedule tab, `FOLLOW_UP_RECORD_TYPES`) |
| Depends on        | `UPD-016` (in progress — this proceeds in parallel, extending the same mechanism); `UPD-008`/`009` (goat filter reuse); `UPD-004`/`UPD-005` (preset/inventory combobox pattern, reused) |
| Schema impact     | additive — one new `medicine_category` enum value (`dip_wash`); 2026-10-04 amendment adds table `health_record_batches` + nullable `health_records.batch_id` (shared with `UPD-016`) |
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
  owner: pick a record type (Deworming, Dip wash, or Vaccination), pick a **group** of target goats by
  filter — shown as a count, never a list of tags, with an optional "Exclude goats" field for leaving
  out a few individuals by typing their tag *(amended 2026-10-04)* — fill in the shared fields **once**
  (whatever fields that record type normally has — reusing the exact same per-type field logic already
  built for single-goat entry), and create that record for every selected goat in one action.
- **Dip wash gains a product field**, matching Deworming's pattern exactly: a searchable combobox sourced
  from `inventory_items`, filtered to a new `dip_wash` category, with "+ Add new" available (empty to
  start — no invented product names, same as every prior drug list in this project).
- *(2026-10-04)* **Every bulk action is recorded as one batch** with a generated group label ("Does",
  "Kids · Barn 2", "All goats"), so the Health page can show it as a single group event on its Upcoming
  and Done tabs (`UPD-016`).
- This is a **single bulk entry**, not a recurring/auto-generating schedule — the owner repeats the
  action every few months as needed, matching what "plan for months" actually meant when clarified.

## 4. Scope (in and out)

**In scope**
- The Bulk schedule action/dialog: record-type picker, goat selection (reusing `UPD-008`/`009`'s
  sex/stage/barn filters as the group, with a live count and an "Exclude goats" tag field — *amended
  2026-10-04, originally a search box and a visible checklist with "select all filtered"*), the shared fields
  for whichever type is chosen (reusing the exact same field configuration as single-goat entry — no
  parallel form logic), and a bulk-create action.
- Adding `dip_wash` to the `medicine_category` enum and wiring dip wash's field set to include the same
  inventory-backed product combobox pattern as Deworming.
- Extending the bulk tool to cover Vaccination too, using its existing preset-backed title field.
- *(2026-10-04)* The batch concept: table `health_record_batches`, column `health_records.batch_id`, the
  generated label, and `bulkCreateHealthRecords` writing both.

**Out of scope**
- *(2026-10-04)* Backfilling existing records into batches, and any `batch_id` on records created one at a
  time from a goat's card — those stay `null`. *(Note, later the same day: the owner approved a one-off
  backfill of earlier bulk actions under `UPD-016` — see that spec. It is not part of this spec, and
  single-goat records still keep `batch_id = null`.)*
- *(2026-10-04)* A hand-typed batch label.
- *(2026-10-04)* Any goat list, search box or "select all" checkbox in the dialog.
- Any recurring/auto-generating schedule (e.g. "repeat every 3 months for a year") — explicitly declined
  in favor of a simple, repeatable single bulk action. Note this as a possible future update if the owner
  ever wants it, not built now.
- Any change to how a single-goat record is created, edited, or deleted — this only adds a new **entry
  point** that creates the same kind of rows, in bulk. The per-goat Health tab is untouched.
- Inventing dip-wash product names — the category starts empty, "+ Add new" available.

## 5. UX / interaction requirements

- **Entry point:** a "Bulk schedule" button on the Health page (`UPD-016`), opening a dialog/short flow —
  not a tab of its own (the page's tabs are Upcoming and Done since the 2026-10-04 amendment).
- **Step 1 — Record type:** Deworming / Dip wash / Vaccination.
- **Step 2 — Target group** *(amended 2026-10-04 — no tag list at all)*: the search box, the "Select all
  shown" checkbox and the goat list with checkboxes are removed. What remains:
  - The group filters only (Sex, Stage, Barn; everything on "All" = "All goats") and a live count, e.g.
    "58 goats match".
  - An optional **"Exclude goats"** text field: the owner types a tag and adds it. It is matched against
    the goats **in the current group** using `normalizeTag()` from `lib/goats/tag.ts` (`UPD-008`), so
    "21", "021" and case variants match the same goat. Each excluded goat is shown as a small removable
    chip. If the tag does not match any goat in the group, a short inline message is shown ("No goat with
    tag 999 in this group") and nothing is added.
  - The count updates, e.g. "57 of 58 goats", and the batch label reflects it ("Does (57 of 58)").
  - Selection still only uses the owner's own RLS-scoped goats.
- **Step 3 — Shared details:** whatever fields that record type normally uses for a single entry —
  reused exactly, not rebuilt:
  - **Deworming:** product (inventory, `category = 'dewormer'`), date given, next due date, note.
  - **Dip wash:** product (inventory, **new** `category = 'dip_wash'`), date given, next due date, note.
  - **Vaccination:** which vaccine (preset-backed title, as it already works today), date given, next due
    date, note.
- One shared date-given (default today) and next-due-date (editable) apply to every selected goat — this
  is a single point-in-time bulk action, not per-goat customization within the same submission.
- **Confirm & create:** a clear summary before submitting ("Log Ivermectin deworming for 14 goats, due
  again 15 Dec 2026?"), then create the records. *(2026-10-04)* The summary and the success message name
  the group and the count — neither lists goat tags.
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

**Amendment 2026-10-04 — batch** (migration `20261004000001_health_record_batches.sql`, additive, standard
conventions: bigserial id, `owner_id` default `auth.uid()`, single "for all" RLS policy):

- Table `health_record_batches`: `id`, `owner_id`, `label` (text — the group description, e.g.
  "Does · Barn A"), `created_at`.
- Column `health_records.batch_id`: nullable bigint FK to `health_record_batches(id)`, `on delete set null`.
- `bulkCreateHealthRecords` creates one batch row first, then sets `batch_id` on every record it creates.
- The label is generated from the group filters ("Does", "Kids · Barn 2", "All goats"), not typed by hand.
  If goats were excluded, the label shows it (e.g. "Does (57 of 58)").
- Records created one at a time from a goat's card keep `batch_id = null`. No backfill of existing records.

## 7. Safety and data integrity rules

- No RLS change to `health_records` — bulk creation still goes through the same owner-scoped policy, just
  across multiple goat ids the owner already owns. *(2026-10-04)* The new `health_record_batches` table
  has RLS enabled with its own owner policy.
- The bulk action must not create records for goats outside the owner's own herd — the goat-id list comes
  from the owner's own already-RLS-scoped goat list (via the reused filters), so this should hold
  naturally; confirm rather than assume.
- No change to per-goat record editing/deletion. (`UPD-016`'s farm-wide History list, originally named
  here, was removed by the 2026-10-04 amendment.)
- *(2026-10-04)* Deleting a batch must never delete health records (`on delete set null`), and editing a
  record on a goat's card must not drop its `batch_id`.

## 8. Acceptance criteria

- [ ] "Bulk schedule" is reachable from the Health page and doesn't disturb the existing tab structure.
- [ ] Selecting a category (e.g. all Does) and applying a deworming entry creates it for every doe, with
      one shared date/next-due-date/product.
- [ ] Individual goats can be excluded from a group before submitting by typing their tag into "Exclude
      goats"; "21" excludes a goat tagged "021"; a chip appears and the count drops ("57 of 58 goats").
- [ ] *(2026-10-04)* A tag that is not in the current group shows the inline message and is not added.
- [ ] *(2026-10-04)* Step 2 shows no tag list, no search box and no "select all" — only the filters, the
      count, and chips for goats the owner excluded.
- [ ] *(2026-10-04)* One bulk action creates one `health_record_batches` row with a generated label
      (e.g. "Does (57 of 58)"), and every record it creates carries that `batch_id`; a record logged on a
      goat's card has none.
- [ ] Dip wash now has a working product field, sourced from a new, initially empty `dip_wash` inventory
      category, with "+ Add new" available.
- [ ] Vaccination works through the same bulk flow using its existing preset-backed title field.
- [ ] Every created record is fully correct and equivalent to one created individually on each affected
      goat's own Health tab; on the Health page the whole action shows as ONE row in Upcoming and ONE
      row in Done *(amended 2026-10-04 — the History tab no longer exists)*.
- [ ] A failure for one goat during a bulk operation is clearly reported, not silently dropped.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the
migration.

**Manual (user flow)** *(amended 2026-10-04; to be checked on a real iPhone)* — bulk-schedule a deworming
for "Does" and confirm no tag list appears, only "58 goats match"; exclude one goat by typing its tag (try
"21" for a goat tagged "021") and confirm the chip appears and the count drops; try a tag that isn't in
the group and confirm the inline message; confirm the Health page shows that action as ONE row in Upcoming
and ONE row in Done, with the label "Does (57 of 58)", and that each doe's own card shows her record;
bulk-apply a dip wash with a newly-added
product to a manually-selected small group; bulk-apply a vaccination to "all Kids"; confirm each affected
goat's own Health tab looks exactly as if the record had been entered individually there.

## 10. Related spec files

- Extends: `context/feature-specs/07-health-records.md`,
  `context/update-specs/016-health-schedule-and-dip-wash.md` (`FOLLOW_UP_RECORD_TYPES`, the Health page).
- Reuses: `context/update-specs/008-goat-search-filter-duplicate-and-reasoned-removal.md` /
  `009-goat-list-age-and-breed-filter.md` (goat filtering), `004-health-record-presets.md` /
  `005-treatment-medication-inventory.md` (preset/inventory combobox pattern).

## Amendment — 2026-10-04 (shared with `UPD-016`)

**Final bulk dialog, as of 2026-10-04** *(note added when `UPD-016` was closed out; this spec's own status
is unchanged — still `in progress`, awaiting the owner's separate confirmation)*: step 2 chooses the
target by **group filters** (sex, stage, barn; all on "All" = "All goats") and shows a **live count**
("58 goats match"). There is no goat list, search box or "select all". Goats are left out by **typing a
tag** into "Exclude goats" — matched within the current group with `normalizeTag()`, shown as removable
chips, with an inline message for a tag not in the group — and the count becomes "57 of 58 goats". Each
bulk action is saved as one batch with a generated label ("Does (57 of 58)") and the excluded goats'
ids.

*This is the second, final wording of the amendment. A first version the same day used a collapsed
"Exclude individual goats" link that revealed a checklist; the owner replaced it after testing. Where the
two differ, this one wins.*

**Goal:** the Health page shows only GROUP health events (what was done and what is next); individual
goat health matters live only on that goat's own card. For this spec that means:

1. **A batch concept**, so a bulk action can be shown as one group event: `health_record_batches` +
   `health_records.batch_id`, written by `bulkCreateHealthRecords`, with a label generated from the group
   filters that shows exclusions ("Does (57 of 58)").
2. **Step 2 has no tag list at all**: group filters and a live count only, plus an optional "Exclude
   goats" tag field matched with `normalizeTag()`, with removable chips and an inline "not in this group"
   message.

Sections 3–9 above were updated in place. `UPD-016`'s amendment covers the other half (History tab
removed; Upcoming / Done tabs showing group events only).

## 11. Implementation note

Built 2026-09-27; the full build narrative is in `context/progress-tracker.md` (Current Goal and the
2026-09-27 Session Note) and is not repeated here. In short: a four-step wizard dialog
(`components/health/bulk-health-dialog.tsx`) launched from the Health page header; `lib/health/products.ts`
for the inventory-backed product field shared by deworming and dip wash; `bulkCreateHealthRecords` in
`app/(app)/health/actions.ts`, which inserts every record in one statement (all-or-nothing) after
re-reading the goat ids under RLS, using the same field validation as a single-goat create; migration
`20260927000004_medicine_category_dip_wash.sql`.

### Amendment build — 2026-10-04

- **Migration** — `supabase/migrations/20261004000001_health_record_batches.sql` (shared with `UPD-016`):
  the batch table with RLS and one "for all" owner policy, plus nullable `health_records.batch_id`
  (`on delete set null`). Additive, idempotent, no backfill. Hand-added stand-ins in
  `types/database.types.ts` until the owner applies it and re-runs `npm run gen:types`.
- **`lib/health/batch-label.ts`** (new, pure) — `batchGroupLabel()` / `batchLabel()`. A stage names the
  group ("Does", "Kids"); sex is only spelled out where it adds something (no stage → "Females" / "Males";
  with Kid → "Female kids"); the barn's name is appended ("Kids · Barn 2"); nothing chosen → "All goats";
  exclusions append "(56 of 58)". The dialog's live preview and the server's stored label call the same
  function.
- **`bulkCreateHealthRecords`** — now inserts one `health_record_batches` row, then the records with its
  `batch_id`. The label is generated **on the server** from the submitted group filters, each validated
  first, with the barn's name read back under RLS rather than trusted from the browser. The result reports
  a count and the group label instead of a list of tags.
- **Atomicity (Section 14)** — the records are still one `insert` statement and therefore all-or-nothing.
  The batch row is a second statement, so it is **compensated rather than transactional**: if the records
  insert fails, the batch row is deleted again. If even that delete failed, the leftover batch has no
  records and is never listed (the Done tab skips empty batches). This is the "same approach"
  option the amendment allowed; an RPC wrapping both statements would make it strictly transactional and
  can be added if the owner prefers.
- **`updateHealthRecord` is untouched** and does not write `batch_id`, so editing a batched record on a
  goat's card keeps it in its batch.
- **Dialog step 2** — the search box, the "Select all shown" toggle and the goat checklist are gone, and
  with them the per-goat stage lookup and label helper the list needed. The step is now: three group
  filters; the generated label with a live count ("58 goats match", or "57 of 58 goats" once someone is
  excluded); and an "Exclude goats (optional)" text field with an Exclude button (Enter also adds).
  - **Matching** is `normalizeTag(typed) === normalizeTag(goat.tag)` over the goats the filters currently
    match — the whole-tag equivalence `UPD-008`'s duplicate detection uses, not a substring search, so
    "21" finds "021" but never "210" or "121".
  - **No match** → "No goat with tag 999 in this group", nothing added. **Already excluded** → "Tag 21 is
    already excluded". The message clears when the owner types again or changes a filter.
  - **Two active goats sharing the same normalized tag** (a duplicate `UPD-008` would already be warning
    about) are both excluded, since the typed tag cannot tell them apart; each gets its own chip.
  - **Chips** show only goats that are both excluded and in the current group; tapping one puts the goat
    back. A goat excluded under one set of filters that no longer matches simply stops counting.
  - The only tags ever on screen are ones the owner typed. The confirm step and the success message name
    the group and the count, never tags. Wizard step renamed "Goats" → "Group".
- **Excluded goats are stored** *(2026-10-04, later the same day, for `UPD-016`'s Health page)*: the dialog
  submits the ids behind its exclusion chips in a hidden field and `bulkCreateHealthRecords` saves them to
  `health_record_batches.excluded_goat_ids` (migration
  `20261004000003_health_record_batches_excluded_goats.sql`). No visible change to the dialog.
- **Selection scope** — unchanged: the goat list the dialog works from is loaded by the server component
  under RLS and pinned to active goats, and the server action re-reads the submitted ids under RLS before
  writing.

## 12. Verification evidence

**Automatic (2026-10-04, covering the amendment):** `npx tsc --noEmit` clean; `npm run build` clean;
`npm run lint` at project baseline (the one pre-existing `hooks/use-mobile.ts` error and five pre-existing
`_prev` warnings — none in this update's files). Label generation unit-checked: none → "All goats";
Doe → "Does"; Kid + barn → "Kids · Barn 2"; 58 of 58 → "Does"; 57 of 58 → "Does (57 of 58)". The exclusion
match rule unit-checked against `normalizeTag`: "21" = "021"; " mj02 " = "MJ2"; "21" ≠ "210"; "999" ≠ "99".

**Not verified here:** nothing was tested in a browser or on an iPhone — the app is auth-gated and this
environment has no sign-in and no device. The dialog's exclude field, chips and inline message, and the
bulk write itself (batch row + records against the real database), have therefore not been exercised;
they need the migration applied and the owner's hands-on test.

## 13. Resolution / final state

*(fill when done)*

## 14. Open questions (resolve, don't guess)

- **Recurring/auto-generated schedules.** Explicitly declined for this update — the owner wants a single
  repeatable bulk action, not an auto-generating series. Worth revisiting as its own future update if
  that need comes up later.
- **Transaction vs. best-effort atomicity.** Section 6 prefers a true all-or-nothing transaction; confirm
  the agent's actual implementation choice and whether it's acceptable if a true transaction turns out to
  be awkward given the current action structure. **Implementation choice:** the records are one statement
  (truly all-or-nothing); since the 2026-10-04 amendment the batch row is a second, compensated statement
  (see Section 11). Awaiting the owner's word on whether that is acceptable or an RPC is wanted.
