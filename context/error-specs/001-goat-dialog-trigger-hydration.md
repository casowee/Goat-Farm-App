# Error Spec — Goat Dialog Trigger Hydration Mismatch

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `ERR-001` (migrated from the former `05b` Task C)                 |
| Status            | `Resolved`                                                        |
| Severity          | `cosmetic` (renders and works; console warning only — prioritized because a known-noisy warning can mask a real hydration bug later) |
| Feature affected  | `05-goat-profiles` (surfaced while verifying the goat form)       |
| Related specs     | feature `05-goat-profiles`; update `UPD-001`, `UPD-002`          |
| Date discovered   | 2026-08, during browser verification of the goat form             |

## What happened

On `/goats`, React logs a hydration mismatch on the Add-goat dialog **trigger** button: the server
rendered `data-slot="dialog-trigger"` and the client rendered `data-slot="button"` (React's diff shows
`+` client / `-` server on that attribute). The page renders and the dialog works. The component chain is
`GoatsPage → GoatFormDialog(trigger=<Button>) → Dialog(open=false) → DialogTrigger render={<Button>} → Button → <button>`.

**Reproduction steps**
1. Run the app and sign in.
2. Navigate to `/goats`.
3. Open the browser console on first load (SSR + hydration).
4. Observe the hydration mismatch warning on the trigger's `data-slot`. (Consistent on load, not intermittent.)

## Expected behavior

No hydration warning. The Add-goat trigger renders identically on server and client, and the dialog opens
as before.

## Root cause

`GoatsPage` (a Server Component) passes a `<Button>` **element** as the `trigger` prop into
`GoatFormDialog`, which hands it to base-ui's `DialogTrigger render={trigger}`. Merging that serialized
element resolves the competing `data-slot` (Button's own `"button"` vs DialogTrigger's `"dialog-trigger"`)
**differently on server vs client**. Passing a client-component element across the RSC boundary into a
base-ui `render` slot is the trigger.

## Why existing verification missed it

Verification confirmed the page **rendered** and that there were no console **errors** — but a hydration
**warning** on a component that still renders and works is easy to miss when clicking through
functionality rather than watching the console on the initial SSR paint. Nothing looked wrong (the button
appears and opens the dialog), `npm run build` and `tsc` pass (the element-as-prop pattern isn't a type
error), and some earlier browser checks ran with an auth-bypass that didn't force a clean real SSR load of
`/goats` with the console open. In short: we checked for errors and correct rendering, not for hydration
warnings on first paint.

## Correction required

Make SSR and client render the same attributes. Root-cause first — stop when the console is clean:

1. **Build the trigger inside the client dialog.** `GoatFormDialog` accepts a plain `triggerLabel` /
   `children` (not a `Button` element) and renders its own
   `<DialogTrigger render={<Button><Plus className="h-5 w-5" /> Add goat</Button>} />` — nothing is
   serialized across the RSC boundary, so SSR === client. *(Preferred.)*
2. If any collision remains, use the **function form**: `render={(props) => <Button {...props}>…</Button>}`
   so Button applies its props last, deterministically.
3. The Dialog is already **controlled** (`open` / `onOpenChange`). Clean fallback: drop `DialogTrigger`
   and use `<Button onClick={() => onOpenChange(true)}>…</Button>`, preserving needed aria attributes.
4. **Last resort only:** `suppressHydrationWarning` — avoid; it hides rather than fixes.

Apply the same fix to `components/barns/barn-form-dialog.tsx` if it shares the pattern. This fix naturally
ships alongside `UPD-002`, which reworks the same `goat-form-dialog.tsx`.

## Preventive rule

**Never pass a client-component element (e.g. `<Button>`) as a prop across the server→client boundary into
a base-ui `render` slot.** Build the trigger inside the client component (accept a label / `children`), or
use the function form of `render`. Additionally, during verification **watch the console for hydration
*warnings* on each new page's first SSR load, not just errors** — a component can render correctly and
still hydrate inconsistently.

## Safety / data-integrity impact

None. UI composition only — no schema, RLS, data access, or `lib` logic. The fix must preserve dialog
behavior and accessibility (focus handling / aria wiring) if `DialogTrigger` is removed.

## Verification required

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow)** — reload `/goats` with the console open: no hydration warning. Click Add goat → the
dialog opens. Repeat on `/barns`.

## Related context files

`context/feature-specs/05-goat-profiles.md`; update specs `UPD-001`, `UPD-002`;
`components/goats/goat-form-dialog.tsx`, `app/(app)/goats/page.tsx`, and possibly
`components/barns/barn-form-dialog.tsx`.

## Resolution notes

Fixed with **Correction Required** option 1 (preferred): each dialog now builds its own trigger `<Button>`
internally from plain `triggerLabel` / `triggerIcon` / `triggerVariant` / `triggerSize` props, instead of
receiving a `<Button>` element built by a Server Component parent. Nothing is serialized across the
RSC boundary into `DialogTrigger`'s `render` slot anymore, so SSR and the client resolve the same
`data-slot` deterministically. No function-form `render`, no dropped-`DialogTrigger` fallback, and no
`suppressHydrationWarning` were needed — the root-cause fix alone was sufficient.

- **Files changed:**
  - `components/goats/goat-form-dialog.tsx` — `trigger: ReactElement` prop replaced with
    `triggerLabel` / `triggerIcon` / `triggerVariant` / `triggerSize`; builds its own
    `<DialogTrigger render={<Button>...}` internally.
  - `components/barns/barn-form-dialog.tsx` — same fix; it shared the identical pattern.
  - `app/(app)/goats/page.tsx`, `app/(app)/goats/[id]/page.tsx`, `app/(app)/barns/page.tsx` — updated to
    pass the new trigger props instead of a `<Button>` element; the last of these (the goat detail page's
    Edit button) was an additional occurrence of the same bug found while applying the Preventive Rule,
    not called out in the original report.
  - `components/goats/delete-goat-dialog.tsx` / `components/barns/delete-barn-dialog.tsx` were inspected
    and left unchanged — they already build their trigger `<Button>` inside the client component itself
    (never received as a prop from a Server Component), so they never had this defect.
- **Tests run:** `npm run build` and `tsc` (clean, no `any`) both before and after the browser
  verification pass, and once more after all temporary scaffolding was reverted.
- **Manual verification:** production build (`next build && next start`) driven with Playwright
  (Chromium), with a console listener attached before each `page.goto()` so it captured the initial SSR
  paint and hydration, not just post-hydration interaction. Reloaded `/goats` (390px and 1280px) and
  `/barns` (390px) fresh — zero `console.warning`/`console.error`/`pageerror` events on any of them,
  confirming no hydration mismatch on the trigger (or elsewhere). Add-goat/Add-barn dialogs opened
  correctly by click in every case.
- **Documentation updated:** this file; `context/update-specs/002-goat-form-and-breed-cross.md` (shipped
  together, same file touched); `context/progress-tracker.md`.
- **Preventive rule applied where else:** audited every `DialogTrigger`/`Dialog` usage in `components/` and
  `app/` for a Server Component passing a client element as a prop into a `render` slot. Found and fixed
  one instance beyond the two named in this spec: `app/(app)/goats/[id]/page.tsx` (the goat detail page's
  Edit button) had the identical pattern and was not previously flagged. No other occurrences found;
  `delete-goat-dialog.tsx` / `delete-barn-dialog.tsx` already build their trigger internally, and no
  other `render` slot usage in the codebase currently receives a prop-passed element from a Server
  Component.
