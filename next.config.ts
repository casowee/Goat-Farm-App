import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spec 17.1 §7 — public/sw.js is served as a static file, so it would
  // otherwise inherit the default static caching. A service worker must be
  // re-fetched on every update check, or a stale worker could keep serving an
  // old cache after a deploy; the explicit content type keeps hosts that sniff
  // it from serving the file as something the browser refuses to register.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
