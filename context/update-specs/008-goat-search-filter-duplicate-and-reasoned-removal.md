# 008 — Goat List Search, Filter, Duplicate Detection & Reasoned Removal

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-008`                                                          |
| Title             | Search by tag/name, sex/stage filters, duplicate-tag warning, reason-based goat removal |
| Status            | `in progress` — built 2026-08-30; awaiting the owner's hands-on test in the running app (migrations `20260830000001` + `20260830000002` must be applied and types regenerated first) |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `05-goat-profiles`                                                |
| Depends on        | `UPD-004` (health presets, reused for cause of death), `UPD-006` (herd events, reused for logging a departure) — both done |
| Schema impact     | additive only — one enum value added (`goat_status` gains `stolen`); no new tables |
| Created           | 2026-08                                                           |

---

## 1. Reason for update

With a growing herd, finding a specific goat by scrolling is already hard. There's no way to filter by
sex or stage, no protection against accidentally registering the same goat twice under slightly
different tag spellings (`MJ02` / `MJ2` / `mj2` are all the same tag), and deleting a goat is a single
irreversible action with no record of *why* — even though most real reasons (sold, died, stolen) are
things the owner will want a history of, not something to erase.

## 2. Current behavior

The goats list has a barn filter only, no search, no sex/stage filter. Registering a goat with a tag
that's a near-duplicate of an existing one (different case or leading zeros) is silently allowed with no
warning. Deleting a goat permanently removes the row with no reason captured and no distinction between
"this was a mistake" and "this goat left the herd."

## 3. Desired behavior — three parts (8a / 8b / 8c)

**8a — Search & filter:** find a goat by typing part of its tag or name; filter the list by sex and
stage, alongside the existing barn filter.

**8b — Duplicate-tag detection:** warn (never block) when a tag being entered is the same as an existing
goat's tag once case and leading zeros are ignored; also provide a way to review any such duplicates
already in the system.

**8c — Reasoned removal:** replace the single "Delete" action with a reason-driven flow. **Wrong
registration** truly deletes the row (nothing real happened, safe to erase). **Sold**, **Death**, and
**Stolen** instead change the goat's status and log the departure — preserving its history — with
**Death** additionally capturing a cause, reusing the existing health-condition preset list.

## 4. Scope (in and out)

**In scope**
- Search box (tag/name) and sex/stage filter controls on the goats list.
- A shared `normalizeTag()` function used by both search and duplicate detection.
- A non-blocking duplicate-tag warning on the goat form, plus a way to review existing duplicates.
- A reason-based removal dialog replacing the plain delete confirm, with the four reasons and the
  Death→cause conditional field.
- Extending `goat_status` with a `stolen` value.
- Extracting the goat-status + herd-event side effect (already built for Sale/Death in `UPD-006`'s
  quick-log form) into one shared function, so this new removal flow and the existing Log Herd Event
  form call the **same** logic rather than two copies that could drift apart.

**Out of scope**
- Any change to the Herd Growth section's current deactivated state (`UPD-006`/follow-up) — logging a
  departure here still writes to `herd_events` underneath, so the data is accurate whenever that section
  is reactivated, but this update does not reactivate it.
- Undoing/reversing a logged removal — if the owner marks a goat sold/deceased/stolen by mistake, they
  correct it by editing the goat directly for now; an "undo" flow is a future concern, not this update.
- Any change to `07`'s health records screens beyond reusing their preset data for cause of death.

## 5. UX / interaction requirements

**8a — Search & filter** (`app/(app)/goats/page.tsx`):
- A search input (tag or name, case-insensitive) alongside the existing barn filter.
- Two additional filter controls: **Sex** (All/Male/Female) and **Stage** (All + the six derived
  stages). All filters combine (AND), and combine with the existing barn filter and default to showing
  everything.
- Filtering happens over the already-fetched owner-scoped goat list (small farm scale) — no new query
  complexity, no schema change.

**8b — Duplicate-tag detection:**
- On the goat form (add/edit), if the entered tag normalizes to match another goat's tag (excluding the
  goat being edited), show a **non-blocking warning** near the Tag field — e.g. *"This tag looks the
  same as an existing goat's: MJ02. Continue anyway?"* — and still allow Save. Never block registration.
- Add a simple way to review existing duplicates — e.g. a "Show possible duplicates" toggle/link on the
  goats list that groups by normalized tag and only shows groups with more than one goat. This is the
  retroactive audit tool for tags entered before this feature existed.

**8c — Reasoned removal** (replaces the current delete confirm dialog):
- **Reason** select: *Wrong registration* / *Sold* / *Death* / *Stolen*.
- **Wrong registration** → a plain confirm ("This will permanently delete this goat and cannot be
  undone") — no further fields, matches today's delete behavior exactly.
- **Sold / Death / Stolen** → a **date** field (defaults to today, not in the future, editable) and an
  optional **note**. **Death** additionally requires a **Cause of death** — a searchable combobox
  reusing the same interaction pattern as `UPD-004`'s title presets, sourced from
  `health_condition_presets` filtered to `illness` **or** `injury` categories combined, with the same
  "+ Add new" behavior (saves a new preset for future reuse).
- This is a short dialog well under the Form Length Standard's threshold — a single dialog with
  conditional fields (matching `UPD-002`'s conditional-field pattern), not a multi-step wizard.
- Build the trigger inside the client dialog per `ERR-001`'s preventive rule.

## 6. Domain / data / API requirements

**8a:** `lib/goats/search.ts` (or extend `lib/goats/breeds.ts`'s neighborhood) —

```ts
export function filterGoats(
  goats: GoatRow[],
  filters: { search?: string; sex?: 'male' | 'female'; stage?: GoatStage; barnId?: number },
): GoatRow[]
```
Pure, no Supabase/React — reuses `deriveGoatStage` for the stage filter and `normalizeTag`/name
substring match for search.

**8b:** `lib/goats/tag.ts`:

```ts
export function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\d+/g, (digits) => String(parseInt(digits, 10))) // strips leading zeros: "02" → "2"
}

export function findDuplicateTagGroups(goats: GoatRow[]): GoatRow[][] // groups of 2+ sharing a normalized tag
```

> **Performance note (answering the owner's question directly, for the record):** at this farm's scale
> (tens to a few hundred goats), **neither the live save-time check nor the duplicate-review scan has any
> meaningful cost.** Both operate over the owner's own already-small goat list — a single pass through an
> array, done in memory, not a heavy query. No new index or schema is needed for either. If the herd ever
> grows into the thousands, a `normalized_tag` generated column with a unique-ish index would be the next
> step, but that's far beyond this project's current scale and not needed now.

**8c:** Additive migration (own statement, not combined with other DDL in the same transaction — adding
a value to an existing enum has transaction-visibility quirks in Postgres, so run it standalone):

```sql
alter type goat_status add value if not exists 'stolen';
```

**Shared departure logic** — extract the status+event side effect `UPD-006` built inline for its Log
Herd Event form into one function both flows call, e.g. `lib/goats/departure.ts` (or a server-action
helper, whichever fits the existing action structure):

```ts
export async function recordGoatDeparture(
  goatId: number,
  kind: 'sale' | 'death' | 'stolen',
  date: string,
  note?: string,
): Promise<void>
```

- `sale` → `goats.status = 'sold'`, `herd_events` row with `event_type = 'sale'`.
- `death` → `goats.status = 'deceased'`, a new `health_records` row (type `illness`/`injury` matching
  the chosen cause's category, dated `date`) is created **in addition to** `goats.status`, and a
  `herd_events` row with `event_type = 'death'`.
- `stolen` → `goats.status = 'stolen'`, `herd_events` row with `event_type = 'other_removal'` (there is
  no dedicated `stolen` herd-event type — `other_removal` is the correct semantic fit; confirm with the
  owner, see open questions).
- **`UPD-006`'s existing Log Herd Event form should be refactored to call this same function** for its
  Sale/Death paths, so the logic lives in exactly one place.

**Wrong registration** uses the existing `deleteGoat` action, unchanged — confirm child-table foreign
keys (`weights`, health records, `goat_barn_moves`, `goat_breed_composition`) already cascade correctly
on goat deletion; if any don't, note it rather than silently assuming.

Regenerate `types/database.types.ts` after the enum migration.

## 7. Safety and data integrity rules

- RLS unaffected — no new tables, no new access pattern.
- **A hard delete only ever happens for "Wrong registration."** Sold/Death/Stolen must never delete the
  row — this is the core safety property of this update; a bug here would silently destroy real farm
  history.
- The `recordGoatDeparture` side effects (status change + event log + health record for death) should not
  be allowed to half-apply — prefer an RPC for atomicity, consistent with how `06`'s `move_goat` and
  `UPD-006`'s status-sync handled the same trade-off; a carefully-ordered multi-step action is acceptable
  if simpler, but note the trade-off explicitly.
- The duplicate-tag warning must never block a save — this is explicitly a warning, not a validation
  rule, per the owner's requirement.

## 8. Acceptance criteria

- [ ] The goats list can be searched by tag or name; `MJ02`, `MJ2`, and `mj2` are treated as equivalent.
- [ ] Sex and Stage filters work and combine correctly with the existing barn filter.
- [ ] Entering a tag that normalizes to match an existing goat shows a non-blocking warning; save still
      succeeds.
- [ ] A "show possible duplicates" view correctly groups existing near-duplicate tags.
- [ ] **Duplicate detection considers ACTIVE goats only** — both the save-time warning on the goat form
      and the "show possible duplicates" review view. A tag retired with a Sold / Deceased / Stolen goat
      is freely reusable on a new animal and must raise no warning; two genuinely active goats sharing a
      tag still do. *(Added 2026-08-30 after owner testing — see §11 amendment.)*
- [ ] **All herd count / composition stats are active-only, unconditionally** — the dashboard's Total
      goats card, the stage & sex donut charts, and the buck-to-doe ratio count only `status = 'active'`
      goats, independent of any list-level status filter. A goat marked Sold / Deceased / Stolen drops
      out of the herd count immediately. *(Added 2026-08-30 after owner testing — see §11 amendment.
      There is no separate `UPD-009`; this belongs to `UPD-008`, and the underlying logic lives in
      feature spec `12`'s `lib/dashboard/herd-composition.ts`.)*
- [ ] Choosing "Wrong registration" on removal permanently deletes the goat, matching prior behavior.
- [ ] Choosing Sold/Death/Stolen changes the goat's status, does **not** delete the row, and logs a
      `herd_events` entry with the correct type and date.
- [ ] Choosing Death additionally requires a cause (from the reused preset combobox, with "+ Add new"
      working) and creates a corresponding health record.
- [ ] `UPD-006`'s Log Herd Event Sale/Death paths and this new removal flow visibly share the same
      underlying logic (no duplicated status-sync code).

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the enum
migration.

**Manual (user flow)** — search by a partial tag and by name; apply sex/stage filters together with the
barn filter; register a goat with a tag that near-matches an existing one and confirm the warning appears
but save succeeds; open the duplicates view and confirm it surfaces that pair; remove one goat as "Wrong
registration" and confirm it's gone; mark a different goat "Sold" and confirm it still appears (with
status Sold) with its history intact; mark one "Death" with a cause and confirm a health record was
created; mark one "Stolen" and confirm its status updates correctly.

## 10. Related spec files

- Extends: `context/feature-specs/05-goat-profiles.md`.
- Reuses: `context/update-specs/004-health-record-presets.md` (cause-of-death combobox pattern),
  `context/update-specs/006-dashboard-redesign-and-herd-population.md` (herd-events logging, refactored
  into a shared function).
- Applies: `context/error-specs/001-goat-dialog-trigger-hydration.md` preventive rule to the new dialog.

## 11. Implementation note

*(Sections 11–13 fill out fully at the verification gate. Interim notes below.)*

- **Departure side effect: an RPC.** `record_goat_departure(p_goat_id, p_kind, p_date, p_note,
  p_cause_title, p_cause_category)` (migration `20260830000002`) does the `goats.status` write, the
  `herd_events` insert, and (for a death with a cause) the `health_records` insert in one function body,
  so they cannot half-apply. `createHerdEvent` (UPD-006) routes Sale/Death through it; `log_herd_event`
  is kept for the goat-less Other addition/removal events.
- **Child-table cascade for "Wrong registration": verified.** `weights`, `health_records`,
  `goat_barn_moves`, and `goat_breed_composition` are all `on delete cascade` on `goat_id` (checked in
  each table's migration). `herd_events.goat_id` is `on delete set null`, so a hard-deleted goat's past
  events survive with a null link.

### Amendment — 2026-08-30 (two bugs from owner testing; tag 777 sold, then reused)

1. **Duplicate-tag detection now excludes non-active goats.** `lib/goats/tag.ts` `TaggedGoat` gained a
   `status` field; `findDuplicateTagGroups` and `findTagMatches` skip any goat whose `status` isn't
   `'active'`. A tag retired with a Sold / Deceased / Stolen goat raises no warning and never appears in
   the "possible duplicates" review view; the retired goat keeps its own tag untouched. Two active goats
   sharing a tag still trigger the warning. `ParentPickerGoat` gained `status` (the goat form's check
   reads it; the parent pickers ignore it); both `parentGoats` mappings and their `goats` selects now
   include `status`.
2. **Herd counts are active-only.** `lib/dashboard/herd-composition.ts` `computeHerdComposition` now
   filters to `status = 'active'` before counting — `total`, every `byStage` count, the sex split, and
   `buckToDoeRatio` all exclude Sold / Deceased / Stolen goats, unconditionally (not a display filter).
   This flows through to the dashboard's Total goats card, both donut charts, the buck-to-doe ratio, and
   the CSV export. The herd-population *timeline* (`computeHerdTimeline`) is unchanged — it is
   event-driven and historical, a separate concept. The `/goats` list still shows every goat as a row
   (with its status), which is correct — only the aggregate counts changed. A dated note was added to
   `context/feature-specs/12-dashboard-analytics.md`, where that logic originated.

## 12. Verification evidence

*(fill at the verification gate)*

## 13. Resolution / final state

*(fill when done)*

## 14. Open questions — resolved by the owner (2026-08-30)

- **Stolen → `other_removal` in `herd_events`.** ✅ **Confirmed — map to `other_removal`.** No new
  `herd_event_type` value is added. A stolen goat is still fully distinguishable via `goats.status =
  'stolen'` and the event note; only the (currently hidden) population chart can't separate theft from
  other removals, which the owner accepted. `record_goat_departure('stolen', …)` writes
  `herd_events.event_type = 'other_removal'` and `goats.status = 'stolen'`.
- **Cause-of-death category.** ✅ **Confirmed — `illness` + `injury` presets combined.** The
  `CauseOfDeathCombobox` lists every `health_condition_presets` row whose `record_type` is `illness` or
  `injury`, with "+ Add new" saving an owner-scoped preset. A picked preset carries its own category
  through, so the `health_records` row created on a death is typed to match; a typed-in ("+ Add new")
  cause defaults to `illness`.
- **Duplicate-review UI placement.** ✅ **Confirmed — a toggle on the goats list page.** "Show possible
  duplicates" on `/goats` regroups the already-loaded list by normalized tag (groups of 2+ only). No new
  route.
