# 015 — Loading Indicator (three-dot pulse)

> **Naming note (2026-09-21):** this spec started as a goat-themed indicator (a hand-drawn SVG silhouette,
> then the 🐐 emoji) and ended, at the owner's final decision, as a plain three-dot pulse with no animal
> theme at all. The file is still named `015-goat-loading-spinner.md` and the ID is still `UPD-015` for
> continuity with existing cross-references (roadmap, progress tracker, commit history) — per this
> project's convention of never renumbering/renaming shipped spec files — but nothing about the shipped
> component is goat-themed. See the two dated Amendments below (after Section 10) for the full history.

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-015`                                                          |
| Title             | Lightweight loading indicator — three-dot pulse (CSS only, no library, no animal theme) |
| Status            | `in progress` — reopened 2026-09-21 (second time) for the goat-theme-drop amendment, awaiting the owner's re-test |
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

**Final (2026-09-21, second amendment):** a small, reusable **`LoadingDots`** component — three small dots
in the accent token color, pulsing in a staggered loop — no animation library, no GIF, no custom artwork of
any kind. Used for **route-level and action-level loading**, not as a replacement for `UPD-011`'s
fine-grained dashboard skeletons.

*(Superseded history, kept for context: this spec originally called for a hand-drawn SVG goat silhouette,
then the 🐐 emoji — see the Amendments after Section 10.)*

## 4. Scope (in and out)

**In scope**
- `components/loading/loading-dots.tsx` (renamed 2026-09-21 from `goat-spinner.tsx`, see the second
  Amendment) — a small, size-variant, reusable component.
- A pure CSS keyframe animation (transform/opacity-only, GPU-cheap).
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

- **Component:** `<LoadingDots size="sm" | "md" | "lg" label="Loading…" />` (renamed 2026-09-21 from
  `GoatSpinner`, see the second Amendment after Section 10).
  - `sm` — inline, for button pending states (fits comfortably next to button text).
  - `md` — default, for a section/panel loading state.
  - `lg` — centered, for a full route-level loading screen.
- **Visual (final, 2026-09-21):** three small dots, `rounded-full`, rendered in the accent token color
  (`--accent-primary`, via `text-*` + `bg-current` so a call site can still override the color the same way
  the original SVG build did). No animal artwork of any kind — this supersedes both the original stroke-based
  SVG silhouette and the intermediate 🐐 emoji (see both Amendments after Section 10).
- **Animation:** each dot scales and fades in a loop (`transform: scale(...)` + `opacity`, both
  compositor-only properties — no layout property animated), on the same `ease-in-out`, roughly 0.8–1s cycle
  as the original spec called for. The three dots are staggered via `animation-delay` (0ms / 150ms / 300ms)
  so they pulse in sequence rather than in unison — the classic "three-dot" loading look.
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

- [x] `LoadingDots` renders correctly at all three sizes, in the accent token color, with a smooth,
      staggered, transform/opacity-only pulse animation (final design, 2026-09-21 — see both Amendments
      after Section 10 for the SVG → emoji → three-dot history).
- [x] The login page shows it while authentication is resolving.
- [x] At least the main top-level routes show it as their route-level loading state.
- [x] At least a few primary save buttons show the `sm` variant during their pending state.
- [x] `UPD-011`'s existing dashboard per-widget skeletons are unchanged — confirm no regression there.
- [x] No new npm dependency was added for this.

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

### Amendment — 2026-09-21 (owner request — replace the hand-drawn SVG with the 🐐 emoji)

The owner tested the original build (Section 12's first round) and confirmed everything about the
component's behavior worked, but felt the hand-drawn stroke-based SVG goat silhouette (Section 5's original
"Visual" requirement) didn't read well as a goat. Rather than iterate on the artwork, the owner asked to
drop custom SVG entirely and render the real `🐐` Unicode emoji character as the spinner's content instead.
This **supersedes** Section 5's "stroke-based SVG silhouette... rendered in the accent token color" language
and Section 8's first acceptance criterion's "in the accent color" clause — the emoji is a fixed-color glyph,
not recolorable via CSS `currentColor`/tokens, which is an accepted trade-off of using the real character.
Everything else from the original build is unchanged: the same `animate-goat-bounce` keyframe (transform-only
`translateY`, 0.9s ease-in-out, infinite), the same `role="status"` + `aria-label` accessibility pattern, the
same size-variant API (`sm`/`md`/`lg`, now scaled via `font-size` instead of an SVG `viewBox`/`h-*`/`w-*`),
and the same application sites (login button, the five route `loading.tsx` files, the three wired form
buttons). No npm dependency, no asset file — if anything this simplified the component (see Section 11). The
contrast fix from the original build (an explicit `text-primary-foreground` override at each button call
site, because the SVG's `currentColor` stroke matched the default button's own tan background) is no longer
needed and was removed — emoji glyphs render in their own fixed colors regardless of surrounding text color,
so they contrast correctly against both the tan buttons and the dark route/login backgrounds with no override.

### Amendment — 2026-09-21, second amendment same day (owner's final decision — drop the goat theme entirely, three-dot pulse)

The owner's final call: no animal theme at all, in any form (SVG or emoji). Replace the indicator with a
classic three-dot pulse — clean and simple. This **fully supersedes** both the original SVG design and the
🐐-emoji amendment above; nothing goat-related survives in the shipped component. Concretely:
- `components/loading/goat-spinner.tsx` → renamed to `components/loading/loading-dots.tsx`
  (`git mv`, history preserved); the exported component is renamed `GoatSpinner` → `LoadingDots`
  (`GoatSpinnerSize` → `LoadingDotsSize`). Every import across the codebase updated to match (`app/login/page.tsx`,
  `components/goats/goat-form-dialog.tsx`, `components/breeding/season-form-dialog.tsx`,
  `components/health/health-record-form-dialog.tsx`, `components/loading/route-loading.tsx`).
- The emoji content is gone; three `rounded-full` dot `span`s render instead, sized via the same
  `sm`/`md`/`lg` API (now `h-1 w-1` / `h-1.5 w-1.5` / `h-3 w-3` per dot, with a matching `gap-*` between
  them), colored via `bg-current` so the outer wrapper's `text-*` class controls them (defaults to
  `text-brand`, same override mechanism as the original SVG build).
- `app/globals.css`: `@keyframes goat-bounce` / `@utility animate-goat-bounce` replaced with
  `@keyframes dot-pulse` / `@utility animate-dot-pulse` — `transform: scale(...)` + `opacity`
  (0.6/0.4 → 1/1 → 0.6/0.4 across the cycle), 1s `ease-in-out infinite`, no `translateY` since there's no
  single shape to bounce anymore. Each dot gets an inline `style={{ animationDelay: '0ms' | '150ms' | '300ms' }}`
  for the staggered "three-dot" look — verified via computed style (see Section 12).
- **The same contrast bug as the original SVG build resurfaced and was fixed the same way:** `bg-current`
  dots default to the accent-tan color, which is invisible against the default `Button`'s own tan
  background — so the `className="text-primary-foreground"` override at all 4 button call sites (removed by
  the emoji amendment, since emoji glyphs don't take a CSS color) had to be **reinstated**. Standalone
  (route-level, unbuttoned) usages keep the default `text-brand`.
- No npm dependency, no asset file, at any point across all three design rounds.

## 11. Implementation note

**Component (current — final, three-dot design):** `components/loading/loading-dots.tsx` (`LoadingDots`,
renamed from `goat-spinner.tsx`/`GoatSpinner` via `git mv`) renders three `rounded-full bg-current` dot
`span`s inside a `role="status"` / `aria-label` outer `span` (the accessible name; each dot carries
`aria-hidden="true"` so screen readers announce only the label). Sizes `sm`/`md`/`lg` map to a per-dot size
class (`h-1 w-1` / `h-1.5 w-1.5` / `h-3 w-3`) plus a matching `gap-*` between dots (`gap-0.5` / `gap-1` /
`gap-1.5`). Each dot gets `className="animate-dot-pulse"` plus an inline
`style={{ animationDelay: '0ms' | '150ms' | '300ms' }}` (from a `DELAYS_MS = [0, 150, 300]` constant mapped
over) so the three dots pulse in a staggered sequence rather than in unison. Default color is `text-brand`
on the outer wrapper, inherited by each dot via `bg-current` — the same override mechanism the original SVG
build used. `components/loading/route-loading.tsx` (`RouteLoading` — the shared centered full-page wrapper
used by every route `loading.tsx` below) needed one line changed: its `<GoatSpinner size="lg" />` call
became `<LoadingDots size="lg" />`.

**CSS (`app/globals.css`):** `@keyframes goat-bounce` / `@utility animate-goat-bounce` replaced with
`@keyframes dot-pulse` / `@utility animate-dot-pulse` — `transform: scale(0.6)` + `opacity: 0.4` at the
resting keyframes, `scale(1)` + `opacity: 1` at the 40% keyframe, `1s ease-in-out infinite`. Transform
(`scale`) + `opacity` only — both compositor-only properties, no layout property animated, same GPU-cheap
approach as the original `translateY` bounce.

**What changed vs. the emoji build:** the `🐐` text content is gone; three dot elements render instead. The
`text-primary-foreground` contrast override at the 4 button call sites, removed by the emoji amendment, had
to be **reinstated** — see the second Amendment above for why (the dots use `bg-current`, so they have the
same tan-on-tan invisibility risk the original SVG had, and the emoji's "no override needed" claim no
longer applies).

**Routes wired** (unchanged across all three design rounds, all via `RouteLoading`, `lg` size):
- `app/(app)/loading.tsx` — the dashboard / root of the authenticated app.
- `app/(app)/goats/loading.tsx`
- `app/(app)/breeding/loading.tsx`
- `app/(app)/health/loading.tsx`
- `app/(app)/inventory/loading.tsx`

**Buttons wired** (unchanged across all three design rounds, all `sm` size, inside each file's existing
`useFormStatus`-driven `SubmitButton`):
- `app/login/page.tsx` — the sign-in button (fulfils `02`'s originally-specified, never-built
  auth-loading animation).
- `components/goats/goat-form-dialog.tsx` — the goat add/edit wizard's save button.
- `components/breeding/season-form-dialog.tsx` — the breeding season save button.
- `components/health/health-record-form-dialog.tsx` — the health record save button.

Each of the 4 call sites above currently reads
`<LoadingDots size="sm" label="…" className="text-primary-foreground" />` — the contrast override is back
(see "What changed" above).

**Not wired (per Section 14, owner-confirmed 2026-09-21, unchanged by either amendment):** every other
form's submit button (barns, weight, inventory, sales, breeding settings, delete-confirmation dialogs,
etc.) — left as cheap follow-on work using the same `LoadingDots size="sm" className="text-primary-foreground"`
+ `useFormStatus` pattern whenever wanted, not required now.

## 12. Verification evidence

**Automatic** — `npm run build` and `npx tsc --noEmit` both clean; `npm run lint` showed only the
pre-existing baseline issues (5 `_prevState`/`_prev` unused-arg warnings, 1 `use-mobile.ts` error), nothing
new. `package.json` / `package-lock.json` diff was empty — no new npm dependency.

**Agent's own browser check (before the owner's test):** no dashboard file or component was touched
(confirmed via `git status`), so `UPD-011`'s per-widget skeletons were unchanged by construction, not just
by inspection. A headless-browser run against the real dev server submitted the login form with invalid
credentials (the real Supabase auth action ran and returned "Incorrect email or password") and captured the
pending state — confirmed the spinner rendered legibly inside the button after the contrast fix above, and
that `md`/`lg` render as a recognizable goat silhouette on the dark background. The authenticated routes and
the three in-app forms could not be exercised this way (no owner credentials available), so that coverage
was always deferred to the owner's own test, per standing project practice.

**Owner's hands-on test — 2026-09-21 (first round): confirmed working.** Signed out and back in, navigated
the main routes, and submitted a wired form; the dashboard's per-widget skeletons render unchanged. One
piece of feedback: the goat silhouette itself doesn't read well / isn't a good likeness — owner explicitly
asked to ship as-is and revisit the artwork later rather than block on it now (see Section 15, then the
Amendment above for the actual fix).

**Agent's own browser check — 2026-09-21 (emoji-swap amendment round):** `npm run build` + `npx tsc --noEmit`
clean; `npm run lint` at the same pre-existing baseline, nothing new; `package.json`/`package-lock.json`
diff empty. `git status` showed only the 4 wiring files + the component itself changed — no dashboard file,
no `globals.css` change (the keyframe is untouched by this amendment), no route `loading.tsx` file changed
(they still just render `<RouteLoading>`, whose own code didn't need to change). A headless-browser run
against the real dev server repeated the invalid-credentials login submission from the first round and
confirmed: the button's pending state now shows the `🐐` glyph directly next to "Signing in..." with clear
contrast against the tan button (no override needed); a computed-style check confirmed
`animationName: goat-bounce`, `animationDuration: 0.9s`, `animationTimingFunction: ease-in-out`,
`animationIterationCount: infinite`, `fontSize: 16px` (the `sm` variant), and `aria-label: "Signing in…"` all
still exactly as before. All three sizes were also visually checked together (temporarily previewed on the
login page's own unauthenticated route, then reverted) — `sm`/`md`/`lg` all render the emoji at clearly
distinct, correctly scaled sizes. The authenticated routes and the three in-app forms could not be
re-exercised live (no owner credentials, same limitation as the first round) — that recheck is, again, for
the owner's own test.

**Agent's own browser check — 2026-09-21 (second amendment round, three-dot pulse):** `npm run build` +
`npx tsc --noEmit` clean; `npm run lint` at the same pre-existing baseline, nothing new;
`package.json`/`package-lock.json` diff empty. `git status` (via `git mv` for the rename) showed the
expected scope: the renamed component, the 4 wiring files, `route-loading.tsx`, and `app/globals.css` — no
dashboard file, no route `loading.tsx` file changed (they still just render `<RouteLoading>`). A
`grep -rln "GoatSpinner\|goat-spinner\|goat-bounce"` across `*.tsx`/`*.ts`/`*.css` confirmed zero remaining
code references (only a stale `.next` build artifact matched, which regenerates). Headless-browser re-run
of the invalid-credentials login submission caught the pending button state and screenshotted the three dots
mid-pulse — **first pass showed them invisible** (same tan-on-tan bug as the original SVG build, since
`bg-current` dots default to the accent-tan color that matches the button's own background); fixed by
reinstating `className="text-primary-foreground"` at all 4 call sites, rebuilt, and re-screenshotted —
dots now clearly visible with the staggered pulse caught mid-animation. All three sizes were visually
compared together (temporary, reverted preview on the login page) and read as clean, distinct dot groups on
the dark background. A `getComputedStyle` check across all three size groups' dots confirmed: `animationName:
dot-pulse`, `animationDuration: 1s`, `animationTimingFunction: ease-in-out`, `animationIterationCount: infinite`,
and `animationDelay` exactly `0s` / `0.15s` / `0.3s` across dots 1/2/3 in every size group, with the shared
`role="status"` / `aria-label="Loading…"` intact on each group. Authenticated routes and the three in-app
forms could not be re-exercised live (no owner credentials, same limitation as both prior rounds).

**Owner's hands-on test — pending for this amendment.** Not yet re-confirmed by the owner; `UPD-015` stays
`in progress` until they do.

## 13. Resolution / final state

**In progress — final design (three-dot pulse) build complete, awaiting the owner's re-test.** The public
`size`/`label`/`className` API is unchanged across all three design rounds; the component itself was renamed
`GoatSpinner` → `LoadingDots` (file `goat-spinner.tsx` → `loading-dots.tsx`) and its internal rendering
changed from a hand-drawn SVG → the 🐐 emoji → three pulsing dots, per the two Amendments above. Follow-ups:
1. ~~Redraw the goat silhouette~~ — **superseded, not just resolved**: there is no goat theme left to redraw
   or maintain. The owner's final decision dropped animal artwork entirely (Section 15).
2. Extending `LoadingDots` to the remaining forms' submit buttons (Section 14, owner-confirmed: not now) —
   still deferred, unaffected by either amendment.

## 14. Open questions (resolve, don't guess)

- **Coverage beyond the representative set.** Should every form's submit button eventually use this, or
  only the primary/most-used ones? This spec builds the shared component so extending it is cheap either
  way — confirm if a full sweep is wanted as an immediate follow-on or left for later, as-needed.
  **Owner-confirmed 2026-09-21: representative set only, for now.** The goat form, breeding season form,
  and health record form stay the full set built in this pass; the shared `LoadingDots` + `useFormStatus`
  pattern is proven in those three, so extending it to every remaining form (barns, weight, inventory,
  sales, breeding settings, delete dialogs, etc.) is left as cheap, low-risk follow-on work whenever it's
  wanted, not required now.

## 15. Follow-up — goat silhouette redesign (superseded — the entire theme was dropped)

During the owner's first hands-on test (2026-09-21), the spinner's motion, sizing, placement, and color all
worked as intended, but the owner felt the goat silhouette itself doesn't read well / isn't a convincing
goat likeness. The owner explicitly chose to ship `UPD-015` as `done` rather than hold it up on artwork,
flagging a redraw as a later follow-up.

**First fix attempt (2026-09-21, same day):** instead of redrawing the SVG, the owner asked to drop custom
artwork and use the real `🐐` Unicode emoji character as the spinner's content — see the first Amendment
after Section 10.

**Final decision (2026-09-21, same day, second round):** on reflection the owner decided to drop the goat
theme entirely — no SVG, no emoji, nothing animal-themed — in favor of a classic three-dot pulse. This is
the shipped design; see the second Amendment after Section 10 and Section 11 for the implementation.
Nothing about "getting the goat right" remains open — there's no goat left in the component. Awaiting the
owner's re-test before flipping `UPD-015` back to `done`.
