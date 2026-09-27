// Goat Farm Manager — service worker (Spec 17.1)
//
// Hand-written on purpose (spec D1): Next 16 builds with Turbopack and the
// plugin-based PWA tools hook into the build pipeline, so a plain file in
// /public has no build dependency and stays readable.
//
// Strategy summary (spec §5):
//   /_next/static/*        cache-first   (content-hashed, immutable)
//   public icons/fonts     stale-while-revalidate
//   document navigations   stale-while-revalidate + PAGE_REVALIDATED message
//   RSC payloads           network-only  (spec D2)
//   everything else        not intercepted at all

// Bump this whenever the caching logic below changes: `activate` deletes every
// cache whose name doesn't carry the current version.
const CACHE_VERSION = 1;

const STATIC_CACHE = `static-v${CACHE_VERSION}`;
const PAGES_CACHE = `pages-v${CACHE_VERSION}`;

const OFFLINE_URL = "/offline";

// Rough caps; oldest entries (insertion order, which is what the Cache API
// preserves in keys()) are evicted once a cache grows past its limit.
const PAGES_LIMIT = 30;
const STATIC_LIMIT = 200;

// ---------------------------------------------------------------------------
// Install / activate
// ---------------------------------------------------------------------------

// Precache only the offline fallback — nothing else is known ahead of time.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })()
  );
});

// Drop every cache from an older CACHE_VERSION, then take over open pages.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Keep a cache from growing without bound. Cache.keys() returns requests in
// insertion order, so the front of the list is the oldest entry.
async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

// Auth and API routes are never cached (spec D4).
function isExcludedPath(pathname) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/")
  );
}

// App Router client navigations fetch RSC payloads whose responses depend on
// router-state headers — caching them risks serving a mismatched tree (D2).
function isRscRequest(request, url) {
  return request.headers.has("RSC") || url.searchParams.has("_rsc");
}

// Only a plain, non-redirected HTML 200 is safe to store for a navigation:
// replaying a redirected response for a navigation fails in iOS Safari (D4).
function isCacheableDocument(response) {
  if (!response || response.status !== 200 || response.redirected) return false;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/html");
}

// Static assets served straight out of /public.
function isPublicAsset(pathname) {
  return (
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname === "/manifest-icon" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$/.test(pathname)
  );
}

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

// Content-hashed build output never changes under the same URL.
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200 && !response.redirected) {
    await cache.put(request, response.clone());
    trimCache(STATIC_CACHE, STATIC_LIMIT);
  }
  return response;
}

// Serve the cached asset immediately, refresh it in the background.
async function staleWhileRevalidateAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200 && !response.redirected) {
        await cache.put(request, response.clone());
        trimCache(STATIC_CACHE, STATIC_LIMIT);
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;
  const network = await networkFetch;
  return network || Response.error();
}

// Tell every open page that a document it may be showing has been refreshed,
// so sw-bridge.tsx can call router.refresh() (spec §6).
async function notifyClients(url) {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "PAGE_REVALIDATED", url });
  }
}

// The core of this spec: show the last-seen page instantly, then quietly swap
// in fresh data (spec D3 — a stale page must never sit there un-refreshed).
async function staleWhileRevalidatePage(request) {
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(async (response) => {
      if (isCacheableDocument(response)) {
        await cache.put(request, response.clone());
        trimCache(PAGES_CACHE, PAGES_LIMIT);
        // Only worth a refresh if the user is already looking at a stale copy.
        if (cached) await notifyClients(request.url);
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;

  const network = await networkFetch;
  if (network) return network;

  // No cache, no network — the offline fallback (precached on install).
  const offline = await caches.match(OFFLINE_URL, { cacheName: STATIC_CACHE });
  return offline || Response.error();
}

// ---------------------------------------------------------------------------
// Fetch routing — order matters
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Server actions and every other write stay untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin, which covers every Supabase auth/REST/storage call.
  if (url.origin !== self.location.origin) return;

  // Auth and API routes.
  if (isExcludedPath(url.pathname)) return;

  // RSC payloads: network-only, never cached (D2).
  if (isRscRequest(request, url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Immutable build output.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Icons, manifest and fonts out of /public.
  if (isPublicAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidateAsset(request));
    return;
  }

  // Full page loads: app open, reload, deep link.
  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidatePage(request));
  }
});
