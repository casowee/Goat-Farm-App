import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthRecordFormDialog } from "@/components/health/health-record-form-dialog";
import { HealthRecordList } from "@/components/health/health-record-list";
import {
  countHealthRecordsByGoat,
  listHealthConditionPresets,
  listHealthRecordsFirstPageByGoat,
} from "@/lib/health/queries";
import { listMedicineItems } from "@/lib/inventory/queries";

/**
 * Spec 17.3 (§5D) — the Health tab's panel.
 *
 * Four reads, all independent of one another, so they run together: the newest
 * page of records (§5E pagination from 17.2), the total count for "Show more",
 * the condition presets and the medicine list for the add/edit form.
 *
 * Every one is `cache()`d, and the first page is shared with the Breeding tab
 * (a doe's kidding history is derived from her health records), so these two tabs
 * rendering side by side costs one set of queries, not two.
 */
export async function GoatHealthTabSection({ goatId }: { goatId: number }) {
  const [records, total, presets, medicines] = await Promise.all([
    listHealthRecordsFirstPageByGoat(goatId),
    countHealthRecordsByGoat(goatId),
    listHealthConditionPresets(),
    listMedicineItems(),
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-sm text-copy-secondary">
          Health records
        </CardTitle>
        <HealthRecordFormDialog
          goatId={goatId}
          presets={presets}
          medicines={medicines}
          triggerLabel="Add health record"
          triggerIcon
        />
      </CardHeader>
      <CardContent>
        <HealthRecordList
          goatId={goatId}
          records={records}
          total={total}
          presets={presets}
          medicines={medicines}
        />
      </CardContent>
    </Card>
  );
}
