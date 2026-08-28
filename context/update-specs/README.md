# Update Specs

Approved **changes and enhancements** to features that are already built. An update spec is how a
"we should improve X" idea becomes a tracked, approved, verifiable unit of work — without editing the
original feature spec or its applied migrations.

## 1. Purpose

- Capture a deliberate **change to existing behavior** (a new field, a reworked flow, a rule change)
  after a feature has shipped.
- Keep the original **feature spec stable** and the **applied migrations untouched** — updates are
  additive deltas layered on top.
- Give the owner an **approval gate**: nothing here is implemented until the owner marks it `approved`.
- Preserve history: how the feature grew, and why, stays readable over time.

## 2. Relationship to other project specs

| Spec type          | Lives in                  | Answers                                             |
| ------------------ | ------------------------- | -------------------------------------------------- |
| **Feature spec**   | `context/feature-specs/`  | What a module *is* — the canonical baseline.        |
| **Update spec**    | `context/update-specs/`   | An approved *change* to a built feature (this folder). |
| **Error spec**     | `context/error-specs/`    | A *defect* and how it was resolved.                 |
| **Roadmap / tracker** | `feature-specs-roadmap.md`, `progress-tracker.md` | Overall state and order.        |

**Current truth of a feature = its feature spec + all its `done` update specs.** Update specs do not
replace the feature spec; they extend it. A defect is *not* an update — file that in `error-specs/`.
If an update spec uncovers a bug, file an error spec; if fixing a bug requires a design change, file an
update spec.

## 3. Naming convention

```
NNN-short-kebab-title.md
```

- `NNN` — zero-padded three-digit sequence, assigned in creation order, **never reused or renumbered**.
- `000-update-spec-template.md` is reserved — the structural template, never implemented.
- Real update specs start at `001`. Numbering is **independent** of the feature-spec numbers
  (feature specs are `00`–`16`; update specs are `001`+).
- Title is a short kebab-case summary, e.g. `001-goat-origin-and-breed.md`.
- ID inside the file: **`UPD-NNN`** (matches the file number), so updates can be referenced in commits and discussion — e.g. "implements UPD-002".

## 4. Status values

Set in the spec's metadata header and kept in sync with reality.

| Status        | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `proposed`    | Drafted, awaiting the owner's approval. **The agent must not implement.** |
| `approved`    | Owner approved; eligible to be implemented.                             |
| `in progress` | Being implemented now.                                                  |
| `done`        | Implemented, verified, and Resolution / Final State recorded.           |
| `rejected`    | Considered and declined; kept for the record (say why).                 |
| `superseded`  | Replaced by a later spec; link the replacement.                         |

## 5. Workflow

Feature implementation always runs in this order:

1. **Read the relevant feature spec** — the canonical baseline for the module.
2. **Read the relevant *approved* update specs** — only `approved` or `done` ones apply. Ignore anything
   still `proposed`.
3. **Read the relevant error specs** — so known defects in the area aren't reintroduced.
4. **Implement** against the union of the above.
5. **Verification gate** — do not mark `done` until the spec's Acceptance Criteria and Verification
   (automatic + manual) pass. Then fill in Verification Evidence and Resolution / Final State, and update
   the status here and in `progress-tracker.md` in the **same commit** as the code.

Authoring an update: copy `000-update-spec-template.md` → next `NNN-…`, fill it out, set `proposed`,
and wait for the owner to set `approved` before any code is written.

## 6. Scope discipline

- **One coherent change per spec.** Don't bundle unrelated improvements.
- **Split across boundaries** per `ai-workflow-rules.md` — if a change touches UI *and* schema, or
  auth/RLS *and* feature logic, it may need to be phased into verifiable increments.
- **State schema impact explicitly** (Section 6 of the template). Additive migrations only; never edit
  an applied migration.
- Enhancements go here; defects go to `error-specs/`. Keep the two kinds separate.
- If it can't be verified end to end quickly, it's too big — narrow it.

## 7. Source of truth

- `000-update-spec-template.md` is the **structural source of truth** for the *shape* of every update
  spec — new specs follow it exactly.
- The **feature spec + its `done` update specs** are the source of truth for the feature's current
  behavior.
- Each update spec's own **status header** is the source of truth for whether it may be implemented.
