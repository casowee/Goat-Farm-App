"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Spec 17.1 §6/§7 — registers the service worker and closes the loop on its
// stale-while-revalidate: when public/sw.js reports that the page the user is
// looking at has been refreshed in the background, re-render it with the fresh
// data so a stale page never stays on screen (spec D3). Renders nothing.
export function SwBridge() {
  const router = useRouter();
  const pathname = usePathname();

  // Registration is deliberately production-only: in `next dev` a service
  // worker would serve cached HTML over the dev server's live output.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration failing is never fatal — the app just runs uncached.
    });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshed = false;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (!data || data.type !== "PAGE_REVALIDATED" || !data.url) return;

      // Only refresh when the revalidated document is the one on screen.
      let revalidatedPath: string;
      try {
        revalidatedPath = new URL(data.url, window.location.href).pathname;
      } catch {
        return;
      }
      if (revalidatedPath !== pathname) return;

      if (refreshed) return;
      refreshed = true;
      router.refresh();
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [pathname, router]);

  return null;
}
