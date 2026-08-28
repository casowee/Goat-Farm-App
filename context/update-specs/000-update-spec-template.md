# 000 — Update Spec Template

> **This file is the structural source of truth for update specs. Do not implement it.**
> To create a new update spec: copy this file to `NNN-short-kebab-title.md`, fill every section, set
> **Status: `proposed`**, and wait for the owner to set `approved` before any code is written.
> Keep the section order and headings; delete the italic guidance as you fill each one.

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-NNN`                                                          |
| Title             | short human title                                                  |
| Status            | `proposed` / `approved` / `in progress` / `done` / `rejected` / `superseded` |
| Owner approved?   | no → yes (date)                                                   |
| Feature spec(s)   | e.g. `05-goat-profiles`                                            |
| Depends on        | other update/error specs, or "none"                               |
| Schema impact     | none / additive migration / (never edit an applied migration)     |
| Created           | YYYY-MM-DD                                                         |

---

## 1. Reason for update

*Why this change is needed. The problem, gap, or opportunity in one short paragraph — plus who it
helps and what triggered it. Keep it to the motivation, not the solution.*

## 2. Current behavior

*What the feature does today, precisely enough to see the gap. Reference the feature spec and the
actual screens/columns/functions involved. State facts, not intentions.*

## 3. Desired behavior

*What it should do after this update. Describe the target behavior concretely — enough that someone
could tell whether the result matches. Avoid implementation detail here; that's Sections 5–7.*

## 4. Scope (in and out)

**In scope**
- *…the specific things this update will change.*

**Out of scope**
- *…related things deliberately left alone, and where they're handled instead (another spec, later).*

## 5. UX / interaction requirements

*The user-facing behavior: form layout, what shows/hides, dropdown options, labels, empty states,
mobile behavior, and any live-preview or validation feedback. Reference `ui-context.md` tokens and the
radius scale. This is what the owner clicks through.*

## 6. Domain / data / API requirements

*The non-UI substance: schema changes (columns, types, defaults — additive migration only), the exact
migration if any, generated-types regeneration, server actions / route handlers, and any pure `lib`
domain logic (kept portable). State validation rules the server enforces. If schema impact is "none",
say so explicitly.*

## 7. Safety and data integrity rules

*Invariants this change must preserve or add: RLS/ownership (`auth.uid()`), DB-level constraints that
guarantee consistency, what happens to existing rows on migration (backfill/defaults), and anything the
change must NOT break (from `architecture-context.md` invariants). Note any child-data or destructive
implications.*

## 8. Acceptance criteria

*A checklist of observable, testable statements that must all be true when this is done. Written so each
can be ticked off. Tie back to the relevant Success Criteria in `project-overview.md` where applicable.*

- [ ] *…*
- [ ] *…*

## 9. Verification required — automatic and manual

**Automatic**
- *`npm run build` passes; `tsc` clean; any type-wiring check; unit tests for pure logic if present.*

**Manual (user flow)**
- *The click-through the owner (or agent, in a browser) performs, step by step, to confirm the behavior —
  including the exact path that proves the change and that existing data still works.*

## 10. Related spec files

*Feature spec(s) this extends, other update specs it builds on or supersedes, and any error specs it
touches. Link by filename.*

## 11. Implementation note

*Filled during/after build: the approach actually taken, files touched, and any decision made at build
time (including how an Open Question was resolved). Note anything the next spec should know.*

## 12. Verification evidence

*Filled at the verification gate: what was actually run and observed — build result, the browser checks
performed, screenshots/log notes, and confirmation that temporary test scaffolding was reverted. This is
the proof, not the plan.*

## 13. Resolution / final state

*The closing summary once `done`: what shipped, the final schema/behavior, any follow-ons filed
(update or error specs), and any Open Questions carried forward. One paragraph that a future reader can
trust as "what actually happened."*
