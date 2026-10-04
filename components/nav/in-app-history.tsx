"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Spec 13 (Section 10) — "is there a page inside the app to go back to?"
//
// The browser will not say whether its previous history entry belongs to this
// app, so the signed-in shell keeps count itself: once the owner has moved
// from one page to another in this visit, there is an in-app page behind the
// current one and a Back button may use `router.back()`. On a page opened
// directly (a pasted link, a reload) nothing has been counted, and a Back
// button falls back to a fixed route instead of leaving the app.
//
// Module state rather than React state: it has to outlive every page, nothing
// renders from it, and it is only read at the moment a Back button is tapped.

let lastPathname: string | null = null;
let movedBetweenPages = false;

/** True once the owner has navigated from one in-app page to another. */
export function hasInAppHistory(): boolean {
  return movedBetweenPages;
}

/** Mounted once, in the signed-in layout. Renders nothing. */
export function InAppHistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (lastPathname !== null && lastPathname !== pathname) {
      movedBetweenPages = true;
    }
    lastPathname = pathname;
  }, [pathname]);

  return null;
}
