# 015 — Goat-Themed Loading Indicator

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-015`                                                          |
| Title             | Lightweight, branded goat-themed loading spinner (SVG + CSS, no library) |
| Status            | `approved` — owner requested directly                             |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | cross-cutting — `02-auth-and-login`, `12-dashboard-analytics`, general app shell |
| Depends on        | `03` (app shell, done); complements but does **not** replace `UPD-011`'s dashboard skeletons |
| Schema impact     | none — pure front-end                                             |
| Created           | 2026-09                                                           |

---

## 1. Reason for update

The app currently has no branded loading state — plain shadcn `Skeleton` placeholders or nothing at all.
The owner wants something lightweight but distinctive: a simple goat-themed indicator, not a heavy
animation.

## 2. Current behavior

No dedicated loading component exists. Spec `02`'s login page was originally specified to show "a small
loading animation while authentication resolves" but that was never built with any specific design.
`UPD-011` built per-widget skeletons specifically for the dashboard's progressive rendering.

## 3. Desired behavior

A small, reusable **goat spinner** component: a simple stroke-based SVG goat silhouette with a lightweight
CSS transform animation (bounce/hop) — no animation library, no GIF, no heavy asset. Used for **route-level
and action-level loading**, not as a replacement for `UPD-011`'s fine-grained dashboard skeletons.

## 4. Scope (in and out)

**In scope**
- `components/loading/goat-spinner.tsx` — a small, size-variant, reusable component.
- A pure CSS keyframe animation (transform-only, GPU-cheap).
- Applying it to: the login page's loading state (`02`, previously unbuilt), Next.js route-level
  `loading.tsx` boundaries for the main pages (dashboard, goats, breeding, health, inventory), and the
  pending state of a representative set of primary save/submit buttons (using `useFormStatus`), built
  once as a shared pattern so extending it to more buttons later is trivial.

**Out of scope**
- Replacing or modifying `UPD-011`'s per-widget dashboard Suspense skeletons — those serve fast
  perceived-load specifically and should not be swapped for a full animated spinner, which would be
  visually noisy with several widgets loading independently. This spinner is for full-page/route
  transitions and single actions, not multiple simultaneous small loading regions.
- Rewiring every single button/form's pending state across the entire app in one pass — this spec
  establishes the shared component and applies it to a representative set of primary actions; extending
  it further is cheap follow-on work with the component already built, not required here.
- Any new npm dependency (no Lottie, no GIF/video asset, no animation library) — SVG + CSS only.

## 5. UX / interaction requirements

- **Component:** `<GoatSpinner size="sm" | "md" | "lg" label="Loading…" />`.
  - `sm` — inline, for button pending states (fits comfortably next to button text).
  - `md` — default, for a section/panel loading state.
  - `lg` — centered, for a full route-level loading screen.
- **Visual:** a simple, minimal, stroke-based goat silhouette (matching `ui-context.md`'s icon
  convention — stroke-based only, no filled shapes), rendered in the accent token color
  (`--accent-primary`), not a raw hex value.
- **Animation:** a subtle bounce/hop via CSS `transform: translateY(...)` keyframes, looping, ease-in-out,
  roughly 0.8–1s per cycle — playful but not distracting. Transform-only for performance (no layout
  properties animated).
- **Accessibility:** an `aria-label` (default "Loading…", overridable) so screen readers announce it
  sensibly; the animation should not rely on color alone to convey "loading" (motion + the label together
  are sufficient).
- **Where it's used:**
  - Login page (`02`) — the originally-specified but never-built loading animation during auth resolution.
  - `app/(app)/loading.tsx`-style route boundaries for the main top-level pages.
  - A representative set of primary save buttons (e.g. the goat form, a breeding form, a health record
    form) showing the `sm` variant during their pending state, alongside or replacing existing pending
    text/disabled styling.
- Respect `ui-context.md`'s dark theme and radius/spacing conventions throughout — this is a small,
  polished detail, not a new visual language.

## 6. Domain / data / API requirements

None — no schema, no server logic. Purely a new component plus a CSS keyframe definition (in
`app/globals.css` or wherever other custom `@utility`/keyframe rules already live, per the project's
existing token conventions) and its application at the call sites listed above.

`components/loading/` is the right home — **not** `components/ui/*`, since this is a custom, branded
component, not a foundation component from the shadcn CLI.

## 7. Safety and data integrity rules

None — presentational only, no data touched.

## 8. Acceptance criteria

- [ ] `GoatSpinner` renders correctly at all three sizes, in the accent color, with a smooth,
      transform-only animation.
- [ ] The login page shows it while authentication is resolving.
- [ ] At least the main top-level routes show it as their route-level loading state.
- [ ] At least a few primary save buttons show the `sm` variant during their pending state.
- [ ] `UPD-011`'s existing dashboard per-widget skeletons are unchanged — confirm no regression there.
- [ ] No new npm dependency was added for this.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow)** — sign out and back in, confirming the spinner shows during authentication;
navigate to a couple of main routes and confirm the route-level loading state uses it; submit a form with
the spinner wired to its button and confirm it appears during the pending state; reload the dashboard and
confirm its existing per-widget skeletons still look and behave exactly as before.

## 10. Related spec files

- Fulfils a previously-unbuilt part of: `context/feature-specs/02-auth-and-login.md`.
- Deliberately does not touch: `context/update-specs/011-dashboard-performance-and-app-shell.md`'s
  per-widget skeletons.

## 11. Implementation note

*(fill during/after build — note exactly which routes and which buttons ended up wired, so extending
coverage later is easy to pick up)*

## 12. Verification evidence

*(fill at the verification gate)*

## 13. Resolution / final state

*(fill when done)*

## 14. Open questions (resolve, don't guess)

- **Coverage beyond the representative set.** Should every form's submit button eventually use this, or
  only the primary/most-used ones? This spec builds the shared component so extending it is cheap either
  way — confirm if a full sweep is wanted as an immediate follow-on or left for later, as-needed.
  **Owner-confirmed 2026-09-21: representative set only, for now.** The goat form, breeding season form,
  and health record form stay the full set built in this pass; the shared `GoatSpinner` + `useFormStatus`
  pattern is proven in those three, so extending it to every remaining form (barns, weight, inventory,
  sales, breeding settings, delete dialogs, etc.) is left as cheap, low-risk follow-on work whenever it's
  wanted, not required now.
