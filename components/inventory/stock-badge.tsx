import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { stockStatus, type StockLevel } from "@/lib/inventory/stock";

/**
 * The single stock indicator for an inventory row. "Out of stock" (error) when
 * the quantity is at or below zero; "Low stock" (warning) when a threshold is
 * set and the quantity has fallen to or below it; nothing when the item is
 * comfortably stocked. Uses `stockStatus()` / `isLowStock()` from
 * `lib/inventory/stock.ts` — the same helper the spec 12 dashboard reuses.
 */
export function StockBadge({ item }: { item: StockLevel }) {
  const status = stockStatus(item);
  if (status === "ok") return null;

  return (
    <Badge
      className={
        status === "out"
          ? "bg-error/15 text-error"
          : "bg-warning/15 text-warning"
      }
    >
      <TriangleAlert className="h-3 w-3" />
      {status === "out" ? "Out of stock" : "Low stock"}
    </Badge>
  );
}
