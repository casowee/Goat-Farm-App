"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HEALTH_RECORD_TYPES,
  HEALTH_RECORD_TYPE_LABELS,
} from "@/lib/health/records";

// UPD-016 (§5) — the History tab's two optional filters. Both are pushed into
// the URL (`/health?tab=history&goat=11&type=vaccination`) and read back on the
// server, so the exact filtered view is still there after tapping a goat and
// coming back, and so a filtered list can be shared or bookmarked.
//
// The selects are the shared `ui/select` primitive with the same "all" sentinel
// the dashboard's barn filter uses — an empty string is not a valid Select
// value, so "All goats" / "All types" carry the literal `all`.

export interface HealthFilterGoat {
  id: number;
  tag: string;
  name: string | null;
}

function goatLabel(goat: HealthFilterGoat): string {
  return goat.name ? `${goat.tag} — ${goat.name}` : goat.tag;
}

export function FarmHealthFilters({
  goats,
  goatValue,
  typeValue,
}: {
  goats: HealthFilterGoat[];
  /** The current `?goat=` value, or `"all"`. */
  goatValue: string;
  /** The current `?type=` value, or `"all"`. */
  typeValue: string;
}) {
  const router = useRouter();

  function push(next: { goat: string; type: string }) {
    const params = new URLSearchParams({ tab: "history" });
    if (next.goat !== "all") params.set("goat", next.goat);
    if (next.type !== "all") params.set("type", next.type);
    router.push(`/health?${params.toString()}`);
  }

  const goatItems = [
    { label: "All goats", value: "all" },
    ...goats.map((goat) => ({ label: goatLabel(goat), value: String(goat.id) })),
  ];
  const typeItems = [
    { label: "All types", value: "all" },
    ...HEALTH_RECORD_TYPES.map((type) => ({
      label: HEALTH_RECORD_TYPE_LABELS[type],
      value: type,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        items={goatItems}
        value={goatValue}
        onValueChange={(value) =>
          push({ goat: value ?? "all", type: typeValue })
        }
      >
        <SelectTrigger aria-label="Filter by goat" className="w-40 sm:w-56">
          <SelectValue placeholder="All goats" />
        </SelectTrigger>
        <SelectContent>
          {goatItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={typeItems}
        value={typeValue}
        onValueChange={(value) =>
          push({ goat: goatValue, type: value ?? "all" })
        }
      >
        <SelectTrigger aria-label="Filter by record type" className="w-36 sm:w-48">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          {typeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
