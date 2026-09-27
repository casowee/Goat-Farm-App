import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockLevelsWidget } from "@/components/dashboard/stock-levels-widget";
import { listInventoryItems } from "@/lib/inventory/queries";

/**
 * Spec 17.3 (§5C) — low and out-of-stock inventory.
 *
 * One query, farm-wide, and already a `cache()`d reader from spec 17.2 — so this
 * is the cheapest section on the page and typically the first to paint.
 */
export async function StockLevelsSection() {
  const inventory = await listInventoryItems();

  return (
    <Card className="rounded-2xl min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Stock levels</CardTitle>
        <CardDescription>
          Low or out-of-stock inventory items (farm-wide — not affected by the
          barn filter).
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        <StockLevelsWidget items={inventory} />
      </CardContent>
    </Card>
  );
}
