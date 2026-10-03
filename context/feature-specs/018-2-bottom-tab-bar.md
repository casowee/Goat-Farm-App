# Spec 18.2 — Bottom Tab Bar (Floating Glass)

**Phase:** 6 · **Spec:** 18 — Native feel · **Status:** `in progress`
**Depends on:** Spec 03 (app shell), 18.1 (instant tap feedback)

---

## 1. Goal

On iPhone, the main sections of the app are **one thumb-tap away** from a floating, frosted-glass tab bar at the bottom of the screen, in the style of iOS 26 apps. On desktop, nothing changes.

## 2. Decisions

- **Mobile only.** The bar shows only below the same breakpoint the app shell already uses to switch the sidebar into a drawer (shadcn sidebar's mobile breakpoint). Desktop keeps the current sidebar and gets no bar.
- **Icons only, no labels.** Each tab has an accessible name for screen readers, but nothing is shown visually.
- **Five slots:**

| Slot | Section | Icon (proposal, user approves) |
|---|---|---|
| 1 | Dashboard | `LayoutDashboard` (lucide) |
| 2 | Goat Records | Custom goat-head icon (see §4D) |
| 3 | Health | `HeartPulse` (lucide) |
| 4 | Breeding History | `Baby` (lucide) |
| 5 | *Reserved, empty for now* | none |

- **Slot 5 is an empty, non-tappable space.** The other four icons keep their final positions, so adding slot 5 later is a one-line config change with no visual reshuffle.
- **The sidebar drawer stays reachable on mobile** through the existing header menu button, for every page not in the bar (barns, inventory, sales, settings, etc.).
- **Safari-compatible glass.** Frosted blur, translucency, light edge, and shadow all work in Safari. True Liquid Glass light-bending (refraction) does not work in Safari, so it is not attempted.

## 3. Audit (agent, before any change)

The agent must report:
- The real route paths for Dashboard, Goat Records, Health, and Breeding History
- The mobile breakpoint and `useIsMobile` (or equivalent) used by the app shell
- How the mobile header and its drawer menu button work today
- Anything fixed to the bottom of the screen on mobile today (toasts, floating buttons, sticky save bars, the Show more button)
- Whether `lucide-react` is installed (expected, via shadcn)

## 4. Design

### A. Shape and position
- Floating pill: `position: fixed`, centered, side margins of about 16 px, max width about 400 px
- Height about 64 px, fully rounded ends
- Sits above the home indicator: `bottom: calc(env(safe-area-inset-bottom, 0px) + 8px)`
- Above page content, below dialogs, sheets, and the drawer (z-index set accordingly)

### B. Glass material (Safari-safe)
- Translucent background built from the desert theme's surface token at roughly 55–65% opacity
- `backdrop-filter: blur(20px) saturate(180%)` **and** `-webkit-backdrop-filter` with the same values
- 1 px border in white at about 12% opacity
- Inner top highlight: `box-shadow: inset 0 1px 0 rgba(255,255,255,0.15)` combined with a soft outer shadow (about `0 8px 32px rgba(0,0,0,0.35)`)
- **Fallback:** under `@supports not (backdrop-filter: blur(1px))` *and* without the `-webkit-` version, use a solid theme surface instead
- All colors come from theme tokens; the rgba highlight and shadow values above are the only exceptions

### C. Tabs and active state
- Icons 24 px, each tap area at least 44 × 44 px (Apple's minimum)
- Inactive icons use the muted foreground token; the active icon uses the desert accent token
- **Active bubble:** a smaller rounded glass bubble sits behind the active icon, slightly lighter than the bar. When the tab changes, it **slides** to the new tab (transform, about 250 ms, with a gentle spring-like easing). This is the "liquid" motion.
- **Reduced motion:** the bubble jumps instead of sliding
- Pressed state uses the `tappable` behavior from 18.1
- Active tab is determined by path prefix, so a goat's detail page (e.g. `/goats/[id]`) highlights Goat Records
- **Tapping the active tab** scrolls the page back to the top, matching native iOS behavior

### D. Goat icon
Lucide has no goat icon. The agent creates `components/icons/goat-icon.tsx`: a simple goat-head outline drawn to match lucide's style (24 × 24 viewBox, 2 px stroke, round caps and joins, `currentColor`). The agent shows it to the user for approval before using it.

### E. Coexisting with the rest of the app
- **Page content** gets bottom padding on mobile equal to bar height + safe-area inset + spacing, so the last row, the Show more button, and save buttons are never hidden behind the bar
- **Toasts and any bottom-fixed elements** found in the audit are moved up on mobile so they appear above the bar
- **Keyboard open:** while a text input, textarea, or select has focus, the bar hides (fades out) so it doesn't float above the iPhone keyboard. It returns when focus leaves.
- **Hidden on:** login/auth pages and the `/offline` page

### F. Accessibility
- `<nav aria-label="Main">`
- Each tab is a link with `aria-label` ("Dashboard", "Goat Records", "Health", "Breeding History")
- Active tab has `aria-current="page"`
- Slot 5 is `aria-hidden="true"` and not focusable

## 5. Files

| File | Action |
|---|---|
| `components/nav/bottom-tab-bar.tsx` | Create (client component) |
| `components/nav/tab-config.ts` | Create; the five slots, so slot 5 is a one-line change later |
| `components/icons/goat-icon.tsx` | Create (after user approval) |
| App shell layout | Mount the bar once; add mobile bottom padding |
| Global CSS | Glass material, fallback, reduced motion |
| Toaster / bottom-fixed elements from audit | Mobile offset only |

No new npm dependencies. No database changes. No data fetching in the bar.

## 6. Dashboard steps (user)

None.

## 7. Verification (installed PWA on iPhone, plus a desktop browser)

| # | Test | Expected |
|---|---|---|
| V1 | `npm run build` passes | ✅ |
| V2 | Open on desktop | No tab bar; sidebar unchanged |
| V3 | Open on iPhone | Floating glass pill above the home indicator; 4 icons + empty 5th slot |
| V4 | Scroll a long list | Content shows blurred through the bar |
| V5 | Tap each tab | Correct page; bubble slides to the new tab |
| V6 | Open a goat's detail page | Goat Records tab is active |
| V7 | Tap the active tab while scrolled down | Scrolls to top |
| V8 | Scroll to the bottom of a long page | Last item, Show more, and save buttons fully visible above the bar |
| V9 | Save something | Toast appears above the bar |
| V10 | Tap into a form field | Bar hides while the keyboard is open; returns afterwards |
| V11 | Open the header menu on iPhone | Drawer works; barns, inventory, etc. still reachable |
| V12 | Open a dialog or sheet | It covers the bar |
| V13 | Login page and offline page | No bar |
| V14 | Reduce Motion on | Bubble jumps instead of sliding |
| V15 | VoiceOver on the bar | Each tab announced by name; slot 5 skipped |

## 8. Implementation Notes

Built 2026-10-03. Status stays `in progress` until the user confirms the iPhone and desktop checks in §7.

**Route paths.** Dashboard `/` (exact match), Goat Records `/goats`, Health `/health`, Breeding History `/breeding`. The last three are active for the whole section (`/goats/12`, `/breeding/settings`, …). The tabs are looked up in `lib/nav.ts` by route, so label, path and icon cannot drift from the sidebar.

**Breakpoint.** 768px, the same one `hooks/use-mobile.ts` and the shadcn sidebar use. The bar is hidden on desktop with CSS (`md:hidden`) rather than `useIsMobile()`, because that hook reports "not mobile" until after the page loads and the bar would appear a moment late on a phone.

**Bottom-fixed elements (audit).** None exist. The app has no toasts, no floating buttons and no sticky save bars; save buttons sit inside dialogs, and Show more is in the normal page flow. The only change needed was bottom padding on the app shell's `<main>` (`max-md:tab-bar-clearance`).

**V9 — not applicable.** There is no toast system to position, and none was added (user's decision, 2026-10-03).

**Icons.** `LayoutDashboard`, `HeartPulse` and `Baby` from lucide as proposed. Goat Records uses lucide's `BookOpenText` (an open record book). History: the custom goat-head icon from §4D was drawn, shown to the user and approved on 2026-10-03, then replaced the same day at the user's request with a book-record style icon; `components/icons/goat-icon.tsx` was deleted, so §4D and its row in §5 no longer apply. The same icon replaces `PawPrint` for Goat Records in the sidebar — a one-line swap in `lib/nav.ts`; nothing else in the sidebar changed. Icons are 24px (`size-6`), recorded in `ui-context.md`.

**Layering.** The bar is `z-40`: above page content and the top bar (`z-10`), below dialogs, sheets, dropdowns and the drawer (`z-50`).

**Keyboard.** The bar fades out and becomes `inert` while a text input, textarea, native select or editable element has focus. Checkboxes, radios and buttons do not hide it.

**Hidden on login and offline.** The bar is mounted in `app/(app)/layout.tsx`, which those two pages are outside of, so no route check is needed.

**Deviations and choices.**
- *Glass color:* the bar uses the elevated surface token (`--bg-elevated`) at 60% rather than `--bg-surface`. Cards are `--bg-surface`, so a bar in the same color would blend into the cards scrolling under it.
- *Fallback:* written as a solid base with the glass inside `@supports (backdrop-filter or -webkit-backdrop-filter)`, which has the same effect as the spec's `@supports not` wording.
- *Tapping the active tab:* scrolls to top only when the page on screen is the tab's own page. From deeper in a section (a goat's detail page) the tap goes to that section's list, as a native tab bar does.
- *Pages outside the bar* (barns, inventory, …): no tab is active and the bubble fades out.
- *Safe area:* the app does not set `viewport-fit=cover`, so iOS already keeps the page above the home indicator and `env(safe-area-inset-bottom)` resolves to 0; the bar then sits 8px above that edge. The `env()` term is kept so the bar stays correct if `viewport-fit=cover` is ever added.

**Files.** Created `components/nav/bottom-tab-bar.tsx`, `components/nav/tab-config.ts`. Changed `app/(app)/layout.tsx` (mount + padding), `app/globals.css` (glass, bubble, clearance, two geometry variables), `lib/nav.ts` (icon swap), `context/ui-context.md`.

**Automatic verification.** `npx tsc --noEmit` and `npm run build` clean (V1); `npm run lint` at the project baseline; no dependency change. A temporary unauthenticated page rendering the real bar was screenshotted in Chromium at 390px and 1280px and then deleted: the pill, four icons plus the empty slot, the bubble under slot 2, the blur over scrolling rows and the bottom clearance all rendered at phone width, and no bar rendered at desktop width. Safari itself, the keyboard behavior, VoiceOver and the signed-in pages were not checked here — those are the user's §7 checks.
