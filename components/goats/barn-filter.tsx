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

export function BarnFilter({ barns, value }: BarnFilterProps) {
  const router = useRouter();

  function handleChange(next: string | null) {
    router.push(next && next !== "all" ? `/goats?barn=${next}` : "/goats");
  }

  const items = [
    { label: "All barns", value: "all" },
    ...barns.map((barn) => ({ label: barn.name, value: String(barn.id) })),
  ];

  return (
    <Select items={items} value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-48">
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
