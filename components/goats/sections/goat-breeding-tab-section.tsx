import {
  GoatBreedingTab,
  loadGoatBreedingTabData,
  type BreedingTabGoat,
} from "@/components/goats/goat-breeding-tab";
import { listHealthRecordsFirstPageByGoat } from "@/lib/health/queries";

/**
 * Spec 17.3 (§5D) — the Breeding tab's panel (UPD-012 / feature 09).
 *
 * `loadGoatBreedingTabData()` genuinely depends on the goat's health records — a
 * doe's kidding dates are derived from them — so that hop stays sequential. It is
 * only two deep, and the health-record read is the `cache()`d first page the
 * Health tab also renders, so in practice it is already resolved.
 */
export async function GoatBreedingTabSection({
  goat,
}: {
  goat: BreedingTabGoat;
}) {
  const healthRecords = await listHealthRecordsFirstPageByGoat(goat.id);
  const data = await loadGoatBreedingTabData(goat, healthRecords);

  return <GoatBreedingTab data={data} />;
}
