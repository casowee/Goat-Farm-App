import type { BuckCapacity } from "@/lib/breeding/capacity";

/**
 * Feature 09 (Task 5) — a small, informational sentence comparing the farm's
 * actual active buck count against the recommended number for its does.
 * Purely informational, never a validation rule.
 */
export function BuckCapacityStat({ capacity }: { capacity: BuckCapacity }) {
  const { activeBucks, activeDoes, recommendedBucks } = capacity;

  return (
    <p className="text-sm text-copy-secondary">
      <span className="font-medium text-copy-primary">{activeBucks}</span>{" "}
      active {activeBucks === 1 ? "buck" : "bucks"} for{" "}
      <span className="font-medium text-copy-primary">{activeDoes}</span>{" "}
      {activeDoes === 1 ? "doe" : "does"} — recommended:{" "}
      <span className="font-medium text-copy-primary">{recommendedBucks}</span>.
    </p>
  );
}
