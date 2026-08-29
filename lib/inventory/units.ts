/**
 * Spec 10 — the allowed values for an inventory item's Unit field.
 *
 * The owner chose a fixed dropdown over free text (2026-08-29) for consistency,
 * so the set of units is closed and validated server-side. The list is
 * type-aware: medicine and feed are measured differently. Unit stays optional —
 * the 13 forward-provisioned drugs were seeded with no unit and must not be
 * forced to have one.
 */
import type { InventoryItemType } from "@/lib/inventory/items";

export const MEDICINE_UNITS: string[] = [
  "ml",
  "litres",
  "mg",
  "g",
  "vials",
  "bottles",
  "sachets",
  "tablets",
  "boluses",
  "doses",
  "tubes",
];

export const FEED_UNITS: string[] = [
  "kg",
  "g",
  "litres",
  "bags",
  "sacks",
  "bales",
  "scoops",
];

/** The units offered for a given item type. */
export function unitsForType(type: InventoryItemType): string[] {
  return type === "feed" ? FEED_UNITS : MEDICINE_UNITS;
}

/** Every unit across both types, deduplicated — used for lenient validation. */
export const ALL_UNITS: string[] = [
  ...new Set([...MEDICINE_UNITS, ...FEED_UNITS]),
];

/**
 * True when `value` is a unit this app recognises. If `type` is given, checks
 * against that type's list; otherwise accepts any known unit (an item whose
 * type changed shouldn't have its still-valid unit rejected).
 */
export function isKnownUnit(value: string, type?: InventoryItemType): boolean {
  return type ? unitsForType(type).includes(value) : ALL_UNITS.includes(value);
}
