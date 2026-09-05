# 011 — Dashboard Performance, Compact Newborn Chart & App-Shell (PWA)

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-011`                                                          |
| Title             | Faster dashboard load, a vertical-only newborn-kids chart, and a real standalone app shell for iPhone |
| Status            | `in progress` — built 2026-09-05, awaiting the owner's hands-on test (iPhone install/re-install required) |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `12-dashboard-analytics`                                          |
| Depends on        | `006`, `007`, `009` (all done) — this touches the same dashboard code |
| Schema impact     | **none** — performance, UI, and app-shell configuration only      |
| Created           | 2026-08                                                           |

---

## 1. Reason for update

The owner uses this app primarily on an iPhone, installed via "Add to Home Screen." Three problems: the
dashboard is slow to load, the Newborn Kids chart (`UPD-007`) is visually too large and risks horizontal
scrolling on narrow screens, and the overall experience still feels like a website opened in a browser
rather than an installed app.

## 2. Current behavior

The dashboard fetches and renders all its widgets (herd composition, weight trend, due-soon list, stock
levels, newborn-kids chart) with no measured performance baseline. The Newborn Kids chart is a Recharts
bar chart with one bar per month in the selected window. There is no confirmed PWA manifest or Apple
web-app metadata — opening the installed icon may still launch inside Safari's normal browser chrome.

## 3. Desired behavior — three parts (11a / 11b / 11c)

**11a — Performance:** measure first, then fix the actual bottlenecks (likely candidates: sequential
rather than parallel data fetching, no progressive/streamed rendering, unnecessarily large data windows
fetched by default) — see Task list below.

**11b — Newborn Kids chart redesign:** replace the bar chart with a **compact vertical list** — one row
per period, a small inline bar, and the count — so the chart's height grows with more months, but its
width never does. No horizontal scrolling is possible under this design, by construction.

**11c — Real app shell:** add Next.js's native `app/manifest.ts` and the `appleWebApp` metadata
configuration so the installed icon launches full-screen, standalone, with no browser chrome — the main,
lowest-risk lever for "feels like an app."

## 4. Scope (in and out)

**In scope**
- Measuring the dashboard's actual load performance before changing anything (11a Task 1).
- Parallelizing data fetching, reducing default fetch windows, and adding progressive loading
  (Suspense/skeletons) where the measurement justifies it.
- Redesigning the Newborn Kids chart to the vertical list format (11b).
- Adding `app/manifest.ts` and `appleWebApp` metadata for standalone launch on iOS (11c).
- A light pass reviewing other dashboard cards' phone-width sizing, since "feels like an app" is a
  whole-dashboard concern, not just the one chart the owner named.

**Out of scope**
- A full offline-capable service worker with asset precaching. This adds real risk (stale caches serving
  an old version of the app after a deploy) that isn't justified for a personal, always-online farm app.
  Flagged as a possible future enhancement, not built now (see open questions).
- Any change to the Herd Growth section, which remains deactivated per the earlier owner request.
- Any change to what data the dashboard shows — this is about how fast and how well it's presented, not
  new widgets.

## 5. Task list — 11a: Performance

1. **Measure first.** Before changing anything, profile the dashboard's actual load (Chrome/Safari dev
   tools network waterfall, or Vercel's own request timing if available) and report what's actually slow
   — server response time, JS bundle size, sequential waterfalls, or something else. Do not guess and
   apply fixes blind.
2. Based on findings, apply what's justified from:
   - **Parallelize** the dashboard's separate data queries (herd composition, weight trend, due-soon,
     stock levels, newborn chart) with `Promise.all` rather than sequential `await`s, if they're
     currently sequential.
   - **Reduce default fetch windows** — e.g. the weight-trend and newborn-kids widgets shouldn't fetch a
     goat's entire lifetime history if only the last few months are shown by default.
   - **Progressive rendering** — use React Suspense with lightweight skeletons per widget so the fast
     parts (summary numbers) render immediately while charts stream in, rather than the whole page
     waiting on the slowest query.
   - Confirm chart libraries (Recharts) aren't blocking the initial paint of non-chart content.
3. Report the before/after measurement, not just "it should be faster now."

## 6. Task list — 11b: Newborn Kids chart redesign

- Replace the Recharts `BarChart` with a vertical list: one row per period bucket (month), each showing
  the period label, a small inline horizontal bar (width scaled to the max count in the currently visible
  window), and the numeric count, right-aligned.
- **This must never require horizontal scrolling**, regardless of the 3/6/12-month window or the custom
  end-date picker from `UPD-007`'s amendment — a taller list, never a wider one.
- **Zero-count months still render as a row** (near-empty bar, visible "0") — do not regress the rule
  `UPD-007` established.
- Keep the existing period selector and end-date picker; only the visual chart type changes.
- Keep the factual, non-diagnostic caption from `UPD-007`.

## 7. Task list — 11c: Real standalone app shell

- Add `app/manifest.ts` (Next.js App Router's native manifest route) with the app's name, short name,
  icons (reuse or generate simple icons in the desert accent color if none exist yet — flag if real
  brand icons are needed from the owner), `theme_color`/`background_color` matching `ui-context.md`'s
  dark palette, and `display: 'standalone'`.
- In `app/layout.tsx`'s `metadata` export, add Next.js's `appleWebApp` field (`capable: true`, a
  `statusBarStyle`, and a `title`) — this generates the legacy Apple meta tags iOS Safari still relies on
  for full-screen launch behavior, in addition to the standard manifest.
- **Do not build a custom service worker in this update** — out of scope per Section 4.
- Light pass: check other dashboard cards for anything clearly oversized on iPhone width and tighten
  spacing/sizing where obviously warranted, without a full redesign.

## 8. Domain / data / API requirements

None beyond the above — no schema, no new tables, no RLS change. This is entirely
performance/UI/app-configuration work.

## 9. Safety and data integrity rules

None — no data is touched. The one thing to watch: `appleWebApp`/manifest changes must not break normal
browser access to the app (it should still work perfectly as a regular website too, not only when
installed).

## 10. Acceptance criteria

- [ ] A before/after performance measurement is reported, not just claimed.
- [ ] The dashboard's fast content (summary numbers) visibly renders before slower charts, if progressive
      rendering was applied.
- [ ] The Newborn Kids chart is a vertical list with inline bars; no horizontal scroll is possible at any
      window length.
- [ ] Zero-count months still show as a visible row.
- [ ] `app/manifest.ts` exists and is served correctly; `appleWebApp` metadata is present in the layout.
- [ ] Re-adding the app to an iPhone home screen and opening it launches full-screen, with no Safari
      address bar or browser chrome visible.
- [ ] The app still works normally in a regular browser tab (not installed).

## 11. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow), on a real iPhone** — remove and re-add the app to the home screen (manifest changes
require a fresh install to take effect on iOS); open it and confirm there's no browser chrome; open the
dashboard and time how it feels to load compared to before; open the Newborn Kids chart and confirm it
never scrolls sideways at 3/6/12-month windows; confirm the app still opens correctly from a normal Safari
tab (not installed) with no regressions.

## 12. Related spec files

- Extends: `context/feature-specs/12-dashboard-analytics.md`.
- Amends the chart built in: `context/update-specs/007-newborn-period-chart-and-event-simplification.md`.
- Builds on the redesign in: `context/update-specs/006-dashboard-redesign-and-herd-population.md`.

### Amendment — 2026-09-05 (owner request, refinement round from real iPhone testing, folded in while still `in progress`)

After the first build shipped, the owner tested it on a real iPhone (screenshot reviewed) and asked for
three refinements, folded into this spec rather than filed separately since it was still `in progress`:

1. **Dashboard card order.** Herd composition first, Sex ratio second, Newborn Kids third (right after Sex
   ratio, before Weight growth) — Weight growth, Due soon, and Stock levels keep their prior relative
   order after that. `app/(app)/page.tsx`'s grid was reordered accordingly. The agent agreed this ordering
   made sense (demographic snapshot cards first, then the newborn trend, then operational/actionable
   widgets) and did not propose an alternative.
2. **Newborn Kids chart redesign, reversed from 11b's original list.** 11b's compact vertical list (one
   row per month, an inline horizontal bar, the count) tested less readable in practice than a standard
   column chart. `components/dashboard/newborn-periods-chart.tsx` now renders a Recharts `BarChart` again
   — bars rising from a baseline, months abbreviated along the bottom axis (e.g. "Mar", not "Mar 2026";
   the full "Mar 2026" still appears in the Tooltip on hover/tap) — with the chart container height capped
   at a fixed `h-36` (144px) regardless of the 3/6/12-month window, so it stays compact. **The "no
   horizontal scrolling, at any window length" requirement from 11b is preserved, but by a different
   mechanism than the list:** Recharts' `ResponsiveContainer` always renders its SVG at exactly its
   parent's measured pixel width and maps every category (month) into that fixed width via a band scale —
   it cannot overflow the container regardless of category count, so 12 narrow bars fit the same way 3 do,
   just thinner. The Y axis was dropped entirely (the Tooltip carries the exact count; bar height plus a
   2px `minPointSize` sliver for zero-count months carries the at-a-glance read) to give the bars maximum
   width. `computeNewbornsByPeriod` (`lib/dashboard/newborn-periods.ts`) is unchanged — this remains a
   presentation-only swap; the zero-count-month-still-renders-as-a-visible-bar rule from `UPD-007` is
   unchanged.
3. **Tighter card padding, dashboard-wide.** Every `CardHeader`/`CardContent` on the dashboard page had its
   horizontal padding reduced from the shadcn default (`px-(--card-spacing)`, 16px) to `px-3` (12px) via a
   `className` override at each call site in `app/(app)/page.tsx` — deliberately **not** an edit to
   `components/ui/card.tsx` itself, so the change is scoped to the dashboard rather than every card in the
   app (`code-standards.md`'s "no edits to `components/ui/*`" convention for this dashboard unit,
   established back in feature 12). Only horizontal padding changed; vertical spacing (`py` on the outer
   `Card`, driven by the same `--card-spacing` variable) was left alone, matching what the owner asked for.
   The Summary Stats row (`components/dashboard/summary-stats.tsx`) uses its own stat-tile layout, not the
   `Card` component, and was left untouched — flagged for the owner to confirm whether it should match.

**Verification method for the "no horizontal scroll at 12 months" requirement:** this environment has no
physical iPhone and no working headless-browser tool (a Playwright fetch was attempted and did not
complete), so this was verified by (a) a clean production build with no errors, and (b) the pixel-budget
arithmetic + Recharts' band-scale rendering guarantee described above, rather than a live screenshot. The
owner's own hands-on iPhone check (Section 11) still stands as the real confirmation, same as the rest of
this spec.

## 13. Implementation note

*(fill during/after build — record the actual measured bottleneck(s) found in 11a Task 1, and which
fixes were applied as a result)*

## 14. Verification evidence

*(fill at the verification gate — include the before/after performance numbers)*

## 15. Resolution / final state

*(fill when done)*

## 16. Open questions (resolve, don't guess)

- **App icons.** This update assumes simple generated icons in the desert accent color are acceptable for
  now if no real brand icon set exists yet — confirm, or the owner can supply real icon files first.
  **Owner-confirmed 2026-09-05: generated placeholder is acceptable for now.** Built as a simple "G"
  monogram on the accent-primary background (`lib/branding/app-icon.tsx`), swappable for real artwork
  later with no other code change.
- **Future service worker.** A full offline-capable PWA (asset precaching, background sync) was
  deliberately left out of this update due to cache-staleness risk. Worth a dedicated future update if
  the owner wants offline access, but not now. **Owner-confirmed 2026-09-05: worth noting as a future
  possibility** — recorded in `progress-tracker.md`'s Open Questions, not specced or built now.
- **Status bar style.** `statusBarStyle` affects how the iOS status bar looks over the app (default,
  black, or black-translucent) — confirm a preference, or default to whichever best matches the dark
  theme (likely `black-translucent`). **Owner-confirmed 2026-09-05: `black-translucent`**, as built.
