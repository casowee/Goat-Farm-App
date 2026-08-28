import {
  Baby,
  Bug,
  HeartPulse,
  LayoutDashboard,
  PawPrint,
  Pill,
  Scale,
  ShoppingCart,
  Syringe,
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
  { label: "Medicine Records", href: "/medicine", icon: Pill },
  { label: "Health History", href: "/health", icon: HeartPulse },
  { label: "Breeding History", href: "/breeding", icon: Baby },
  { label: "Weight History", href: "/weight", icon: Scale },
  { label: "Vaccinations", href: "/vaccinations", icon: Syringe },
  { label: "Deworming", href: "/deworming", icon: Bug },
  { label: "Sales & Purchases", href: "/sales", icon: ShoppingCart },
];
