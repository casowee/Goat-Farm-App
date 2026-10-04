"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasInAppHistory } from "@/components/nav/in-app-history";

// Spec 13 (Section 10) — the goat card's Back button returns to wherever the
// owner came from: the Calendar on the same month, day and filters, the Health
// page, Breeding, Doe Performance, another goat's card. It steps back through
// the browser's own history, so the page comes back exactly as it was left,
// scroll position included, with nothing for each linking page to pass along.
//
// When there is no in-app page behind this one (the card was opened straight
// from a link, or reloaded) it is an ordinary link to `fallbackHref` — the
// goats list, or UPD-008's duplicates view when `?from=duplicates` says so.
//
// The trigger is built in here, inside the client component (ERR-001).

export function GoatBackButton({
  fallbackHref,
  fallbackLabel,
}: {
  fallbackHref: string;
  /** Read out for the link's destination when there is nothing to go back to. */
  fallbackLabel: string;
}) {
  const router = useRouter();

  const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!hasInAppHistory()) return;
    event.preventDefault();
    router.back();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={
        <Link href={fallbackHref} title={fallbackLabel} onClick={goBack} />
      }
    >
      <ArrowLeft />
      Back
    </Button>
  );
}
