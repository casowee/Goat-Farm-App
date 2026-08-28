# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Respect the system boundaries defined in `architecture-context.md`.
- Keep shared domain logic (the inbreeding / relatedness check, goat-stage derivation, calendar + reminder building) as pure, testable functions in `lib`, so it stays portable and can move into a Supabase database or Edge Function later for mobile to reuse.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any`; use explicit interfaces or narrowly scoped types.
- Use the database types generated from Supabase for table reads and writes, rather than hand-written duplicates.
- Validate unknown external input at system boundaries before trusting it.
- Use `interface` for object contracts.

## Next.js

- Default to React Server Components.
- Add `"use client"` only when the component needs browser interactivity, hooks, or client state (forms, the calendar, charts).
- Keep route handlers and server actions focused on a single responsibility.
- Heavier server work (e.g. building a PDF report) runs on the server — in a route handler or server action — and never blocks the browser. This project has no background-job service; work is either a quick request or an on-demand server action.

## Styling

- Desktop-first, but every screen must remain usable on a phone-width browser.
- Use the design tokens defined in `ui-context.md` and `globals.css` — no raw Tailwind color classes (like `zinc-*`) and no hardcoded hex values.
- Reference tokens through their Tailwind utility names (e.g. `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`), as set in the design system.
- Keep a consistent border-radius scale: `rounded-xl` for small elements, `rounded-2xl` for cards, `rounded-3xl` for modals.
- Build UI from shadcn/ui components rather than hand-rolling equivalents.

## Data Access and Ownership

- All reads and writes go through the Supabase client with row-level security; ownership is enforced at the database by `auth.uid()`, not only in the UI.
- Every owned table has an `owner` column set to the signed-in user.
- Validate and parse input before any write, and return consistent, predictable shapes from route handlers.
- The service-role key is server-only; the browser uses only the anon key.

## Files and Storage

- Structured records belong in PostgreSQL (Supabase).
- Goat photos and any other uploads belong in Supabase Storage; the database stores only the file's URL reference.
- Do not store large files or generated documents directly in the database.
- PDF reports are generated on demand and sent to the user; they are not persisted unless a need appears later.

## File Organization

- `lib/` — shared infrastructure: Supabase clients, access helpers, utilities, and pure domain logic.
- `lib/supabase/` — `client.ts` (browser) and `server.ts` (server), following the `@supabase/ssr` pattern.
- `components/` — UI composition only; no business logic.
- `app/` — one area per module; `app/api/` holds route handlers for server-only work.
- `types/` — shared types, including the generated Supabase database types.
- `supabase/` — SQL migrations and row-level-security policies.
- Name files after the responsibility they contain, not the technology.
