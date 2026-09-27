import { SkeletonBreedingPage } from "@/components/skeletons/skeleton-breeding-page";

/** Spec 17.3 (§5B) — Breeding → Doe Performance. */
export default function Loading() {
  return <SkeletonBreedingPage introLines={4} rows={6} />;
}
