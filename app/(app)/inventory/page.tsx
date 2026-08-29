import { createClient } from "@/lib/supabase/server";
import { InventoryItemDialog } from "@/components/inventory/inventory-item-dialog";
import { DeleteInventoryItemDialog } from "@/components/inventory/delete-inventory-item-dialog";
import { StockBadge } from "@/components/inventory/stock-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { medicineCategoryLabel } from "@/lib/inventory/items";
import type { InventoryItem } from "@/app/(app)/inventory/actions";

function formatQuantity(item: InventoryItem): string {
  const qty = Number(item.quantity);
  return item.unit ? `${qty} ${item.unit}` : String(qty);
}

function EmptyState({ type }: { type: "medicine" | "feed" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "medicine" ? "No medicine items yet" : "No feed items yet"}
        </CardTitle>
        <CardDescription>
          {type === "medicine"
            ? "Add a medicine to start tracking its stock."
            : "Add a feed item — hay, pellets, minerals — to track what's on hand."}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function MedicineList({ items }: { items: InventoryItem[] }) {
  if (items.length === 0) return <EmptyState type="medicine" />;

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-copy-primary">
                  {item.name}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {medicineCategoryLabel(item.category)}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {formatQuantity(item)}
                </TableCell>
                <TableCell>
                  <StockBadge item={item} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <InventoryItemDialog
                      item={item}
                      triggerLabel="Edit"
                      triggerVariant="outline"
                      triggerSize="sm"
                    />
                    <DeleteInventoryItemDialog
                      itemId={item.id}
                      itemName={item.name}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:hidden">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{item.name}</CardTitle>
                <StockBadge item={item} />
              </div>
              <CardDescription>
                {medicineCategoryLabel(item.category)} · {formatQuantity(item)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <InventoryItemDialog
                item={item}
                triggerLabel="Edit"
                triggerVariant="outline"
                triggerSize="sm"
              />
              <DeleteInventoryItemDialog itemId={item.id} itemName={item.name} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function FeedList({ items }: { items: InventoryItem[] }) {
  if (items.length === 0) return <EmptyState type="feed" />;

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-copy-primary">
                  {item.name}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {formatQuantity(item)}
                </TableCell>
                <TableCell>
                  <StockBadge item={item} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <InventoryItemDialog
                      item={item}
                      triggerLabel="Edit"
                      triggerVariant="outline"
                      triggerSize="sm"
                    />
                    <DeleteInventoryItemDialog
                      itemId={item.id}
                      itemName={item.name}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:hidden">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{item.name}</CardTitle>
                <StockBadge item={item} />
              </div>
              <CardDescription>{formatQuantity(item)}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <InventoryItemDialog
                item={item}
                triggerLabel="Edit"
                triggerVariant="outline"
                triggerSize="sm"
              />
              <DeleteInventoryItemDialog itemId={item.id} itemName={item.name} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export default async function InventoryPage() {
  const supabase = await createClient();
  // RLS scopes this to the signed-in owner's inventory only.
  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name");

  const all = items ?? [];
  const medicine = all.filter((item) => item.type === "medicine");
  const feed = all.filter((item) => item.type === "feed");

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-copy-primary">Inventory</h1>
      </div>

      <Tabs defaultValue="medicine">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="medicine">
              Medicine ({medicine.length})
            </TabsTrigger>
            <TabsTrigger value="feed">Feed ({feed.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="medicine" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <InventoryItemDialog
              triggerLabel="Add medicine"
              triggerIcon
              defaultType="medicine"
            />
          </div>
          <MedicineList items={medicine} />
        </TabsContent>

        <TabsContent value="feed" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <InventoryItemDialog
              triggerLabel="Add feed"
              triggerIcon
              defaultType="feed"
            />
          </div>
          <FeedList items={feed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
