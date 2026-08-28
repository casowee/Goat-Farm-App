Read `AGENTS.md`, `context/ui-context.md`, and `context/code-standards.md` before starting.

Runs after `00-project-setup.md`. We're implementing the design system: the desert theme tokens, fonts, and the shadcn/ui primitives.

## Goal

Turn the palette described in `ui-context.md` into real, working theme tokens, and install the base components on top of it.

## Tasks

1. **Design tokens in `globals.css`.** Dark theme only.
   - Add the CSS custom properties from `ui-context.md` on `:root` — the full desert palette (`--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-subtle`, borders, text scale, `--accent-primary`, `--accent-secondary`, and the state colors).
   - Map them to Tailwind utilities via `@theme inline` (Tailwind v4), using the utility names in `ui-context.md` (`bg-base`, `bg-surface`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc.).

2. **Point shadcn's theme variables at the desert palette.** shadcn/ui reads its own variables (`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, and their `-foreground` pairs). Set these to the desert values so components render dark-desert, not shadcn's grey defaults. Set `--radius` to match the scale in `ui-context.md` (`rounded-xl` / `rounded-2xl` / `rounded-3xl`).

3. **Fonts.** Load Geist Sans and Geist Mono via `next/font`, expose them as `--font-geist-sans` and `--font-geist-mono` on `<html>`, and set `body` to Geist Sans with `antialiased`.

4. **Install shadcn/ui.** Initialize with the current shadcn CLI (confirm Tailwind v4 compatibility). Then add: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea. Do not modify the generated `components/ui/*` files.

5. **Icons.** Ensure `lucide-react` is installed (the shadcn init may add it).

6. **`cn()` helper.** Confirm `lib/utils.ts` exports a `cn()` for merging Tailwind classes (the shadcn init usually creates this; verify it exists and works).

## Check when done

- `npm run build` completes and all components import without errors.
- `cn()` merges classes correctly.
- Add a temporary demo page at `app/style-check/page.tsx` that renders one of each component — a primary and a secondary Button, a Card, a Dialog trigger, an Input, a Tabs group, a Textarea, and a ScrollArea. Opening `/style-check` in the browser should show: a warm near-black background, sand/terracotta accents, warm off-white text, and no light-mode flashes anywhere.
- No default light styling appears.

## After this step

- The owner can review `/style-check` in the browser to confirm the theme looks right. The demo page can stay for now or be removed later.
- Update `context/progress-tracker.md`: mark the design system done.
