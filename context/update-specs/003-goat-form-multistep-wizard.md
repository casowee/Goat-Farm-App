# 003 — Goat Form Multi-Step Wizard

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-003`                                                          |
| Title             | Convert the goat form to a multi-step wizard; establish the reusable stepper pattern |
| Status            | `done` — owner requested this directly; implemented ahead of 07. (06 was already complete when this was picked up, so there were no remaining 06 sub-features to sequence against.) |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `05-goat-profiles`, `06-family-tree`                              |
| Depends on        | `UPD-001`, `UPD-002`, `06` (all `done`)                           |
| Schema impact     | **none** — UI only (+ a new reusable `components/forms/` pattern) |
| Created           | 2026-08                                                           |

---

## 1. Reason for update

The goat form has grown into one long single-scroll dialog — identity, origin, breed/composition,
purchase details, barn, parents (sire/dam, added by `06`'s in-progress work), and notes all stacked on
one screen. On desktop it's merely long; **on an iPhone it's unusable** — the owner works primarily from
a phone, so this blocks real use, not just aesthetics. This also isn't a one-off goat problem: health
records, breeding records, and other upcoming modules will hit the same wall if there's no standing rule
against it. This update both fixes the goat form now and establishes that rule (see the paired change to
`ai-workflow-rules.md` / `ui-context.md`, "Forms — Length & Multi-Step Standard").

## 2. Current behavior

One continuous form/dialog (`components/goats/goat-form-dialog.tsx`) renders every field at once: Tag,
Name, Breed, Sex, Date of birth, Status, Barn, Parents (Sire/Dam pickers from `06` 6a), Notes — plus the
origin segmented control and its conditional fields from `UPD-002`. At phone width this requires a long
scroll before reaching Save, and the optional Parents section adds length even when the owner has nothing
to enter there yet.

## 3. Desired behavior

The same data, collected across a **short multi-step wizard** inside the same dialog:

1. **Step 1 — Identity & Origin:** Tag, Name, Origin (segmented control) with its conditional purchase
   date, Sex, Date of birth.
2. **Step 2 — Breed & Housing:** Breed (per `UPD-002`'s origin-driven purebred/crossed input), Status,
   Barn.
3. **Step 3 — Parents (optional, skippable):** Sire, Dam pickers (per `06`'s origin-aware default) with a
   clear "Skip for now — add later" affordance.
4. **Step 4 — Notes & Review:** Notes, a short read-only summary of what was entered, and **Save**.

A step indicator ("Step 2 of 4") is always visible. Back is available except on step 1. All data persists
across steps within the same open dialog. **The database write happens once**, when Save is pressed on
the final step — this is UI pagination, not four separate saves.

## 4. Scope (in and out)

**In scope**
- Restructure `goat-form-dialog.tsx` into the four-step wizard above.
- Build the reusable stepper pattern in `components/forms/` (step indicator, step container, per-step
  validation/navigation) so `07` (health records), `09` (breeding), and any future long form reuse it
  instead of reinventing pagination.
- Coordinate with `06`'s in-progress work: the Parents step should be **built directly as Step 3**, not
  added to the flat form and then moved — avoid double work.
- Add the "Forms — Length & Multi-Step Standard" to `ui-context.md` and reference it from
  `ai-workflow-rules.md` (paired documentation change, not code, but part of this unit).

**Out of scope**
- Any change to validation *rules* (still per `UPD-001`/`UPD-002`/`06`) — only where/when they're checked
  changes (per-step vs. all-at-once).
- The barns form dialog — leave it as-is unless it already exceeds the new threshold (check; if it does,
  file a separate small update spec rather than scope-creeping this one).
- Any further `06` work (6b/6c/6d) beyond making sure the Parents step lands correctly inside the wizard.

## 5. UX / interaction requirements

- **Step indicator** at the top of the dialog (e.g. "Step 2 of 4" + a slim progress bar or dots), token
  colors, no hardcoded hex.
- **Per-step validation:** "Next" is disabled/blocked until the current step's required fields are valid
  (Step 1: Tag, Sex, Date of birth at minimum — match whatever's currently required). Steps ahead are not
  validated until reached.
- **Back** navigation preserves all previously entered values, including on steps not yet visited.
- **Step 3 (Parents) shows a visible "Skip for now — add later"** control, distinct from just leaving the
  pickers empty — reinforcing that lineage is genuinely optional and deferred, consistent with `06`'s
  design intent.
- **Step 4** shows a compact, read-only review of the key fields entered (tag/name, origin, breed, barn)
  before Save — a lightweight confirmation, not a full re-render of every field.
- Editing an existing goat opens the wizard **pre-filled**; the owner can jump between steps freely (not
  forced linear) since all data already exists — first-time creation can be more linear if simpler to
  build, but jumping should not be blocked once implemented.
- Verify at **iPhone width specifically** — each step must be reachable and usable without an oppressive
  scroll. Desktop-only verification does not satisfy this spec.
- No edits to `components/ui/*`; the new stepper lives in `components/forms/`.

## 6. Domain / data / API requirements

- **No schema change and no new validation rules.** `createGoat` / `updateGoat` keep exactly the
  validation from `UPD-001`, `UPD-002`, and `06` — only the **timing** of validation moves (per-step
  client-side checks for UX, with the existing server-side validation as the final authority on submit).
- **State management:** hold the full form's values in one client-side state object (or a form library
  already idiomatic to the project, e.g. extending the existing `useActionState` pattern with a
  wrapping local state for cross-step persistence) so switching steps never drops data. The **final
  submit** on step 4 calls the same `createGoat` / `updateGoat` server action as today, with the complete
  payload — one write, not four.
- **New reusable files** (exact names may adapt to project convention, but keep the separation):
  - `components/forms/step-indicator.tsx` — the "Step X of N" / progress UI.
  - `components/forms/use-wizard-steps.ts` (or similar) — step index, next/back, per-step validation gate.
  - These must be **generic** (no goat-specific logic) so `07`/`09` can import them directly.
- `components/goats/goat-form-dialog.tsx` becomes the goat-specific wizard, composed from the above plus
  the existing field components (`parent-picker.tsx`, breed inputs, etc. — reused, not rewritten).

## 7. Safety and data integrity rules

- No RLS or constraint changes — this is presentation-layer only.
- The single-final-submit design must not create partial/invalid rows — if the dialog is closed mid-wizard
  without pressing Save, nothing is written (matches current behavior of an unsubmitted form).
- All existing server-side validation continues to run on submit regardless of the client-side per-step
  checks, so a bypassed or manipulated client can't produce an invalid row.

## 8. Acceptance criteria

- [x] The goat form opens as a **4-step wizard** with a visible step indicator.
- [x] Each step shows only its fields; no step requires more than a short scroll at **iPhone width**
  (verified: every step's container fits with zero scroll at 390 × 844).
- [x] Required fields block "Next" until valid; unrelated future steps don't block the current one.
- [x] Data entered on any step survives navigating back and forth before Save.
- [x] Step 3 (Parents) has a clear **Skip for now** affordance.
- [x] Step 4 shows a short review and **Save writes once**, matching prior create/update behavior exactly
  (single `<form>` → unchanged `createGoat` / `updateGoat`; authenticated Save is the owner's own test).
- [x] Editing an existing goat opens the wizard pre-filled and navigable.
- [x] The stepper components in `components/forms/` contain no goat-specific logic and are ready for reuse.
- [x] `ui-context.md` carries the new Forms standard; `ai-workflow-rules.md` references it (both were
  already in place when this was picked up).

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow), at iPhone width specifically:**
1. Open Add goat — see Step 1 of 4; fill required fields; Next is blocked until they're valid.
2. Step 2 — breed/housing per the current origin-driven rules from `UPD-002`; Next proceeds.
3. Step 3 — Parents; try both **Skip for now** and actually picking a sire/dam; Back to Step 2 and
   confirm nothing entered was lost; forward again.
4. Step 4 — review shows the right summary; Save creates exactly one goat with all fields correct.
5. Edit an existing goat — wizard opens pre-filled; jump between steps; Save updates correctly.
6. Confirm **no step requires more than a short scroll** on a real phone-width viewport.
7. No console errors or hydration warnings (per `ERR-001`'s lesson — check warnings, not just errors).

## 10. Related spec files

- Restructures: `context/feature-specs/05-goat-profiles.md`'s form; builds on `UPD-001`, `UPD-002`.
- Coordinates with: `context/feature-specs/06-family-tree.md` (Parents step = 06's 6a parent picker,
  built directly into the wizard rather than retrofitted).
- Establishes a pattern feature specs `07` and `09` should plan to reuse.
- Paired documentation change: `ui-context.md` ("Forms — Length & Multi-Step Standard"),
  `ai-workflow-rules.md` ("Form Length Standard").

## 11. Implementation note

**Reusable stepper — `components/forms/` (no goat-specific logic, ready for `07` / `09`):**

- `use-wizard-steps.ts` — `useWizardSteps(steps, { allowJump })` hook. Holds only navigation state
  (current index + highest index reached); the **consuming form owns every field value**, so switching
  steps never unmounts an input and nothing is lost. `steps` is a plain `WizardStepDef[]` the consumer
  rebuilds each render with fresh `complete` / `optional` flags — the hook reads them live to decide
  whether "Next" is allowed. `allowJump` (passed `true` in edit mode) lets the step indicator jump
  anywhere; otherwise jumps are capped at the furthest step reached.
- `step-indicator.tsx` — `<StepIndicator>`: "Step X of N" + a segmented progress bar, token-styled
  (`bg-brand` / `bg-surface-border`, no hex). Segments are tappable when `onStepSelect` is given, capped
  by `maxSelectable`.
- `wizard-nav.tsx` — `<WizardNav>`: generic Back / Next / Skip footer. The consumer supplies the submit
  button for the final step via `children`; `onSkip` renders the "Skip for now — add later" affordance.

**Goat form (`components/goats/goat-form-dialog.tsx`) — composed from the above + existing fields:**

- One `<form action={formAction}>` wraps all four steps. Each step is a `<div>` that is **always
  mounted** and toggled with `flex` / `hidden` (never unmounted), so the single final submit collects
  every field regardless of which step is showing — **one write on Save**, calling the unchanged
  `createGoat` / `updateGoat`. An `onKeyDown` guard stops Enter from submitting before the last step.
- Step 1 fields that gate "Next" (`tag`, `date_of_birth`) plus `sex`, `origin`, and `barn_id` were moved
  from uncontrolled `defaultValue` to controlled state so per-step validation can read them; they keep
  their `name` attributes so `FormData` is unchanged. `purchase_date`, `status`, `reproductive_state`,
  `notes` stay uncontrolled inside their (mounted) step.
- **No validation rule changed.** `step1Valid` = tag present + DOB present and not future;
  `step2Valid` = a resolved breed composition + a barn chosen. These are the same conditions the server
  action already enforced, only checked per-step now instead of all-at-once. The server action remains
  the authority on submit.
- Step 3 is built directly as the Parents step — the two `06` `ParentPicker`s, reused unchanged. "Skip
  for now — add later" advances to step 4; in the create flow it also clears any partial pick and
  remounts the pickers empty (via `parentsResetKey`), in edit mode it only advances (so it can't
  silently wipe a recorded lineage).
- **6c interaction:** the "Use parents' breed" toggle still lives with the Breed field on step 2 and
  appears reactively once both parents are set to in-system goats (immediately in edit mode; after
  visiting step 3 and coming back, in the create flow). No reordering of the spec's steps was needed.
- Editing opens the wizard pre-filled with `allowJump` on, so the owner can tap any step segment.

## 12. Verification evidence

**Automatic:** `npm run build` passes (Next 16.3.2 / Turbopack) and `tsc --noEmit` is clean, both on a
tree with all temporary verification scaffolding removed.

**Browser (Playwright, Chromium, iPhone viewport 390 × 844, `isMobile` + touch):** driven against a
production build (`next start`) via a temporary env-gated auth bypass (`WIZARD_VERIFY`) and a throwaway
`wizard-check` page rendering the dialog with stub barns / goats — all of it reverted afterward and
`grep`-confirmed absent, followed by the clean build above.

- **Step 1:** "Next" disabled with tag/DOB empty, enabled once both are filled. Step container
  `scrollHeight === clientHeight` (388 px) — **no scroll at all** at iPhone width.
- **Step 2:** "Next" disabled until a breed and a barn are chosen. No scroll (244 px).
- **Step 3:** "Skip for now — add later" visible alongside Back / Next. No scroll (348 px).
- **No data loss:** picked an in-system sire on step 3 → Back to step 2 (breed still "Boer", barn still
  "North Barn") → forward to step 3 (sire still "S-01 — Sire One").
- **Step 4:** review shows Tag / Origin / Breed / Sex / DOB / Barn / Sire / Dam correctly; "Add Goat"
  (Save) button present. No scroll (358 px).
- **Skip:** from step 3, "Skip for now" → step 4 with Sire and Dam both "Not set".
- **Edit:** the "Edit" trigger opens the wizard pre-filled (tag `G-042`, DOB `2024-03-15`); the step
  indicator jumps straight to step 4 (review reflects Origin "Purchased", Barn "South Barn", external
  Sire "Outside Sire", in-system Dam "D-01 — Dam One"); jumping back to step 2 keeps breed and barn.
- **Zero console errors or warnings** captured across the whole walkthrough (per `ERR-001`'s lesson).

**Owner acceptance (2026-08-28):** the owner tested the wizard directly in the running app, including at
phone width, and confirmed it works — this covers the authenticated Save path that agent testing could
not reach. Cross-account RLS on a second real login remains the only outstanding check, unchanged from
every prior goat session; the server action and schema are untouched by this update, so the single-write
create/update path is the same one already exercised by `05` / `05a` / `06`.

## 13. Resolution / final state

The goat add/edit form is now a four-step wizard inside the same dialog — **Identity & Origin → Breed &
Housing → Parents (skippable) → Notes & Review** — with an always-visible "Step X of 4" indicator and a
segmented progress bar. The stepper is a reusable, goat-agnostic pattern in `components/forms/`
(`use-wizard-steps.ts`, `step-indicator.tsx`, `wizard-nav.tsx`) that `07` (health records) and `09`
(breeding) are expected to import directly rather than re-inventing pagination; this is now the standing
"Forms — Length & Multi-Step Standard" in `ui-context.md`. No schema change, no new validation rules,
and still exactly one database write on final Save — only the UI pagination and the timing of the
client-side checks changed. All field logic from `UPD-001`, `UPD-002`, and `06` (origin-driven breed
input, cross-breed computation, `crossTouched` preservation, parent pickers, parent-based breed
computation) carries over unchanged. 06 was already complete when this shipped, so there is no follow-on
06 work gated behind it. No new update or error specs were filed.

**Follow-up (not yet filed):** the owner has minor refinements to the wizard in mind for later. Nothing
is specified or scoped yet — this note exists only so the intent isn't lost; a proper update spec will
be written when those refinements are defined.
