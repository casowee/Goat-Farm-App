"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BarnFilterProps {
  barns: { id: number; name: string }[];
  value: string;
}

/**
 * Sets `?barn=<id>` on the dashboard home route (or clears it for "all barns").
 * Same pattern as `components/goats/barn-filter.tsx`, just pointed at `/`. The
 * dashboard page reads the param server-side and scopes herd composition,
 * weight growth and the due-soon list to it — stock levels are left alone.
 */
export function BarnFilter({ barns, value }: BarnFilterProps) {
  const router = useRouter();

  function handleChange(next: string | null) {
    router.push(next && next !== "all" ? `/?barn=${next}` : "/");
  }

  const items = [
    { label: "All barns", value: "all" },
    ...barns.map((barn) => ({ label: barn.name, value: String(barn.id) })),
  ];

  return (
    <Select items={items} value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-32 sm:w-44">
        <SelectValue placeholder="All barns" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All barns</SelectItem>
        {barns.map((barn) => (
          <SelectItem key={barn.id} value={String(barn.id)}>
            {barn.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
