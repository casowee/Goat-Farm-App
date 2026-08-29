import { isLowStock, isOutOfStock } from "@/lib/inventory/stock";
import { StockBadge } from "@/components/inventory/stock-badge";
import type { InventoryItem } from "@/app/(app)/inventory/actions";

function formatQuantity(item: InventoryItem): string {
  const qty = Number(item.quantity);
  return item.unit ? `${qty} ${item.unit}` : String(qty);
}

/**
 * Inventory items that need attention — out of stock (quantity at or below
 * zero) or at/below their low-stock threshold. Reuses `isLowStock()` /
 * `isOutOfStock()` from spec 10 verbatim; no new logic. This widget is
 * farm-wide and is **not** affected by the dashboard barn filter (inventory
 * isn't barn-scoped).
 */
export function StockLevelsWidget({ items }: { items: InventoryItem[] }) {
  const flagged = items
    .filter((item) => isOutOfStock(item) || isLowStock(item))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (flagged.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        Every tracked item is above its low-stock threshold.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {flagged.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 border-t border-surface-border py-2 first:border-t-0 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-copy-primary">
              {item.name}
            </p>
            <p className="text-xs text-copy-muted">{formatQuantity(item)}</p>
          </div>
          <StockBadge item={item} />
        </li>
      ))}
    </ul>
  );
}
