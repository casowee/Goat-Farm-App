# Spec 17.1 — Service Worker Caching (Stale-While-Revalidate)

**Phase:** 6 · **Spec:** 17 — Loading speed · **Status:** `in-progress` (started 2026-09-27)
**Depends on:** Spec 02 (auth / `proxy.ts`), Spec 12 (PWA app-shell config)
**Followed by:** 17.2 Query optimization, 17.3 Skeleton screens

---

## 1. Goal

When the user opens the installed PWA on their iPhone, the last-seen page appears **instantly from cache**, while fresh data loads in the background and silently replaces it. No blank white screen, no waiting on barn signal just to see the app.

This spec targets **app open and page reload speed**. In-app navigation speed is handled by 17.2 and 17.3.

## 2. Current state (agent must verify before coding)

The agent must audit and report on the following before writing any code:

- Whether a service worker already exists (`public/sw.js` or similar) and whether anything registers one. Spec 12 added PWA app-shell config, but it may only include the manifest.
- The location and contents of the web manifest.
- The `matcher` in `proxy.ts`, since `/sw.js`, `/offline`, the manifest, and icons must **not** be auth-redirected.
- How sign-out is implemented (server action, route handler, or client call).

If a service worker already exists, the agent must **stop and ask** before replacing or extending it.

## 3. Scope

**In scope**
- A hand-written service worker at `public/sw.js`
- Registration from a client component mounted once in the root layout (production only)
- Stale-while-revalidate for full page loads (document navigations) of authenticated app routes
- Cache-first for content-hashed static assets (`/_next/static/*`)
- Background revalidation that triggers `router.refresh()` so the visible page updates to fresh data
- A static `/offline` fallback page
- Clearing all app caches on sign-out
- Correct headers for `sw.js` in `next.config`

**Out of scope**
- Caching client-side navigation (RSC) requests. These stay network-only; see decision D2.
- Offline writes and sync queues (17.13)
- Skeleton screens (17.3)
- Push notifications
- Any change to database schema, RLS, or Supabase config

## 4. Design decisions

**D1 — Hand-written service worker, no plugin.**
Next.js 16 builds with Turbopack by default, and plugin-based PWA tools hook into the build pipeline. A small hand-written `public/sw.js` has no build dependency and is fully readable. Do not install `next-pwa`, Serwist, Workbox, or similar without asking.

**D2 — Cache full page loads only, not RSC payloads.**
App Router client navigations fetch RSC payloads whose responses depend on router-state headers. Caching them risks serving mismatched trees. Only `request.mode === 'navigate'` requests (app open, reload, deep link) get stale-while-revalidate. Requests with an `RSC` header or a `_rsc` query param go straight to the network.

**D3 — Stale data is shown briefly, then refreshed.**
A cached page may briefly show outdated numbers, such as a herd total from before a goat was marked sold. This is acceptable **only because** the page refreshes itself as soon as fresh data arrives (§6). No stale page may remain on screen without triggering a refresh.

**D4 — Never cache anything unsafe.**
The service worker must never cache:
- Non-GET requests, including all server actions
- Responses where `response.redirected === true` or the status isn't 200. Serving a redirected response for a navigation fails in iOS Safari.
- `/login`, `/auth/*`, `/api/*`
- Any cross-origin request, including all Supabase URLs (auth, REST, storage)

**D5 — Sign-out wipes caches.**
Cached pages contain farm data. On sign-out, all caches owned by the service worker are deleted **before** the sign-out request runs.

## 5. Caching strategy

| Request | Strategy | Cache name | Limit |
|---|---|---|---|
| `/_next/static/*` | Cache-first (content-hashed, immutable) | `static-v{N}` | ~200 entries |
| Icons, manifest, fonts under `/public` | Stale-while-revalidate | `static-v{N}` | shared |
| Document navigations to app routes | Stale-while-revalidate | `pages-v{N}` | ~30 entries, oldest evicted |
| RSC requests (`RSC` header or `_rsc` param) | Network-only | — | — |
| Non-GET, cross-origin, excluded paths | Network-only (not intercepted) | — | — |
| Navigation with no network and no cache | Serve precached `/offline` | `static-v{N}` | — |

`{N}` is a `CACHE_VERSION` constant at the top of `sw.js`. On `activate`, delete every cache whose name doesn't end in the current version. Bump the version whenever the caching logic changes.

## 6. Revalidation → visible refresh flow

1. User opens the app. The service worker serves the cached document for that URL immediately.
2. In parallel, the service worker fetches the same URL from the network.
3. If the response is cacheable (D4), it updates `pages-v{N}` and then `postMessage`s all clients: `{ type: 'PAGE_REVALIDATED', url }`.
4. A client component (`components/pwa/sw-bridge.tsx`) listens for that message. If `url` matches the current pathname, it calls `router.refresh()` once.
5. If the network response is a redirect to `/login` (expired session), nothing is cached. On the next navigation, `proxy.ts` sends the user to login as normal.

On a cache miss, the service worker falls through to the network and caches the result without messaging.

## 7. Registration and lifecycle

- `sw-bridge.tsx` registers `/sw.js` with scope `/`, **only when** `process.env.NODE_ENV === 'production'` and `'serviceWorker' in navigator`.
- `install`: precache `/offline` only, then `self.skipWaiting()`.
- `activate`: purge old-version caches, then `self.clients.claim()`.
- `next.config` headers for `/sw.js`:
  - `Content-Type: application/javascript; charset=utf-8`
  - `Cache-Control: no-cache, no-store, must-revalidate`
- `proxy.ts` matcher must exclude `/sw.js`, `/offline`, the manifest, and icon paths.

## 8. Offline page

- Route: `app/offline/page.tsx`, fully static with no data fetching and no auth
- Desert dark theme tokens and centered layout at iPhone width
- Message along the lines of "No connection — pages you've opened recently are still available," plus a **Try again** button that reloads

## 9. Sign-out cache clearing

Before the existing sign-out logic runs, the sign-out control must:
1. Call `caches.keys()` and `caches.delete()` for every key (client-side, no service worker message needed).
2. Then proceed with the existing Supabase sign-out and redirect.

If sign-out is currently a pure server action triggered by a form, the agent must **stop and ask** how to wrap it rather than restructuring auth on its own.

## 10. Files

| File | Action |
|---|---|
| `public/sw.js` | Create |
| `components/pwa/sw-bridge.tsx` | Create — registration + `PAGE_REVALIDATED` listener |
| `app/layout.tsx` | Mount `<SwBridge />` once |
| `app/offline/page.tsx` | Create |
| `next.config.*` | Add `sw.js` headers |
| `proxy.ts` | Adjust matcher exclusions only |
| Sign-out component/action | Add cache clearing (§9) |

No other files should change. No new npm dependencies.

## 11. Dashboard steps

None. No Supabase or Vercel dashboard changes are required.

## 12. Verification (on iPhone, installed PWA)

**Baseline first:** before deploying, time a cold open (app fully closed → dashboard content visible) three times on normal signal. Record the times in Implementation Notes.

| # | Test | Expected |
|---|---|---|
| V1 | `next build` passes, no type or lint errors | ✅ |
| V2 | Deploy, open app, close fully, reopen | Dashboard content appears near-instantly with no blank screen; record the time |
| V3 | Open dashboard, then goats list, then a goat detail. Close the app, turn on Airplane Mode, reopen | Last pages show from cache |
| V4 | Airplane Mode on, open a page never visited before | `/offline` page shows, not a Safari error |
| V5 | Mark a test goat as sold on the goat page. Reopen the dashboard | Old total may flash briefly, then updates to the correct total without manual refresh |
| V6 | Sign out, turn on Airplane Mode, reopen app | No farm data visible from cache |
| V7 | Deploy any small visible change, reopen app twice | New version is live by the second open at the latest |
| V8 | Save any record (e.g. a health event) | Save works exactly as before |
| V9 | Visit `/sw.js` directly while logged out | Returns JavaScript, not a login redirect |

## 13. Risks

- **Stale herd totals** (domain rule: sold/deceased/stolen never counted). Mitigated by D3 and V5. Stale pages must always self-refresh.
- **Deploy skew.** A cached old page may run briefly against a new deployment. V7 covers this.
- **Auth leakage after sign-out.** Mitigated by D5 and V6.

## 14. Implementation Notes

_(Agent fills this in after implementation: baseline vs. after timings, audit findings from §2, deviations, anything learned.)_
