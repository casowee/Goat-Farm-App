# Spec 18.1 — Instant Tap Feedback

**Phase:** 6 · **Spec:** 18 — Native feel · **Status:** `done`
**Depends on:** Spec 03 (app shell), 17.3 (skeleton screens)

---

## 1. Goal

Every tap gets a visible response **the moment the finger touches the screen**, before anything loads or saves. Save buttons show that they're working and can't be tapped twice.

This removes the "did that register?" feeling, which is the most common sign that an app is a website.

## 2. Scope

**In scope**
- A. Pressed state on everything tappable
- B. Removing iOS Safari's default grey tap flash and long-press text selection on controls
- C. Pending state on save/submit buttons, with double-tap protection

**Out of scope**
- Page transitions (later 18.x)
- Haptics (not supported in iOS web apps)
- Any change to what actions do, where they navigate, or confirm dialogs
- Any database change

## 3. Audit (agent, before any change)

The agent must report:
- Where the shared button styles live (`components/ui/button.tsx` base classes)
- Tappable elements that are **not** shadcn Buttons: list rows linking to goat detail, cards, sidebar/nav items, tab triggers, `goat-link.tsx`
- How forms submit today (server actions with `<form action>`, `useTransition`, `onClick` handlers) and whether any already show a pending state
- Any places where a double tap could currently create a duplicate record

## 4. Design

### A. Pressed state
- **Buttons:** add to the shared Button base classes a quick press response: slight scale-down (about 0.97) plus a slightly darker/lighter background using theme tokens. The transition is about 100 ms, and it springs back on release.
- **Rows, cards, nav items, tabs:** one shared utility class (e.g. `tappable`) that gives a background tint on press, with no scaling for large rows because it looks odd.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, no scaling; color change only.
- **iOS quirk:** Safari sometimes doesn't apply `:active` styles on touch unless the page has a touch listener. If pressed states don't appear on the iPhone, add one passive no-op `touchstart` listener at the document level, and nothing more.

### B. Remove browser tap artifacts
Applied globally in CSS:
- `-webkit-tap-highlight-color: transparent`, since the pressed states above replace the grey flash
- `touch-action: manipulation` on interactive elements, so taps never wait for double-tap-zoom detection
- `user-select: none` and `-webkit-touch-callout: none` on buttons, nav items, and tabs only, **not** on text content or inputs

### C. Pending state on saves
Every button that saves, deletes, or submits:
- Becomes disabled **immediately** on tap
- Shows a small spinner, with its label changing to a present-tense word ("Saving…", "Deleting…")
- Keeps the same width so the layout doesn't jump
- Returns to normal if the action fails, so the user can retry

Use the pattern that matches how each form already submits (`useFormStatus` for `<form action>`, the `isPending` flag of `useTransition` for transitions). Build it once as a shared component or Button prop, and don't restructure forms to fit one pattern.

## 5. Files

| File | Action |
|---|---|
| `components/ui/button.tsx` | Pressed state in base classes; pending support |
| Global CSS | `tappable` class, tap-artifact rules, reduced-motion rule |
| Tappable non-button components (rows, cards, nav, tabs, `goat-link`) | Add `tappable` class |
| Save/delete buttons across modules | Use the shared pending state |

No new npm dependencies.

## 6. Dashboard steps (user)

None.

## 7. Verification (installed PWA on iPhone)

| # | Test | Expected |
|---|---|---|
| V1 | `npm run build` passes | ✅ |
| V2 | Tap and hold any button | Visibly pressed while held; springs back on release |
| V3 | Tap a goat row, a nav item, a tab | Tint appears on touch, before the page changes |
| V4 | Tap anything | No grey flash |
| V5 | Long-press a button or nav item | No text selection or callout menu |
| V6 | Long-press text in a record, and type in a form field | Text selection and typing still work normally |
| V7 | Save a health record on weak signal | Button disables instantly and shows "Saving…" |
| V8 | Double-tap a save button quickly | Only one record created |
| V9 | Save with no signal | Button returns to normal and the user can retry |
| V10 | Reduce Motion on | Pressed state changes color without scaling |

## 8. Implementation Notes

Built 2026-09-27. Front-end only — no schema change, no new npm dependency, no
behaviour change: nothing navigates anywhere new, no confirm dialog was added or
removed, and no server action was touched.

### Audit findings (§3)

- **Shared button styles:** `components/ui/button.tsx` — a `cva` base string on a
  base-ui `ButtonPrimitive`, seven variants × nine sizes. It already carried
  `select-none` and one press hint (`active:not-aria-[haspopup]:translate-y-px`),
  but no scale, no pressed background, no `touch-action`, no tap-highlight
  suppression.
- **Tappable non-Buttons found:** `sidebarMenuButtonVariants` (nav rows, including
  the mobile drawer and Sign out), `TabsTrigger`, the route-backed
  `components/breeding/breeding-tabs.tsx`, `goat-link.tsx`, the three goat-list
  links (table row, phone card title, duplicate review), the dashboard due-soon and
  breeding-status links, the goat Breeding tab links, `pedigree-view.tsx` nodes,
  `SelectItem`, `Toggle`, and the wizard step dots in `forms/step-indicator.tsx`.
  `Card` is never given an `onClick` anywhere, so cards are not tappable surfaces.
- **How forms submit:** strikingly uniform — **every** mutation in the app is
  `<form action={formAction}>` + `useActionState` + a local `useFormStatus()` submit
  button. No `onSubmit` anywhere; the only `useTransition` is the read-side
  `ShowMoreButton`. All 19 save/delete buttons **already had** a pending state, as 19
  near-identical hand copies of the same six lines. So §4C was largely a
  consolidation rather than new behaviour.
- **Double-tap duplicate risk: none found.** Every write goes through a form whose
  submit button is `disabled={pending}`, and React sets `pending` synchronously when
  the action starts, so the second tap of a fast double-tap lands on a disabled
  control. No `onClick` handler calls a server action directly (the dashboard CSV
  button builds a local Blob and writes nothing). The one unguarded submit was
  **Sign out**, which is idempotent but was given a pending state anyway.

### A. Pressed states

`components/ui/button.tsx` base classes gained `touch-manipulation`,
`duration-100 ease-out`, and `active:not-aria-[haspopup]:scale-[0.97]` alongside the
existing 1px nudge, with `motion-reduce:active:scale-100` /
`motion-reduce:active:translate-y-0` so reduced motion keeps the colour change and
drops the movement (V10). Each variant also got a pressed background drawn from the
token it already uses (`active:bg-primary/70`, `active:bg-muted`,
`active:bg-destructive/30`, …). The `outline` and `ghost` variants additionally got
`dark:active:` counterparts: the `dark` variant is `&:is(.dark *)`, which out-ranks a
bare `active:` rule on a touch — where `:hover` and `:active` fire together — so
without them the `dark:hover:` background would have won.

`tappable` (in `globals.css`) is the shared class for everything else: a `::before`
overlay tinted with `--accent-primary` at 12% opacity on `:active`, no scaling. The
overlay approach means the class can be dropped onto an element that already paints
its own background (an active nav row, a pedigree node) without fighting it.
`tappable-inline` is its sibling for inline text links, where a full-bleed overlay
would paint a block behind the words — it shifts the text colour instead. Both
suppress the tap highlight and set `touch-action: manipulation` themselves.

**The iOS `touchstart` fix was applied up front**, not reactively:
`components/pwa/touch-active-bridge.tsx` attaches one empty, passive, document-level
`touchstart` listener and is mounted in `app/layout.tsx`. Safari only applies
`:active` on touch when the document has a touch listener, so without it every
pressed state here would work on desktop and do nothing on the iPhone — the device
this spec exists for. It reads nothing, never calls `preventDefault`, and never
blocks scrolling. If the V2/V3 checks pass on the tested iOS version without it, the
component can be deleted with no other change.

### B. Tap artifacts

One `@layer base` block in `globals.css`, deliberately three rules with three
different scopes:

1. `-webkit-tap-highlight-color: transparent` on `html` — document-wide (V4).
2. `touch-action: manipulation` on `a`, `button`, `summary`, `label`, `select` and
   the `button`/`tab`/`option`/`menuitem` roles — safe on anything interactive,
   links included.
3. `user-select: none` + `-webkit-touch-callout: none` on **controls only** —
   `button`, `summary`, the `button`/`tab` roles, and the `button`, `tabs-trigger`,
   `sidebar-menu-button`, `toggle` and `select-trigger` data-slots (V5). Record text
   and inputs are untouched, and because a control can *contain* an input (the
   combobox's text field), `input` / `textarea` / `[contenteditable]` explicitly
   restore `user-select: text` and the callout so selection handles and the paste
   menu keep working (V6).

### C. Pending state

`components/forms/submit-button.tsx` is the one submit button now, replacing all 19
local copies. Two things the copies lacked:

- **Stable width.** Both labels render into the same CSS grid cell, one `invisible`
  and `aria-hidden`, so the button is always as wide as the wider of the two and a
  dialog footer no longer shifts sideways mid-submit.
- **`LoadingDots`, not `Loader2`.** The three-dot pulse is this app's loading
  language everywhere else (`UPD-015`, spec 17.3's skeletons, the "Show more"
  control), and the dots inherit the button's text colour (`text-current`) so they
  stay legible on a filled primary button as well as an outline one. **`Loader2` no
  longer appears anywhere in the app.**

Double-tap protection needs nothing beyond this: `pending` is set synchronously, and
it returns to `false` on failure so the user can retry (V8, V9).

Buttons converted: barns (form, delete), breeding (delete season, doe-performance
note, doe-performance settings, breeding settings, season form, templates ×2),
dashboard (log herd event), goats (goat form wizard, litter-mate quick add, move
barn, remove goat), health (record form, delete record), inventory (item dialog,
delete item), weight (weight form, delete weight), and the login page. Sign out
could not use the shared component — it is a `SidebarMenuButton`, not a shadcn
`Button` — so it got the same treatment inline in `components/app-sidebar.tsx`.

### Verification run by the agent

`npx tsc --noEmit` clean. `npm run build` clean (V1). `npm run lint` at the project
baseline — the same one pre-existing `hooks/use-mobile.ts` error and five
pre-existing `_prev` warnings, nothing new. `package.json` / `package-lock.json`
unchanged.

V2–V10 are touch behaviours on a physical iPhone and were the user's to confirm.
The user confirmed the feature works and asked for the spec to be marked `done` on
2026-10-03.
