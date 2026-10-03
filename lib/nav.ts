import {
  Baby,
  BookOpenText,
  HeartPulse,
  LayoutDashboard,
  Package,
  Scale,
  ShoppingCart,
  Stethoscope,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Barns", href: "/barns", icon: Warehouse },
  { label: "Goat Records", href: "/goats", icon: BookOpenText },
  // Spec 10 repurposed the `/medicine` stub into farm-wide Inventory.
  { label: "Inventory", href: "/inventory", icon: Package },
  // UPD-016 — "Health History" retired: that label sat on spec 03's stub and
  // never held real content. The route is now the real farm-wide Health page
  // (History + Schedule tabs), so the label is simply "Health".
  { label: "Health", href: "/health", icon: HeartPulse },
  // Spec 15 — the Doctor module: static, non-diagnostic condition reference plus
  // this farm's own "what worked before" treatment history per condition.
  { label: "Health Reference", href: "/doctor", icon: Stethoscope },
  { label: "Breeding History", href: "/breeding", icon: Baby },
  { label: "Weight History", href: "/weight", icon: Scale },
  // The `/vaccinations` and `/deworming` stubs were removed in spec 10 —
  // spec 07 made both of those record types per-goat entries on the Health tab,
  // so the top-level pages were dead ends.
  { label: "Sales & Purchases", href: "/sales", icon: ShoppingCart },
];
