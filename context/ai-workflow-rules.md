# Development Workflow

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state of progress. Always implement against these specs — do not infer or invent behavior from scratch.

The owner is non-technical and often works from a phone. After each unit, explain in plain language what was built and how to check it in the app, and keep each increment small enough to verify by clicking through the running app.

## Implementation Workflow

Before writing code for any unit, read the specs that govern it — in this order — and implement against their union:

1. **Feature spec** (`context/feature-specs/`) — the canonical baseline for the module.
2. **Approved update specs** (`context/update-specs/`) — approved changes layered on that feature. Only specs marked `approved` or `done` apply; never implement one still marked `proposed`.
3. **Error specs** (`context/error-specs/`) — known defects in the area and their fixes, so nothing already fixed is reintroduced and open bugs are accounted for.
4. **Implement** the unit against all of the above.
5. **Verification gate** — do not mark the unit done until its acceptance criteria and verification (automatic + manual) pass. Then record the verification evidence and set the status — in the governing spec and in `progress-tracker.md` — in the same commit as the code.

Update specs capture approved enhancements to already-built features; error specs capture defects and their resolutions. A deliberate change is an update spec; a bug is an error spec. If an update uncovers a bug, file an error spec; if a bug fix needs a design change, file an update spec. Each folder's `README.md` and `000-*-template.md` define its statuses and structure and are the source of truth for the shape of new specs.

## Form Length Standard

Before shipping any form (a new one, or adding fields to an existing one), check it against the **Forms — Length & Multi-Step Standard** in `ui-context.md`. This is a standing rule, not a per-feature judgment call:

- Count the fields/controls the form will show. If it exceeds the threshold, or a natural sub-topic (e.g. an optional related-record picker) can be deferred, split into a multi-step wizard using the reusable pattern in `components/forms/` — do not ship a single long scrolling form and plan to fix it later.
- Check this **at phone width specifically** — a form that looks fine on a wide desktop screen can still fail this standard on an iPhone. Verifying only on desktop is not sufficient.
- This check happens *before* the verification gate, not after — catching it during layout is far cheaper than reworking a shipped form.
- If a feature spec's original field list makes a wizard likely, say so in the spec up front rather than discovering it mid-build.

## Scoping Rules

- Work on one feature unit or subsystem at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When To Split Work

Split an implementation step if it combines:

- UI changes and database schema / migration changes
- Auth or row-level-security policy changes and feature logic
- Multiple unrelated modules or routes
- Behavior that is not clearly defined in the context files

If a change cannot be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the context files.
- Do not build features listed under "Out of Scope" or "Planned for Later" in `project-overview.md` until they are explicitly moved into scope.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.

## Database And Security

- All schema changes go through Supabase migrations in `supabase/`, so the database can be rebuilt from version control — do not make ad-hoc changes that aren't captured as migrations.
- Every new table has row-level security enabled with an owner policy (`auth.uid()`) before any feature reads from or writes to it.
- The service-role key stays server-only; the browser uses only the anon key.

## Protected Foundation Components

Do not modify generated third-party foundation components unless explicitly instructed.

This includes:

- `components/ui/*` (shadcn/ui components)
- third-party library internals

These should remain default and reusable.

Project-specific styling, layout changes, and feature logic must be implemented in app-level components instead of modifying foundation components.

Only modify these files when a task explicitly requires it.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

Progress state must reflect the actual state of the implementation, not the intended state.

When a feature is changed under an update spec, or a bug fixed under an error spec, keep that spec's status and its Verification Evidence / Resolution current — in the same commit as the code. The `context/update-specs/` and `context/error-specs/` folders track reality, not intent.

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope.
2. Any new table has row-level security enabled with an owner policy.
3. No invariant defined in `architecture-context.md` was violated.
4. `progress-tracker.md` reflects the completed work.
5. Every governing spec's status is current: any update spec is `done` and any error spec is `resolved`, each with its Verification Evidence recorded and its verification gate passed.
6. Any form built or extended in this unit meets the Form Length Standard, checked at phone width — no single long scrolling form shipped where a multi-step wizard was called for.
