"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isTabActive, tabSlots } from "@/components/nav/tab-config";
import { cn } from "@/lib/utils";

// Spec 18.2 — the floating glass tab bar, phone only.
//
// It is hidden on desktop with CSS (`md:hidden`, the same 768px breakpoint the
// sidebar switches at) rather than with `useIsMobile()`: that hook reports
// "not mobile" until after hydration, which would make the bar pop in a beat
// late on exactly the devices it exists for.
//
// The material, the sliding bubble and the reduced-motion rules live in
// `globals.css` (`tab-bar-glass`, `tab-bar-bubble`).

/**
 * True for anything that brings up the on-screen keyboard (or the iOS picker
 * wheel, for a native select). Checkboxes, radios and buttons are inputs too
 * but open nothing, so they must not hide the bar.
 */
const KEYBOARD_INPUT_TYPES_EXCLUDED = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function opensKeyboard(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) {
    return !KEYBOARD_INPUT_TYPES_EXCLUDED.has(target.type);
  }
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/** §4E — the bar steps out of the way while a field has focus. */
function useKeyboardOpen(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) =>
      setKeyboardOpen(opensKeyboard(event.target));
    // `relatedTarget` is where focus is going, so moving from one field
    // straight to the next keeps the bar hidden instead of flashing it.
    const onFocusOut = (event: FocusEvent) =>
      setKeyboardOpen(opensKeyboard(event.relatedTarget));

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return keyboardOpen;
}

export function BottomTabBar() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();

  const activeIndex = tabSlots.findIndex(
    (slot) => slot !== null && isTabActive(slot.href, pathname),
  );

  // §4C — tapping the tab for the page already on screen scrolls it back to
  // the top, as a native tab bar does. From deeper in the section (a goat's
  // detail page) the tap is left alone and navigates to the section's list.
  const scrollToTopIfCurrent = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (pathname !== href) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <nav
      aria-label="Main"
      inert={keyboardOpen}
      data-hidden={keyboardOpen || undefined}
      className="tab-bar-glass fixed inset-x-4 bottom-(--tab-bar-offset) z-40 mx-auto h-(--tab-bar-height) max-w-100 rounded-full px-2 md:hidden"
    >
      <div className="relative grid h-full grid-cols-5 items-center">
        {/* One bubble for the whole bar, moved under the active tab — moving a
            single element is what lets it slide rather than blink between tabs.
            It is exactly one column wide, so translating it by its own width
            steps it one tab along. */}
        <span
          aria-hidden="true"
          data-active={activeIndex >= 0 || undefined}
          className="tab-bar-bubble pointer-events-none absolute inset-y-0 left-0 flex w-1/5 items-center justify-center"
          style={
            {
              "--tab-index": Math.max(activeIndex, 0),
            } as CSSProperties
          }
        >
          <span className="tab-bar-bubble-fill h-11 w-14 rounded-full" />
        </span>

        {tabSlots.map((slot, index) => {
          // §4F — a reserved slot keeps its column but is invisible to
          // assistive tech and cannot take focus.
          if (slot === null) {
            return <span key={`reserved-${index}`} aria-hidden="true" />;
          }

          const isActive = index === activeIndex;

          return (
            <Link
              key={slot.href}
              href={slot.href}
              aria-label={slot.label}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => scrollToTopIfCurrent(event, slot.href)}
              className={cn(
                "tappable mx-auto flex h-11 w-14 items-center justify-center rounded-full transition-colors",
                isActive ? "text-brand" : "text-copy-muted",
              )}
            >
              <slot.icon className="size-6" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
