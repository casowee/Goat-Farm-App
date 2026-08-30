# 010 — Newborn Kid Registration Without a Permanent Tag

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-010`                                                          |
| Title             | Auto-generated temporary tag for newborn kids, launched from the dam's own card |
| Status            | `done` — built + owner-verified in the running app 2026-08-30 (migration `20260830000003` applied, types regenerated) |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `05-goat-profiles`, `06-family-tree`                              |
| Depends on        | `05`, `06` (done); `UPD-008` (duplicate detection, must be amended); reuses the `UPD-003` wizard |
| Schema impact     | additive — one new column (`goats.is_temp_tag`)                   |
| Created           | 2026-08                                                           |

> This resolves a previously-logged "Deferred idea" from this project's own notes: newborn kids commonly
> go untagged for months due to high early mortality, but the owner still wants every birth recorded
> immediately, connected to its mother.

---

## 1. Reason for update

Kids aren't given a permanent ear tag until the owner is confident they'll survive (often ~5 months, not
a strict rule). But `goats.tag` is required, so there's currently no way to record a newborn the moment
it's born without inventing a tag prematurely — and doing so risks exactly the kind of duplicate/renaming
mess the tag system was built to prevent.

## 2. Current behavior

Registering any goat requires a `tag` value up front (`NOT NULL`). There's no quick way to add a kid
directly from its mother's profile — the owner must use the general Add Goat wizard and manually pick the
dam from the Parents step like any other goat.

## 3. Desired behavior

- An **"Add newborn kid"** action on a doe's own goat detail page, which opens the existing registration
  wizard with **Dam locked to this goat** and **Origin locked to Born on the farm** — the owner only
  fills in what's actually unknown (sex, date of birth, optionally sire, optionally breed/notes).
- **No tag is typed.** The system auto-generates one in the form `{dam_tag}-K{n}` (e.g. `MJ02-K1`,
  `MJ02-K2` for the next kid), guaranteed unique against the whole herd, and marks the record with
  `is_temp_tag = true`.
- Anywhere a tag is shown, a temp tag is **visibly marked** as provisional (e.g. a small "Temp tag" badge).
- **Promoting to a permanent tag** is a normal edit: type the real tag and turn off an explicit "This is
  a temporary tag" toggle. From that point the goat behaves exactly like any other tagged goat — no
  lingering special case.
- **Duplicate-tag warnings ignore temp-tagged goats** — they're system-generated and already
  guaranteed unique, so flagging them would just be noise.

## 4. Scope (in and out)

**In scope**
- `goats.is_temp_tag` (additive migration).
- `lib/goats/temp-tag.ts` — pure function generating the next unique `{dam_tag}-K{n}` value.
- "Add newborn kid" entry point on a doe's detail page, reusing the existing `UPD-003` wizard with Dam
  and Origin pre-locked and the Tag step replaced by the generated preview.
- A "This is a temporary tag" toggle on the edit form, defaulting on for temp-tagged goats.
- Excluding `is_temp_tag = true` goats from `UPD-008`'s duplicate-tag warning and duplicates-review view.
- Visual badge wherever a tag is displayed (list, detail).
- A **"Total kids"** stat on a doe's own detail page — a lifetime count of every kid ever linked to her
  via `dam_id`, regardless of that kid's tag status (temp or promoted) or current life status
  (active/sold/deceased/stolen). This is a "how many has she had," not "how many she currently has"
  figure — a deceased kid still counts.

**Out of scope**
- Adding a "no tag yet" path to the *general* Add Goat wizard (reachable other than from a dam's card) —
  the owner specifically wants this tied to the mother's profile; a general entry point can be a future
  small addition if wanted (see open questions), not required here.
- Auto-inferring the sire — leave it as the normal optional picker.
- Any change to how a permanently-tagged goat behaves once promoted — it's simply a normal goat from then on.

## 5. UX / interaction requirements

- **Entry point:** a clearly-labeled "Add newborn kid" button/action on a doe's (`sex = female`) own goat
  detail page — not shown on bucks/wethers, since only does have kids.
- **Wizard behavior in this mode:** launch the existing `UPD-003` multi-step wizard with:
  - **Dam locked** to the goat this was launched from (not editable in this flow).
  - **Origin locked** to Born on the farm (no need to ask — it's obviously true).
  - **Tag field replaced** with a read-only preview of the generated temp tag (e.g. "Temporary tag:
    MJ02-K1 — you can assign a real tag later"), not an input.
  - Sex, date of birth (defaults today), sire (optional), breed (optional — auto-suggested from both
    parents if `06`'s parent-based breed computation is active and a sire is chosen), notes: unchanged
    from the normal wizard.
  - **Sire field is unchanged from `06`'s existing parent picker** — the owner can pick an in-system
    goat or type an external name, exactly as in the normal wizard. This spec does not rebuild that
    picker, only confirms it still works correctly when reached through this newborn-specific entry.
- **"Total kids" stat:** shown on a doe's detail page near the "Add newborn kid" action (e.g. a small
  stat like "Total kids: 5"), reflecting every kid ever linked via `dam_id` — computed with a direct,
  RLS-scoped count query on the detail page (no need to fetch the whole herd for this), not filtered by
  tag status or current life status.
- **Temp-tag badge:** a small, clearly-labeled pill (e.g. "Temp") next to the tag anywhere it's shown —
  list rows, the goat detail header, and the duplicates-review view if it ever surfaces one (it shouldn't,
  per Section 3).
- **Promotion:** on the edit form, a "This is a temporary tag" toggle is on by default for these goats.
  Turning it off requires the owner to also enter a real tag value in the same save; once saved with the
  toggle off, `is_temp_tag` becomes `false` permanently (re-enabling it is not a supported flow — if
  needed later, that's a manual data fix, not a UI feature).

## 6. Domain / data / API requirements

**Migration** (additive, new file):

```sql
alter table public.goats
  add column if not exists is_temp_tag boolean not null default false;
```

**`lib/goats/temp-tag.ts`:**

```ts
export function generateTempTag(damTag: string, existingTags: string[]): string {
  // Try {damTag}-K1, {damTag}-K2, ... comparing via normalizeTag() equivalence (reuse from lib/goats/tag.ts),
  // not raw string equality, so case/leading-zero variants can't produce a false "available" slot.
  // Return the first candidate that doesn't collide with any existing tag.
}
```

- Pure, no Supabase/React — reuses `normalizeTag()` from `lib/goats/tag.ts` (`UPD-008`) for collision
  checks, consistent with how duplicate equivalence is defined everywhere else in this project.
- The server action creating a newborn via this flow passes the full current tag list (or queries it) to
  `generateTempTag`, sets `is_temp_tag = true`, `origin = 'born_here'`, and `dam_id` = the locked dam.
- **Amend `UPD-008`'s duplicate-detection functions** (`findDuplicateTagGroups` and the save-time warning
  check) to exclude any goat with `is_temp_tag = true` from the comparison set — same pattern as the
  earlier active-only exclusion, just a second exclusion condition alongside it.
- Regenerate `types/database.types.ts` after the migration.

## 7. Safety and data integrity rules

- `is_temp_tag` is a display/behavior flag only — it doesn't change RLS, ownership, or any constraint.
- **A temp tag must still be genuinely unique in the database** (the `NOT NULL` + whatever uniqueness
  already exists on `tag` is untouched) — only the *user-facing warning* is suppressed for temp tags, not
  the underlying guarantee that every tag value is distinct.
- If a dam's own tag is later changed, previously generated temp tags for her earlier kids will still
  reference her *old* tag string in their own value — this is a cosmetic inconsistency, not a data
  integrity problem (the real link is `dam_id`, not the temp tag's text), and is not something this
  update needs to solve.

## 8. Acceptance criteria

- [ ] "Add newborn kid" appears only on a doe's detail page.
- [ ] Using it creates a goat with Dam locked, Origin locked to born-here, and a generated temp tag like
      `MJ02-K1`.
- [ ] A second newborn from the same dam gets `MJ02-K2`, not a collision.
- [ ] The temp tag is visibly badged wherever shown.
- [ ] Temp-tagged goats never trigger or appear in the duplicate-tag warning/review.
- [ ] Turning off "This is a temporary tag" with a real tag entered promotes the goat; from then on it
      behaves as a normal tagged goat, including normal duplicate-tag protection.
- [ ] Existing goat registration (the general Add Goat flow) is unaffected.
- [ ] The sire field in this newborn flow lets the owner pick an in-system goat or type an external
      name, exactly like the normal wizard's Parents step (reused unchanged from `06`).
- [ ] A doe's detail page shows a "Total kids" count reflecting every kid ever linked via `dam_id`,
      including ones that are now sold, deceased, or stolen, and including temp-tagged ones not yet
      promoted.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the migration.

**Manual (user flow)** — from a real doe's profile, add two newborn kids in a row and confirm they get
sequential temp tags with no collision; confirm the badge shows; confirm neither triggers a duplicate
warning; promote one to a real tag and confirm the badge disappears and normal duplicate protection now
applies to it; confirm the general Add Goat wizard still works exactly as before for a non-newborn goat.
While adding a newborn, confirm the sire field offers both an in-system picker and an external-name
option, unchanged from the normal wizard. After adding two kids to the same dam, confirm her "Total kids"
count reads 2; mark one of those kids deceased and confirm the count stays at 2, not 1.

## 10. Related spec files

- Extends: `context/feature-specs/05-goat-profiles.md`, `context/feature-specs/06-family-tree.md`
  (dam linking), reuses `context/update-specs/003-goat-form-multistep-wizard.md`'s wizard.
- Amends: `context/update-specs/008-goat-search-filter-duplicate-and-reasoned-removal.md`'s duplicate
  detection (add the `is_temp_tag` exclusion alongside the existing active-only exclusion).

## 11. Implementation note

**Migration.** `supabase/migrations/20260830000003_goat_is_temp_tag.sql` —
`alter table public.goats add column if not exists is_temp_tag boolean not null default false;`
Additive, non-destructive; existing rows default to `false` (already-tagged). `is_temp_tag` is a
display/behaviour flag only — no RLS, ownership, or `tag` `NOT NULL`/uniqueness change. Types were
hand-added to the `goats` Row/Insert/Update in `types/database.types.ts` (the usual
stand-in-then-verify) and are to be re-confirmed with `npm run gen:types` once the owner applies the
migration.

**`lib/goats/temp-tag.ts` — `generateTempTag(damTag, existingTags)`.** Pure, no React/Supabase. Tries
`${damTag}-K1`, `-K2`, … and returns the first candidate that doesn't collide with any existing tag
under **`normalizeTag()` equivalence** (imported from `lib/goats/tag.ts`, `UPD-008`), not raw string
equality — so a case / leading-zero / whitespace variant of an existing tag can't be mistaken for a
free slot. `n` starts at 1; a hard cap (`existingTags.length + 2`) keeps it total. The **server action
is the authority**: `createGoat` re-queries the live tag list and the dam's current tag and calls
`generateTempTag` itself, so the value written to `goats.tag` is correct even if the client preview was
computed from a stale list (e.g. adding a second kid before the dam's page revalidates). `createGoat`
now also `revalidatePath`s the dam's (and sire's) detail page so the "Total kids" count and the next
preview refresh immediately.

**Entry point & wizard reuse.** `components/goats/goat-form-dialog.tsx` gained a
`newbornDam?: { id; tag }` prop. When set (`isNewborn`), the **existing `UPD-003` four-step wizard** is
launched with:
- Origin **locked** to `born_here` — the toggle is replaced by a read-only "Born on the farm — to
  {dam_tag}" line; a hidden `origin` input still submits, and `createGoat` re-forces `origin =
  'born_here'` server-side.
- Dam **locked** — Step 3's dam `ParentPicker` is replaced by a read-only panel showing the dam's
  tag/name plus hidden `dam_id` / empty `dam_name` inputs. "Skip for now" on Step 3 only clears the
  (optional) sire, never the locked dam.
- Tag step **replaced by a read-only preview** — the `Input` is `readOnly` and shows the generated
  `{dam_tag}-K{n}` value with the helper "Temporary tag: … — you can assign a real tag later". The
  duplicate-tag warning is suppressed in this mode. A hidden `is_temp_tag="true"` input is submitted.
- DOB defaults to **today**; sex, sire, breed and notes are **unchanged** from the normal wizard.

**Sire picker — reused unchanged (confirmed).** Step 3's sire control is `06`'s existing
`ParentPicker` with no modification — the in-system searchable select (with the "showing males only ⇄
showing all goats" override) **and** the "External" free-text name mode both work exactly as in the
normal wizard when reached through this newborn entry. No picker code was touched.

**`06`'s parent-based breed computation in this flow — offered, not auto-applied (confirmed).** The
newborn flow reuses the same `bothParentsInSystem` gate and the same "Use parents' breed" ⇄ "Enter
manually" `ToggleGroup` as the normal born-here path, unchanged. Because the dam is always an in-system
goat here, the toggle appears on the Breed step **as soon as the owner also picks an in-system sire
that carries a recorded breed composition** — at which point the live computed preview
(`composeFromParents(dam, sire)`) is shown. It is never silently applied over a manual entry (`06`
§16 decision 5); the manual breed input stays the default until the owner switches the toggle. If the
sire is external or unlinked, the flow falls back to the manual breed input with no blocking.

**Promotion.** Editing a temp-tagged goat shows a "Temporary tag ⇄ Permanent tag" toggle (Temporary by
default). While Temporary, the tag input stays read-only. Switching to Permanent makes it editable and
gates "Next"/Save until a non-empty tag **different from the generated one** is entered; the form then
submits `is_temp_tag="false"` and `updateGoat` writes `is_temp_tag = false`. An update **never** writes
`is_temp_tag = true`, so re-enabling it is not a UI flow (matches Section 5). From that point the goat
is a normal tagged goat — normal duplicate-tag protection applies again.

**Badge.** `components/goats/temp-tag-badge.tsx` — a small "Temp" pill (warning-tint tokens) rendered
next to the tag on the goats-list rows (desktop table + phone card) and the goat detail header.

**"Total kids" stat (confirmed).** The goat detail page (Server Component) runs a direct RLS-scoped
`supabase.from("goats").select("id", { count: "exact", head: true }).eq("dam_id", goatId)` — only for
does — and renders "Total kids: N" beside the "Add newborn kid" action. It counts **every** row linked
via `dam_id`, independent of that kid's `is_temp_tag` or `status`, so a sold / deceased / stolen kid
still counts. No herd fetch.

**`UPD-008` duplicate detection amended.** `lib/goats/tag.ts` `TaggedGoat` gained `is_temp_tag?`;
`findDuplicateTagGroups` and `findTagMatches` now `continue`/filter on `is_temp_tag === true` alongside
the existing `status !== 'active'` skip. `ParentPickerGoat` gained `is_temp_tag`, and both `parentGoats`
selects/mappings (`app/(app)/goats/page.tsx`, `app/(app)/goats/[id]/page.tsx`) include it, so the goat
form's non-blocking warning ignores temp-tagged goats too.

**General Add Goat wizard unaffected (confirmed).** `newbornDam` is `undefined` for the normal entry
points, so the origin toggle, the editable tag input + live duplicate warning, the dam `ParentPicker`,
and the `is_temp_tag = false` default all behave exactly as before — verified by code path and by the
owner's hands-on test.

## 12. Verification evidence

**Automatic.** `npm run build` passes (Next 16.3.2 / Turbopack); `npx tsc --noEmit` clean; `npm run
lint` at the project baseline (the pre-existing `use-mobile.ts` error + four `_prev` warnings in
other delete dialogs — none in `UPD-010` files).

**Unit check.** `generateTempTag` exercised directly: `("MJ02", ["MJ02","MJ01"]) → "MJ02-K1"`;
`("MJ02", ["MJ02","MJ02-K1"]) → "MJ02-K2"`; `("MJ02", []) → "MJ02-K1"`; case/whitespace variants of an
existing `-K1` are treated as taken via `normalizeTag`.

**Manual (owner, running app, 2026-08-30).** The owner applied migration `20260830000003`, regenerated
types, and tested the built flow directly, confirming it works: adding two newborn kids in a row from a
real doe's profile produced sequential temporary tags with no collision (`{dam_tag}-K1`, then
`{dam_tag}-K2`); the sire field offered both the in-system picker and the external-name option; the
"Temp" badge displayed on the list and the detail header; neither temp-tagged kid triggered a
duplicate-tag warning or appeared in the "possible duplicates" review; promoting one kid to a real tag
removed the badge and restored normal duplicate-tag protection for it; the doe's "Total kids" count
read 2 after both were added and stayed at 2 after one kid was marked deceased; and the general Add
Goat wizard still worked exactly as before.

**Final tag format used:** `{dam_tag}-K{n}` (e.g. `MJ02-K1`, `MJ02-K2`) — kept as proposed, owner
confirmed it reads well (Section 14).

**No new owner-scoped table**, so no new cross-account RLS item — `is_temp_tag` is a column on the
existing, already-RLS-covered `goats` table.

## 13. Resolution / final state

`UPD-010` is `done` — built and owner-verified in the running app on 2026-08-30. One additive migration
(`20260830000003_goat_is_temp_tag.sql`, `goats.is_temp_tag boolean not null default false`), applied by
the owner and types regenerated.

Shipped:
- `lib/goats/temp-tag.ts` — pure `generateTempTag(damTag, existingTags)` → `{dam_tag}-K{n}`, collision
  check via `normalizeTag()` equivalence.
- `components/goats/goat-form-dialog.tsx` — `newbornDam` mode reusing the `UPD-003` wizard: Origin +
  Dam locked, Tag step replaced by a read-only auto-generated preview, DOB defaulting to today; plus a
  "Temporary tag ⇄ Permanent tag" promote toggle in the edit flow.
- `app/(app)/goats/actions.ts` — `createGoat` regenerates the temp tag server-side (authority), sets
  `is_temp_tag = true` + `origin = 'born_here'`, and revalidates the dam's detail page; `updateGoat`
  writes `is_temp_tag = false` on promotion and never back to `true`.
- `components/goats/temp-tag-badge.tsx` — the "Temp" pill, shown on the goats list and the detail
  header.
- `app/(app)/goats/[id]/page.tsx` — the "Add newborn kid" action (does only), a lifetime "Total kids"
  count (direct RLS-scoped count query), and the temp badge in the header.
- `lib/goats/tag.ts` — `findDuplicateTagGroups` / `findTagMatches` exclude `is_temp_tag = true` goats
  alongside the existing active-only exclusion; `ParentPickerGoat` + both `parentGoats` selects carry
  `is_temp_tag`.

`06`'s parent-based breed computation is **offered** in this flow (the "Use parents' breed" toggle
appears once an in-system sire with a recorded breed is chosen — the locked dam always satisfies the
other half), never auto-applied. The general Add Goat wizard is unchanged. Both Section 14 open
questions were confirmed by the owner as built: the general-wizard "no tag yet" option stays out of
scope; the `{dam_tag}-K{n}` format is kept.

No new update or error specs were filed.

## 14. Open questions — resolved by the owner (2026-08-30)

- **General-wizard "no tag yet" option.** ✅ **Confirmed — stays out of scope.** Only the dam's-card
  entry point is built. A general "I don't have a tag yet" option (which would need a different,
  dam-independent temp-tag scheme) can be a small future update spec if the owner finds they want it;
  it is not required here.
- **Temp-tag format.** ✅ **Confirmed — `{dam_tag}-K{n}` as proposed.** e.g. dam `MJ02` → `MJ02-K1`,
  `MJ02-K2`. Compact and traceable back to the mother; no separator/suffix change.
