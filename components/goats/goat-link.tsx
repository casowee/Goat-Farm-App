import Link from "next/link";
import { cn } from "@/lib/utils";

// One reusable way to render a goat reference as a link to its detail page
// (/goats/[id]). Used everywhere a goat is named in the Breeding area — the
// Seasons list's bucks, the Doe Performance list's does, a doe's kids under each
// kidding event, and the Top Performers ranking — so goat references behave
// consistently instead of each list rendering them its own way.

export interface GoatLinkRef {
  id: number;
  tag: string;
  name?: string | null;
}

export function GoatLink({
  goat,
  className,
}: {
  goat: GoatLinkRef;
  className?: string;
}) {
  return (
    <Link
      href={`/goats/${goat.id}`}
      title={goat.name ? `${goat.tag} — ${goat.name}` : goat.tag}
      className={cn(
        "text-brand underline underline-offset-2 hover:text-brand/80",
        className,
      )}
    >
      {goat.tag}
    </Link>
  );
}
