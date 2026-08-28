Read `AGENTS.md`, `context/ui-context.md`, and `context/code-standards.md` before starting.

Runs after `03-app-shell.md`. We're adding the first real data module: the `barns` table with owner-scoped RLS, generated TypeScript types, and full CRUD (name, category, notes). Barns come before goats because a goat belongs to a barn — and because this is the first CRUD module, it sets the pattern every later module copies.

## Goal

Build barns end to end and, in doing so, establish the CRUD template for the rest of the app. That means three things: a `barns` table owned per-user and protected by RLS keyed on `auth.uid()`; TypeScript types generated from the schema and wired into the Supabase clients so every query is type-checked; and a `/barns` screen where the owner can list, add, edit, and delete barns. Goats (next spec) reference these barns, so this has to be solid first.

## Tasks

1. **`barns` table (Supabase SQL editor).**
   - Owner-scoped, per the plan. Use `bigserial` for the id to match the existing tables' convention; `owner_id` is a uuid because it references `auth.users`.
     ```sql
     create table public.barns (
       id bigserial primary key,
       owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
       name text not null,
       category text,
       notes text,
       created_at timestamptz not null default now(),
       updated_at timestamptz not null default now()
     );

     alter table public.barns enable row level security;

     create policy "owner full access" on public.barns
       for all to authenticated
       using (auth.uid() = owner_id)
       with check (auth.uid() = owner_id);
     ```
   - Because `owner_id` defaults to `auth.uid()`, the app never has to send it — the logged-in user is stamped on automatically, and RLS makes sure each owner only ever sees their own barns.
   - This owner-scoped pattern is the new standard. The 8 earlier tables still use the simpler authenticated-only policy from step 02; migrating them to owner scope is a later, separate job — not this spec.

2. **Generated types.**
   - Set up type generation so it's repeatable: add a script to `package.json`, e.g. `"gen:types": "supabase gen types typescript --project-id <your-project-ref> --schema public > types/database.types.ts"`. This generation covers *all* tables at once, not just barns.
   - Running it needs a Supabase personal access token — getting one is an owner step (see manual steps). It's provided to the environment as `SUPABASE_ACCESS_TOKEN`, used once, then revoked. Never log, print, or commit it.
   - Generate `types/database.types.ts`. If the token genuinely isn't available, hand-write the `barns` row types into that file matching the schema above so nothing is blocked, and leave a `// TODO: regenerate` note — a real generation later overwrites it authoritatively.
   - Wire the `Database` type into both Supabase clients from step 02: `createBrowserClient<Database>(...)` and `createServerClient<Database>(...)`, so queries are type-safe from here on.

3. **Add Barns to navigation.**
   - Add a `Barns` item to the existing nav config from step 03 (label, `/barns`, a lucide icon). Do not create a second, parallel nav list. Since barns are setup data goats depend on, it can sit near the top or in a setup group — a plain nav item is fine for now.

4. **Barns route — list (`app/(app)/barns/page.tsx`).**
   - Server Component. Read the current user's barns via the server client (RLS already limits results to the owner) and render them.
   - Use the design-system components: a `Card` per barn (or a simple table) showing name, category, and notes, each with edit and delete controls.
   - Empty state when there are no barns: a `Card` prompting "Add your first barn."

5. **Create / edit / delete (server actions).**
   - `app/(app)/barns/actions.ts` — `createBarn`, `updateBarn`, `deleteBarn` Server Actions using the server client. Each calls `revalidatePath('/barns')` on success so the list refreshes.
   - Insert must NOT set `owner_id` (the column default handles it). Update and delete rely on RLS to scope to the owner.
   - Return readable errors rather than throwing raw Supabase errors at the UI.

6. **Barn form (`components/barns/barn-form-dialog.tsx`).**
   - Client component. A `Dialog` (from step 01) holding the form: `Input` for name (required), `Input` for category, `Textarea` for notes.
   - Reused for both add (empty) and edit (pre-filled). Submitting calls the matching server action; show a pending/loading state and surface any returned error inline.
   - Delete goes through a confirmation `Dialog` before calling `deleteBarn`.

7. **Establish the pattern.**
   - This shape — server-component list + server-action mutations + a dialog form + generated types — is the template every later module (goats first) will copy. Keep the file/folder layout clean and consistent with `code-standards.md` so it's easy to replicate.
   - Note for the goats spec: goats will foreign-key to `barns`, so that spec will decide what happens to a barn's goats when a barn is deleted (restrict vs. set null). Not handled here, since nothing references barns yet.

## Check when done

- `npm run build` completes with no errors, and Supabase queries are type-checked against `Database` — a deliberately wrong column name should fail the build.
- Signed in, `/barns` lists the owner's barns and shows the empty state when there are none.
- Adding a barn (name required) makes it appear in the list; category and notes are optional.
- Editing a barn updates it; deleting removes it after a confirmation.
- If a second account is tested, it never sees the first account's barns — RLS holds.
- The Barns nav item works and the page renders dark-desert with no light-mode flash.

## Manual steps for the owner

1. Run the `barns` table + RLS SQL from task 1 in the Supabase SQL editor (should return "Success. No rows returned").
2. For type generation: Supabase dashboard → Account → Access Tokens → create a token; provide it to the agent's environment as `SUPABASE_ACCESS_TOKEN`, and note your project ref (Project Settings → General). After the types are generated, you can revoke the token.

## After this step

- The owner can add a few real barns in the browser — these are the barns goats get assigned to in the next spec.
- Update `context/progress-tracker.md`: mark barns done.
