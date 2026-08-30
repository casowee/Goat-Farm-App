import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * UPD-010 — marks a tag as a provisional, system-generated newborn temp tag
 * (`{dam_tag}-K{n}`). Shown next to the tag anywhere it appears: the goats-list
 * rows and the goat detail header. Disappears the moment the kid is promoted to
 * a real tag (`is_temp_tag` back to false).
 */
export function TempTagBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "border-transparent bg-warning/15 text-warning",
        className,
      )}
      title="Temporary tag — assign a permanent tag later by editing this goat"
    >
      Temp
    </Badge>
  );
}
