# Error Spec — <Short Title>

> **Structural source of truth for error specs. Do not implement it.**
> To file a mistake: copy this file to `NNN-short-error-name.md`, fill every section, set **Status:
> `Open`** (or `Investigating`) and a **Severity**. Keep the section order and headings; delete the italic
> guidance as you fill each one. The **Preventive Rule** is the point of the exercise — don't skip it.

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `ERR-NNN`                                                          |
| Status            | `Open` / `Investigating` / `Resolved` / `Won't fix`               |
| Severity          | `blocking` / `major` / `minor` / `cosmetic`                       |
| Feature affected  | feature number / name (+ update spec, if the mistake was in one)  |
| Related specs     | feature / update / error specs involved, or "none"                |
| Date discovered   | YYYY-MM-DD, and how (e.g. manual verification of update 00X)      |

## What happened

*The observed mistake or failure, precisely, with the concrete evidence (error/console message verbatim,
the wrong value, the failing request).*

**Reproduction steps** — *numbered, from a known starting point. If intermittent, say so and how often. A
mistake that can't be reproduced can't be confirmed fixed.*

## Expected behavior

*What should have happened, per the feature spec and any approved update spec.*

## Root cause

*The implementation or workflow reason it occurred — the actual mechanism, not the symptom. If still
under investigation, record the leading hypothesis and what would confirm it.*

## Why existing verification missed it

*Why the build check, automated tests, or previous review did not detect this. This is what improves the
verification strategy over time — be specific about the gap.*

## Correction required

*The concrete change to fix it. A root-cause fix is preferred; any symptom-suppressing fallback must be
justified here.*

## Preventive rule

*The reusable rule that must apply to future features so this class of mistake cannot recur. Write it as
an actionable instruction the coding agent can follow (e.g. "Never pass a client-component element as a
prop across the RSC boundary into a base-ui `render` slot — build the trigger inside the client component").*

## Safety / data-integrity impact

*Did the mistake risk or expose data, or weaken RLS/ownership or a DB constraint? Must the fix preserve a
specific invariant (`architecture-context.md`)? Note any risk to existing rows. "None" if purely cosmetic.*

## Verification required

**Automatic** — *`npm run build` passes; `tsc` clean; a regression test if the mistake is testable.*

**Manual (user flow)** — *the reproduction re-walked with a clean result, plus a check that the surrounding
flow still works.*

## Related context files

*Feature spec(s), update spec(s), and context files relevant to the mistake and the fix.*

## Resolution notes

*(fill when `Resolved`)*

- **Files changed:**
- **Tests run:**
- **Manual verification:**
- **Documentation updated:**
- **Preventive rule applied where else:** *(same pattern fixed elsewhere to prevent recurrence)*
