"use client";

import { useEffect } from "react";

/**
 * Spec 18.1 (§4A, "iOS quirk") — makes `:active` fire on touch in iOS Safari.
 *
 * Safari only applies `:active` styles to a touched element when the document
 * has at least one touch listener attached; without one, every pressed state in
 * the app would work on desktop and silently do nothing on the iPhone, which is
 * the device this spec exists for.
 *
 * The listener is deliberately empty and passive: it never reads the event,
 * never calls `preventDefault`, and never blocks scrolling. It exists purely so
 * Safari turns the pressed states on. Nothing else in the app changes.
 *
 * Added up front rather than waiting for the iPhone check to fail, because the
 * quirk is well established and a no-op listener costs nothing. If the pressed
 * states turn out to work without it on the tested iOS version, this component
 * can be deleted with no other change.
 */
export function TouchActiveBridge() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
