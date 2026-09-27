# 15 — Health Reference (Doctor) & Effective Treatment History

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Phase       | 5 — Reference & output                                                        |
| Aspect      | Both (mostly static content + UI; one small additive column)                  |
| Status      | `in progress` — built 2026-09-27; awaiting the owner's migration run + hands-on test |
| Depends on  | `07` (health records — inspect current schema before building); `UPD-004` (health condition preset names, which this spec's static content must match exactly) |
| Unblocks    | none directly                                                                  |

> **Agent:** before writing code, follow the Implementation Workflow in `ai-workflow-rules.md`. Read this
> spec, then `07`'s actual current schema (inspect `types/database.types.ts` — don't assume field names),
> and `context/update-specs/004-health-record-presets.md` for the exact seeded preset name strings this
> spec's static content must match character-for-character (including punctuation like em-dashes).

---

## 1. Goal

Two things, deliberately combined:

1. **A static health reference** — the original "Doctor" concept from `project-overview.md`: common
   ailments, typical symptoms, general guidance, and clear emergency signs, always shown with a visible
   non-diagnostic disclaimer. Fixed, shipped-in-repo content — not owner-editable.
2. **A personalized "what worked before" history** — since the vet isn't always available, the owner
   wants to mark a treatment they've actually recorded as **effective**, so that if the same condition
   comes up again, the exact treatment that worked is one tap away instead of buried in past records.

The second part is the real new capability here. It needs almost no new schema — `07`'s health records
already capture the medication, dosage, date, and goat; this just adds a way to flag one as proven.

## 2. Scope

**In scope**

- Static condition reference content (Task 1), matching `UPD-004`'s seeded preset names exactly so the
  two link up automatically.
- A `/doctor` browse page and per-condition detail page (Tasks 2–3).
- **"Your farm's history with this condition"** on each detail page — every health record ever logged
  under that exact name, across all goats, newest first.
- **Mark as effective** — a boolean flag on a health record, togglable both from the record itself (on a
  goat's card) and from the Doctor condition page's history list. Single source of truth, not duplicated
  logic in two places.
- The always-visible non-diagnostic disclaimer (invariant 4 in `architecture-context.md`).

**Out of scope**

- Letting the owner write their own new static condition entries — the reference content stays fixed and
  shipped in the repo. A health record logged under a name with no matching static entry still gets a
  history/effectiveness page — it just has no static guidance section, which is expected, not a bug.
- Any aggregate "most farms find X effective" cross-owner comparison — this is single-farm history only.
- Vaccination/deworming schedules — those live in `07` itself; Doctor is about illnesses and injuries.

## 3. Task 1 — Static condition reference content

**File:** `lib/doctor/conditions.ts` (or a JSON file alongside it — agent's choice, keep it simple and
statically typed). One entry per condition, **using the exact name strings already seeded in `UPD-004`**
so matching against real health records works without any extra mapping step:

```ts
export interface DoctorCondition {
  name: string                 // MUST exactly match a health_condition_presets.name string
  category: 'illness' | 'injury'
  commonSymptoms: string[]
  generalGuidance: string[]
  emergencySigns: string[]
  note?: string                // e.g. "suspected, not lab-confirmed" for the presets marked that way
}
```

Write entries for at minimum the conditions `UPD-004` seeded: Worm/Parasite Infestation, Listeriosis
(suspected), Orf — Contagious Ecthyma (suspected), FMD — Foot-and-Mouth Disease (suspected), PPR — Peste
des Petits Ruminants (suspected), Bacterial Infection/Diarrhea, Severe Diarrhea, Skin Abscess/Boils,
Respiratory Illness (Sneezing/Nasal Discharge), Bloat/Abdominal Distension, Constipation/Failure to Pass
Dung, Newborn Weakness/Difficulty Standing or Breathing, Difficult Birth/Assisted Delivery. Copy the exact
name strings from `UPD-004`'s Appendix — do not retype/rephrase them.

Content should be genuinely useful general guidance (symptoms to watch for, basic supportive care,
clear signs that mean "call a vet now") — factual and cautious, never phrased as a diagnosis.

## 4. Task 2 — Doctor browse page

**File:** `app/(app)/doctor/page.tsx`. Replace the stub route from spec `03`. List all static conditions
(grouped by category: Illness / Injury), each showing its name and a short one-line symptom summary.
**A persistent, clearly visible non-diagnostic disclaimer banner** at the top of this page and every page
in this module — something like: *"This is general reference information, not a diagnosis. Always
consult a veterinarian for a confirmed diagnosis or treatment plan."*

## 5. Task 3 — Condition detail page

**File:** `app/(app)/doctor/[condition]/page.tsx` (slugify the name for the URL, or use an id — agent's
choice, keep it simple).

- **Static guidance section:** symptoms, general guidance, emergency signs, the suspected/confirmed note
  if present. If no static entry exists for this exact name (a custom preset the owner added later via
  `UPD-004`'s "+ Add new"), skip this section gracefully — show the history section only, with a small
  note like "No reference guidance written for this yet."
- **"Your farm's history with this condition"** — every `health_records` row (RLS-scoped) whose title
  exactly matches this condition's name, across all goats, newest first. Each row: goat (clickable link,
  reuse the existing goat-link component), date, medication/dosage if it was a treatment-type record, and
  an **effectiveness badge** — showing "✓ Marked effective" where flagged, with a toggle to mark/unmark
  directly from this list.
- If there's no history yet, show a plain empty state — this is expected for a condition the farm hasn't
  encountered.

## 6. Task 4 — Mark as effective

**Migration** (additive, single column):

```sql
alter table public.health_records
  add column if not exists marked_effective boolean not null default false;
```

- Add a toggle to the health record's own edit form (on a goat's card) — "Mark this treatment as
  effective" — alongside its existing fields. Wire the **same** update action from both this location and
  the Doctor condition page's history list — one code path, not two.
- No new table, no new RLS policy — this is a column on an already-owner-scoped, already-RLS-protected
  table.

## 7. Files this unit touches

```
supabase/migrations/xxxx_health_records_marked_effective.sql   # additive column only
types/database.types.ts                                          # regenerated
lib/doctor/conditions.ts                                          # static reference content
app/(app)/doctor/page.tsx                                         # browse list + disclaimer
app/(app)/doctor/[condition]/page.tsx                             # detail: static guidance + farm history
components/doctor/condition-history-list.tsx                      # history rows + effectiveness toggle
components/doctor/disclaimer-banner.tsx                           # reusable, shown on every Doctor page
components/health/health-record-form.tsx                          # add the "mark as effective" toggle (existing form, extended)
```

`/doctor` already exists as a stub route from spec `03` — replace the placeholder, don't add a duplicate
nav entry. Do not edit `components/ui/*`.

## 8. Verification (must pass before 15 is `done`)

Build & types: `npm run build` passes; `tsc` clean.

Click-through:

1. `/doctor` lists conditions grouped by category with the disclaimer visible.
2. Opening a condition with matching real health records shows them correctly, newest first, with working
   goat links.
3. Marking a record effective from the Doctor page updates it; opening that same record on the goat's
   card shows the toggle already on — same underlying data, not two separate flags.
4. A condition with no static entry (test with a custom "+ Add new" preset from `UPD-004`) shows history
   only, with a graceful "no guidance written yet" note, not an error.
5. A condition with no history yet shows a plain empty state.
6. Dark theme, phone width, no console errors or hydration warnings.

Owner-only: cross-account RLS — confirm a second account never sees another owner's `marked_effective`
flags or history (this rides on `health_records`' existing RLS, so should already be correct — verify).

## 9. Roadmap & progress updates — the agent must do these

**On starting 15:** set feature **15** to `in progress` in both the "At a glance" table and its section
of `feature-specs-roadmap.md`, and update `progress-tracker.md`.

**On completing 15** (build passes and verified): set feature **15** to `done`, and record it in
`progress-tracker.md` (Completed + dated Session Notes).

## 10. Open questions — resolved by the owner, 2026-09-27

- **Condition list completeness — RESOLVED: the seeded conditions only.** Static content covers exactly the
  13 illness/injury conditions `UPD-004` seeded, and nothing beyond them. More can be added incrementally as
  new presets get used: `lib/doctor/conditions.ts` is a plain file edit with no migration and no data change.
- **Vaccination category presets — RESOLVED: included, as a light reference.** The owner asked for the four
  seeded vaccination presets to get pages too. They carry what the vaccine is generally given to protect
  against, handling and route notes, and post-injection reaction signs — **deliberately no schedule**, since
  vaccination timing is regional and a vet's or a national programme's decision, not this app's.
  `DoctorCategory` is therefore `'illness' | 'injury' | 'vaccination'`, widening the two-value union in
  Section 3's sketch, and `DoctorCondition` gains an optional `protectsAgainst` used only by those entries.
  Deworming, treatment, checkup and surgery presets stay out: they describe something done to a goat rather
  than something a goat has.

- **The `/doctor` stub from spec `03` — it did not exist.** Section 7 says to replace a placeholder route and
  not add a duplicate nav entry. There was no `app/(app)/doctor/` route and no `/doctor` item in `lib/nav.ts`
  (spec 10 had cleaned out the other dead stubs). Raised with the owner, who directed that the route be built
  fresh **and** a "Health Reference" sidebar entry added beside "Health History", so the module is reachable
  from anywhere on a phone.


---

## 11. Implementation note

*Built 2026-09-27. The owner's migration run and hands-on test (Section 8) are both still outstanding.*

- **Preset name matching — verified mechanically, not by eye.** All 17 `name` strings in
  `lib/doctor/conditions.ts` were checked against the seed `values` list in
  `supabase/migrations/20260829000003_health_condition_presets.sql` by script: 17 seeded
  illness/injury/vaccination rows, 17 entries, zero missing and zero extra. This matters because matching is
  a straight `.eq("title", name)` — the spaces around the slashes and the em-dashes in the Orf / FMD / PPR
  names are load-bearing.

- **Migration:** `supabase/migrations/20260927000002_health_records_marked_effective.sql` — one additive
  `marked_effective boolean not null default false` column, plus a
  `health_records (owner_id, title, date_occurred desc)` index for the "every record with this title" read.
  **No new RLS policy**, deliberately: `health_records`' existing `for all` owner policy (feature 07,
  rewritten to `(select auth.uid())` by spec 17.2) covers every column of the row, including ones added
  later, so nothing about this widens or weakens the existing scoping.

- **Types:** `types/database.types.ts` carries a **hand-added** `marked_effective` stand-in in the
  `health_records` Row / Insert / Update blocks, to be re-confirmed with `npm run gen:types` once the owner
  applies the migration — the same stand-in-then-verify pattern used for every prior table in this project.

- **One code path for the flag (Section 6's real requirement).** `components/health/mark-effective-toggle.tsx`
  is the single control, calling the single `setHealthRecordEffective` server action, writing the single
  `health_records.marked_effective` column. It is rendered in all three places the flag appears: the record's
  row on a goat's Health tab, that record's edit dialog, and the Doctor condition page's history list. The
  two views cannot disagree because there is nothing for them to disagree about.
  `updateHealthRecord` deliberately does **not** read or write `marked_effective`, so editing a record's
  dosage or notes can never silently clear the flag. The consequence is that the toggle saves immediately
  rather than on form submit; the edit dialog says so in its helper text. It is one boolean, reversible by
  tapping again.

- **Reads:** `listHealthRecordsByTitle()` and `listConditionHistoryStats()` live in `lib/health/queries.ts`
  with the other `health_records` reads, not under `lib/doctor/` — same table, same RLS, same spec 17.2
  explicit-column discipline. The history query embeds the goat (`goats!inner(id, tag, name)`) so the whole
  list is one query rather than one lookup per row. The browse page's per-condition counts are one narrow
  two-column read rather than ~18 head-only count queries. Both are `cache()`d.
  `lib/doctor/conditions.ts` stays pure static content with no I/O.

- **Disclaimer (invariant 4):** one `components/doctor/disclaimer-banner.tsx`, used by both pages. It is a
  server component and is **not** dismissible or collapsible — an invariant that can be closed is not an
  invariant.

- **Slugs:** `conditionSlug()` lowercases and collapses non-alphanumeric runs, so
  `"Orf — Contagious Ecthyma (suspected)"` becomes `orf-contagious-ecthyma-suspected`. A URL is resolved
  against the static reference first and then against the owner's own in-scope presets, which is how a
  custom "+ Add new" name gets a working history-only page. A slug neither knows is a real `notFound()`,
  not an empty page — a mistyped URL should not read as "this condition has no history".

- **Custom presets are reachable.** The browse page lists in-scope presets with no static entry under
  "Other conditions you have added". Without this, Section 8's verification item 4 would have had nothing
  to click. Presets are used rather than raw record titles because a preset row carries the `record_type`
  that says whether a name is an illness, an injury or a vaccination; a bare title does not, so
  treatment/deworming titles would otherwise have been listed as unexplained "other conditions". Every name
  typed through "+ Add new" is saved as a preset (`UPD-004`), so nothing the owner adds is missed.

- **Content stance.** Every entry is written to be useful without being diagnostic: no entry names a
  diagnosis for an individual goat, none prescribes a drug or a dose, and every one ends in explicit
  "call a vet now if you see" signs. The four notifiable/zoonotic entries (FMD, PPR, Orf, Listeriosis) lead
  with the reporting or human-health instruction rather than with husbandry advice. The five `(suspected)`
  presets carry a shared note explaining that the farm's past records under those names were never
  lab-confirmed.

## 12. Verification evidence

- **Automatic (agent):** `npx tsc --noEmit` clean; `npm run build` clean; `npm run lint` at baseline (one
  pre-existing error in the shadcn `hooks/use-mobile.ts` and five pre-existing `_prev` warnings — none of
  the new files appear). `package.json` / `package-lock.json` diff empty.

- **Browser (agent):** Playwright (Chromium) drove a **production** build at 390px and 1280px in dark mode,
  through a throwaway env-gated `/doctor-preview` route rendering the real components with stub records
  (removed afterwards; tree `grep`-confirmed clean, `proxy.ts` reverted, rebuilt). Confirmed: the disclaimer
  renders and is visible; three category groups build; a custom preset with no static entry appears under
  "Other conditions you have added" while an out-of-scope deworming preset is correctly excluded; the slug
  is `worm-parasite-infestation`; `GoatLink` resolves to `/goats/11` showing the tag; both toggle states
  render with the correct `aria-pressed`; the empty-history state renders gracefully rather than erroring;
  **no horizontal overflow at 390px**; and **zero console errors or warnings**, including no hydration
  warning (`ERR-001`'s "watch warnings, not just errors" lesson).

- **Still outstanding — the owner's, not the agent's:**
  1. Run `supabase/migrations/20260927000002_health_records_marked_effective.sql` in the Supabase SQL
     editor, then `npm run gen:types` to replace the hand-added type stand-in with the real generated shape.
     **The Doctor pages and the goat Health tab will error until this is applied** — they select a column
     that does not exist yet.
  2. The Section 8 click-through in the running app, authenticated, with real goats and real records —
     especially items 2, 3 and 5 (a condition with matching records, and marking one effective from the
     Doctor page then seeing it already on in the same record's edit dialog on the goat's card).
  3. The cross-account RLS check. This rides entirely on `health_records`' existing owner policy, which this
     spec does not touch — no policy was added, dropped or altered, and the new column is covered by the
     existing one. Confirming it was not weakened is a second-account check only the owner can run.
