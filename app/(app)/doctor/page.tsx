import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DisclaimerBanner } from "@/components/doctor/disclaimer-banner";
import { buildDoctorBrowse, type DoctorBrowseEntry } from "@/lib/doctor/browse";
import {
  listConditionHistoryStats,
  listHealthConditionPresets,
} from "@/lib/health/queries";

/**
 * Feature 15, Task 2 — the Doctor browse page.
 *
 * A server component: the reference content is static and the two reads are
 * plain RLS-scoped selects, so there is nothing to make interactive
 * (code-standards.md — default to server components).
 */
export const metadata = {
  title: "Health Reference",
};

function historyNote(entry: DoctorBrowseEntry): string {
  if (entry.count === 0) return "No records yet";
  const records = entry.count === 1 ? "1 record" : `${entry.count} records`;
  return entry.effectiveCount > 0
    ? `${records} · ${entry.effectiveCount} marked effective`
    : records;
}

function ConditionRow({ entry }: { entry: DoctorBrowseEntry }) {
  return (
    <li>
      <Link
        href={`/doctor/${entry.slug}`}
        className="tappable flex items-center gap-3 rounded-xl border border-surface-border bg-subtle px-3 py-3 transition-colors hover:border-brand/40"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-copy-primary">
              {entry.name}
            </span>
            {entry.effectiveCount > 0 && (
              <Badge variant="secondary">
                <Check className="text-brand" aria-hidden />
                Worked before
              </Badge>
            )}
          </div>
          {entry.summary && (
            <p className="text-xs leading-relaxed text-copy-secondary">
              {entry.summary}
            </p>
          )}
          <p className="text-xs text-copy-muted">{historyNote(entry)}</p>
        </div>
        <ChevronRight
          className="ml-auto h-4 w-4 shrink-0 text-copy-muted"
          aria-hidden
        />
      </Link>
    </li>
  );
}

export default async function DoctorPage() {
  // Both reads are `cache()`d (spec 17.2 §5F) and independent, so they go in
  // parallel rather than one after the other.
  const [presets, stats] = await Promise.all([
    listHealthConditionPresets(),
    listConditionHistoryStats(),
  ]);

  const { groups, otherEntries } = buildDoctorBrowse({ presets, stats });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-copy-primary">
          Health Reference
        </h1>
        <p className="text-sm text-copy-muted">
          General background on the conditions this farm records, and — on each
          one — every treatment you have already logged for it, including the
          ones you marked as having worked.
        </p>
      </div>

      <DisclaimerBanner />

      {groups.map((group) => (
        <section key={group.category} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-copy-primary">
              {group.label}
            </h2>
            <p className="text-xs leading-relaxed text-copy-muted">
              {group.blurb}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {group.entries.map((entry) => (
              <ConditionRow key={entry.slug} entry={entry} />
            ))}
          </ul>
        </section>
      ))}

      {otherEntries.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-copy-primary">
              Other conditions you have added
            </h2>
            <p className="text-xs leading-relaxed text-copy-muted">
              Names you added yourself when logging a health record. There is no
              written reference for these, but each one still keeps your farm&rsquo;s
              history and your &ldquo;marked effective&rdquo; treatments.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {otherEntries.map((entry) => (
              <ConditionRow key={entry.slug} entry={entry} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
