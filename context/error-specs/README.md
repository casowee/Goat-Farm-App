# Error Specs

This folder records **implementation mistakes, regressions, and process failures** found while building
the Goat Farm Manager. Each one is turned into a **reusable rule** so the coding agent does not repeat
that class of mistake. This folder is the project's growing **memory** of what went wrong and how to
avoid it — not a disposable bug list.

## 1. Purpose

- Capture a mistake: what happened, why, and the **rule** that prevents it next time.
- Force **root-cause** and **verification-gap** thinking, not band-aids.
- Prevent regressions and repeated agent errors by making prior mistakes **required reading** before new work.

## 2. Relationship to other project specs

| Spec type          | Lives in                  | Answers                                              |
| ------------------ | ------------------------- | --------------------------------------------------- |
| **Feature spec**   | `context/feature-specs/`  | What a module *is* — the canonical baseline.         |
| **Update spec**    | `context/update-specs/`   | An approved *change* to a built feature.             |
| **Error spec**     | `context/error-specs/`    | A *mistake / defect* and the rule that prevents it (this folder). |

A defect, regression, or process failure is an error spec. A deliberate enhancement is an update spec.
If a bug fix needs a design change, file an update spec too and link them.

## 3. Naming

- Files: `NNN-short-error-name.md` — sequential, **never reused or renumbered**. `000-error-spec-template.md` is reserved.
- ID inside the file: **`ERR-NNN`** (matches the file number), so errors can be referenced in commits and
  discussion — e.g. "fixes ERR-003".

## 4. When to create an error spec

Create one when:

- a feature was marked complete but was **not actually usable**;
- implemented behavior **violates a context-file rule**;
- a **regression** breaks completed functionality;
- the test / verification strategy **missed a user-visible defect**;
- the agent made an **architectural or domain assumption it was not allowed** to make;
- a **manual test exposes** something automated verification missed;
- the **same class of mistake** could reasonably happen again.

Do **not** use this folder for ordinary feature requests or unresolved product questions — those are
update specs, or open questions in the feature spec.

## 5. Status values

| Status         | Meaning                                                            |
| -------------- | ----------------------------------------------------------------- |
| `Open`         | Found, not yet fixed.                                              |
| `Investigating`| Root cause being determined.                                      |
| `Resolved`     | Fixed, verified, and the Preventive Rule recorded.                |
| `Won't fix`    | Deliberately not fixed — say why. Duplicates link to the canonical spec. |

Also record **Severity** (`blocking` / `major` / `minor` / `cosmetic`) so priority is visible at a glance.

## 6. Workflow / agent rule

- **Before starting a feature**, review the relevant error specs so known mistakes aren't repeated. This
  is part of the read-order in `ai-workflow-rules.md`: feature spec → approved update specs → **error
  specs** → implement → verification gate.
- **Before marking a feature complete**, check whether any known **Preventive Rule** applies to the work.
- A fix is not `Resolved` until the **reproduction no longer occurs** and its Verification passes.
- **Never delete resolved error specs.** Mark them `Resolved` and keep them as project memory.

## 7. Scope discipline

- **One mistake (or one tightly-related cluster) per spec.**
- **Root cause over band-aid** — suppressing a symptom (e.g. `suppressHydrationWarning`, catch-and-ignore)
  is a last resort and must be justified.
- **Note any data-integrity / RLS implication** — some bugs expose data; the fix must not weaken ownership
  (`auth.uid()`) or a database constraint.

## 8. Source of truth

- `000-error-spec-template.md` is the **structural source of truth** for the shape of every error spec.
- A `Resolved` error spec is the source of truth for **that mistake and the rule that prevents it** — the
  record that keeps it from coming back.
