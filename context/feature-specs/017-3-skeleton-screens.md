# Spec 17.3 — Skeleton Screens

**Phase:** 6 · **Spec:** 17 — Loading speed · **Status:** `in-progress` (started 2026-09-27)
**Depends on:** Spec 03 (app shell), Spec 12 (dashboard), 17.2 (query optimization)
**Recommended after:** 17.2 is verified, because 17.2 changes how pages fetch data and this spec wraps those fetches
**Followed by:** 17.4 Bundle size audit

---

## 1. Goal

Tapping anything in the app gives an **immediate visual response**. The app shell (sidebar/header) stays in place, and a skeleton shaped like the real page appears straight away. Real content then fills in without anything jumping around.

This does not make data arrive faster; 17.2 does that. It removes the "frozen" feeling between tapping and content appearing, which is the biggest remaining gap between the PWA and a native app during in-app navigation.

## 2. How it fits with 17.1 and 17.2

- **17.1 (service worker):** opening the app from the home screen shows the cached page directly. Skeletons do **not** appear on app open, only on in-app navigation.
- **17.2 (queries):** skeletons cover the time the optimized queries take. Show more (17.2 §5E) gets a small inline skeleton while the next records load.

## 3. Current state (agent must audit before coding)

The agent must report:
- Every route under `app/` and whether it already has a `loading.tsx`
- Any existing spinners, "Loading…" text, or loading states, and where they are
- Whether `components/ui/skeleton.tsx` (shadcn Skeleton) already exists
- The current structure of the dashboard page and goat detail page: which queries run where, and how 17.2 left them (`Promise.all`, `cache()` helpers)
- Where the app shell lives, to confirm skeletons will render inside it and not replace it

## 4. Scope

**In scope**
- A. Shared skeleton building blocks
- B. A `loading.tsx` for every authenticated route, shaped like that page
- C. Streaming the dashboard card by card with Suspense
- D. Streaming goat-detail tab content while the goat header shows immediately
- E. Inline skeleton rows for Show more
- F. Anti-flash delay and reduced-motion support

**Out of scope**
- Button press states and pending states on form submits (17.8 Tap feedback)
- Page transition animations (17.10)
- Error pages (`error.tsx`)
- Any change to queries beyond moving them into Suspense-wrapped components (C, D)
- Any database change

## 5. Design

### A. Shared building blocks
Create a small set of reusable skeleton pieces in `components/skeletons/`, all built on the shadcn `Skeleton`:

| Component | Mimics |
|---|---|
| `SkeletonCard` | Dashboard stat card (title line + large number) |
| `SkeletonChart` | Donut or bar chart card (title + fixed-height block) |
| `SkeletonListRow` | One row in a list (goat tag/name line + secondary line) |
| `SkeletonList` | N list rows (default 8) |
| `SkeletonGoatHeader` | Goat detail header area |
| `SkeletonTabs` | Tab bar + tab content rows |
| `SkeletonPageHeader` | Page title + action button |

Visual rules:
- Colors come from the desert dark theme tokens (muted surface), never hard-coded
- Rounded corners and card padding match the real components
- **Same size as real content.** Each skeleton matches the height and spacing of what replaces it, so nothing shifts when content arrives
- Gentle pulse animation

### B. Route-level `loading.tsx`
Every authenticated route segment gets a `loading.tsx` that composes the building blocks into the shape of that page: dashboard, goats list, goat detail, barns, health, breeding, inventory, and any other route found in the audit. Stub routes get a generic `SkeletonPageHeader` + `SkeletonList`.

`loading.tsx` files go at the route segment level, **never** in a position that would replace the app shell. The sidebar/header stays visible and usable during loading.

### C. Dashboard streaming
Split the dashboard into independent async sections, each wrapped in its own `<Suspense>` with the matching skeleton:
1. Herd totals cards
2. Donut charts
3. Newborn kids chart
4. Herd population timeline

The fastest section (herd totals) appears first instead of waiting for the slowest chart.

Rules:
- Each section keeps using the fetch helpers from 17.2, with `cache()` so nothing is fetched twice
- Sections still start their queries at the same time; splitting must not create a waterfall
- Herd totals must still exclude sold, deceased, and stolen goats (the counting logic is moved, not changed)
- If the dashboard's current structure makes this split risky, the agent must stop and show the user its plan first

### D. Goat detail streaming
The goat header (tag, name, age via `formatAge()`, status, barn) renders as soon as the goat row is loaded. The tab content area streams behind a `<Suspense>` with `SkeletonTabs`. The same rules as C apply.

### E. Show more skeleton
While the next page of records loads, 3 `SkeletonListRow`s appear below the existing list, and the Show more button is disabled. The existing records stay in place.

### F. Anti-flash and reduced motion
- **Anti-flash:** skeletons start invisible and fade in after about 150 ms (CSS `animation-delay`). If data arrives faster than that, no skeleton flickers on screen.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, the pulse is off and skeletons appear static.
- **Accessibility:** each skeleton region has `aria-busy="true"` and a visually hidden "Loading…" label.

## 6. Files

| File | Action |
|---|---|
| `components/ui/skeleton.tsx` | Use if present; if missing, add via shadcn CLI after asking the user |
| `components/skeletons/*` | Create (building blocks from §5A) |
| `app/**/loading.tsx` | Create one per authenticated route segment |
| Dashboard page + new section components | Restructure for Suspense (§5C) |
| Goat detail page + tab content component | Restructure for Suspense (§5D) |
| Shared Show more component (from 17.2) | Add loading rows (§5E) |
| Global CSS / Tailwind config | Fade-in delay + reduced-motion rule, only if not expressible in utility classes |

No new npm dependencies.

## 7. Dashboard steps (user)

None. No Supabase or Vercel changes.

## 8. Verification (installed PWA on iPhone)

Test on weak signal where possible (for example, at the barn), since that is where skeletons matter most.

| # | Test | Expected |
|---|---|---|
| V1 | `next build` passes with no type or lint errors | ✅ |
| V2 | Tap each item in the navigation | Shell stays; page-shaped skeleton appears straight away, then content |
| V3 | Watch content replace the skeleton on dashboard, goats list, goat detail | No visible jump or shift in layout |
| V4 | Dashboard on weak signal | Herd totals appear before the charts finish |
| V5 | Goat detail | Header shows first; tabs fill in after |
| V6 | Tap between pages quickly on good signal | No skeleton flicker on fast loads |
| V7 | Show more on a long history tab | 3 skeleton rows appear below; button disabled; existing records stay |
| V8 | iPhone Settings → Accessibility → Motion → Reduce Motion on | Skeletons appear without pulsing |
| V9 | Close the app fully and reopen from home screen | Cached page shows directly (17.1), no skeleton |
| V10 | Dashboard herd totals and charts | Same values as before this spec |
| V11 | Ages and goat links in streamed sections | Still via `formatAge()` and `goat-link` |

## 9. Risks

- **Waterfalls from splitting sections.** Moving queries into nested components can accidentally make them run one after another. Covered by §5C rules and V4.
- **Layout shift** if skeleton sizes don't match real content. Covered by the same-size rule and V3.
- **Herd totals** changing while their component is moved. Covered by §5C and V10.
- **Shell disappearing** if a `loading.tsx` sits too high in the route tree. Covered by §5B and V2.

## 10. Implementation Notes

_Implemented 2026-09-27. Status stays `in-progress` until the user confirms the Section 8 iPhone checks._

### Audit findings (§3)

**Routes and existing boundaries.** Twelve authenticated route segments under `app/(app)/`. Five already
had a `loading.tsx` (`/`, `/goats`, `/health`, `/inventory`, `/breeding`) and all five were byte-identical
`<RouteLoading />` — a centred `LoadingDots` from `UPD-015`, not shaped like any page. Seven had none:
`/goats/[id]`, `/barns`, `/breeding/settings`, `/breeding/top-performers`, `/breeding/doe-performance`,
`/sales`, `/weight`. `/login`, `/offline` and `/style-check` sit outside `(app)` and are out of scope.

**Shell.** `app/(app)/layout.tsx` renders `SidebarProvider` → `AppSidebar` + `TopBar` + `<main>`. Every
`loading.tsx` added by this spec sits at or below the `(app)` segment, so §5B's "shell stays visible" holds
by construction — the §9 risk of a boundary sitting too high does not arise. One gap worth recording: the
layout's own `await supabase.auth.getUser()` has no boundary above it, so a cold first request renders no
shell until auth resolves. In-app navigation never re-runs the layout, which is what this spec targets, so
it was left alone.

**Existing loading states.** `LoadingDots` (`UPD-015`) in the login button, three form submit buttons and
the "Show more" button; `DonutChartSkeleton` / `LineChartSkeleton` (`UPD-011`) as `next/dynamic` fallbacks
for the Recharts bundles; shadcn's unused `SidebarMenuSkeleton`; `ModulePlaceholder` on the three stub
routes.

**`components/ui/skeleton.tsx` exists** — plain shadcn, `animate-pulse rounded-md bg-muted`, where `--muted`
resolves to the desert token `--bg-subtle`. No shadcn CLI run and no new dependency were needed.

**Dashboard, as 17.2 left it.** One `Promise.all` of eight queries at the top of the page component, then a
second `Promise.all` of two (weights, health) that genuinely depends on the resolved goat ids. Only
`listInventoryItems()` was a `cache()`d 17.2 helper; the other seven were inline `supabase.from(...)` calls.
Critically, **the three `<Suspense>` boundaries already on the page were not data boundaries** — all data was
awaited before the JSX, and those boundaries only covered the `next/dynamic` chart bundles. So before this
spec V4 was impossible: nothing painted until the slowest of ten queries returned.

**Goat detail, as 17.2 left it.** Await the goat row → a ten-way `Promise.all` → then
`loadGoatBreedingTabData()` sequentially (it genuinely needs the health records).

### Three discrepancies raised with the user before coding, and how they were resolved

1. **§5C's "herd totals cards" do not exist.** The dashboard has no stat-card row; the herd numbers are
   rendered only inside the two donuts. Resolved with the user: treat the herd-composition donut section as
   §5C's section 1. It is the fastest section and it is where the herd totals live.
2. **§5C's "herd population timeline" is deactivated** behind `SHOW_HERD_GROWTH_SECTION = false`
   (`UPD-006` amendment). Resolved: leave it deactivated rather than stream a hidden section. The user asked
   for the dashboard experience to stay the same, so nothing was re-enabled and no values changed.
3. **Replacing the route-level dots.** The user's decision was explicit: **keep the dots whenever something
   is loading.** So `RouteLoading` is no longer wired to the boundaries, but every page-shaped skeleton
   carries a `LoadingDots` of its own — in `SkeletonPageHeader` beside the title placeholder, centred in the
   first dashboard card, in the goat-header skeleton, and in each tab-panel skeleton header. The dots are
   `aria-hidden` inside a skeleton, because the enclosing region already carries the one "Loading…" label.

### What was built

**§5A — shared building blocks, `components/skeletons/`**

| File | Exports |
|---|---|
| `skeleton-region.tsx` | `SkeletonRegion` (anti-flash + `aria-busy` + one hidden label), `SkeletonDots` |
| `skeleton-line.tsx` | `SkeletonLine` — a thin bar centred in the *real* line box, so nothing shifts |
| `skeleton-page-header.tsx` | `SkeletonPageHeader` (title + dots + action button) |
| `skeleton-card.tsx` | `SkeletonCard`, `SkeletonChart` (`donut` / `bar`) |
| `skeleton-list.tsx` | `SkeletonListRow`, `SkeletonList`, `DEFAULT_SKELETON_ROWS` |
| `skeleton-goat-header.tsx` | `SkeletonGoatHeader`, `SkeletonGoatHeaderActions` |
| `skeleton-tabs.tsx` | `SkeletonTabs`, `SkeletonTabPanel` |
| `skeleton-breeding-page.tsx` | `SkeletonBreedingPage` — the three Breeding tab routes' shared shape |
| `skeleton-module-placeholder.tsx` | `SkeletonModulePlaceholder` — the stub-route shape |

Every piece is built from the real `Card` / `CardHeader` / `CardContent` and the real row classes rather
than hand-rolled `div`s, so padding, radius and gaps cannot drift from what replaces them. Colors come only
from tokens (`bg-muted` → `--bg-subtle`); no hex, no raw Tailwind palette classes.

**§5B — a `loading.tsx` for all twelve authenticated routes.** The five generic ones were replaced with
page-shaped versions; seven were added. Each is a `SkeletonRegion` with a route-specific hidden label.
Sizing was taken from the real components, not guessed — for example the goats filter row uses `h-8` and
`rounded-lg` (the real `Input` / `SelectTrigger` heights) and stacks at the same `lg:` breakpoint, and the
inventory header carries no action placeholder because that page has no action beside its title. The three
Breeding routes render the real `BreedingTabs` rather than a placeholder: it needs no data and it is
route-backed, so the tapped tab is already highlighted while the page loads.

**§5C — dashboard streaming.** `app/(app)/page.tsx` now awaits nothing but its own search params and is pure
composition. New `lib/dashboard/queries.ts` holds the seven previously-inline reads as `cache()`d helpers,
plus `loadHerdComposition()` and `resolveBarnView()`; `lib/dashboard/breeding-panel.ts` holds the assembly
the two breeding cards share. Seven new async sections live in `components/dashboard/sections/`.

- **No waterfall.** The sections are siblings, so React renders them in one pass and every query starts at
  the same moment `Promise.all` started them. The only two-step dependency (goat ids → weights) is isolated
  inside the weight-growth section, where before it delayed the entire page.
- **Herd totals are moved, not changed.** `computeHerdComposition` is called in exactly one place now
  (`loadHerdComposition`, `cache()`d), and both donuts plus the CSV export read that one call — so the
  sold/deceased/stolen exclusion is byte-identical and the two donuts cannot disagree (V10).
- **Top bar.** One `TopBarSlot` with a nested `<Suspense fallback={null}>` inside it: the barn filter needs
  only the barn list and appears at once, the CSV button waits for composition + herd size. Two sibling
  slots would both portal into the same header node and whichever resolved first would land on the left, so
  nesting was necessary to keep the filter-then-export order.
- The deactivated Herd growth card moved to `herd-growth-section.tsx`, flag and comment intact, and now owns
  its own data — so while it is off the dashboard no longer computes a timeline it does not render.

**§5D — goat detail.** The page awaits only the goat row, which is enough for the entire header including
`formatAge()`. Streaming separately: the header's action cluster (it needs the whole herd for the parent
pickers, the barn list and the cause-of-death presets — so it gets a button-shaped skeleton rather than
holding the header back), the barn move history, and each of the four tab panels. The `TabsList` is static
and paints with the header, so tabs are tappable while their contents arrive. Six new sections in
`components/goats/sections/`.

`listHealthRecordsFirstPageByGoat` was added to `lib/health/queries.ts` as a `cache()`d wrapper: the split
gave the first page of health records two independent consumers (the Health tab renders it, the Breeding tab
derives a doe's kidding history from it), and without the wrapper that query would run twice per render.
This is §5C's "keep using 17.2's helpers, with `cache()` so nothing is fetched twice" applied literally.
`GoatFormGoat` is now exported from `goat-form-dialog.tsx` so the streamed action cluster can name the exact
column set it forwards.

**§5E — Show more.** Three `SkeletonListRow`s now render above the button while a page loads, in the same
`ul` / `gap-3` shape the real lists use. Existing records are untouched. The button was already
`disabled={pending}` and already showed `LoadingDots`; `aria-busy` was added to the container. Three rows
rather than a full page of twenty, so the button stays on a phone screen.

**§5F — anti-flash, reduced motion, accessibility.** In `app/globals.css`: a `skeleton-fade` utility
(`opacity: 0`, then a 150 ms-delayed fade) and an `animate-skeleton-pulse` utility, each carrying its own
nested `prefers-reduced-motion: reduce` override, plus a rule stilling `UPD-015`'s `animate-dot-pulse`.
`components/ui/skeleton.tsx` was pointed at `animate-skeleton-pulse` instead of Tailwind's `animate-pulse`
— changed on the base component so every placeholder in the app honours the preference with no way to
forget one. Under reduced motion the 150 ms delay is kept (it is a timing decision, not a motion effect) and
only the fade and the pulse are dropped.

`aria-busy` and the fade are applied **on the card / panel element itself**, not on a wrapper. A wrapping
`div` around a `<Suspense fallback>` would have become the grid item and broken the `lg:col-span-2` cards it
was standing in for. Route-level skeletons carry one hidden "Loading…" label for the whole page via
`SkeletonRegion`; in-page fallbacks take an explicit `label` prop so a streaming card announces itself
without the route skeleton repeating a label per card.

### Verification done here

- `npm run build` passes (Next 16.3.2, Turbopack): compile, TypeScript and all 21 static pages clean.
- `npx tsc --noEmit` clean.
- `npm run lint` at the exact prior baseline — the same 6 problems (5 `_prevState` warnings, 1 pre-existing
  `react-hooks/set-state-in-effect` error in shadcn's `hooks/use-mobile.ts`), none in any file touched here.
- `git diff package.json package-lock.json` empty — **no new dependencies**, and no database change.
- §5F was checked against the *compiled* CSS rather than assumed: the production stylesheet contains
  `.skeleton-fade{opacity:0;animation:.15s ease-out .15s forwards skeleton-fade-in}`,
  `.animate-skeleton-pulse{animation:1.8s cubic-bezier(.4,0,.6,1) infinite skeleton-pulse}`, and
  `@media (prefers-reduced-motion:reduce)` overrides for both plus `animate-dot-pulse` — the last emitted
  after (and outside the layer of) the utility it overrides, so it actually wins the cascade.

**Not verified here:** every check in Section 8 that needs a signed-in session — V2–V8, V10 and V11 — plus
all weak-signal behaviour. There are no owner credentials in this environment, so the authenticated routes
cannot be exercised. Those are the user's hands-on tests and the reason this spec stays `in-progress`.

### Deviations from the spec text

- §5C section 1 ("herd totals cards") is realised as the herd-composition donut section, and section 4
  ("herd population timeline") is skipped — both per the user's decisions recorded above.
- `components/loading/route-loading.tsx` is now unreferenced. It was kept, with its docstring updated to say
  so, rather than deleted: it remains the right treatment for a full-page wait with no predictable layout,
  and removing an owner-approved component as a side effect of this spec would be out of scope. It should be
  flagged for deletion if nothing adopts it.
- `UPD-011`'s `DonutChartSkeleton` / `LineChartSkeleton` were kept in place and their geometry reproduced in
  `SkeletonChart` rather than being replaced. They cover the wait for the Recharts *bundle*, which is a
  different wait from the data wait this spec covers; both boundaries are needed and both are now present.

