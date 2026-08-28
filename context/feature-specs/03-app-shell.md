Read `AGENTS.md`, `context/ui-context.md`, and `context/code-standards.md` before starting.

Runs after `02-auth-and-login.md`. We're building the app shell: a persistent sidebar + top bar on desktop that collapses to a drawer on phone, navigation for all 8 modules, and empty placeholder pages for each route so the whole app is browsable end to end.

## Goal

Give the app its frame. Every authenticated screen should sit inside a consistent chrome — a sidebar of the 8 modules plus a top bar — that stays put on desktop and collapses to a slide-in drawer on a phone. The owner works mainly from an iPhone, so the mobile drawer has to feel right, not like an afterthought. Wire up navigation and a stub page per module so the shell is fully clickable; the real forms and tables land in later feature specs.

## Tasks

1. **Navigation config (single source of truth).**
   - Define the module list once, in `constants/nav.ts` (or `lib/nav.ts` — match the folder convention in `code-standards.md`): an array of `{ label, href, icon }`.
   - Icons come from `lucide-react` (installed in step 01).
   - The sidebar, the mobile drawer, and the active-state highlight all read from this one array — don't hardcode the list in more than one place.

2. **Install the shell primitives.**
   - Add shadcn's `sidebar` block: `npx shadcn@latest add sidebar` (confirm it's compatible with your Tailwind v4 / shadcn setup at install time). It provides `SidebarProvider`, `Sidebar`, `SidebarTrigger`, and the menu parts, and includes the mobile drawer behaviour out of the box.
   - It may also pull in `Sheet`, `Separator`, `Tooltip`, and a `use-mobile` hook — that's expected, let it.
   - Do not modify the generated `components/ui/*` files (same rule as step 01). Your own components go in `components/`, not `components/ui/`.

3. **Point the sidebar variables at the desert palette.**
   - The sidebar block ships its own tokens: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`, and their `-foreground` pairs.
   - Set these in `globals.css` to the desert values — surface background, warm off-white text, terracotta / sand accent — so the sidebar renders dark-desert, not shadcn grey. Same treatment the shadcn variables got in step 01.
   - No light-mode flash anywhere in the shell.

4. **Build the shell layout.**
   - In the protected `(app)` route group from step 02, make `app/(app)/layout.tsx` the shell: wrap `{children}` in `SidebarProvider` and render the sidebar and top bar around the content.
   - Keep the server-side session guard from step 02 here. If it currently lives in the root layout, consolidate it into this group layout.
   - `/login` stays outside this group — no shell, no guard.

5. **Sidebar (`components/app-sidebar.tsx`).**
   - Client component. Map over the nav config and render one menu item per module, each with its icon and label.
   - Highlight the active route with `usePathname()`.
   - Farm name / logo placeholder in the sidebar header (real logo later).
   - Sign-out control in the sidebar footer — call the `signOut()` action from step 02.

6. **Top bar (`components/top-bar.tsx`).**
   - Holds the `SidebarTrigger` (hamburger): on phone it opens the drawer; on desktop it collapses the persistent sidebar.
   - Show the current page title or a simple brand mark.
   - Keep it sticky at the top of the content area.

7. **Responsive behaviour.**
   - Desktop (≥ md): sidebar persistent alongside the content.
   - Phone (< md): sidebar hidden; the hamburger in the top bar opens it as a slide-in drawer over the content, and it closes on link tap or backdrop tap.
   - This comes from the sidebar block by default — but verify it actually behaves this way at an iPhone-width viewport, since that's the owner's main device.

8. **Empty module pages.**
   - Create a stub page for each route so navigation works end to end:
     - `/` → Dashboard
     - `/goats` → Goat Records
     - `/medicine` → Medicine Records
     - `/health` → Health History
     - `/breeding` → Breeding History
     - `/weight` → Weight History
     - `/vaccinations` → Vaccinations
     - `/deworming` → Deworming
     - `/sales` → Sales & Purchases
   - Each stub renders the module title and a simple empty-state placeholder (e.g. a `Card` with "Coming soon" text) using the design-system components. Real forms and tables come in later feature specs.

Out of scope for this step: the PWA manifest, service worker, and install prompt — that's a separate spec.

## Check when done

- `npm run build` completes with no errors.
- Signed in, every nav item routes to its page and the active item is visibly highlighted.
- On a desktop-width window the sidebar is persistent; at an iPhone-width viewport it's hidden behind a hamburger that opens a drawer, and the drawer closes on link tap and on backdrop tap.
- Sign-out is reachable from the shell (sidebar footer, and inside the drawer on phone) and still returns to `/login`.
- Sidebar, top bar, and all stub pages render dark-desert (warm near-black background, sand / terracotta accents, warm off-white text) with no light-mode flash.
- `/login` still renders with no shell around it.

## After this step

- The owner can browse the whole app on both desktop and phone: open each module, confirm the drawer feels right on the iPhone, sign out.
- Update `context/progress-tracker.md`: mark the app shell done.
