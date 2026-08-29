import {
  Baby,
  HeartPulse,
  LayoutDashboard,
  Package,
  PawPrint,
  Scale,
  ShoppingCart,
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
  { label: "Goat Records", href: "/goats", icon: PawPrint },
  // Spec 10 repurposed the `/medicine` stub into farm-wide Inventory.
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Health History", href: "/health", icon: HeartPulse },
  { label: "Breeding History", href: "/breeding", icon: Baby },
  { label: "Weight History", href: "/weight", icon: Scale },
  // The `/vaccinations` and `/deworming` stubs were removed in spec 10 —
  // spec 07 made both of those record types per-goat entries on the Health tab,
  // so the top-level pages were dead ends.
  { label: "Sales & Purchases", href: "/sales", icon: ShoppingCart },
];
