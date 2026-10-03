import { navItems, type NavItem } from "@/lib/nav";

// Spec 18.2 — the five slots of the mobile bottom tab bar.
//
// Each tab is looked up in `navItems` by its route rather than restated here,
// so a tab's label, path and icon can never drift from the sidebar entry for
// the same section.

function tab(href: string): NavItem {
  const item = navItems.find((navItem) => navItem.href === href);
  if (!item) throw new Error(`No nav item for tab route "${href}"`);
  return item;
}

/**
 * The bar always lays out five equal columns. `null` is a reserved slot: it
 * holds its space but renders nothing, so the four tabs keep their final
 * positions and filling slot 5 later is a one-line change here.
 */
export const tabSlots: (NavItem | null)[] = [
  tab("/"),
  tab("/goats"),
  tab("/health"),
  tab("/breeding"),
  null,
];

/**
 * A tab is active for its whole section, so a goat's detail page
 * (`/goats/12`) still highlights Goat Records. The dashboard is the one exact
 * match — every path starts with "/".
 */
export function isTabActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
