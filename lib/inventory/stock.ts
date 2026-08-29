/**
 * Spec 10 — Inventory low-stock logic. Pure functions, no React and no
 * Supabase, so the spec 12 dashboard stock-levels widget reuses this rather
 * than re-deriving the same rules.
 *
 * Quantity is a directly-edited number (owner's decision, 2026-08-29) — the
 * owner types the current amount after a stock count or a purchase. Nothing
 * auto-decrements it, so these checks only ever read the stored value.
 */

/** The shape any stock check needs — a subset of an `inventory_items` row. */
export interface StockLevel {
  quantity: number;
  low_stock_threshold: number | null;
}

/**
 * True when the item has a low-stock threshold set and its quantity has fallen
 * to or below it. An item with no threshold is never "low" by this rule — use
 * {@link isOutOfStock} to catch a zero quantity regardless of threshold.
 */
export function isLowStock(item: StockLevel): boolean {
  return (
    item.low_stock_threshold != null &&
    Number(item.quantity) <= Number(item.low_stock_threshold)
  );
}

/** True when there is nothing left (quantity at or below zero). */
export function isOutOfStock(item: StockLevel): boolean {
  return Number(item.quantity) <= 0;
}

export type StockStatus = "out" | "low" | "ok";

/**
 * The single badge an inventory row should show. "out" wins over "low" when an
 * item is both (zero quantity with a threshold set).
 */
export function stockStatus(item: StockLevel): StockStatus {
  if (isOutOfStock(item)) return "out";
  if (isLowStock(item)) return "low";
  return "ok";
}
