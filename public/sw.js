// Minimal service worker — enables "Add to Home Screen" install behavior.
// Data is stored in localStorage, so no offline caching is required yet.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", () => {
  // pass-through — no caching for now
});
