Read `AGENTS.md`, `context/ui-context.md`, and `context/code-standards.md` before starting.

Runs after `01-design-system.md`. We're implementing authentication: Supabase email/password login, cookie-based sessions via middleware, protected routes, and a polished login page built on the design-system tokens.

## Goal

Put a real auth gate in front of the app. Right now every request reaches Supabase as the anonymous role, which RLS blocks — that's the error stopping new goat records from being created. Wire up Supabase email/password auth with cookie-based sessions so authenticated requests carry `auth.uid()`, guard every route except `/login`, and build a login page that matches the desert theme from step 01.

The app has a single owner, so account creation happens in the Supabase dashboard — the app itself only signs in and signs out. No public sign-up flow.

## Tasks

1. **Environment variables.**
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, and set the same two in the Vercel project (Settings → Environment Variables), since production builds run there.
   - Only the anon / publishable key belongs in the client. The `service_role` / secret key must never appear in the repo or in any `NEXT_PUBLIC_*` variable.
   - Keep `.env.local` in `.gitignore`. If the current anon key was ever pasted into a chat or committed to git, rotate it in the Supabase dashboard (Project Settings → API) and update both `.env.local` and Vercel. (The anon key is public by design and protected by RLS, so this is precautionary, not urgent.)

2. **Supabase clients (`@supabase/ssr`).**
   - Install `@supabase/ssr` and `@supabase/supabase-js` (confirm these are still the current packages for Next.js App Router auth at install time).
   - `lib/supabase/client.ts` — a `createClient()` using `createBrowserClient`, for Client Components.
   - `lib/supabase/server.ts` — a `createClient()` using `createServerClient` wired to `cookies()` from `next/headers`, for Server Components, Server Actions, and Route Handlers.
   - `lib/supabase/middleware.ts` — an `updateSession(request)` helper that refreshes the auth token and returns the response with updated cookies.

3. **Middleware (`middleware.ts`).**
   - Call `updateSession` on every request so the session cookie stays fresh.
   - If there is no session and the path isn't `/login` (or a public asset), redirect to `/login`.
   - If there *is* a session and the path is `/login`, redirect to `/` (home).
   - Set the `matcher` to skip static files, images, and favicon.

4. **Auth actions.**
   - `app/login/actions.ts` — a `login(formData)` Server Action that reads email + password, calls `signInWithPassword` on the server client, and on success `redirect('/')`; on failure returns a readable error string (don't throw raw Supabase errors at the user).
   - A `signOut()` Server Action (co-locate here or in `lib/actions/auth.ts`) that calls `supabase.auth.signOut()` and redirects to `/login`.

5. **Login page (`app/login/page.tsx`).**
   - Build it on the design-system components from step 01: a `Card` centered on the `bg-base` background, `Input` fields for email and password, a primary `Button` to submit.
   - Farm logo placeholder at the top — a simple mark or text block for now; the real logo comes later.
   - Loading state: disable the button and show a spinner / loading animation while the action is pending (`useFormStatus` or a pending flag).
   - Error state: render the action's error message using the theme's danger / error state color; a bad password shows the message inline, it never crashes the page.
   - Everything reads dark-desert — no light-mode flash on first paint.

6. **Protect the app routes.**
   - Middleware handles the redirect, but add a server-side check for defense in depth: in the root (or app) layout, read the session on the server and `redirect('/login')` if it's absent.
   - Make sure `/login` itself is reachable without a session.

7. **Sign-out control.**
   - Add a sign-out button to the app header / nav that calls the `signOut()` action.

8. **RLS policies (Supabase SQL editor).**
   - The tables already have RLS on with policies that require an authenticated user — that's exactly why anon requests fail today. Now that real sessions exist, confirm each of the 8 tables (goat records, medicine records, health history, breeding history, weight history, vaccinations, deworming, sales & purchases) grants full CRUD `to authenticated`.
   - Simplest correct form for a single-owner app, per table:
     ```sql
     alter table <table> enable row level security;

     create policy "authenticated full access"
       on <table> for all
       to authenticated
       using (true)
       with check (true);
     ```
   - If per-user isolation is ever needed later, add a `user_id uuid default auth.uid() references auth.users` column and switch the policy to `using (auth.uid() = user_id)`. Not required for a single owner.

## Check when done

- `npm run build` completes with no errors.
- Visiting any app route while signed out redirects to `/login`.
- Signing in with the owner's Supabase credentials lands on the home page; a wrong password shows an inline error, not a crash.
- The session survives a full page refresh (cookie-based).
- Creating a new goat record now succeeds — the RLS error is gone.
- Sign-out returns to `/login` and re-blocks the app routes.
- `/login` renders dark-desert (warm near-black background, sand / terracotta accents, warm off-white text) with no light-mode flash.

## After this step

- The owner can review the full login flow in the browser: sign in, create a record, sign out.
- Update `context/progress-tracker.md`: mark auth and login done.
