import { cn } from "@/lib/utils"

// Spec 17.3 (§5F) — `animate-pulse` swapped for `animate-skeleton-pulse`, which
// is the same gentle pulse but silences itself under
// `prefers-reduced-motion: reduce` (see `app/globals.css`). Changed on the base
// component rather than per skeleton so every placeholder in the app — including
// `SidebarMenuSkeleton` — honours the preference, with no way to forget one.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-skeleton-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
