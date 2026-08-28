# UI Context

## Theme

Dark only. No light mode. The visual language is a warm, dark workspace — near-black backgrounds with a slight warmth, layered surfaces, and desert accent colors for interactive and branded elements.

All colors are defined as CSS custom properties in `globals.css` and mapped to Tailwind tokens via `@theme inline`. Components must use these tokens — no hardcoded hex values or raw Tailwind color classes like `zinc-*`. Because everything references tokens, the whole app can be re-themed (for a different farm's branding, for example) by changing these values alone, without touching any component.

The neutral dark surfaces are brand-agnostic. The **accent** colors are the desert brand layer — this is the part a future farm would swap.

| Role             | CSS Variable            | Hex / Value                 |
| ---------------- | ----------------------- | --------------------------- |
| Page background  | `--bg-base`             | `#0B0A09`                   |
| Surface          | `--bg-surface`          | `#141210`                   |
| Elevated surface | `--bg-elevated`         | `#1C1915`                   |
| Subtle surface   | `--bg-subtle`           | `#24201A`                   |
| Default border   | `--border-default`      | `#332E26`                   |
| Subtle border    | `--border-subtle`       | `#453E34`                   |
| Primary text     | `--text-primary`        | `#F5F1EA`                   |
| Secondary text   | `--text-secondary`      | `#CFC6B8`                   |
| Muted text       | `--text-muted`          | `#948978`                   |
| Faint text       | `--text-faint`          | `#635A4C`                   |
| Brand accent     | `--accent-primary`      | `#D9A05B` (warm sand)       |
| Brand dim        | `--accent-primary-dim`  | `rgba(217, 160, 91, 0.12)`  |
| Secondary accent | `--accent-secondary`    | `#C56A3B` (terracotta)      |
| Secondary dim    | `--accent-secondary-dim`| `rgba(197, 106, 59, 0.12)`  |
| Error            | `--state-error`         | `#E5544B`                   |
| Success          | `--state-success`       | `#57C77E`                   |
| Warning          | `--state-warning`       | `#E0A22E`                   |

Tailwind utility names map to these variables. Use `bg-base`, `bg-surface`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc.

> Brand colors are a starting proposal in the desert direction. Replace `--accent-primary` and `--accent-secondary` with the exact hex from the farm logo once available; nothing else needs to change.

## Typography

| Role      | Font       | CSS Variable        |
| --------- | ---------- | ------------------- |
| UI text   | Geist Sans | `--font-geist-sans` |
| Code/mono | Geist Mono | `--font-geist-mono` |

Both fonts are loaded via `next/font/google` and applied as CSS variables on the `<html>` element. The base `body` uses Geist Sans with `antialiased`.

## Border Radius

Radius increases with surface depth — smaller for inner elements, larger for outer containers.

| Context           | Class         |
| ----------------- | ------------- |
| Inline / small UI | `rounded-xl`  |
| Cards / panels    | `rounded-2xl` |
| Modal / overlay   | `rounded-3xl` |

## Branding

- A farm logo appears in the sidebar header and on the sign-in page. Until a final logo is supplied, use a simple placeholder mark in the brand accent color.
- The sign-in page shows the logo and a small loading animation while authentication resolves.

## Component Library

shadcn/ui on top of Tailwind. No custom design system. Components live in `components/ui/`. Use the `shadcn` CLI to add new components rather than writing them from scratch.

## Layout Patterns

- **App shell:** a left sidebar for navigation, a slim top bar, and a main content area. The sidebar links to the modules — Dashboard, Goats, Barns, Health, Breeding, Inventory, Sales, Calendar, Doctor, Analytics.
- **Responsive:** desktop-first, but on a phone the sidebar collapses into a drawer opened from a top-bar menu button, and content stacks into a single column.
- **List views:** tables on wide screens that collapse into stacked cards on small screens.
- **Records:** shown as cards or detail pages; related history (health, weight, breeding, lineage) grouped in tabs or sections on the goat detail page.
- **Modals and dialogs:** centered overlay, `rounded-3xl`, dark background with backdrop blur.
- **Forms:** in dialogs for quick add/edit, or on dedicated pages for longer forms.
- **Top bar:** dark background with a bottom border; holds the page title, the barn filter where relevant, and account controls.

## Forms — Length & Multi-Step Standard

A single continuous form is only acceptable up to a point. Beyond it, split into a **multi-step wizard**
inside the same dialog rather than one long scroll — this is a standing rule for every form in this
project, not a per-feature judgment call.

**When to use a multi-step wizard** (any one of these triggers it):
- The form would show more than roughly **6–7 fields/controls** at once.
- The fields naturally group into more than one topic (e.g. identity vs. breed vs. lineage vs. notes).
- Part of the form is **optional and skippable** (e.g. a related-record picker like parents) — that's a
  natural step boundary, not something to bury mid-scroll in the main form.
- Checked **at phone width, not desktop.** A form that looks reasonable on a wide screen can still fail
  this standard on an iPhone — always verify the mobile view specifically, not just desktop.

**Wizard requirements:**
- A **step indicator** at the top ("Step 2 of 3", dots, or a progress bar), built from tokens.
- **Per-step validation** — required fields on the current step must be valid before "Next" proceeds.
  Fields on other steps don't block navigation of the current one.
- **One data write, on final submit.** The wizard is UI pagination over a single in-memory form state
  (or equivalent) — it does not create partial records per step. Retain all entered values across steps
  within the same open dialog so navigating back and forth never loses data.
- **Back** is always available except on step 1.
- **Optional steps offer an explicit skip** (e.g. "Skip for now — add later"), not just empty fields
  buried in a long scroll.
- Each step must be comfortably usable on an iPhone-width screen without an oppressive scroll.
- Build the stepper as a **reusable pattern** in `components/forms/` (step indicator + step container +
  the per-step-validation/navigation logic) so later modules (health records, breeding, etc.) reuse it
  rather than each reinventing pagination.

This standard is checked **before** the verification gate — catching a too-long form during layout is far
cheaper than reworking one after it ships. See `ai-workflow-rules.md` → Form Length Standard.

## Icons

Lucide React. Stroke-based icons only — no filled variants. Icon sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-8 w-8` for feature icons in empty states.
