import { SkeletonBreedingPage } from "@/components/skeletons/skeleton-breeding-page";

/** Spec 17.3 (§5B) — Breeding → Top Performers. */
export default function Loading() {
  return <SkeletonBreedingPage introLines={2} rows={8} />;
}
